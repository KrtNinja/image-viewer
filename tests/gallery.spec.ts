import { expect, test, type Locator, type Page } from '@playwright/test'

const photo = (page: Page) => page.locator('.gallery-viewer__photo')
const strip = (page: Page) => page.getByRole('group', { name: 'Миниатюры' })
const thumb = (page: Page, number: number) =>
  strip(page).getByRole('button', { name: `Фото ${number}`, exact: true })

async function open(page: Page, story: string) {
  await page.goto(`/iframe.html?id=galleryviewer--${story}&viewMode=story`)
  await expect(page.locator('#storybook-root')).not.toBeEmpty()
}

async function visibleItem(page: Page) {
  await expect.poll(() => strip(page).evaluate(row => {
    const button = row.querySelector('[aria-pressed=true]')!
    const item = button.getBoundingClientRect()
    const bounds = row.getBoundingClientRect()
    return item.left >= bounds.left - 1 && item.right <= bounds.right + 1
  })).toBe(true)
}

test('выбор, обновление миниатюры, новый порядок и явный startId', async ({ page }) => {
  await open(page, 'updates')
  await expect(photo(page)).toHaveAttribute('alt', 'Астронавт в открытом космосе над Землёй')
  await thumb(page, 3).click()
  const preview = thumb(page, 3).locator('img')
  const before = await preview.getAttribute('src')
  await page.getByText('Копия массива').click()
  await expect(thumb(page, 3)).toHaveAttribute('aria-pressed', 'true')
  await page.getByText('Обновить миниатюру C').click()
  await expect(preview).not.toHaveAttribute('src', before!)
  await expect(preview).toHaveAttribute('src', (await photo(page).getAttribute('src'))!)
  await expect(thumb(page, 3)).toHaveAttribute('aria-pressed', 'true')
  await page.getByText('Обратить порядок').click()
  await expect(thumb(page, 1)).toHaveAttribute('aria-pressed', 'true')
  await page.getByText('C, D', { exact: true }).click()
  await page.getByText('Задать startId D').click()
  await expect(thumb(page, 2)).toHaveAttribute('aria-pressed', 'true')
})

test('пустой список, первое заполнение, повторное заполнение, одно фото', async ({ page }) => {
  await open(page, 'initially-empty')
  await expect(page.locator('.gallery-viewer')).toBeAttached()
  await expect(page.locator('.gallery-viewer')).toBeHidden()
  await page.getByText('A, B', { exact: true }).click()
  await expect(thumb(page, 2)).toHaveAttribute('aria-pressed', 'true')
  await page.getByText('Очистить').click()
  await expect(page.locator('.gallery-viewer')).toBeAttached()
  await expect(page.locator('.gallery-viewer')).toBeHidden()
  await page.getByText('C, D', { exact: true }).click()
  await expect(thumb(page, 1)).toHaveAttribute('aria-pressed', 'true')
  await thumb(page, 2).click()
  await expect(photo(page)).toHaveAttribute('alt', 'Большое красное пятно в облаках Юпитера')
  await page.getByText('Только D').click()
  await expect(photo(page)).toHaveAttribute('alt', 'Большое красное пятно в облаках Юпитера')
  await expect(strip(page)).toHaveCount(0)
  await expect(page.locator('.gallery-viewer__arrow')).toHaveCount(0)
  await expect(page.locator('.gallery-viewer__caption')).toHaveCount(0)
})

test('кнопки перелистывают кадры и становятся недоступными на краях', async ({ page }) => {
  await open(page, 'default')
  const prev = page.getByRole('button', { name: 'Предыдущее фото' })
  const next = page.getByRole('button', { name: 'Следующее фото' })
  await expect(thumb(page, 2)).toHaveAttribute('aria-pressed', 'true')
  await next.click()
  await expect(thumb(page, 3)).toHaveAttribute('aria-pressed', 'true')
  await prev.click()
  await expect(thumb(page, 2)).toHaveAttribute('aria-pressed', 'true')
  await prev.click()
  await expect(thumb(page, 1)).toHaveAttribute('aria-pressed', 'true')
  await expect(prev).toBeDisabled()
  await expect(next).toBeEnabled()
  await thumb(page, 8).click()
  await expect(prev).toBeEnabled()
  await expect(next).toBeDisabled()
})

