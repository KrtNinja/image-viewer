const rootSelector = '.gallery-viewer'
const stripSelector = '.gallery-viewer__strip'
export const frameSelector = '.gallery-viewer__frame'
export const ownStripSelector = `:scope > ${stripSelector}`
export const thumbnailSelector = `${stripSelector} > button[data-id]`
export const prevArrowSelector = '.gallery-viewer__arrow--prev'
export const nextArrowSelector = '.gallery-viewer__arrow--next'
export const selectedThumbnailSelector = ':scope > button[aria-pressed="true"]'
export const interactiveSelector = 'button, a, input, select, textarea, label, summary, [contenteditable], [role="button"], [role="link"]'

export const captionSelector = '.gallery-viewer__caption'
export const nonEmptyCaptionSelector = `:scope > ${captionSelector}:not(:empty)`
const wheelAreaSelector = `${frameSelector}, ${stripSelector}, ${prevArrowSelector}, ${nextArrowSelector}`

// Captions can contain another gallery. Only the closest root handles the event.
export function ownTarget(event: Event) {
  const node = event.target
  return node instanceof Element && node.closest(rootSelector) === event.currentTarget ? node : null
}

export function ownFrame(event: Event) {
  const node = ownTarget(event)?.closest<HTMLElement>(frameSelector)
  return node && (event.currentTarget as HTMLElement).contains(node) ? node : null
}

export function ownWheelTarget(event: Event) {
  const node = ownTarget(event)
  const area = node?.closest(wheelAreaSelector)
  return area && (event.currentTarget as HTMLElement).contains(area) ? node : null
}
