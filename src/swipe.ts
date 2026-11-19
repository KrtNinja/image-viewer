export class SwipeGesture {
  readonly #tapSlopPx: number
  readonly #swipeThresholdPx: number
  #stroke?: { id: number; x: number; y: number; moved: boolean }

  constructor({ tapSlopPx = 8, swipeThresholdPx = 40 } = {}) {
    this.#tapSlopPx = tapSlopPx
    this.#swipeThresholdPx = swipeThresholdPx
  }

  start(id: number, x: number, y: number) {
    this.#stroke = { id, x, y, moved: false }
  }

  move(id: number, x: number, y: number) {
    const stroke = this.#stroke
    if (stroke?.id === id && Math.hypot(x - stroke.x, y - stroke.y) > this.#tapSlopPx) stroke.moved = true
  }

  end(id: number, x: number, y: number): 'left' | 'right' | 'tap' | undefined {
    const stroke = this.#stroke
    if (stroke?.id !== id) return
    this.#stroke = undefined
    const dx = x - stroke.x
    const dy = y - stroke.y
    if (!stroke.moved && Math.hypot(dx, dy) <= this.#tapSlopPx) return 'tap'
    if (Math.abs(dx) >= this.#swipeThresholdPx && Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right'
  }

  cancel(id: number) {
    if (this.#stroke?.id === id) this.#stroke = undefined
  }

  otherPointerDown(id: number) {
    if (this.#stroke?.id !== id) this.#stroke = undefined
  }
}
