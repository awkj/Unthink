import { ICheckPlatform } from "@/ui/browser/checkPlatform"
export type AndroidSourceType = "play" | "xiaomi"

export interface IGetLocalSwitchOptions {
  checkPlatform: ICheckPlatform
  userAgent: string
  androidSource: AndroidSourceType | null
}
