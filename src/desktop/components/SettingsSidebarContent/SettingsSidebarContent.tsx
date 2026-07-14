import { AIIcon, BackIcon, CircleQuestionMark, DownloadIcon, PaletteIcon, Server } from "@/ui/components/icons"
import { useService } from "@/ui/hooks/use-service"
import { useWatchEvent } from "@/ui/hooks/use-watch-event"
import { localize } from "@/nls"
import { ITodoService } from "@/services/todo/todoService"
import classNames from "classnames"
import React from "react"
import { Link, useLocation } from "react-router"
import { desktopStyles } from "../../theme/main.ts"
import { MacTopBar } from "../MacTopBar.tsx"

const groups = [
  {
    id: "general",
    heading: localize("settings.sidebar.general"),
    items: [
      {
        id: "appearance",
        label: localize("settings.appearance"),
        path: "/settings/appearance",
        icon: PaletteIcon,
      },
      {
        id: "ai",
        label: localize("settings.ai"),
        path: "/settings/ai",
        icon: AIIcon,
      },
    ],
  },
  {
    id: "data",
    heading: localize("settings.sidebar.data"),
    items: [
      {
        id: "selfhosted-sync",
        label: localize("sync.serverSettings"),
        path: "/settings/selfhosted-sync",
        icon: Server,
      },
      {
        id: "import-export",
        label: localize("settings.import_export"),
        path: "/settings/import-export",
        icon: DownloadIcon,
      },
    ],
  },
] as const

export const SettingsSidebarContent: React.FC = () => {
  const todoService = useService(ITodoService)
  useWatchEvent(todoService.onStateChange)
  const location = useLocation()

  return (
    <div className={classNames(desktopStyles.sidebarBackground, desktopStyles.sidebarContainerStyle)}>
      <MacTopBar />
      <div className={desktopStyles.SettingsSidebarGroupList}>
        {groups.map((group) => (
          <div key={group.id} className={desktopStyles.SettingsSidebarGroup}>
            <span className={desktopStyles.SettingsSidebarGroupHeading}>{group.heading}</span>
            {group.items.map((item) => {
              const isActive = location.pathname === item.path
              const Icon = item.icon

              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={classNames(
                    desktopStyles.SidebarMenuItem,
                    isActive ? desktopStyles.SidebarMenuItemActive : desktopStyles.SidebarMenuItemInactive,
                  )}
                >
                  <span className={desktopStyles.SidebarMenuItemIcon}>
                    <Icon className={desktopStyles.SidebarMenuItemIconSvg} strokeWidth={1.5} />
                  </span>
                  <span className={desktopStyles.SidebarMenuItemLabel}>{item.label}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </div>
      <div className={desktopStyles.SettingsSidebarFooter}>
        <Link to="/" className={desktopStyles.SettingsSidebarBackLink}>
          <span className={desktopStyles.SettingsSidebarBackIconContainer}>
            <BackIcon className={desktopStyles.SettingsSidebarBackIcon} strokeWidth={1.5} />
          </span>
          <span className={desktopStyles.SettingsSidebarBackLabel}>{localize("settings.back_to_home")}</span>
        </Link>
        <Link
          to="/settings/guide"
          className={classNames(desktopStyles.SidebarBottomIconButton, desktopStyles.SettingsSidebarGuideLink)}
          aria-label={localize("guide.title")}
        >
          <CircleQuestionMark className={desktopStyles.SidebarBottomIcon} strokeWidth={1.5} />
        </Link>
      </div>
    </div>
  )
}
