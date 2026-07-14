import { getTodayTimestampInUtc } from "@/core/time/getTodayTimestampInUtc"
import {
  ThingsAnytimeIcon,
  ThingsDeletedIcon,
  ThingsInboxIcon,
  ThingsLogbookIcon,
  ThingsScheduleIcon,
  ThingsTodayIcon,
} from "@/ui/components/icons"
import { getInboxTasks } from "@/core/state/inbox/getInboxTasks"
import { getTodayItems } from "@/core/state/today/getTodayItems"
import { useService } from "@/ui/hooks/use-service"
import { useWatchEvent } from "@/ui/hooks/use-watch-event"
import { useTaskDisplaySettings } from "@/ui/hooks/useTaskDisplaySettings"
import { localize } from "@/nls"
import { ITodoService } from "@/services/todo/todoService.ts"
import classNames from "classnames"
import React from "react"
import { desktopStyles } from "../../../theme/main"
import { MenuItem } from "../../MenuItem/MenuItem.tsx"

const baseLinks = [
  {
    to: "/desktop/inbox",
    text: localize("inbox"),
    icon: <ThingsInboxIcon />,
  },
  {
    to: "/desktop/today",
    text: localize("today"),
    icon: <ThingsTodayIcon />,
  },
  {
    to: "/desktop/schedule",
    text: localize("schedule"),
    icon: <ThingsScheduleIcon />,
  },
  {
    to: "/desktop/pending",
    text: localize("pending"),
    icon: <ThingsAnytimeIcon />,
  },
  {
    to: "/desktop/completed",
    text: localize("completed"),
    icon: <ThingsLogbookIcon />,
  },
  {
    to: "/desktop/deleted",
    text: localize("deleted"),
    icon: <ThingsDeletedIcon />,
  },
]

export const SidebarMenu: React.FC = () => {
  const todoService = useService(ITodoService)
  useWatchEvent(todoService.onStateChange)
  const todayItems = getTodayItems(todoService.modelState, getTodayTimestampInUtc())
  const { showFutureTasks, showCompletedTasks, completedAfter } = useTaskDisplaySettings("inbox")
  const { uncompletedTasksCount } = getInboxTasks(todoService.modelState, {
    currentDate: getTodayTimestampInUtc(),
    showFutureTasks,
    showCompletedTasks,
    showCompletedTasksAfter: completedAfter,
    keepAliveElements: todoService.keepAliveElements,
  })

  return (
    <ul className={classNames(desktopStyles.SidebarMenuItemContainer, desktopStyles.SidebarPrimaryMenuSpacing)}>
      {baseLinks.map((link) => {
        const isTodayLink = link.to === "/desktop/today"
        const isInboxLink = link.to === "/desktop/inbox"
        const startDateCount = isTodayLink ? todayItems.startDateItemsCount : 0
        const dueDateCount = isTodayLink ? todayItems.dueDateItemsCount : 0
        return (
          <MenuItem
            key={link.to}
            to={link.to}
            text={link.text}
            icon={link.icon}
            className={
              isInboxLink
                ? desktopStyles.SidebarInboxMenuItem
                : link.to === "/desktop/completed"
                  ? desktopStyles.SidebarLogbookMenuItem
                  : undefined
            }
            primaryBadge={isTodayLink && dueDateCount > 0 ? dueDateCount : undefined}
            secondaryBadge={
              isTodayLink && startDateCount > 0
                ? startDateCount
                : isInboxLink && uncompletedTasksCount > 0
                  ? uncompletedTasksCount
                  : undefined
            }
          />
        )
      })}
      <div className={desktopStyles.SidebarMenuDivider} aria-hidden="true" />
    </ul>
  )
}
