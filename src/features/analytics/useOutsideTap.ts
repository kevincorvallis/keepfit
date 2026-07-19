import { useEffect, type RefObject } from 'react'

/** Dismiss-on-tap-elsewhere: calls `onOutside` when a pointerdown lands outside `ref`. */
export function useOutsideTap(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  onOutside: () => void,
) {
  useEffect(() => {
    if (!active) return
    const handle = (event: PointerEvent) => {
      const el = ref.current
      if (el && event.target instanceof Node && !el.contains(event.target)) onOutside()
    }
    document.addEventListener('pointerdown', handle)
    return () => document.removeEventListener('pointerdown', handle)
  }, [ref, active, onOutside])
}
