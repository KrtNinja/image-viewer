export function mount(root: HTMLElement): () => void {
  function reveal() {
    const row = root.querySelector<HTMLElement>(':scope > .gallery-viewer__strip')
    const button = row?.querySelector<HTMLButtonElement>(':scope > button[aria-pressed="true"]')
    if (!row || !button) return
    const left = button.offsetLeft
    const right = left + button.offsetWidth
    if (left < row.scrollLeft) row.scrollLeft = left
    else if (right > row.scrollLeft + row.clientWidth) row.scrollLeft = right - row.clientWidth
  }

  const resize = new ResizeObserver(reveal)
  resize.observe(root)
  const mutations = new MutationObserver(records => {
    const row = root.querySelector(':scope > .gallery-viewer__strip')
    if (row && records.some(({ target, type }) => target === root || target === row ||
      (type === 'attributes' && target.parentElement === row))) reveal()
  })
  mutations.observe(root, { subtree: true, childList: true, attributeFilter: ['aria-pressed'] })
  reveal()
  return () => {
    resize.disconnect()
    mutations.disconnect()
  }
}
