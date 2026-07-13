import { ITodoService } from "@/services/todo/todoService"
import { IReminderService } from "./reminderService"
import { checkPlatform } from "@/ui/browser/checkPlatform"

export class MobileReminderService implements IReminderService {
  readonly _serviceBrand: undefined

  constructor(@ITodoService private todoService: ITodoService) {}

  async start(): Promise<void> {
    if (!checkPlatform().isTauri) return
    try {
      await this.run()
    } catch (error) {
      // A notification integration failure must not prevent the mobile app from rendering.
      console.error("Error starting mobile reminders:", error)
    }
    this.todoService.onStateChange(() => {
      void this.run().catch((error) => {
        console.error("Error updating mobile reminders on state change:", error)
      })
    })
  }

  private async run(): Promise<void> {
    const { Schedule, cancel, isPermissionGranted, pending, requestPermission, sendNotification } =
      await import("@tauri-apps/plugin-notification")
    let granted = await isPermissionGranted()
    if (!granted) {
      granted = (await requestPermission()) === "granted"
    }
    if (!granted) return

    // notification 2.3.3's Android implementation requires the IDs argument,
    // while cancelAll() invokes the native command without one.
    const pendingNotifications = await pending()
    if (pendingNotifications.length > 0) {
      await cancel(pendingNotifications.map((notification) => notification.id))
    }
    const now = Date.now()
    const modelState = this.todoService.modelState
    this.todoService.getReminders().forEach((reminders, taskId) => {
      const taskItem = modelState.taskObjectMap.get(taskId)
      if (!taskItem) return
      for (const reminder of reminders) {
        const at = new Date(reminder.time)
        if (at.getTime() <= now) continue
        sendNotification({
          id: Math.floor(Math.random() * 2_000_000_000),
          title: taskItem.title,
          body: taskItem.type === "task" || taskItem.type === "project" ? taskItem.notes || "" : "",
          schedule: Schedule.at(at, false, true),
        })
      }
    })
  }
}
