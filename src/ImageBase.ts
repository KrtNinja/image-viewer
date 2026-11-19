export class ImageBase {
  id = ''
  src = ''
  preview?: string = ''

  get previewSrc(): string {
    return this.preview || this.src
  }
}
