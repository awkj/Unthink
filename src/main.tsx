import "@/locales/browser/config.ts"
import "large-small-dynamic-viewport-units-polyfill"

import { checkPlatform } from "@/ui/browser/checkPlatform"
import { startDesktop } from "./desktop/main"
import { startMobile } from "./mobile/main"

function shouldLoadDesktop() {
  if (checkPlatform().isTauri && !checkPlatform().isNative) {
    return true
  }
  const pathname = location.pathname
  if (pathname !== "/") {
    return pathname.startsWith("/desktop")
  }
  // Check if user agent matches mobile device
  const userAgent = navigator.userAgent.toLowerCase()
  const isMobileDevice = /android/i.test(userAgent)

  if (isMobileDevice) {
    return false
  }

  return true
}

if (shouldLoadDesktop()) {
  startDesktop()
} else {
  startMobile()
}
