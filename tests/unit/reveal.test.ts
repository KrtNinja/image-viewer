import { expect, test } from 'vitest'
import { mutationsAffectContainer, scrollLeftToReveal } from '../../src/reveal.js'

// Видимая часть ленты — от 100 до 180.
test.each([
  { position: 'частично слева', left: 85, width: 30, expected: 85 },
  { position: 'частично справа', left: 165, width: 30, expected: 115 },
  { position: 'целиком видна', left: 120, width: 30, expected: 100 },
  { position: 'ровно на левой границе', left: 100, width: 30, expected: 100 },
  { position: 'ровно на правой границе', left: 150, width: 30, expected: 100 },
  { position: 'шире ленты', left: 120, width: 110, expected: 120 },
])('прокрутка, когда миниатюра $position', ({ left, width, expected }) => {
  expect(scrollLeftToReveal(left, width, 100, 80)).toBe(expected)
})

const root = { parentElement: null }
const strip = { parentElement: root }
const child = { parentElement: strip }
const nested = { parentElement: child }

test.each([
  { place: 'корень', target: root, type: 'childList', expected: true },
  { place: 'лента', target: strip, type: 'childList', expected: true },
  { place: 'прямой потомок', target: child, type: 'attributes', expected: true },
  { place: 'вложенный элемент', target: nested, type: 'attributes', expected: false },
  { place: 'прямой потомок', target: child, type: 'childList', expected: false },
] as const)('изменение $type, цель — $place', ({ target, type, expected }) => {
  expect(mutationsAffectContainer([{ target, type }], root, strip)).toBe(expected)
})

test('пустой список изменений не затрагивает ленту', () => {
  expect(mutationsAffectContainer([], root, strip)).toBe(false)
})

test('изменение ленты учитывается и после посторонней записи', () => {
  expect(mutationsAffectContainer([
    { target: nested, type: 'attributes' },
    { target: strip, type: 'childList' },
  ], root, strip)).toBe(true)
})
