import { checkPlatform } from "@/ui/browser/checkPlatform"
import { createDecorator } from "@hamsterbase/foundation/instantiation"
import { switchKeys, SwitchKeyType } from "./switch/main"

export interface ISwitchService {
  readonly _serviceBrand: undefined

  getLocalSwitch(key: SwitchKeyType): boolean

  init(): Promise<void>
}

export class SwitchService implements ISwitchService {
  readonly _serviceBrand: undefined

  async init(): Promise<void> {}

  getLocalSwitch(key: SwitchKeyType): boolean {
    if (!switchKeys[key]) {
      throw new Error(`switch key ${key} not found`)
    }
    return switchKeys[key]({
      checkPlatform: checkPlatform(),
      userAgent: navigator.userAgent,
      androidSource: null,
    })
  }
}

export const ISwitchService = createDecorator<ISwitchService>("ISwitchService")
