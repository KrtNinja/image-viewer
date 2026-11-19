import { expect, test } from 'vitest'
import { canScrollInDirection, isVerticalWheel, WheelPager, wheelDeltaInPixels } from '../../src/wheel.js'

test('вертикальное колесо требует преобладания по Y и отпущенных Ctrl и Shift', () => {
  const event = { ctrlKey: false, shiftKey: false, deltaX: 0, deltaY: -10 }
  expect(isVerticalWheel(event)).toBe(true)
  expect(isVerticalWheel({ ...event, ctrlKey: true })).toBe(false)
  expect(isVerticalWheel({ ...event, shiftKey: true })).toBe(false)
  expect(isVerticalWheel({ ...event, deltaY: 0 })).toBe(false)
  expect(isVerticalWheel({ ...event, deltaX: 10 })).toBe(false)
  expect(isVerticalWheel({ ...event, deltaX: -11 })).toBe(false)
})

test('пиксели, строки и страницы сохраняют направление и величину смещения', () => {
  const units = { line: 18, page: 720 }
  expect(wheelDeltaInPixels({ deltaMode: 0, deltaY: 2.5 }, units)).toBe(2.5)
  expect(wheelDeltaInPixels({ deltaMode: 1, deltaY: -2.5 }, units)).toBe(-45)
  expect(wheelDeltaInPixels({ deltaMode: 2, deltaY: 0.5 }, units)).toBe(360)
})

test('направление прокрутки учитывает оба края и дробный scrollTop', () => {
  const top = { scrollTop: 0, scrollHeight: 150, clientHeight: 100 }
  expect(canScrollInDirection(top, -1)).toBe(false)
  expect(canScrollInDirection(top, 1)).toBe(true)
  const bottom = { ...top, scrollTop: 50 }
  expect(canScrollInDirection(bottom, 1)).toBe(false)
  expect(canScrollInDirection(bottom, -1)).toBe(true)
  expect(canScrollInDirection({ ...top, scrollTop: 0.25 }, -1)).toBe(true)
  expect(canScrollInDirection({ ...top, scrollTop: 48.75 }, 1)).toBe(true)
  expect(canScrollInDirection({ ...top, scrollTop: 49.25 }, 1)).toBe(false)
  expect(canScrollInDirection(bottom, 0)).toBe(false)
})

test('порог по умолчанию позволяет листать отдельными щелчками колеса', () => {
  function countMoves(events: number, deltaPx: number, intervalMs: number) {
    const wheel = new WheelPager()
    let moves = 0
    for (let i = 0; i < events; i++) {
      if (wheel.move(deltaPx, i * intervalMs) === 'next') moves++
    }
    return moves
  }

  expect(countMoves(6, 100, 120)).toBe(6)
  expect(countMoves(6, 72, 120)).toBe(6)
  expect(countMoves(6, 100, 30)).toBe(1)
  expect(countMoves(3, 10, 16)).toBe(0)
})

test('колесо накапливает 160 пикселей в одном направлении', () => {
  const wheel = new WheelPager({ thresholdPx: 160 })
  expect(wheel.move(80, 0)).toBeUndefined()
  expect(wheel.move(-80, 10)).toBeUndefined()
  expect(wheel.move(-79, 20)).toBeUndefined()
  expect(wheel.move(-1, 30)).toBe('prev')
})

test('49 мс продлевают блокировку, через 50 мс накопление начинается с нуля', () => {
  const wheel = new WheelPager({ thresholdPx: 160 })
  expect(wheel.move(80, 0)).toBeUndefined()
  expect(wheel.move(80, 49)).toBe('next')
  expect(wheel.move(-160, 98)).toBeUndefined()
  expect(wheel.move(-80, 148)).toBeUndefined()
  expect(wheel.move(-80, 150)).toBe('prev')
})

test('порог колеса и паузу можно задать для экземпляра', () => {
  const wheel = new WheelPager({ thresholdPx: 30, pauseMs: 10 })
  expect(wheel.move(29, 0)).toBeUndefined()
  expect(wheel.move(1, 5)).toBe('next')
  expect(wheel.move(-30, 14)).toBeUndefined()
  expect(wheel.move(-30, 24)).toBe('prev')
})

test('пауза сбрасывает и неполный порог', () => {
  const wheel = new WheelPager({ thresholdPx: 160 })
  expect(wheel.move(159, 0)).toBeUndefined()
  expect(wheel.move(1, 50)).toBeUndefined()
  expect(wheel.move(159, 51)).toBe('next')
})

test('инерционные события на краю списка учитываются до конца жеста', () => {
  const wheel = new WheelPager({ thresholdPx: 160 })
  expect(wheel.move(160, 0)).toBe('next')
  wheel.pass(5, 20)
  wheel.pass(5, 40)
  expect(wheel.move(-160, 60)).toBeUndefined()
  expect(wheel.move(-160, 110)).toBe('prev')
})

test('нативная прокрутка подписи сбрасывает накопление и продлевает блокировку', () => {
  const wheel = new WheelPager({ thresholdPx: 160 })
  expect(wheel.move(80, 0)).toBeUndefined()
  wheel.pass(0, 10)
  expect(wheel.move(80, 20)).toBeUndefined()
  expect(wheel.move(80, 30)).toBe('next')
  wheel.pass(0, 75)
  expect(wheel.move(-160, 100)).toBeUndefined()
})
