import { expect, test } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { renderToString } from 'react-dom/server'
import { build } from 'vite'
import { gallery } from './fixtures/hydration.js'

test('сервер отдаёт выбранный снимок и сохраняет явно пустой alt', async ({ page }) => {
  const photo = page.locator('.gallery-viewer__photo')
  await page.setContent(renderToString(gallery('c')))
  await expect(photo).toHaveAttribute('alt', '')
  await page.setContent(renderToString(gallery('unknown')))
  await expect(photo).toHaveAttribute('src', '/a.webp')
  await expect(photo).toHaveAttribute('alt', 'Фото 1 из 3')
  expect(renderToString(gallery('b', []))).toBe('')
})

test('StrictMode подключает управление к уже показанному сервером кадру', async ({ page }, testInfo) => {
  await page.setContent(`<div id="root">${renderToString(gallery('b'))}</div>`)
  const photo = page.locator('.gallery-viewer__photo')
  await expect(photo).toHaveAttribute('src', '/b.webp')
  await expect(photo).toHaveAccessibleName('Лодка у причала')
  await expect(page.getByRole('button', { name: 'Фото 2' })).toHaveAttribute('aria-pressed', 'true')
  const serverImage = await photo.elementHandle()
  const errors: Error[] = []
  page.on('pageerror', error => errors.push(error))

  await build({
    configFile: false,
    logLevel: 'silent',
    define: { 'process.env.NODE_ENV': '"development"' },
    build: {
      outDir: testInfo.outputPath('client'),
      lib: {
        entry: fileURLToPath(new URL('./fixtures/hydration.tsx', import.meta.url)),
        name: 'fixture',
        formats: ['iife'],
        fileName: () => 'gallery.js',
      },
    },
  })
  await page.addScriptTag({ path: testInfo.outputPath('client/gallery.js') })
  await page.evaluate('fixture.hydrate()')
  await page.getByRole('button', { name: 'Фото 1' }).click()
  await expect(photo).toHaveAttribute('src', '/a.webp')
  await page.locator('.gallery-viewer__frame').press('ArrowRight')
  await expect(photo).toHaveAttribute('src', '/b.webp')
  expect(await photo.evaluate((node, original) => node === original, serverImage)).toBe(true)
  expect(errors).toEqual([])
})