test('при arrows={false} галерея показывает ленту без кнопок перелистывания', async ({ page }) => {
  await open(page, 'without-arrows')
  await expect(thumb(page, 2)).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.gallery-viewer__arrow')).toHaveCount(0)
})

test('колесо над кнопкой перелистывания выбирает соседний кадр', async ({ page }) => {
  await open(page, 'narrow')
  const prev = page.getByRole('button', { name: 'Предыдущее фото' })
  await prev.hover()
  await page.mouse.wheel(0, 160)
  await expect(thumb(page, 3)).toHaveAttribute('aria-pressed', 'true')
  await thumb(page, 1).click()
  await expect(prev).toBeDisabled()
  await prev.hover()
  await page.mouse.wheel(0, 160)
  await expect(thumb(page, 2)).toHaveAttribute('aria-pressed', 'true')
})

test('кнопка перелистывания во вложенной галерее меняет только её кадр', async ({ page }) => {
  await open(page, 'independent')
  await page.locator('.example-frame').evaluateAll(([outer, inner]) => {
    outer.querySelector('.gallery-viewer__caption')!.append(inner)
  })
  const outer = page.locator('.example-pair > .example-frame > .gallery-viewer')
  const inner = outer.locator('.gallery-viewer')
  const next = inner.getByRole('button', { name: 'Следующее фото' })
  await next.focus()
  await next.click()
  await expect(inner.locator('[aria-pressed=true]')).toHaveAccessibleName('Фото 2')
  await expect(outer.locator(':scope > .gallery-viewer__strip [aria-pressed=true]')).toHaveAccessibleName('Фото 1')
})

// Model continuous or separate wheel gestures independently of browser automation latency.
async function wheel(target: Locator, deltaY: number, time: number, options: Pick<WheelEventInit, 'ctrlKey' | 'deltaX' | 'deltaMode'> = {}) {
  return target.evaluate((node, args) => {
    const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: args.deltaY, ...args.options })
    Object.defineProperty(event, 'timeStamp', { value: args.time })
    node.dispatchEvent(event)
    return event.defaultPrevented
  }, { deltaY, time, options })
}

test('колесо делит накопление между кадром и лентой и учитывает единицы события', async ({ page }) => {
  await open(page, 'updates')
  await expect(thumb(page, 2)).toHaveAttribute('aria-pressed', 'true')
  expect(await wheel(photo(page), -40, 100)).toBe(true)
  expect(await wheel(strip(page), -40, 110)).toBe(true)
  await expect(thumb(page, 1)).toHaveAttribute('aria-pressed', 'true')
  expect(await wheel(photo(page), -10, 120)).toBe(false)
  expect(await wheel(photo(page), 200, 200, { ctrlKey: true })).toBe(false)
  expect(await wheel(strip(page), 1, 210, { deltaX: 80 })).toBe(false)

  const line = await photo(page).evaluate(node => parseFloat(getComputedStyle(node).lineHeight))
  await wheel(strip(page), Math.ceil(160 / line), 600, { deltaMode: 1 })
  await expect(thumb(page, 2)).toHaveAttribute('aria-pressed', 'true')
  await wheel(photo(page), 1, 700, { deltaMode: 2 })
  await expect(thumb(page, 3)).toHaveAttribute('aria-pressed', 'true')
})

