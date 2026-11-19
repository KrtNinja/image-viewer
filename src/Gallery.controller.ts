import {
  captionSelector, frameSelector, interactiveSelector, nextArrowSelector, nonEmptyCaptionSelector,
  ownFrame, ownTarget, ownWheelTarget, prevArrowSelector, thumbnailSelector,
} from './Gallery.dom.js'
import type { GalleryService } from './Gallery.service.js'
import { mount as mountStrip } from './Gallery.strip.js'
import { SwipeGesture } from './swipe.js'
import { canScrollInDirection, isVerticalWheel, WheelPager, wheelDeltaInPixels } from './wheel.js'

export class GalleryController {
  readonly #service: GalleryService

  constructor(service: GalleryService) {
    this.#service = service
  }

  mount(root: HTMLElement): () => void {
    const listeners = new AbortController()
    const { signal } = listeners
    const pager = new WheelPager()
    const swipe = new SwipeGesture()
    signal.addEventListener('abort', mountStrip(root), { once: true })

    root.addEventListener('click', this.#click, { signal })
    root.addEventListener('keydown', this.#arrow, { signal })
    root.addEventListener('wheel', event => this.#onWheel(event, pager), { passive: false, signal })
    root.addEventListener('pointerdown', event => this.#pointerDown(event, swipe), { signal })
    root.addEventListener('pointermove', event => this.#pointerMove(event, swipe), { signal })
    root.addEventListener('pointerup', event => this.#pointerUp(event, swipe), { signal })
    for (const type of ['pointercancel', 'lostpointercapture'] as const) {
      root.addEventListener(type, event => swipe.cancel(event.pointerId), { signal })
    }
    root.ownerDocument.addEventListener('pointerdown', event => swipe.otherPointerDown(event.pointerId), { capture: true, signal })
    return () => listeners.abort()
  }

  #click = (event: MouseEvent) => {
    const button = ownTarget(event)?.closest('button')
    if (!button) return
    if (button.matches(thumbnailSelector)) this.#service.select(button.dataset.id!)
    else if (button.matches(prevArrowSelector)) this.#service.prev()
    else if (button.matches(nextArrowSelector)) this.#service.next()
  }

  #arrow = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing) return
    if (!this.#service.canNext && !this.#service.canPrev) return
    const node = ownTarget(event)
    const forward = event.key === 'ArrowRight'
    if (node?.matches(frameSelector)) this.#service[forward ? 'next' : 'prev']()
    else if (node?.matches(thumbnailSelector)) {
      const next = forward ? node.nextElementSibling : node.previousElementSibling
      if (next instanceof HTMLButtonElement) {
        this.#service.select(next.dataset.id!)
        next.focus({ preventScroll: true })
      }
    } else return
    event.preventDefault()
  }

  #onWheel(event: WheelEvent, pager: WheelPager) {
    const node = ownWheelTarget(event)
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
    const hasNeighbor = pixels > 0 ? this.#service.canNext : this.#service.canPrev
    if (!pixels || !hasNeighbor) return pager.pass(pixels, event.timeStamp)
    event.preventDefault()
    const action = pager.move(pixels, event.timeStamp)
    if (action) this.#service[action]()
  }

  #pointerDown(event: PointerEvent, swipe: SwipeGesture) {
    const photo = ownFrame(event)
    if (!photo || !event.isPrimary || event.button !== 0 || (event.target as Element).closest(interactiveSelector)) return
    swipe.start(event.pointerId, event.clientX, event.clientY)
    photo.setPointerCapture(event.pointerId)
  }

  #pointerMove(event: PointerEvent, swipe: SwipeGesture) {
    if (ownFrame(event)) swipe.move(event.pointerId, event.clientX, event.clientY)
  }

  #pointerUp(event: PointerEvent, swipe: SwipeGesture) {
    const photo = ownFrame(event)
    if (!photo) return
    const gesture = swipe.end(event.pointerId, event.clientX, event.clientY)
    if (gesture === 'left') this.#service.next()
    else if (gesture === 'right') this.#service.prev()
    else if (gesture === 'tap' && photo.querySelector(nonEmptyCaptionSelector)) this.#service.toggleDescription()
  }
}
