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

При двух и более фотографиях поверх области снимка появляются кнопки «Предыдущее фото» и «Следующее фото» для мыши и касаний. На первом кадре недоступна кнопка «Предыдущее фото», на последнем — «Следующее фото». Пропс `arrows` по умолчанию равен `true`. Передай `arrows={false}`, чтобы убрать обе кнопки.

Поле `alt` задаёт текстовое описание фотографии. Без него галерея указывает номер кадра, например «Фото 2 из 8». Явное `alt: ''` оставляет альтернативный текст пустым.

На устройствах с наведением описание появляется, когда указатель находится над снимком. На сенсорных экранах касание открывает описание, повторное касание скрывает его.

Нажми Tab, чтобы поставить фокус на снимок, затем используй ← и → для перелистывания. На миниатюрах стрелки перемещают выбор и фокус вместе. Внутри подписи клавиши сохраняют своё обычное действие.

## Оформление

Задавай CSS-переменные на `.gallery-viewer` или на её родительском элементе.

| Переменная | Что меняет | По умолчанию |
| --- | --- | --- |
| `--gallery-accent` | Цвет рамки выбранной миниатюры | `#3672bc` |
| `--gallery-focus` | Цвет контура клавиатурного фокуса | `#70adff` |
| `--gallery-caption` | Фон описания | `rgb(12 15 19 / .88)` |
| `--gallery-caption-color` | Цвет текста описания | `white` |
| `--gallery-arrow` | Фон кнопок перелистывания | `rgb(12 15 19 / .65)` |
| `--gallery-arrow-color` | Цвет шевронов на кнопках перелистывания | `white` |
| `--gallery-gap` | Расстояние от области снимка до ленты и промежуток между миниатюрами | `.5rem` |

Классы галереи входят в публичный интерфейс и сохраняются между версиями.

| Класс | Элемент и его состояние |
| --- | --- |
| `gallery-viewer` | Корневой элемент галереи |
| `gallery-viewer__stage` | Область, в которую вписывается снимок |
| `gallery-viewer__frame` | Кадр, объединяющий снимок и описание |
| `gallery-viewer__photo` | Основное изображение |
| `gallery-viewer__caption` | Описание. На сенсорном экране `data-open` показывает, что описание открыто касанием |
| `gallery-viewer__arrow` | Кнопка перелистывания. Модификаторы `gallery-viewer__arrow--prev` и `gallery-viewer__arrow--next` задают направление, состояние `:disabled` отмечает недоступную кнопку |
| `gallery-viewer__strip` | Лента миниатюр |
| `gallery-viewer__thumb` | Кнопка миниатюры. У выбранной кнопки `aria-pressed="true"` |
| `gallery-viewer__thumb-image` | Изображение внутри кнопки миниатюры |

Подключай свои стили после `image-viewer/gallery.css`. Например, так можно скруглить углы всех миниатюр и задать цвет рамки выбранной.

```css
.gallery-viewer__thumb {
  border-radius: 12px;
}

.gallery-viewer__thumb[aria-pressed="true"] {
  border-color: #1e5aa0;
}
```

У `.gallery-viewer__stage` сохраняй `container-type: size`, чтобы снимок вписывался в доступную область, и `position: relative`, чтобы кнопки оставались у её краёв. У `.gallery-viewer__frame` сохраняй `position: relative` для привязки описания к снимку и `touch-action: pan-y pinch-zoom` для горизонтального перелистывания, вертикальной прокрутки и масштабирования.

Если приложение использует каскадные слои, например в Tailwind, подключи стили галереи в слое компонентов.

```css
@import 'image-viewer/gallery.css' layer(components);
```

## Storybook

Для разработки нужен Node.js 22.12+ или 24. Из корня репозитория выполни:

```sh
npm ci
npm run storybook
```

Открой http://localhost:6006. В Storybook есть обычный и узкий просмотр, две независимые галереи, изменение входных данных и нативный диалог.

## Сборка и проверки

`npm run test:unit` проверяет распознавание колеса, свайпов и тапов, а также состояние галереи в Node.js без браузера и Storybook. `npm run test:e2e` запускает браузерные тесты через Storybook. Обе группы последовательно запускает `npm test`.

```sh
npm run check
npm run build
npm run build-storybook
npx playwright install --with-deps chromium firefox webkit
npm test
```

Размер снимка и подписи задаёт CSS с единицами контейнера. Лента прокручивается внутри своей области, в том числе в Firefox и Safari, где [параметр container для scrollIntoView](https://caniuse.com/mdn-api_element_scrollintoview_options_parameter_container_option) недоступен.
