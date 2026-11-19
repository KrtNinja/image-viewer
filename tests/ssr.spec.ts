import { expect, test } from '@playwright/test'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { GalleryViewer, ImageBase } from '../src/index.js'

test('сервер отдаёт выбранный снимок и сохраняет явно пустой alt', async ({ page }) => {
  const images = [
    Object.assign(new ImageBase(), { id: 'a', src: '/a.webp' }),
    Object.assign(new ImageBase(), { id: 'b', src: '/b.webp', alt: 'Лодка у причала' }),
    Object.assign(new ImageBase(), { id: 'c', src: '/c.webp', alt: '' }),
  ]
  const render = (startId: string) => renderToString(createElement(GalleryViewer, { images, startId }))
  await page.setContent(render('b'))
  const photo = page.locator('.gallery-viewer__photo')
  await expect(photo).toHaveAttribute('src', '/b.webp')
  await expect(photo).toHaveAccessibleName('Лодка у причала')
  await expect(page.getByRole('button', { name: 'Фото 2' })).toHaveAttribute('aria-pressed', 'true')
  await page.setContent(render('c'))
  await expect(photo).toHaveAttribute('alt', '')
  await page.setContent(render('unknown'))
  await expect(photo).toHaveAttribute('src', '/a.webp')
  await expect(photo).toHaveAttribute('alt', 'Фото 1 из 3')
  expect(renderToString(createElement(GalleryViewer, { images: [] }))).toBe('')
})
