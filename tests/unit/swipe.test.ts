import { expect, test } from 'vitest'
import { SwipeGesture } from '../../src/swipe.js'

test('тап допускает 8 пикселей, возврат после большего движения не даёт тап', () => {
  const swipe = new SwipeGesture()
  swipe.start(1, 100, 100)
  expect(swipe.end(1, 108, 100)).toBe('tap')
  swipe.start(1, 100, 100)
  swipe.move(1, 107, 107)
  expect(swipe.end(1, 100, 100)).toBeUndefined()
  swipe.start(1, 100, 100)
  expect(swipe.end(1, 109, 100)).toBeUndefined()
})

test('свайп требует 40 пикселей и преобладания горизонтального движения', () => {
  const swipe = new SwipeGesture()
  swipe.start(1, 50, 0)
  expect(swipe.end(1, 11, 0)).toBeUndefined()
  swipe.start(1, 50, 0)
  expect(swipe.end(1, 10, 40)).toBeUndefined()
  swipe.start(1, 50, 0)
  expect(swipe.end(1, 10, 39)).toBe('left')
  swipe.start(1, 50, 0)
  expect(swipe.end(1, 90, -2)).toBe('right')
  expect(swipe.end(1, 90, -2)).toBeUndefined()
})

test('пороги тапа и свайпа можно задать для экземпляра', () => {
  const swipe = new SwipeGesture({ tapSlopPx: 3, swipeThresholdPx: 12 })
  swipe.start(1, 0, 0)
  expect(swipe.end(1, 3, 0)).toBe('tap')
  swipe.start(1, 0, 0)
  expect(swipe.end(1, 4, 0)).toBeUndefined()
  swipe.start(1, 0, 0)
  expect(swipe.end(1, 12, 0)).toBe('right')
})

test('второй палец и отмена завершают жест только для нужного указателя', () => {
  const swipe = new SwipeGesture()
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
