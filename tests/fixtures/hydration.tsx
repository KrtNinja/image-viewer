import { StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { GalleryViewer, ImageBase } from '../../src/index.js'

const images = [
  Object.assign(new ImageBase(), { id: 'a', src: '/a.webp' }),
  Object.assign(new ImageBase(), { id: 'b', src: '/b.webp', alt: 'Лодка у причала' }),
  Object.assign(new ImageBase(), { id: 'c', src: '/c.webp', alt: '' }),
]

export function gallery(startId: string, items = images) {
  return <StrictMode><GalleryViewer images={items} startId={startId} /></StrictMode>
}

export function hydrate() {
  hydrateRoot(document.getElementById('root')!, gallery('b'), {
    onRecoverableError(error) { throw error },
  })
}
