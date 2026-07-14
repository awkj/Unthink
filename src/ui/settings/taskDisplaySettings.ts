import { localize } from "@/nls"

export const taskDisplaySettingOptions = {
  get title() {
    return localize("settings.displaySettings")
  },
  get description() {
    return localize("settings.displaySettings.description")
  },
  showFutureTasks: {
    get title() {
      return localize("settings.showFutureTasks")
    },
    get description() {
      return localize("settings.showFutureTasks.description")
    },
  },
  showCompletedTasks: {
    get title() {
      return localize("settings.showCompletedTasks")
    },
    get description() {
      return localize("settings.showCompletedTasks.description")
    },
  },
  completedTasksRange: {
    get title() {
      return localize("settings.completedTasksRange")
    },
    get description() {
      return localize("settings.completedTasksRange.description")
    },
    get options() {
      return [
        {
          value: "today",
          description: localize("settings.completedTasksRange.today.description"),
          label: localize("settings.completedTasksRange.today"),
        },
        {
          value: "day",
          description: localize("settings.completedTasksRange.day.description"),
          label: localize("settings.completedTasksRange.day"),
        },
        {
          value: "week",
          description: localize("settings.completedTasksRange.week.description"),
          label: localize("settings.completedTasksRange.week"),
        },
        {
          value: "month",
          description: localize("settings.completedTasksRange.month.description"),
          label: localize("settings.completedTasksRange.month"),
        },
        {
          value: "all",
          description: localize("settings.completedTasksRange.all.description"),
          label: localize("settings.completedTasksRange.all"),
        },
      ] as const
    },
  },
} as const
