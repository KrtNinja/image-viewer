import assert from 'node:assert/strict'
import { test } from 'node:test'
import { annotation, duplicates, outcomes, relativeImports, testedFiles, verdict } from '../quality.mjs'

test('относительные импорты: статические, только типы и динамические; пакеты не считаются', () => {
  const source = [
    "import { expect, test } from 'vitest'",
    "import { SwipeGesture } from '../../src/swipe.js'",
    "import type { ImageBase } from '../../src/ImageBase.js'",
    "const lazy = await import('./helpers.js')",
  ].join('\n')
  assert.deepEqual(relativeImports(source), ['../../src/swipe.js', '../../src/ImageBase.js', './helpers.js'])
})

test('в мутации попадают файлы продукта, которые модульный тест импортирует напрямую', () => {
  const product = ['src/Gallery.service.ts', 'src/Gallery.viewer.tsx', 'src/index.ts', 'src/swipe.ts', 'src/wheel.ts']
  const tests = [
    { path: 'tests/unit/swipe.test.ts', source: "import { SwipeGesture } from '../../src/swipe.js'" },
    { path: 'tests/unit/view.test.ts', source: "import { GalleryViewer } from '../../src/Gallery.viewer'" },
    { path: 'tests/unit/nested/service.test.ts', source: "import { GalleryService } from '../../../src/Gallery.service.js'" },
    { path: 'tests/unit/helpers.test.ts', source: "import { photo } from './photos.js'" },
  ]
  assert.deepEqual(testedFiles(tests, product), ['src/Gallery.service.ts', 'src/Gallery.viewer.tsx', 'src/swipe.ts'])
})

test('без модульных тестов мутировать нечего', () => {
  assert.deepEqual(testedFiles([], ['src/swipe.ts']), [])
})

test('кандидаты в повторы читаются из отчёта dryer', () => {
  const output = [
    'DUPLICATE score=1.00',
    '  src/swipe.ts:6-9',
    '  src/wheel.ts:26-29',
    'DUPLICATE score=0.84',
    '  src/Gallery.dom.ts:21-24',
    '  src/Gallery.dom.ts:26-30',
    '',
  ].join('\n')
  assert.deepEqual(duplicates(output), [
    { score: '1.00', left: 'src/swipe.ts:6-9', right: 'src/wheel.ts:26-29' },
    { score: '0.84', left: 'src/Gallery.dom.ts:21-24', right: 'src/Gallery.dom.ts:26-30' },
  ])
  assert.deepEqual(duplicates(''), [])
})

test('повтор отмечается в PR на первом месте пары', () => {
  assert.equal(
    annotation({ score: '1.00', left: 'src/swipe.ts:6-9', right: 'src/wheel.ts:26-29' }),
    '::warning file=src/swipe.ts,line=6,endLine=9,title=Повтор (dryer)::Совпадает по структуре с src/wheel.ts:26-29, score 1.00',
  )
})

test('итоги мутаций считаются по строкам KILLED и SURVIVED в начале строки', () => {
  const output = [
    'KILLED    src/swipe.ts:17 ?. -> .',
    'SURVIVED  src/swipe.ts:27 0 -> 1',
    'KILLED    src/swipe.ts:31 === -> !==',
    'Function  Namespace  Killed  Survived',
    '  KILLED в середине строки не считается',
  ].join('\n')
  assert.deepEqual(outcomes(output), { killed: 2, survived: 1 })
  assert.deepEqual(outcomes('No functions to mutate.\n'), { killed: 0, survived: 0 })
})

test('итог по коду завершения mutator', () => {
  assert.equal(verdict(0), 'все убиты')
  assert.equal(verdict(2), 'исходные тесты упали')
  assert.equal(verdict(3), 'есть выжившие')
  assert.equal(verdict(1), 'код 1')
})
