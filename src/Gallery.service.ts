import { Observable } from 'kr-observable'
import type { ImageBase } from './ImageBase.js'

export class GalleryService extends Observable {
  static shallow = new Set(['images'])
  images: ImageBase[] = []
  index = -1
  descriptionOpen = false
  touchInput = false

  private ids: string[] = []
  private lastStartId?: string

  constructor(images: ImageBase[], startId?: string) {
    super()
    this.sync(images, startId)
  }

  get currentImage(): ImageBase | undefined {
    return this.images[this.index]
  }

  sync(images: ImageBase[], startId?: string) {
    const sameOrder = this.ids.length === images.length &&
      this.ids.every((id, i) => id === images[i].id)

    this.images = images.slice()
    if (!sameOrder) {
      this.ids = images.map(image => image.id)
      this.index = images.length ? 0 : -1
    }
    if (images.length) {
      if (startId !== undefined && startId !== this.lastStartId) this.select(startId)
      this.lastStartId = startId
    }
  }

  setTouchInput(touch: boolean) {
    if (touch && !this.touchInput) this.descriptionOpen = false
    this.touchInput = touch
  }

  select(id: string) {
    const index = this.images.findIndex(image => image.id === id)
    if (index >= 0) this.index = index
  }

  next() {
    if (this.index + 1 < this.images.length) this.index++
  }

  prev() {
    if (this.index > 0) this.index--
  }

  toggleDescription() {
    this.descriptionOpen = !this.descriptionOpen
  }
}
