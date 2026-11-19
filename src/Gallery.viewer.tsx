import { useEffect, useRef, useState, type ReactNode } from 'react'
import { observer } from 'kr-observable/react'
import { GalleryController } from './Gallery.controller.js'
import { GalleryService } from './Gallery.service.js'
import type { ImageBase } from './ImageBase.js'

export type GalleryViewerProps = {
  images: ImageBase[]
  startId?: string
  arrows?: boolean
  children?: ReactNode
}

function Arrow({ direction, disabled }: { direction: 'prev' | 'next', disabled: boolean }) {
  const previous = direction === 'prev'
  return (
    <button type="button" className={`gallery-viewer__arrow gallery-viewer__arrow--${direction}`}
      aria-label={previous ? 'Предыдущее фото' : 'Следующее фото'} disabled={disabled} tabIndex={-1}>
      <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={previous ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
      </svg>
    </button>
  )
}

export const GalleryViewer = observer(function GalleryViewer({ images, startId, arrows = true, children }: GalleryViewerProps) {
  const [{ service, controller }] = useState(() => {
    const service = new GalleryService(images, startId)
    return { service, controller: new GalleryController(service) }
  })
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => controller.mount(root.current!), [controller])
  useEffect(() => service.sync(images, startId), [service, images, startId])

  const image = service.currentImage
  const multipleImages = service.images.length > 1
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
          {arrows && multipleImages && (
            <>
              <Arrow direction="prev" disabled={!service.canPrev} />
              <Arrow direction="next" disabled={!service.canNext} />
            </>
          )}
        </div>
      )}
      {multipleImages && (
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
