import { hideFABWhenKeyboardShow } from "./hideFABWhenKeyboardShow"
import { shouldIgnoreSafeBottom } from "./shouldIgnoreSafeBottom"
import { showNativeAboutButton } from "./showNativeAboutButton"

export const switchKeys = {
  hideFABWhenKeyboardShow,
  showNativeAboutButton,
  shouldIgnoreSafeBottom,
} as const

export type SwitchKeyType = keyof typeof switchKeys
