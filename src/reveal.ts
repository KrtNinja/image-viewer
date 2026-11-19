export function scrollLeftToReveal(left: number, width: number, scrollLeft: number, viewportWidth: number) {
  const scrollAtRightEdge = left + width - viewportWidth
  return Math.min(left, Math.max(scrollLeft, scrollAtRightEdge))
}

type ObservedMutation = Pick<MutationRecord, 'type'> & { target: { parentElement: object | null } }

export function mutationsAffectContainer(records: readonly ObservedMutation[], root: object, container: object) {
  for (const { target, type } of records) {
    if (target === root || target === container) return true
    if (type === 'attributes' && target.parentElement === container) return true
  }
  return false
}
