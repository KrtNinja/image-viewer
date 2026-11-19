const TAP_SLOP_PX = 8
const SWIPE_THRESHOLD_PX = 40

export class GallerySwipe {
  private stroke?: { id: number; x: number; y: number; moved: boolean }

  start(id: number, x: number, y: number) {
    this.stroke = { id, x, y, moved: false }
  }

  move(id: number, x: number, y: number) {
    const stroke = this.stroke
    if (stroke?.id === id && Math.hypot(x - stroke.x, y - stroke.y) > TAP_SLOP_PX) stroke.moved = true
  }

  end(id: number, x: number, y: number): 'next' | 'prev' | 'tap' | undefined {
    const stroke = this.stroke
    if (stroke?.id !== id) return
    this.stroke = undefined
    const dx = x - stroke.x
    const dy = y - stroke.y
    if (!stroke.moved && Math.hypot(dx, dy) <= TAP_SLOP_PX) return 'tap'
    if (Math.abs(dx) >= SWIPE_THRESHOLD_PX && Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'next' : 'prev'
  }

  cancel(id: number) {
    if (this.stroke?.id === id) this.stroke = undefined
  }

  otherPointerDown(id: number) {
    if (this.stroke?.id !== id) this.stroke = undefined
  }
}
