import { ConfigKey, IConfigService, parseConfigValue } from "@/services/config/configService.ts"
import { useStore } from "zustand"
import { useService } from "./use-service"

export function useConfig<T>(key: ConfigKey<T>): {
  value: T
  setValue: (value: T) => void
  saveIfValid: (value: T) => void
} {
  const config = useService(IConfigService)
  const storedValue = useStore(config.store, (state) => state.values[key.key])

  return {
    value: parseConfigValue(key, storedValue),
    setValue: (value: T) => {
      void config.save(key, value)
    },
    saveIfValid: (value: T) => {
      if (key.check(value)) {
        void config.save(key, value)
      }
    },
  }
}
