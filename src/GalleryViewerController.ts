import type { GalleryViewerService } from './GalleryViewerService.js'
import type { ImageBase } from './ImageBase.js'

type Stroke = { id: number; x: number; y: number; moved: boolean }

export class GalleryViewerController {
  private ids: string[] = []
  private lastStartId?: string

  constructor(readonly service: GalleryViewerService) {}

  update(images: ImageBase[], startId?: string) {
    const sameOrder = this.ids.length === images.length &&
      this.ids.every((id, index) => id === images[index].id)

    if (sameOrder) {
      this.service.images = images.slice()
    } else {
      this.service.setImages(images)
      this.ids = images.map(image => image.id)
    }

    if (images.length) {
      if (startId !== undefined && startId !== this.lastStartId) this.service.select(startId)
      this.lastStartId = startId
    }
  }

  listen(frame: HTMLElement, strip: HTMLElement | null) {
    const service = this.service
    const listeners = new AbortController()
    const { signal } = listeners
    let stroke: Stroke | undefined
    let lastWheel = -Infinity
    let distance = 0
    let locked = false

    function wheel(event: WheelEvent) {
      const mode = event.deltaMode
      const { deltaX, deltaY, timeStamp } = event
      if (event.ctrlKey || event.shiftKey || !deltaY || Math.abs(deltaX) >= Math.abs(deltaY)) return

      if (timeStamp - lastWheel >= 50) {
        distance = 0
        locked = false
      }
      lastWheel = timeStamp

      const forward = deltaY > 0
      const caption = event.target instanceof Element
        ? event.target.closest<HTMLElement>('.gallery-viewer__caption')
        : null
      if (caption?.parentElement === frame) {
        const bottom = caption.scrollHeight - caption.clientHeight
        if (forward ? Math.ceil(caption.scrollTop) < bottom : caption.scrollTop > 0) {
          distance = 0
          return
        }
      }

      const hasNeighbor = forward ? service.index + 1 < service.images.length : service.index > 0
      if (hasNeighbor) event.preventDefault()
      if (locked) return
      if (Math.sign(distance) !== Math.sign(deltaY)) distance = 0
      if (!hasNeighbor) return

      // Use the same line and page units over both the photograph and its strip.
      let unit = 1
      if (mode === WheelEvent.DOM_DELTA_LINE) unit = parseFloat(getComputedStyle(frame).lineHeight) || 16
      if (mode === WheelEvent.DOM_DELTA_PAGE) unit = frame.ownerDocument.documentElement.clientHeight
      distance += deltaY * unit
      if (Math.abs(distance) < 160) return
      locked = true
      if (forward) service.next()
      else service.prev()
    }

    function arrow(event: KeyboardEvent) {
      const forward = event.key === 'ArrowRight'
      if (!forward && event.key !== 'ArrowLeft') return
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing) return

      const target = event.target
      if (target === frame) {
        if (forward) service.next()
        else service.prev()
      } else {
        if (!(target instanceof HTMLButtonElement) || target.parentElement !== strip) return
        const next = forward ? target.nextElementSibling : target.previousElementSibling
        if (next instanceof HTMLButtonElement) {
          service.select(next.value)
          next.focus({ preventScroll: true })
        }
      }
      event.preventDefault()
    }

    function cancel() {
      stroke = undefined
    }

    // A second finger may land outside the picture. Invalidate the original gesture too.
    frame.ownerDocument.addEventListener('pointerdown', event => {
      if (stroke && event.pointerId !== stroke.id) cancel()
    }, { capture: true, signal })

    frame.addEventListener('pointerdown', event => {
      const touch = event.pointerType !== 'mouse'
      if (touch && !service.touchInput) service.descriptionOpen = false
      service.touchInput = touch
      if (!event.isPrimary || event.button !== 0) return
      const target = event.target
      if (target instanceof Element && target.closest('button, a, input, select, textarea, label, summary, [contenteditable], [role="button"], [role="link"]')) return
      stroke = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false }
      frame.setPointerCapture(event.pointerId)
    }, { signal })

    frame.addEventListener('pointermove', event => {
      if (event.pointerType === 'mouse' && service.touchInput) service.touchInput = false
      if (stroke?.id !== event.pointerId) return
      if (Math.hypot(event.clientX - stroke.x, event.clientY - stroke.y) > 8) stroke.moved = true
    }, { signal })

    frame.addEventListener('pointerup', event => {
      if (!stroke || stroke.id !== event.pointerId) return
      const dx = event.clientX - stroke.x
      const dy = event.clientY - stroke.y
      const tap = !stroke.moved && Math.hypot(dx, dy) <= 8
      cancel()
      if (tap && event.pointerType !== 'mouse') service.toggleDescription()
      if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) service.next()
        else service.prev()
      }
    }, { signal })

    const cancelPointer = (event: PointerEvent) => {
      if (stroke?.id === event.pointerId) cancel()
    }
    frame.addEventListener('pointercancel', cancelPointer, { signal })
    frame.addEventListener('lostpointercapture', cancelPointer, { signal })
    frame.addEventListener('wheel', wheel, { passive: false, signal })
    if (strip) {
      frame.addEventListener('keydown', arrow, { signal })
      strip.addEventListener('keydown', arrow, { signal })
      strip.addEventListener('wheel', wheel, { passive: false, signal })
    }
    return () => listeners.abort()
  }
}
