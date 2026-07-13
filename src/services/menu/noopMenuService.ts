import { IMenuService } from "./menuService"

export class NoopMenuService implements IMenuService {
  readonly _serviceBrand: undefined

  async updateMenu(): Promise<void> {}
}