test('стили приложения меняют цвет описания и оформление миниатюр', async ({ page }) => {
  await open(page, 'default')
  await page.addStyleTag({ content: `
    button { border: none; }
    .gallery-viewer { --gallery-caption-color: rgb(250, 220, 100); }
    .gallery-viewer__thumb { border-radius: 12px; }
    .gallery-viewer__thumb[aria-pressed="true"] { border-color: rgb(30, 90, 160); }
    .gallery-viewer__thumb-image { object-fit: contain; }
  ` })

  await expect(page.locator('.gallery-viewer__caption')).toHaveCSS('color', 'rgb(250, 220, 100)')
  const button = thumb(page, 1)
  await expect(button).toHaveCSS('border-top-left-radius', '12px')
  await expect(button.locator('img')).toHaveCSS('object-fit', 'contain')
  await button.click()
  await expect(button).toHaveCSS('border-top-style', 'solid')
  await expect(button).toHaveCSS('border-top-color', 'rgb(30, 90, 160)')
})

test('портрет и панорама, свободное поле, описание и Tab', async ({ page }) => {
  await open(page, 'default')
  const caption = page.locator('.gallery-viewer__caption')
  const stage = page.locator('.gallery-viewer__stage')
  for (const index of [2, 3]) {
    await thumb(page, index).click()
    await expect.poll(() => photo(page).evaluate(node => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
    const pic = (await photo(page).boundingBox())!
    const area = (await stage.boundingBox())!
    const note = (await caption.boundingBox())!
    expect(Math.abs(pic.y + pic.height - note.y - note.height)).toBeLessThan(1)
    expect(Math.abs(pic.width - note.width)).toBeLessThan(1)
    const side = index === 2
    if (side) expect(pic.x - area.x).toBeGreaterThan(2)
    else expect(pic.y - area.y).toBeGreaterThan(2)
    await page.mouse.move(side ? area.x + 1 : area.x + area.width / 2, side ? area.y + area.height / 2 : area.y + 1)
    await expect(caption).toHaveCSS('opacity', '0')
    await photo(page).hover({ position: { x: 5, y: 5 } })
    await expect(caption).toHaveCSS('opacity', '1')
    await caption.getByRole('button').hover()
    await expect(caption).toHaveCSS('opacity', '1')
  }
  await thumb(page, 1).focus()
  await page.mouse.move(1, 1)
  await page.keyboard.press('Shift+Tab')
  await expect(caption.getByRole('button')).toBeFocused()
  await expect(caption).toHaveCSS('opacity', '1')
  await expect(caption.getByRole('button')).toHaveCSS('outline-style', 'solid')
  await page.keyboard.press('Enter')
  await expect(page.locator('#collection')).toBeVisible()
})

test('360 px, ручная прокрутка, выбор и изменение ширины при scale(.5)', async ({ page }) => {
  await open(page, 'narrow')
  const row = strip(page)
  await expect(row).toHaveCSS('width', '360px')
  await expect(thumb(page, 2)).toHaveAttribute('aria-pressed', 'true')
  await row.evaluate(node => { node.scrollLeft = 33 })
  await wheel(photo(page), 160, 100)
  await visibleItem(page)
  expect(await row.evaluate(node => node.scrollLeft)).toBe(33)
  await page.locator('.example-frame').evaluate(node => { node.style.transform = 'scale(.5)' })
  for (let index = 4; index <= 8; index++) {
    await wheel(photo(page), 160, index * 100)
    await expect(thumb(page, index)).toHaveAttribute('aria-pressed', 'true')
    await visibleItem(page)
  }
  await expect(thumb(page, 8).locator('img')).toHaveAttribute('src', (await photo(page).getAttribute('src'))!)
  await page.locator('.example-frame').evaluate(node => { node.style.width = '220px' })
  await visibleItem(page)
  await row.evaluate(node => { node.scrollLeft = 0 })
  await expect(thumb(page, 8)).toHaveAttribute('aria-pressed', 'true')
  for (let index = 7; index >= 1; index--) {
    await wheel(photo(page), -160, (16 - index) * 100)
    await expect(thumb(page, index)).toHaveAttribute('aria-pressed', 'true')
    await visibleItem(page)
  }
  expect(await row.evaluate(node => node.scrollLeft)).toBe(0)
})

test('Tab показывает текстовую подпись, колесо прокручивает её до края', async ({ page }) => {
  await open(page, 'text-caption')
  const frame = page.locator('.gallery-viewer__frame')
  const caption = page.locator('.gallery-viewer__caption')
  await expect(thumb(page, 2)).toHaveAttribute('aria-pressed', 'true')
  await page.mouse.move(1, 1)
  await page.keyboard.press('Tab')
  await expect(frame).toBeFocused()
  await expect(caption).toHaveCSS('opacity', '1')
  await expect(frame).toHaveCSS('outline-style', 'solid')

  await caption.hover()
  await page.mouse.wheel(0, 180)
  await expect.poll(() => caption.evaluate(node => node.scrollTop)).toBeGreaterThan(0)
  await expect(thumb(page, 2)).toHaveAttribute('aria-pressed', 'true')
  await page.mouse.wheel(0, -180)
  await expect.poll(() => caption.evaluate(node => node.scrollTop)).toBe(0)
  await expect(thumb(page, 2)).toHaveAttribute('aria-pressed', 'true')

  expect(await wheel(caption, 160, 1000)).toBe(false)
  await caption.evaluate(node => { node.scrollTop = node.scrollHeight })
  expect(await wheel(caption, 40, 1020)).toBe(true)
  await expect(thumb(page, 2)).toHaveAttribute('aria-pressed', 'true')
  await wheel(caption, 40, 1040)
  await expect(thumb(page, 3)).toHaveAttribute('aria-pressed', 'true')
  await caption.evaluate(node => { node.scrollTop = 0 })
  expect(await wheel(caption, 5, 1060)).toBe(false)
  expect(await wheel(caption, 5, 1080)).toBe(false)
  await wheel(photo(page), -160, 1100)
  await expect(thumb(page, 3)).toHaveAttribute('aria-pressed', 'true')

  await caption.evaluate(node => node.replaceChildren())
  await expect(caption).toBeHidden()
})

test('диалог, положение страницы и диалога, Escape и кнопка закрытия', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 })
  await open(page, 'dialog')
  await page.evaluate(() => { document.body.style.height = '2500px' })
  const launch = page.getByRole('button', { name: 'Открыть галерею' })
  const dialog = page.getByRole('dialog')
  await launch.click()
  await visibleItem(page)
  await expect(thumb(page, 8)).toHaveAttribute('aria-pressed', 'true')
  await expect(dialog).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  expect(await dialog.evaluate(node => getComputedStyle(node, '::backdrop').backgroundColor)).toBe('rgba(0, 0, 0, 0.35)')
  await dialog.evaluate(node => { node.style.maxHeight = '250px'; node.scrollTop = 45; window.scrollTo(0, 180) })
  const offsets = () => dialog.evaluate(node => [scrollY, node.scrollTop])
  const before = await offsets()
  for (let index = 7; index >= 1; index--) await wheel(photo(page), -160, (8 - index) * 100)
  await visibleItem(page)
  expect(await offsets()).toEqual(before)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await launch.click()
  await dialog.getByRole('button', { name: 'Закрыть' }).click()
  await expect(dialog).toHaveCount(0)
})

