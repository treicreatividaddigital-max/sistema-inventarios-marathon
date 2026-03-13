import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const getMatches = React.useCallback(() => {
    if (typeof window === "undefined") return false
    return window.innerWidth < MOBILE_BREAKPOINT
  }, [])

  const [isMobile, setIsMobile] = React.useState<boolean>(getMatches)

  React.useEffect(() => {
    if (typeof window === "undefined") return

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)

    const sync = () => {
      setIsMobile(getMatches())
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        sync()
      }
    }

    sync()

    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", sync)
    } else {
      mql.addListener(sync)
    }

    window.addEventListener("resize", sync)
    window.addEventListener("orientationchange", sync)
    window.addEventListener("pageshow", sync)
    window.addEventListener("focus", sync)
    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      if (typeof mql.removeEventListener === "function") {
        mql.removeEventListener("change", sync)
      } else {
        mql.removeListener(sync)
      }

      window.removeEventListener("resize", sync)
      window.removeEventListener("orientationchange", sync)
      window.removeEventListener("pageshow", sync)
      window.removeEventListener("focus", sync)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [getMatches])

  return isMobile
}
