import { getTheme } from "@/ui/browser/initializeTheme"
import { taskDisplaySettingOptions } from "@/ui/settings/taskDisplaySettings"
import { SettingsIcon } from "@/ui/components/icons"
import { getCalendarWeekStartOptions } from "@/core/time/calendarWeekStart"
import { getCurrentLocale } from "@/locales/common/locale"
import { useConfig } from "@/ui/hooks/useConfig"
import { useAbout } from "@/ui/hooks/use-about"
import { useService } from "@/ui/hooks/use-service"
import useNavigate from "@/ui/hooks/useNavigate"
import { localize } from "@/nls"
import { calendarWeekStartDayConfigKey } from "@/services/config/config"
import { selfhostedSyncPageTitle } from "@/services/selfhostedSync/useAddSelfhostedServer"
import { ISwitchService } from "@/services/switchService/switchService"
import { ListItemGroup } from "../components/listItem/listItem"
import { PageLayout } from "../components/PageLayout"

export const MobileSettings = () => {
  const navigate = useNavigate()
  const { showAbout } = useAbout()
  const switchService = useService(ISwitchService)
  const { value: weekStartDay } = useConfig(calendarWeekStartDayConfigKey())
  const weekStartDayLabel = getCalendarWeekStartOptions().find((option) => option.value === weekStartDay)?.label

  return (
    <PageLayout
      header={{
        showBack: true,
        id: "settings",
        title: localize("settings.title"),
        renderIcon: (className: string) => <SettingsIcon className={className} />,
      }}
    >
      <ListItemGroup
        items={[
          {
            title: localize("settings.language"),
            onClick: () => navigate({ path: "/settings/language" }),
            mode: {
              type: "navigation",
            },
          },
          {
            title: localize("settings.theme"),
            onClick: () => navigate({ path: "/settings/theme" }),
            mode: {
              type: "navigation",
            },
          },
          {
            title: localize("settings.calendar"),
            onClick: () => navigate({ path: "/settings/calendar" }),
            mode: {
              type: "navigation",
              label: weekStartDayLabel,
            },
          },
          {
            title: taskDisplaySettingOptions.title,
            onClick: () => navigate({ path: "/settings/task-display" }),
            mode: {
              type: "navigation",
            },
          },
          {
            title: localize("settings.export"),
            onClick: () => navigate({ path: "/settings/export" }),
            mode: {
              type: "navigation",
            },
          },
          {
            title: localize("settings.import"),
            onClick: () => navigate({ path: "/settings/import" }),
            mode: {
              type: "navigation",
            },
          },
          {
            title: selfhostedSyncPageTitle,
            onClick: () => navigate({ path: "/settings/selfhosted-sync" }),
            mode: {
              type: "navigation",
            },
          },
          {
            hidden: switchService.getLocalSwitch("showNativeAboutButton"),
            title: localize("settings.about"),
            onClick: () => navigate({ path: "/settings/about" }),
            mode: {
              type: "navigation",
            },
          },
          {
            hidden: !switchService.getLocalSwitch("showNativeAboutButton"),
            title: localize("settings.about"),
            onClick: () => showAbout({ showICP: getCurrentLocale() === "zh-CN", displayMode: getTheme() }),
            mode: {
              type: "navigation",
            },
          },
        ]}
      />
    </PageLayout>
  )
}