test.describe('сенсорный ввод', () => {
  test.use({ hasTouch: true })

  test.beforeEach(async ({ page }) => {
    const hoverNone = await page.evaluate(() => matchMedia('(hover: none)').matches)
    expect(hoverNone).toBe(true)
  })

  test('касание кнопки перелистывает кадр и оставляет описание закрытым', async ({ page }) => {
    await open(page, 'narrow')
    const caption = page.locator('.gallery-viewer__caption')
    await expect(caption).toBeAttached()
    await page.getByRole('button', { name: 'Следующее фото' }).tap()
    await expect(thumb(page, 3)).toHaveAttribute('aria-pressed', 'true')
    await expect(caption).not.toHaveAttribute('data-open')
  })

  test('два тапа в одной точке, кнопка и независимость двух галерей', async ({ page }) => {
    await open(page, 'independent')
    const galleries = page.locator('.gallery-viewer')
    const first = galleries.nth(0)
    const second = galleries.nth(1)
    await first.getByRole('button', { name: 'Фото 2', exact: true }).tap()
    const image = first.locator('.gallery-viewer__photo')
    const caption = first.locator('.gallery-viewer__caption')
    await expect(image).toHaveAttribute('alt', 'Астронавт в открытом космосе над Землёй')
    await image.evaluate(node => (node as HTMLImageElement).decode())
    const bounds = (await image.boundingBox())!
    const tap = () => page.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + 15)
    await tap()
    await expect(caption).toHaveCSS('opacity', '1')
    await expect(second.locator('.gallery-viewer__caption')).toHaveCSS('opacity', '0')
    await expect(second.locator('[aria-pressed=true]')).toHaveAccessibleName('Фото 1')
    await tap()
    await expect(caption).toHaveCSS('opacity', '0')
    await tap()
    await expect(caption).toHaveCSS('opacity', '1')
    await caption.getByRole('button').tap()
    await expect(first.locator('[popover]')).toBeVisible()
    await expect(first.locator('[aria-pressed=true]')).toHaveAccessibleName('Фото 2')
  })

  test('свайпы, второй палец и отмена касания', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Точные траектории нескольких пальцев задаёт Chromium CDP')
    await open(page, 'default')
    const image = photo(page)
    const note = page.locator('.gallery-viewer__caption')
    const bounds = (await image.boundingBox())!
    const x = Math.round(bounds.x + bounds.width / 2), y = Math.round(bounds.y + bounds.height / 2)
    const cdp = await page.context().newCDPSession(page)
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel', points: { x: number; y: number; id: number }[]) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points })
    await page.touchscreen.tap(x, y)
    for (const [dx, index] of [[-75, 3], [75, 2]]) {
      await touch('touchStart', [{ x, y, id: 1 }])
      await touch('touchMove', [{ x: x + dx, y, id: 1 }])
      await touch('touchEnd', [])
      await expect(thumb(page, index)).toHaveAttribute('aria-pressed', 'true')
      await expect(note).toHaveCSS('opacity', '1')
    }
    await touch('touchStart', [{ x, y, id: 1 }])
    await touch('touchStart', [{ x, y, id: 1 }, { x: x + 70, y, id: 2 }])
    await touch('touchMove', [{ x: x - 70, y, id: 1 }, { x: x + 70, y, id: 2 }])
    await touch('touchEnd', [])
    await touch('touchStart', [{ x, y, id: 3 }])
    await touch('touchMove', [{ x: x - 60, y, id: 3 }])
    await touch('touchCancel', [])
    await expect(thumb(page, 2)).toHaveAttribute('aria-pressed', 'true')
    await expect(note).toHaveCSS('opacity', '1')
  })
})

