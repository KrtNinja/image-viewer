import type { GalleryService } from './Gallery.service.js'
import { mount as mountStrip } from './Gallery.strip.js'
import { GallerySwipe } from './Gallery.swipe.js'
import { GalleryWheel } from './Gallery.wheel.js'

const frameSelector = '.gallery-viewer__frame'
const thumbnailSelector = '.gallery-viewer__strip > button[data-id]'
const interactiveSelector = 'button, a, input, select, textarea, label, summary, [contenteditable], [role="button"], [role="link"]'

// Captions can contain another gallery. Only the closest root handles the event.
function target(event: Event) {
  const node = event.target
  return node instanceof Element && node.closest('.gallery-viewer') === event.currentTarget ? node : null
}

function frame(event: PointerEvent) {
  const node = target(event)?.closest<HTMLElement>(frameSelector)
  return node && (event.currentTarget as HTMLElement).contains(node) ? node : null
}

function readWheel(event: WheelEvent) {
  const node = target(event)
  const root = event.currentTarget as HTMLElement
  if (!node || node.closest('.gallery-viewer__frame, .gallery-viewer__strip, .gallery-viewer') === root) return
  const { deltaMode, deltaY, deltaX } = event
  if (event.ctrlKey || event.shiftKey || !deltaY || Math.abs(deltaX) >= Math.abs(deltaY)) return

  const caption = node.closest<HTMLElement>('.gallery-viewer__caption')
  if (caption && root.contains(caption)) {
    const bottom = caption.scrollHeight - caption.clientHeight
    if (deltaY > 0 ? Math.ceil(caption.scrollTop) < bottom : caption.scrollTop > 0) return 0
  }

  if (deltaMode === WheelEvent.DOM_DELTA_PAGE) return deltaY * root.ownerDocument.documentElement.clientHeight
  if (deltaMode === WheelEvent.DOM_DELTA_LINE) {
    const line = getComputedStyle(root.querySelector(frameSelector)!).lineHeight
    return deltaY * (parseFloat(line) || 16)
  }
  return deltaY
}

export class GalleryController {
  constructor(private readonly service: GalleryService) {}

  mount(root: HTMLElement): () => void {
    const listeners = new AbortController()
    const { signal } = listeners
    const wheel = new GalleryWheel()
    const swipe = new GallerySwipe()
    signal.addEventListener('abort', mountStrip(root), { once: true })

    root.addEventListener('click', this.click, { signal })
    root.addEventListener('keydown', this.arrow, { signal })
    root.addEventListener('wheel', event => this.wheel(event, wheel), { passive: false, signal })
    root.addEventListener('pointerdown', event => this.pointerDown(event, swipe), { signal })
    root.addEventListener('pointermove', event => this.pointerMove(event, swipe), { signal })
    root.addEventListener('pointerup', event => this.pointerUp(event, swipe), { signal })
    for (const type of ['pointercancel', 'lostpointercapture'] as const) {
      root.addEventListener(type, event => swipe.cancel(event.pointerId), { signal })
    }
    root.ownerDocument.addEventListener('pointerdown', event => swipe.otherPointerDown(event.pointerId), { capture: true, signal })
    return () => listeners.abort()
  }

  private click = (event: MouseEvent) => {
    const button = target(event)?.closest<HTMLButtonElement>(thumbnailSelector)
    if (button) this.service.select(button.dataset.id!)
  }

  private arrow = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing) return
    if (this.service.images.length < 2) return
    const node = target(event)
    const forward = event.key === 'ArrowRight'
    if (node?.matches(frameSelector)) this.service[forward ? 'next' : 'prev']()
    else if (node?.matches(thumbnailSelector)) {
      const next = forward ? node.nextElementSibling : node.previousElementSibling
      if (next instanceof HTMLButtonElement) {
        this.service.select(next.dataset.id!)
        next.focus({ preventScroll: true })
      }
    } else return
    event.preventDefault()
  }

  private wheel(event: WheelEvent, wheel: GalleryWheel) {
    const pixels = readWheel(event)
    if (pixels === undefined) return
    const { index, images } = this.service
    const hasNeighbor = pixels > 0 ? index + 1 < images.length : index > 0
    if (!pixels || !hasNeighbor) return wheel.pass(pixels, event.timeStamp)
    event.preventDefault()
    const action = wheel.move(pixels, event.timeStamp)
    if (action) this.service[action]()
  }

  private pointerDown(event: PointerEvent, swipe: GallerySwipe) {
    const photo = frame(event)
    if (!photo || !event.isPrimary || event.button !== 0 || (event.target as Element).closest(interactiveSelector)) return
    swipe.start(event.pointerId, event.clientX, event.clientY)
    photo.setPointerCapture(event.pointerId)
  }

  private pointerMove(event: PointerEvent, swipe: GallerySwipe) {
    if (frame(event)) swipe.move(event.pointerId, event.clientX, event.clientY)
  }

  private pointerUp(event: PointerEvent, swipe: GallerySwipe) {
    const photo = frame(event)
    if (!photo) return
    const action = swipe.end(event.pointerId, event.clientX, event.clientY)
    if (action === 'tap') {
      if (event.pointerType !== 'mouse' && photo.querySelector(':scope > .gallery-viewer__caption:not(:empty)')) {
        this.service.toggleDescription()
      }
    } else if (action) this.service[action]()
  }
}
