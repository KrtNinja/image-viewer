const WHEEL_THRESHOLD_PX = 160
const WHEEL_PAUSE_MS = 50

export class GalleryWheel {
  private lastEvent = -Infinity
  private distance = 0
  private locked = false

  // Native scrolling still extends the gesture. A zero delta clears its partial distance.
  pass(delta: number, timeStamp: number) {
    if (timeStamp - this.lastEvent >= WHEEL_PAUSE_MS) {
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
    if (Math.abs(this.distance) < WHEEL_THRESHOLD_PX) return
    this.locked = true
    return this.distance > 0 ? 'next' : 'prev'
  }
}
