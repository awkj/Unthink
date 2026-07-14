import { getCurrentLocale } from "@/locales/common/locale"
import { i18n, resources, type TranslationKey, type TranslationValues } from "@/locales/i18n"

const unresolvedInterpolation = /{{[^{}]+}}/

/** Translate a known message key. Missing keys and interpolation values are programming errors. */
export function localize(key: TranslationKey, values?: TranslationValues): string {
  if (!Object.hasOwn(resources[getCurrentLocale()].translation, key)) {
    throw new Error(`Missing translation: ${key}`)
  }

  const result = values === undefined ? i18n.t(key) : i18n.t(key, values)
  if (unresolvedInterpolation.test(result)) {
    throw new Error(`Missing interpolation value for translation: ${key}`)
  }
  return result
}
