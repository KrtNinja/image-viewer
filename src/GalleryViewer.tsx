import { Component, useEffect, useRef, type ReactNode } from 'react'
import { listen } from 'kr-observable'
import { GalleryController } from './Gallery.controller.js'
import { GalleryService } from './Gallery.service.js'
import type { ImageBase } from './ImageBase.js'

export type GalleryViewerProps = {
  images: ImageBase[]
  startId?: string
  children?: ReactNode
}

export class GalleryViewer extends Component<GalleryViewerProps> {
  private service: GalleryService
  private controller: GalleryController
  private unsubscribe?: () => void

  constructor(props: GalleryViewerProps) {
    super(props)
    this.service = new GalleryService(props.images, props.startId)
    this.controller = new GalleryController(this.service)
  }

  componentDidMount() {
    this.unsubscribe = listen(this.service, () => this.forceUpdate())
  }

  componentWillUnmount() {
    this.unsubscribe?.()
  }

  componentDidUpdate(previous: GalleryViewerProps) {
    // A parent may reuse the same array after editing an ImageBase.
    if (previous !== this.props) this.service.sync(this.props.images, this.props.startId)
  }

  render() {
    return <GalleryView controller={this.controller} service={this.service}>{this.props.children}</GalleryView>
  }
}

function GalleryView({ controller, service, children }: {
  service: GalleryService
  controller: GalleryController
  children?: ReactNode
}) {
  const root = useRef<HTMLDivElement>(null)
  const image = service.currentImage
  const hasPhoto = Boolean(image)
  const hasStrip = service.images.length > 1

  useEffect(() => {
    if (root.current) return controller.mount(root.current)
  }, [controller, hasPhoto])

  if (!image) return null
  const hasDescription = children != null && typeof children !== 'boolean'
  return (
    <div className="gallery-viewer" ref={root}>
      <div className="gallery-viewer__stage">
        <div className="gallery-viewer__frame" tabIndex={0}
          data-touch={service.touchInput || undefined}>
          <img className="gallery-viewer__photo" src={image.src} draggable={false}
            alt={image.alt ?? `Фото ${service.index + 1} из ${service.images.length}`} />
          {hasDescription && (
            <div className="gallery-viewer__caption" data-open={service.descriptionOpen || undefined}>
              {children}
            </div>
          )}
        </div>
      </div>
      {hasStrip && (
        <div className="gallery-viewer__strip" role="group" aria-label="Миниатюры">
          {service.images.map((item, index) => (
            <button type="button" key={item.id} value={item.id} data-id={item.id}
              aria-label={`Фото ${index + 1}`} aria-description={item.alt} aria-pressed={index === service.index}>
              <img src={item.previewSrc} alt="" draggable={false} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
