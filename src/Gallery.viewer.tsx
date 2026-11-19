import { useEffect, useRef, useState, type ReactNode } from 'react'
import { observer } from 'kr-observable/react'
import { GalleryController } from './Gallery.controller.js'
import { GalleryService } from './Gallery.service.js'
import type { ImageBase } from './ImageBase.js'

export type GalleryViewerProps = {
  images: ImageBase[]
  startId?: string
  children?: ReactNode
}

export const GalleryViewer = observer(function GalleryViewer({ images, startId, children }: GalleryViewerProps) {
  const [{ service, controller }] = useState(() => {
    const service = new GalleryService(images, startId)
    return { service, controller: new GalleryController(service) }
  })
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => controller.mount(root.current!), [controller])
  useEffect(() => service.sync(images, startId), [service, images, startId])

  const image = service.currentImage
  const hasDescription = children != null && typeof children !== 'boolean'
  return (
    <div className="gallery-viewer" ref={root} hidden={!image}>
      {image && (
        <div className="gallery-viewer__stage">
          <div className="gallery-viewer__frame" tabIndex={0}>
            <img className="gallery-viewer__photo" src={image.src} draggable={false}
              alt={image.alt ?? `Фото ${service.index + 1} из ${service.images.length}`} />
            {hasDescription && (
              <div className="gallery-viewer__caption" data-open={service.descriptionOpen || undefined}>
                {children}
              </div>
            )}
          </div>
        </div>
      )}
      {service.images.length > 1 && (
        <div className="gallery-viewer__strip" role="group" aria-label="Миниатюры">
          {service.images.map((item, index) => (
            <button className="gallery-viewer__thumb" type="button" key={item.id} data-id={item.id}
              aria-label={`Фото ${index + 1}`} aria-description={item.alt} aria-pressed={index === service.index}>
              <img className="gallery-viewer__thumb-image" src={item.previewSrc} alt="" draggable={false} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
})
