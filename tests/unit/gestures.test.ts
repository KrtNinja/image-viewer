import { expect, test } from '@playwright/test'
import { GallerySwipe } from '../../src/Gallery.swipe.js'
import { GalleryWheel } from '../../src/Gallery.wheel.js'

test('колесо накапливает 160 пикселей в одном направлении', () => {
  const wheel = new GalleryWheel()
  expect(wheel.move(80, 0)).toBeUndefined()
  expect(wheel.move(-80, 10)).toBeUndefined()
  expect(wheel.move(-79, 20)).toBeUndefined()
  expect(wheel.move(-1, 30)).toBe('prev')
})

test('49 мс продлевают блокировку, через 50 мс накопление начинается с нуля', () => {
  const wheel = new GalleryWheel()
  expect(wheel.move(80, 0)).toBeUndefined()
  expect(wheel.move(80, 49)).toBe('next')
  expect(wheel.move(-160, 98)).toBeUndefined()
  expect(wheel.move(-80, 148)).toBeUndefined()
  expect(wheel.move(-80, 150)).toBe('prev')
})

test('пауза сбрасывает и неполный порог', () => {
  const wheel = new GalleryWheel()
  expect(wheel.move(159, 0)).toBeUndefined()
  expect(wheel.move(1, 50)).toBeUndefined()
  expect(wheel.move(159, 51)).toBe('next')
})

test('инерционные события на краю списка учитываются до конца жеста', () => {
  const wheel = new GalleryWheel()
  expect(wheel.move(160, 0)).toBe('next')
  wheel.pass(5, 20)
  wheel.pass(5, 40)
  expect(wheel.move(-160, 60)).toBeUndefined()
  expect(wheel.move(-160, 110)).toBe('prev')
})

test('нативная прокрутка подписи сбрасывает накопление и продлевает блокировку', () => {
  const wheel = new GalleryWheel()
  expect(wheel.move(80, 0)).toBeUndefined()
  wheel.pass(0, 10)
  expect(wheel.move(80, 20)).toBeUndefined()
  expect(wheel.move(80, 30)).toBe('next')
  wheel.pass(0, 75)
  expect(wheel.move(-160, 100)).toBeUndefined()
})

test('тап допускает 8 пикселей, возврат после большего движения не даёт тап', () => {
  const swipe = new GallerySwipe()
  swipe.start(1, 100, 100)
  expect(swipe.end(1, 108, 100)).toBe('tap')
  swipe.start(1, 100, 100)
  swipe.move(1, 107, 107)
  expect(swipe.end(1, 100, 100)).toBeUndefined()
  swipe.start(1, 100, 100)
  expect(swipe.end(1, 109, 100)).toBeUndefined()
})

test('свайп требует 40 пикселей и преобладания горизонтального движения', () => {
  const swipe = new GallerySwipe()
  swipe.start(1, 50, 0)
  expect(swipe.end(1, 11, 0)).toBeUndefined()
  swipe.start(1, 50, 0)
  expect(swipe.end(1, 10, 40)).toBeUndefined()
  swipe.start(1, 50, 0)
  expect(swipe.end(1, 10, 39)).toBe('next')
  swipe.start(1, 50, 0)
  expect(swipe.end(1, 90, -2)).toBe('prev')
  expect(swipe.end(1, 90, -2)).toBeUndefined()
})

test('второй палец и отмена завершают жест только для нужного указателя', () => {
  const swipe = new GallerySwipe()
  swipe.start(1, 0, 0)
  swipe.otherPointerDown(2)
  expect(swipe.end(1, -50, 0)).toBeUndefined()
  swipe.start(3, 0, 0)
  swipe.cancel(3)
  expect(swipe.end(3, -50, 0)).toBeUndefined()
  swipe.start(4, 0, 0)
  swipe.otherPointerDown(4)
  swipe.cancel(5)
  swipe.move(5, 100, 0)
  expect(swipe.end(5, 0, 0)).toBeUndefined()
  expect(swipe.end(4, 0, 0)).toBe('tap')
})
