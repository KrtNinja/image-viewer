import { Component } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { GalleryViewer, ImageBase } from '../src'
import { photos } from './photos'

export default {
  title: 'GalleryViewer',
  component: GalleryViewer,
} satisfies Meta<typeof GalleryViewer>

type Story = StoryObj<typeof GalleryViewer>

function Caption({ id }: { id: string }) {
  return (
    <div className="example-caption">
      <span>Фотографии космических миссий</span>
      <button type="button" popoverTarget={id}>О коллекции</button>
      <div id={id} popover="auto" className="example-source">
        <p>Восемь снимков из архива NASA.</p>
        <a href="https://images.nasa.gov/" target="_blank" rel="noreferrer">Открыть архив NASA</a>
      </div>
    </div>
  )
}

function Example({ narrow = false }: { narrow?: boolean }) {
  return (
    <div className={narrow ? 'example-frame example-frame--narrow' : 'example-frame'}>
      <GalleryViewer images={photos} startId="b">
        <Caption id="collection" />
      </GalleryViewer>
    </div>
  )
}

export const Default: Story = { name: 'Галерея', render: () => <Example /> }
export const Narrow: Story = { name: 'Ширина 360 px', render: () => <Example narrow /> }
export const TextCaption: Story = {
  name: 'Текстовая подпись',
  args: {
    images: photos,
    startId: 'b',
    children: 'Землю на первом снимке сфотографировал экипаж «Аполлона-17» по пути к Луне. '
      + 'На втором виден астронавт над Землёй во время выхода в открытый космос. '
      + 'Третий снимок показывает кольца Сатурна, а четвёртый — Большое красное пятно Юпитера. '
      + 'Во второй половине коллекции собраны четыре разных вида: поверхность Луны, '
      + 'облака газа и пыли в туманности Ориона, Марс и синий диск Нептуна.',
  },
  render: args => (
    <div className="example-frame example-frame--narrow" style={{ maxHeight: 320 }}>
      <GalleryViewer {...args} />
    </div>
  ),
}

export const Independent: Story = {
  name: 'Две независимые галереи',
  render: () => (
    <div className="example-pair">
      <div className="example-frame">
        <GalleryViewer images={photos.slice(0, 4)}><Caption id="inner-planets" /></GalleryViewer>
      </div>
      <div className="example-frame">
        <GalleryViewer images={photos.slice(4)}><Caption id="outer-planets" /></GalleryViewer>
      </div>
    </div>
  ),
}

export const Dialog: Story = {
  name: 'В диалоге',
  render: () => (
    <>
      <button type="button" {...{ command: 'show-modal', commandfor: 'gallery-dialog' }}>Открыть галерею</button>
      <dialog className="example-dialog" id="gallery-dialog" aria-label="Просмотр фотографий">
        <form method="dialog"><button autoFocus>Закрыть</button></form>
        <div className="example-frame">
          <GalleryViewer images={photos} startId="h"><Caption id="dialog-source" /></GalleryViewer>
        </div>
      </dialog>
    </>
  ),
}

class UpdatingExample extends Component<{ initialImages?: ImageBase[] }> {
  state = { images: this.props.initialImages ?? photos.slice(0, 3), startId: 'b' }

  render() {
    const { images, startId } = this.state
    return (
      <>
        <div className="example-actions">
          <button onClick={() => this.setState({ images: images.slice() })}>Копия массива</button>
          <button onClick={() => this.setState({
            images: images.map(image => image.id === 'c'
              ? Object.assign(new ImageBase(), image, { preview: image.src })
              : image),
          })}>Обновить миниатюру C</button>
          <button onClick={() => this.setState({ images: [] })}>Очистить</button>
          <button onClick={() => this.setState({ images: photos.slice(0, 2) })}>A, B</button>
          <button onClick={() => this.setState({ images: photos.slice(2, 4) })}>C, D</button>
          <button onClick={() => this.setState({ images: [photos[3]] })}>Только D</button>
          <button onClick={() => this.setState({ images: images.slice().reverse() })}>Обратить порядок</button>
          <button onClick={() => this.setState({ startId: 'd' })}>Задать startId D</button>
        </div>
        <div className="example-frame">
          <GalleryViewer images={images} startId={startId} />
        </div>
      </>
    )
  }
}
export const InitiallyEmpty: Story = { name: 'Пустой список', render: () => <UpdatingExample initialImages={[]} /> }
export const Updates: Story = { name: 'Обновление фотографий', render: () => <UpdatingExample /> }
