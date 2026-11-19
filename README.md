# GalleryViewer

Встраиваемый компонент React для просмотра фотографий. Выбор кадра и описание по касанию принадлежат каждому экземпляру. Состояние хранит сервис на `kr-observable`, за изменениями в React следит `observer` из `kr-observable/react`.

```tsx
import { GalleryViewer, ImageBase } from 'image-viewer'
import 'image-viewer/gallery.css'

const images = [
  Object.assign(new ImageBase(), { id: 'a', src: '/a.jpg' }),
  Object.assign(new ImageBase(), { id: 'b', src: '/b.jpg', alt: 'Лодка у причала', preview: '/b-small.jpg' }),
]

export function Album() {
  return (
    <section style={{ height: 420 }}>
      <GalleryViewer images={images} startId="b">
        <a href="/album">Открыть альбом</a>
      </GalleryViewer>
    </section>
  )
}
```

Передавай фотографии с уникальными строковыми ID. Для пустого `preview` геттер возвращает `src`. При изменении полей фотографии передавай новый массив `images`, например `[...images]`. Если ID и их порядок прежние, выбранный кадр сохраняется. При изменении порядка или состава открывается первый кадр. Явное изменение `startId` выбирает указанный кадр, если он есть.

Поле `alt` задаёт текстовое описание фотографии. Без него галерея указывает номер кадра, например «Фото 2 из 8». Явное `alt: ''` оставляет альтернативный текст пустым.

Первый кадр с учётом `startId` доступен уже в серверном HTML. Нажми Tab, чтобы поставить фокус на снимок, затем используй ← и → для перелистывания. На миниатюрах стрелки перемещают выбор и фокус вместе. Внутри подписи клавиши сохраняют своё обычное действие.

## Storybook

Для разработки нужен Node.js 22.12+ или 24. Из корня репозитория выполни:

```sh
npm ci
npm run storybook
```

Открой http://localhost:6006. В Storybook есть обычный и узкий просмотр, две независимые галереи, изменение входных данных и нативный диалог.

## Сборка и проверки

Только распознавание колеса, свайпов и тапов можно проверить командой `npx playwright test -c tests/unit`. Эти тесты передают в классы числа и выполняются в Node.js без браузера и Storybook. Полный набор запускает `npm test`.

```sh
npm run check
npm run build
npm run build-storybook
npx playwright install --with-deps chromium firefox webkit
npm test
```

Размер снимка и подписи задаёт CSS с единицами контейнера. Лента прокручивается внутри своей области, в том числе в Firefox и Safari, где [параметр container для scrollIntoView](https://caniuse.com/mdn-api_element_scrollintoview_options_parameter_container_option) недоступен. Цвет рамки, клавиатурного фокуса, фон описания и отступы можно изменить через `--gallery-accent`, `--gallery-focus`, `--gallery-caption` и `--gallery-gap`.