test('нативное колесо сохраняет страницу внутри списка и передаёт прокрутку на краю', async ({ page }) => {
  await open(page, 'narrow')
  await page.evaluate(() => { document.body.style.minHeight = '2500px' })
  await photo(page).hover({ position: { x: 10, y: 10 } })
  await page.mouse.wheel(0, 40)
  await expect(thumb(page, 2)).toHaveAttribute('aria-pressed', 'true')
  await page.waitForTimeout(100)
  expect(await page.evaluate(() => scrollY)).toBe(0)
  await strip(page).hover()
  await page.mouse.wheel(120, 0)
  await expect.poll(() => strip(page).evaluate(row => row.scrollLeft)).toBeGreaterThan(0)
  await expect(thumb(page, 2)).toHaveAttribute('aria-pressed', 'true')
  await thumb(page, 8).click()
  await photo(page).hover({ position: { x: 10, y: 10 } })
  await page.mouse.wheel(0, 200)
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0)
  await expect(thumb(page, 8)).toHaveAttribute('aria-pressed', 'true')
})

test('стрелки на снимке без подписи и на миниатюрах', async ({ page }) => {
  await open(page, 'updates')
  const frame = page.locator('.gallery-viewer__frame')
  await page.getByRole('button', { name: 'Задать startId D' }).focus()
  await page.keyboard.press('Tab')
  await expect(frame).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(thumb(page, 3)).toHaveAttribute('aria-pressed', 'true')
  await expect(photo(page)).toHaveAccessibleName('Облака Сатурна и полоса его колец')
  await page.keyboard.press('ArrowRight')
  await expect(thumb(page, 3)).toHaveAttribute('aria-pressed', 'true')
  await expect(frame).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await expect(thumb(page, 2)).toHaveAttribute('aria-pressed', 'true')

  await thumb(page, 3).focus()
  await page.keyboard.press('ArrowLeft')
  await expect(thumb(page, 2)).toBeFocused()
  await expect(thumb(page, 2)).toHaveAccessibleDescription('Астронавт в открытом космосе над Землёй')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  await expect(thumb(page, 1)).toBeFocused()
  await expect(thumb(page, 1)).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('ArrowRight')
  await expect(thumb(page, 2)).toBeFocused()
  await expect(thumb(page, 2)).toHaveAttribute('aria-pressed', 'true')
})

