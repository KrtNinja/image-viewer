const LINE_MODE = 1
const PAGE_MODE = 2

export function isVerticalWheel(event: Pick<WheelEvent, 'ctrlKey' | 'shiftKey' | 'deltaX' | 'deltaY'>) {
  return !event.ctrlKey && !event.shiftKey && Math.abs(event.deltaY) > Math.abs(event.deltaX)
}

export function canScrollInDirection(element: Pick<Element, 'scrollTop' | 'scrollHeight' | 'clientHeight'>, deltaY: number) {
  if (deltaY > 0) return Math.ceil(element.scrollTop) < element.scrollHeight - element.clientHeight
  return deltaY < 0 && element.scrollTop > 0
}

export function wheelDeltaInPixels(event: Pick<WheelEvent, 'deltaMode' | 'deltaY'>, units: { line: number; page: number }) {
  if (event.deltaMode === LINE_MODE) return event.deltaY * units.line
  if (event.deltaMode === PAGE_MODE) return event.deltaY * units.page
  return event.deltaY
}

export class WheelPager {
  private readonly thresholdPx: number
  private readonly pauseMs: number
  private lastEvent = -Infinity
  private distance = 0
  private locked = false

  constructor({ thresholdPx = 160, pauseMs = 50 } = {}) {
    this.thresholdPx = thresholdPx
    this.pauseMs = pauseMs
  }

  // Native scrolling still extends the gesture. A zero delta clears its partial distance.
  pass(delta: number, timeStamp: number) {
    if (timeStamp - this.lastEvent >= this.pauseMs) {
      this.distance = 0
      this.locked = false
    }
    this.lastEvent = timeStamp
    if (Math.sign(this.distance) !== Math.sign(delta)) this.distance = 0
  }

  move(delta: number, timeStamp: number): 'next' | 'prev' | undefined {
    this.pass(delta, timeStamp)
    if (this.locked) return
    this.distance += delta
    if (Math.abs(this.distance) < this.thresholdPx) return
    this.locked = true
    return this.distance > 0 ? 'next' : 'prev'
  }
}
