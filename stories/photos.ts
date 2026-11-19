import { ImageBase } from '../src'

const files = import.meta.glob<string>('./photos/*.webp', { eager: true, import: 'default' })
const descriptions = {
  a: 'Земля с борта «Аполлона-17»',
  b: 'Астронавт в открытом космосе над Землёй',
  c: 'Облака Сатурна и полоса его колец',
  d: 'Большое красное пятно в облаках Юпитера',
  e: 'Светлые кратеры и тёмные моря Луны',
  f: 'Разноцветные облака газа в туманности Ориона',
  g: 'Оранжевый диск Марса с тёмными участками поверхности',
  h: 'Голубой диск Нептуна на фоне космоса',
}

export const photos = Object.entries(descriptions).map(([id, alt]) =>
  Object.assign(new ImageBase(), {
    id,
    alt,
    src: files[`./photos/${id}.webp`],
    preview: files[`./photos/${id}-thumb.webp`] ?? '',
  })
)
