import { Observable } from 'kr-observable'
import type { ImageBase } from './ImageBase.js'

export class GalleryService extends Observable {
  static shallow = new Set(['images'])
  // Read the current index and array directly, including between synchronous commands.
  static ignore = new Set(['currentImage', 'canNext', 'canPrev'])
  images: ImageBase[] = []
  index = -1
  descriptionOpen = false

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

  select(id: string) {
    const index = this.images.findIndex(image => image.id === id)
    if (index >= 0) this.index = index
  }

  get canNext() {
    return this.index + 1 < this.images.length
  }

  get canPrev() {
    return this.index > 0
  }

  next() {
    if (this.canNext) this.index++
  }

  prev() {
    if (this.canPrev) this.index--
  }

  toggleDescription() {
    this.descriptionOpen = !this.descriptionOpen
  }
}
