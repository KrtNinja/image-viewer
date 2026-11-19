import type { GalleryService } from './Gallery.service.js'

type Stroke = { id: number; x: number; y: number; moved: boolean }

const frameSelector = '.gallery-viewer__frame'
const stripSelector = '.gallery-viewer__strip'
const thumbnailSelector = '.gallery-viewer__strip > button[data-id]'
const interactiveSelector = 'button, a, input, select, textarea, label, summary, [contenteditable], [role="button"], [role="link"]'

export class GalleryController {
  private stroke?: Stroke
  private lastWheel = -Infinity
  private distance = 0
  private locked = false

  constructor(private readonly service: GalleryService) {}

  mount(root: HTMLElement): () => void {
    const listeners = new AbortController()
    const { signal } = listeners
    root.addEventListener('click', this.click, { signal })
    root.addEventListener('keydown', this.arrow, { signal })
    root.addEventListener('wheel', this.wheel, { passive: false, signal })
    root.addEventListener('pointerdown', this.pointerDown, { signal })
    root.addEventListener('pointermove', this.pointerMove, { signal })
    root.addEventListener('pointerup', this.pointerUp, { signal })
    root.addEventListener('pointercancel', this.cancelPointer, { signal })
    root.addEventListener('lostpointercapture', this.cancelPointer, { signal })
    root.ownerDocument.addEventListener('pointerdown', this.cancelOnSecondPointer, { capture: true, signal })

    const reveal = () => this.revealThumbnail(root)
    const resize = new ResizeObserver(reveal)
    resize.observe(root)
    const mutations = new MutationObserver(records => {
      if (records.some(({ target }) => target === root ||
        (target instanceof Element && target.closest('.gallery-viewer') === root &&
          target.matches(stripSelector + ', ' + thumbnailSelector)))) reveal()
    })
    mutations.observe(root, { subtree: true, childList: true, attributeFilter: ['aria-pressed'] })
    reveal()

    return () => {
      listeners.abort()
      mutations.disconnect()
      resize.disconnect()
      this.stroke = undefined
      this.lastWheel = -Infinity
    }
  }

  private revealThumbnail(root: HTMLElement) {
    const row = root.querySelector<HTMLElement>(':scope > .gallery-viewer__strip')
    const button = row?.querySelector<HTMLElement>(':scope > button[aria-pressed="true"]')
    if (!row || !button) return
    const left = button.offsetLeft
    const right = left + button.offsetWidth
    if (left < row.scrollLeft) row.scrollLeft = left
    else if (right > row.scrollLeft + row.clientWidth) row.scrollLeft = right - row.clientWidth
  }

  // A caption can contain another gallery with its own controller.
  private target(event: Event) {
    const target = event.target
    return target instanceof Element && target.closest('.gallery-viewer') === event.currentTarget ? target : null
  }

  private frame(event: PointerEvent) {
    const frame = this.target(event)?.closest<HTMLElement>(frameSelector)
    return frame && (event.currentTarget as HTMLElement).contains(frame) ? frame : null
  }

  private click = (event: MouseEvent) => {
    const button = this.target(event)?.closest<HTMLButtonElement>(thumbnailSelector)
    if (button) this.service.select(button.dataset.id!)
  }

  private arrow = (event: KeyboardEvent) => {
    const forward = event.key === 'ArrowRight'
    if (!forward && event.key !== 'ArrowLeft') return
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing) return
    if (this.service.images.length < 2) return

    const target = this.target(event)
    if (target?.matches(frameSelector)) {
      if (forward) this.service.next()
      else this.service.prev()
    } else {
      if (!target?.matches(thumbnailSelector)) return
      const next = forward ? target.nextElementSibling : target.previousElementSibling
      if (next instanceof HTMLButtonElement) {
        this.service.select(next.dataset.id!)
        next.focus({ preventScroll: true })
      }
    }
    event.preventDefault()
  }

  private wheel = (event: WheelEvent) => {
    const target = this.target(event)
    if (!target || target.closest(frameSelector + ', ' + stripSelector + ', .gallery-viewer') === event.currentTarget) return
    const mode = event.deltaMode
    const { deltaX, deltaY, timeStamp } = event
    if (event.ctrlKey || event.shiftKey || !deltaY || Math.abs(deltaX) >= Math.abs(deltaY)) return

    if (timeStamp - this.lastWheel >= 50) {
      this.distance = 0
      this.locked = false
    }
    this.lastWheel = timeStamp

    const forward = deltaY > 0
    const caption = target.closest<HTMLElement>('.gallery-viewer__caption')
    if (caption && caption.closest('.gallery-viewer') === event.currentTarget) {
      const bottom = caption.scrollHeight - caption.clientHeight
      if (forward ? Math.ceil(caption.scrollTop) < bottom : caption.scrollTop > 0) {
        this.distance = 0
        return
      }
    }

    const hasNeighbor = forward ? this.service.index + 1 < this.service.images.length : this.service.index > 0
    if (hasNeighbor) event.preventDefault()
    if (this.locked) return
    if (Math.sign(this.distance) !== Math.sign(deltaY)) this.distance = 0
    if (!hasNeighbor) return

    const root = event.currentTarget as HTMLElement
    let unit = 1
    if (mode === WheelEvent.DOM_DELTA_LINE) {
      const frame = root.querySelector(frameSelector)!
      unit = parseFloat(getComputedStyle(frame).lineHeight) || 16
    }
    if (mode === WheelEvent.DOM_DELTA_PAGE) unit = root.ownerDocument.documentElement.clientHeight
    this.distance += deltaY * unit
    if (Math.abs(this.distance) < 160) return
    this.locked = true
    if (forward) this.service.next()
    else this.service.prev()
  }

  private cancelOnSecondPointer = (event: PointerEvent) => {
    if (this.stroke && event.pointerId !== this.stroke.id) this.stroke = undefined
  }

  private pointerDown = (event: PointerEvent) => {
    const frame = this.frame(event)
    if (!frame) return
    this.service.setTouchInput(event.pointerType !== 'mouse')
    if (!event.isPrimary || event.button !== 0 || (event.target as Element).closest(interactiveSelector)) return
    this.stroke = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false }
    frame.setPointerCapture(event.pointerId)
  }

  private pointerMove = (event: PointerEvent) => {
    if (!this.frame(event)) return
    if (event.pointerType === 'mouse' && this.service.touchInput) this.service.setTouchInput(false)
    if (this.stroke?.id !== event.pointerId) return
    if (Math.hypot(event.clientX - this.stroke.x, event.clientY - this.stroke.y) > 8) this.stroke.moved = true
  }

  private pointerUp = (event: PointerEvent) => {
    const stroke = this.stroke
    const frame = this.frame(event)
    if (!frame || stroke?.id !== event.pointerId) return
    this.stroke = undefined
    const dx = event.clientX - stroke.x
    const dy = event.clientY - stroke.y
    if (event.pointerType !== 'mouse' && !stroke.moved && Math.hypot(dx, dy) <= 8 &&
      frame.querySelector(':scope > .gallery-viewer__caption:not(:empty)')) {
      this.service.toggleDescription()
    }
    if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) this.service.next()
      else this.service.prev()
    }
  }

  private cancelPointer = (event: PointerEvent) => {
    if (this.stroke?.id === event.pointerId) this.stroke = undefined
  }
}
