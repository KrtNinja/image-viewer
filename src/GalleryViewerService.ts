import { Observable } from 'kr-observable'
import type { ImageBase } from './ImageBase.js'

export class GalleryViewerService extends Observable {
  static shallow = new Set(['images'])
  images: ImageBase[] = []
  index = -1
  descriptionOpen = false
  touchInput = false

  setImages(images: ImageBase[]) {
    this.images = images.slice()
    this.index = images.length ? 0 : -1
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
