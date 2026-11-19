export const frameSelector = '.gallery-viewer__frame'
export const thumbnailSelector = '.gallery-viewer__strip > button[data-id]'
export const interactiveSelector = 'button, a, input, select, textarea, label, summary, [contenteditable], [role="button"], [role="link"]'

export const captionSelector = '.gallery-viewer__caption'
export const nonEmptyCaptionSelector = `:scope > ${captionSelector}:not(:empty)`
const wheelAreaSelector = `${frameSelector}, .gallery-viewer__strip`

// Captions can contain another gallery. Only the closest root handles the event.
export function ownTarget(event: Event) {
  const node = event.target
  return node instanceof Element && node.closest('.gallery-viewer') === event.currentTarget ? node : null
}

export function ownFrame(event: Event) {
  const node = ownTarget(event)?.closest<HTMLElement>(frameSelector)
  return node && (event.currentTarget as HTMLElement).contains(node) ? node : null
}

export function ownWheelArea(event: Event) {
  const node = ownTarget(event)
  const area = node?.closest(wheelAreaSelector)
  return area && (event.currentTarget as HTMLElement).contains(area) ? node : null
}
