import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import enUS from "./en-US.json"
import { getValidLocaleKey, setCurrentLocale } from "./common/locale"
import zhCN from "./zh-CN.json"

export const defaultNamespace = "translation"
export const resources = {
  "en-US": { [defaultNamespace]: enUS },
  "zh-CN": { [defaultNamespace]: zhCN },
} as const

export type TranslationKey = keyof typeof enUS
export type TranslationValues = Record<string, unknown>

function assertMatchingResources(): void {
  const sourceKeys = Object.keys(enUS).sort()
  const sourceKeySet = new Set(sourceKeys)
  const translatedKeys = Object.keys(zhCN).sort()
  const missing = sourceKeys.filter((key) => !Object.hasOwn(zhCN, key))
  const extra = translatedKeys.filter((key) => !sourceKeySet.has(key))

  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `Invalid zh-CN translations. Missing: ${missing.join(", ") || "none"}; extra: ${extra.join(", ") || "none"}`,
    )
  }
}

function detectLocale(): string {
  if (typeof localStorage !== "undefined") {
    const configuredLocale = localStorage.getItem("language")
    if (configuredLocale) return configuredLocale
  }
  if (typeof navigator !== "undefined") return navigator.language
  return "en-US"
}

assertMatchingResources()

const locale = getValidLocaleKey(detectLocale())
setCurrentLocale(locale)

void i18n.use(initReactI18next).init({
  resources,
  lng: locale,
  supportedLngs: Object.keys(resources),
  fallbackLng: false,
  load: "currentOnly",
  defaultNS: defaultNamespace,
  ns: [defaultNamespace],
  keySeparator: false,
  initAsync: false,
  returnNull: false,
  parseMissingKeyHandler: (key) => {
    throw new Error(`Missing translation: ${key}`)
  },
  missingInterpolationHandler: (_text, value) => {
    throw new Error(`Missing interpolation value: ${value}`)
  },
  interpolation: {
    escapeValue: false,
  },
})

export { i18n }
