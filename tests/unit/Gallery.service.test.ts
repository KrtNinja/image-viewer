import { expect, test } from 'vitest'
import { GalleryService } from '../../src/Gallery.service.js'
import { ImageBase } from '../../src/ImageBase.js'

function image(id: string) {
  const photo = new ImageBase()
  photo.id = id
  return photo
}

test('в пустой галерее индекс равен -1 и листать нечего', () => {
  const gallery = new GalleryService([])
  expect(gallery.index).toBe(-1)
  expect(gallery.currentImage).toBeUndefined()
  expect(gallery.canNext).toBe(false)
  expect(gallery.canPrev).toBe(false)

  gallery.next()
  expect(gallery.index).toBe(-1)
  gallery.prev()
  expect(gallery.index).toBe(-1)
})

test('галерея открывается на первом кадре, next и prev останавливаются на краях', () => {
  const first = image('a')
  const last = image('b')
  const gallery = new GalleryService([first, last])
  expect(gallery.index).toBe(0)
  expect(gallery.currentImage).toBe(first)
  expect(gallery.canPrev).toBe(false)
  expect(gallery.canNext).toBe(true)
  gallery.prev()
  expect(gallery.index).toBe(0)

  gallery.next()
  expect(gallery.index).toBe(1)
  expect(gallery.currentImage).toBe(last)
  expect(gallery.canPrev).toBe(true)
  expect(gallery.canNext).toBe(false)
  gallery.next()
  expect(gallery.index).toBe(1)

  gallery.prev()
  expect(gallery.index).toBe(0)
})

test('конструктор выбирает кадр по startId, неизвестный id оставляет первый кадр', () => {
  const images = [image('a'), image('b')]
  expect(new GalleryService(images, 'b').index).toBe(1)
  expect(new GalleryService(images, 'unknown').index).toBe(0)
})

test('sync сохраняет индекс при том же порядке id и заменяет объекты снимков', () => {
  const gallery = new GalleryService([image('a'), image('b')])
  gallery.next()
  const updated = [image('a'), image('b')]
  gallery.sync(updated)

  expect(gallery.index).toBe(1)
  expect(gallery.images[0]).toBe(updated[0])
  expect(gallery.currentImage).toBe(updated[1])
})

test('перестановка id сбрасывает индекс в 0', () => {
  const images = [image('a'), image('b'), image('c')]
  const gallery = new GalleryService(images, 'b')
  gallery.sync([images[2], images[1], images[0]])
  expect(gallery.index).toBe(0)
  expect(gallery.currentImage).toBe(images[2])
})

test('изменение длины сбрасывает индекс в 0, а пустой список — в -1', () => {
  const images = [image('a'), image('b')]
  const gallery = new GalleryService(images, 'b')
  gallery.sync([...images, image('c')])
  expect(gallery.index).toBe(0)
  gallery.sync([])
  expect(gallery.index).toBe(-1)
  expect(gallery.images).toHaveLength(0)
})

test('после навигации sync применяет только изменившийся startId', () => {
  const images = [image('a'), image('b'), image('c')]
  const gallery = new GalleryService(images, 'b')
  gallery.prev()
  gallery.sync(images, 'b')
  expect(gallery.index).toBe(0)
  gallery.sync(images, 'c')
  expect(gallery.index).toBe(2)
})

test('после sync с undefined прежний startId снова выбирает кадр', () => {
  const images = [image('a'), image('b')]
  const gallery = new GalleryService(images, 'b')
  gallery.prev()
  gallery.sync(images, undefined)
  expect(gallery.index).toBe(0)
  gallery.sync(images, 'b')
  expect(gallery.index).toBe(1)
})

test('startId из пустого списка применяется при появлении снимков', () => {
  const gallery = new GalleryService([], 'b')
  gallery.sync([image('a'), image('b')], 'b')
  expect(gallery.index).toBe(1)
})

test('после неизвестного startId добавление этого кадра не выбирает его автоматически', () => {
  const images = [image('a'), image('b')]
  const gallery = new GalleryService(images)
  gallery.next()
  gallery.sync(images, 'c')
  expect(gallery.index).toBe(1)
  gallery.sync([...images, image('c')], 'c')
  expect(gallery.index).toBe(0)
})

test('изменение исходного массива не меняет список снимков в сервисе', () => {
  const first = image('a')
  const images = [first]
  const gallery = new GalleryService(images)
  images.pop()
  expect(gallery.images).toEqual([first])
})

test('select с неизвестным id сохраняет выбранный кадр', () => {
  const gallery = new GalleryService([image('a'), image('b')], 'b')
  gallery.select('unknown')
  expect(gallery.index).toBe(1)
})

test('toggleDescription открывает и закрывает описание', () => {
  const gallery = new GalleryService([image('a')])
  expect(gallery.descriptionOpen).toBe(false)
  gallery.toggleDescription()
  expect(gallery.descriptionOpen).toBe(true)
  gallery.toggleDescription()
  expect(gallery.descriptionOpen).toBe(false)
})