test('стрелки действуют только в активной галерее и сохраняют управление в подписи', async ({ page }) => {
  await open(page, 'independent')
  const first = page.locator('.gallery-viewer').nth(0)
  const second = page.locator('.gallery-viewer').nth(1)
  await first.locator('.gallery-viewer__frame').focus()
  await page.keyboard.press('Shift+ArrowRight')
  await expect(first.locator('[aria-pressed=true]')).toHaveAccessibleName('Фото 1')
  await page.keyboard.press('ArrowRight')
  await expect(first.locator('[aria-pressed=true]')).toHaveAccessibleName('Фото 2')
  await expect(second.locator('[aria-pressed=true]')).toHaveAccessibleName('Фото 1')

  const caption = first.locator('.gallery-viewer__caption')
  await caption.getByRole('button').focus()
  await page.keyboard.press('ArrowLeft')
  await expect(first.locator('[aria-pressed=true]')).toHaveAccessibleName('Фото 2')
  await caption.evaluate(node => node.append(document.createElement('input')))
  const input = caption.getByRole('textbox')
  await input.fill('abc')
  await input.press('End')
  await input.press('ArrowLeft')
  expect(await input.evaluate(node => (node as HTMLInputElement).selectionStart)).toBe(2)
  await expect(first.locator('[aria-pressed=true]')).toHaveAccessibleName('Фото 2')
})

test('клик, стрелки и колесо во вложенной галерее сохраняют выбор внешней', async ({ page }) => {
  await open(page, 'independent')
  await page.locator('.gallery-viewer').evaluateAll(([outer, inner]) => {
    outer.querySelector('.gallery-viewer__caption')!.append(inner)
  })
  const outer = page.locator('.example-pair > :first-child > .gallery-viewer')
  const inner = outer.locator('.gallery-viewer')
  const selection = (gallery: Locator) => gallery.locator(':scope > .gallery-viewer__strip [aria-pressed=true]')
  const button = inner.getByRole('button', { name: 'Фото 2', exact: true })
  await button.press('Enter')
  await expect(selection(inner)).toHaveAccessibleName('Фото 2')
  await button.press('ArrowRight')
  await expect(selection(inner)).toHaveAccessibleName('Фото 3')
  expect(await wheel(inner.locator('.gallery-viewer__photo'), 160, 100)).toBe(true)
  await expect(selection(inner)).toHaveAccessibleName('Фото 4')
  await expect(selection(outer)).toHaveAccessibleName('Фото 1')
})
