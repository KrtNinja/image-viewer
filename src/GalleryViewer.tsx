import { Component, useEffect, useRef, type ReactNode } from 'react'
import { listen } from 'kr-observable'
import { GalleryViewerController } from './GalleryViewerController.js'
import { GalleryViewerService } from './GalleryViewerService.js'
import type { ImageBase } from './ImageBase.js'

export type GalleryViewerProps = {
  images: ImageBase[]
  startId?: string
  children?: ReactNode
}

export class GalleryViewer extends Component<GalleryViewerProps> {
  private controller = new GalleryViewerController(new GalleryViewerService())
  private unsubscribe?: () => void

  constructor(props: GalleryViewerProps) {
    super(props)
    this.controller.update(props.images, props.startId)
  }

  componentDidMount() {
    this.unsubscribe = listen(this.controller.service, () => this.forceUpdate())
  }

  componentWillUnmount() {
    this.unsubscribe?.()
  }

  componentDidUpdate(previous: GalleryViewerProps) {
    // A parent may reuse the same array after editing an ImageBase.
    if (previous !== this.props) this.controller.update(this.props.images, this.props.startId)
  }

  render() {
    return <GalleryView controller={this.controller}>{this.props.children}</GalleryView>
  }
}

function GalleryView({ controller, children }: {
  controller: GalleryViewerController
  children?: ReactNode
}) {
  const frame = useRef<HTMLDivElement>(null)
  const strip = useRef<HTMLDivElement>(null)
  const selected = useRef<HTMLButtonElement>(null)
  const service = controller.service
  const image = service.images[service.index]
  const hasPhoto = Boolean(image)
  const hasStrip = service.images.length > 1

  useEffect(() => {
    if (frame.current) return controller.listen(frame.current, strip.current)
  }, [controller, hasPhoto, hasStrip])

  useEffect(() => {
    const row = strip.current
    const button = selected.current
    if (!row || !button) return
    const reveal = () => {
      const left = button.offsetLeft
      const right = left + button.offsetWidth
      if (left < row.scrollLeft) row.scrollLeft = left
      else if (right > row.scrollLeft + row.clientWidth) row.scrollLeft = right - row.clientWidth
    }
    reveal()
    const resize = new ResizeObserver(reveal)
    resize.observe(row)
    return () => resize.disconnect()
  }, [hasStrip, image?.id, service.index])

  if (!image) return null
  const hasDescription = children != null && typeof children !== 'boolean'
  return (
    <div className="gallery-viewer">
      <div className="gallery-viewer__stage">
        <div className="gallery-viewer__frame" ref={frame} tabIndex={0}
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
        <div className="gallery-viewer__strip" ref={strip} role="group" aria-label="Миниатюры">
          {service.images.map((item, index) => (
            <button type="button" key={item.id} value={item.id} ref={index === service.index ? selected : undefined}
              aria-label={`Фото ${index + 1}`} aria-description={item.alt} aria-pressed={index === service.index}
              onClick={() => service.select(item.id)}>
              <img src={item.previewSrc} alt="" draggable={false} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
