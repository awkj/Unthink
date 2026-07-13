import "@/locales/browser/config.ts"
import "large-small-dynamic-viewport-units-polyfill"

import { checkPlatform } from "@/ui/browser/checkPlatform"

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

async function startApplication(): Promise<void> {
  if (shouldLoadDesktop()) {
    const { startDesktop } = await import("./desktop/main")
    await startDesktop()
  } else {
    const { startMobile } = await import("./mobile/main")
    await startMobile()
  }
}

void startApplication().catch((error: unknown) => {
  console.error("Failed to start application:", error)
})
