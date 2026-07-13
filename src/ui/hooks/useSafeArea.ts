import { useEffect } from "react"

export const useSafeArea = () => {
  useEffect(() => {
    for (const side of ["top", "right", "bottom", "left"]) {
      document.documentElement.style.setProperty(`--safe-area-inset-${side}`, `env(safe-area-inset-${side}, 0px)`)
    }
  }, [])
}
