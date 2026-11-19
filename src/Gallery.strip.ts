import { ownStripSelector, selectedThumbnailSelector } from './Gallery.dom.js'
import { mutationsAffectContainer, scrollLeftToReveal } from './reveal.js'

function reveal(root: HTMLElement) {
  const row = root.querySelector<HTMLElement>(ownStripSelector)
  if (!row) return
  const button = row.querySelector<HTMLButtonElement>(selectedThumbnailSelector)
  if (!button) return
  row.scrollLeft = scrollLeftToReveal(button.offsetLeft, button.offsetWidth, row.scrollLeft, row.clientWidth)
}

function revealAfterMutation(root: HTMLElement, records: MutationRecord[]) {
  const row = root.querySelector(ownStripSelector)
  if (row && mutationsAffectContainer(records, root, row)) reveal(root)
}

export function mount(root: HTMLElement): () => void {
  const resize = new ResizeObserver(reveal.bind(null, root))
  resize.observe(root)
  const mutations = new MutationObserver(revealAfterMutation.bind(null, root))
  mutations.observe(root, { subtree: true, childList: true, attributeFilter: ['aria-pressed'] })
  reveal(root)
  return () => {
    resize.disconnect()
    mutations.disconnect()
  }
}
