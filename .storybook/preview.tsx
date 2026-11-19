import { StrictMode } from 'react'
import type { Preview } from '@storybook/react-vite'
import '../src/gallery.css'
import '../stories/examples.css'

export default {
  decorators: [Story => <StrictMode><Story /></StrictMode>],
  parameters: { layout: 'fullscreen' },
} satisfies Preview
