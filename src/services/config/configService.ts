import { Event, Emitter } from "@hamsterbase/foundation/event"
import { createDecorator } from "@hamsterbase/foundation/instantiation"
import { createStore, StoreApi } from "zustand/vanilla"

export interface IConfigStorage {
  /**
   * Initialize the storage and load any persisted data
   */
  init(): Promise<Record<string, string>>

  /**
   * Save a key-value pair to storage
   */
  save(key: string, value: string): Promise<void>
}

export type ConfigKey<T> = {
  key: string
  default: T
  check: (value: T) => boolean
}

export type ConfigType = string | number | boolean

export interface ConfigChangeEvent {
  key: string
}

export interface ConfigStoreState {
  values: Record<string, string>
}

export interface IConfigService {
  readonly _serviceBrand: undefined
  readonly store: StoreApi<ConfigStoreState>
  onConfigChange: Event<ConfigChangeEvent>
  init(): Promise<void>
  get<T>(config: ConfigKey<T>): T
  save<T>(key: ConfigKey<T>, value: T): Promise<void>
}

export function parseConfigValue<T>(config: ConfigKey<T>, storedValue: string | undefined): T {
  if (storedValue === undefined) {
    return config.default
  }

  try {
    const parsedValue: unknown = JSON.parse(storedValue)
    if (!config.check(parsedValue as T)) {
      return config.default
    }
    return parsedValue as T
  } catch (error) {
    console.error(`Error parsing config value for key ${config.key}:`, error)
    return config.default
  }
}

export class WorkbenchConfig implements IConfigService {
  readonly _serviceBrand: undefined
  readonly store = createStore<ConfigStoreState>()(() => ({ values: {} }))
  private readonly _onConfigChange = new Emitter<ConfigChangeEvent>()
  readonly onConfigChange: Event<ConfigChangeEvent> = this._onConfigChange.event

  constructor(private readonly storage: IConfigStorage) {}

  async init(): Promise<void> {
    this.store.setState({ values: { ...(await this.storage.init()) } })
  }

  get<T = ConfigType>(config: ConfigKey<T>): T {
    return parseConfigValue(config, this.store.getState().values[config.key])
  }

  async save<T = ConfigType>(config: ConfigKey<T>, value: T): Promise<void> {
    if (!config.check(value)) {
      throw new Error(`Invalid value for config ${config.key}.`)
    }
    const previousValue = this.store.getState().values[config.key]
    try {
      const stringValue = JSON.stringify(value)
      this.setStoredValue(config.key, stringValue)
      await this.storage.save(config.key, stringValue)
    } catch (error) {
      this.setStoredValue(config.key, previousValue)
      console.error(`Error saving config value for key ${config.key}:`, error)
      throw new Error(`Failed to save config value for ${config.key}`, { cause: error })
    }
  }

  private setStoredValue(key: string, value: string | undefined): void {
    this.store.setState((state) => {
      const values = { ...state.values }
      if (value === undefined) {
        delete values[key]
      } else {
        values[key] = value
      }
      return { values }
    })
    this._onConfigChange.fire({ key })
  }
}

export const IConfigService = createDecorator<IConfigService>("wwewe")
