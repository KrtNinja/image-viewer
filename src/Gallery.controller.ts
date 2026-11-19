import {
  captionSelector, frameSelector, interactiveSelector, nonEmptyCaptionSelector,
  ownFrame, ownTarget, ownWheelArea, thumbnailSelector,
} from './Gallery.dom.js'
import type { GalleryService } from './Gallery.service.js'
import { mount as mountStrip } from './Gallery.strip.js'
import { SwipeGesture } from './swipe.js'
import { canScrollInDirection, isVerticalWheel, WheelPager, wheelDeltaInPixels } from './wheel.js'

export class GalleryController {
  constructor(private readonly service: GalleryService) {}

  mount(root: HTMLElement): () => void {
    const listeners = new AbortController()
    const { signal } = listeners
    const pager = new WheelPager()
    const swipe = new SwipeGesture()
    signal.addEventListener('abort', mountStrip(root), { once: true })

    root.addEventListener('click', this.click, { signal })
    root.addEventListener('keydown', this.arrow, { signal })
    root.addEventListener('wheel', event => this.onWheel(event, pager), { passive: false, signal })
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
    const button = ownTarget(event)?.closest<HTMLButtonElement>(thumbnailSelector)
    if (button) this.service.select(button.dataset.id!)
  }

  private arrow = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing) return
    if (!this.service.canMove('next') && !this.service.canMove('prev')) return
    const node = ownTarget(event)
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

  private onWheel(event: WheelEvent, pager: WheelPager) {
    const node = ownWheelArea(event)
    if (!node) return
    // Read the mode before the deltas so the browser keeps their original units.
    const { deltaMode, deltaY } = event
    if (!isVerticalWheel(event)) return

    const root = event.currentTarget as HTMLElement
    const caption = node.closest<HTMLElement>(captionSelector)
    if (caption && root.contains(caption) && canScrollInDirection(caption, deltaY)) {
      return pager.pass(0, event.timeStamp)
    }

    const pixels = wheelDeltaInPixels({ deltaMode, deltaY }, {
      get line() { return parseFloat(getComputedStyle(root.querySelector(frameSelector)!).lineHeight) || 16 },
      get page() { return root.ownerDocument.documentElement.clientHeight },
    })
    if (!pixels || !this.service.canMove(pixels > 0 ? 'next' : 'prev')) return pager.pass(pixels, event.timeStamp)
    event.preventDefault()
    const action = pager.move(pixels, event.timeStamp)
    if (action) this.service[action]()
  }

  private pointerDown(event: PointerEvent, swipe: SwipeGesture) {
    const photo = ownFrame(event)
    if (!photo || !event.isPrimary || event.button !== 0 || (event.target as Element).closest(interactiveSelector)) return
    swipe.start(event.pointerId, event.clientX, event.clientY)
    photo.setPointerCapture(event.pointerId)
  }

  private pointerMove(event: PointerEvent, swipe: SwipeGesture) {
    if (ownFrame(event)) swipe.move(event.pointerId, event.clientX, event.clientY)
  }

  private pointerUp(event: PointerEvent, swipe: SwipeGesture) {
    const photo = ownFrame(event)
    if (!photo) return
    const action = swipe.end(event.pointerId, event.clientX, event.clientY)
    if (action === 'tap') {
      if (photo.querySelector(nonEmptyCaptionSelector)) this.service.toggleDescription()
    } else if (action) this.service[action]()
  }
}
