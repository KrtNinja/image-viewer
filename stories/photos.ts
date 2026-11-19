import { ImageBase } from '../src'

const files = import.meta.glob<string>('./photos/*.webp', { eager: true, import: 'default' })
export const photos = Array.from('abcdefgh', id =>
  Object.assign(new ImageBase(), {
    id,
    src: files[`./photos/${id}.webp`],
    preview: files[`./photos/${id}-thumb.webp`] ?? '',
  })
)
