export class ImageBase {
  id = ''
  src = ''
  alt?: string
  preview?: string = ''

  get previewSrc(): string {
    return this.preview || this.src
  }
}
