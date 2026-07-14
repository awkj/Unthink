import { getCalendarWeekStartOptions, type CalendarWeekStartDay } from "@/core/time/calendarWeekStart"
import { TimeAfterEnum } from "@/core/time/getTimeAfter"
import { ItemGroup } from "@/desktop/components/settings/ItemGroup"
import { SettingsContent } from "@/desktop/components/settings/SettingsContent/SettingsContent"
import { SettingsItem } from "@/desktop/components/settings/SettingsItem"
import { SettingsSection } from "@/desktop/components/settings/SettingsSection"
import { getCurrentLocale } from "@/locales/common/locale"
import { useConfig } from "@/ui/hooks/useConfig"
import { useGlobalTaskDisplaySettings } from "@/ui/hooks/useGlobalTaskDisplaySettings"
import { localize } from "@/nls"
import {
  calendarWeekStartDayConfigKey,
  dockBadgeCountTypeConfigKey,
  groupTodayByAreaProjectConfigKey,
  notesMarkdownRenderConfigKey,
  type DockBadgeCountType,
} from "@/services/config/config"
import React, { useState } from "react"

export const AppearanceSettings: React.FC = () => {
  const [currentTheme, setCurrentTheme] = useState(localStorage.getItem("theme") || "auto")
  const [currentLanguage] = useState(getCurrentLocale())
  const {
    showFutureTasks,
    showCompletedTasks,
    completedTasksRange,
    setShowFutureTasks,
    setShowCompletedTasks,
    setCompletedTasksRange,
    settingOptions,
  } = useGlobalTaskDisplaySettings()

  const { value: notesMarkdownRender, setValue: setNotesMarkdownRender } = useConfig(notesMarkdownRenderConfigKey())
  const { value: weekStartDay, setValue: setWeekStartDay } = useConfig(calendarWeekStartDayConfigKey())
  const { value: dockBadgeCountType, setValue: setDockBadgeCountType } = useConfig(dockBadgeCountTypeConfigKey())
  const { value: groupTodayByAreaProject, setValue: setGroupTodayByAreaProject } = useConfig(
    groupTodayByAreaProjectConfigKey(),
  )

  const changeTheme = (theme: string) => {
    localStorage.setItem("theme", theme)
    setCurrentTheme(theme)
    window.location.reload()
  }

  const changeLanguage = (lang: string) => {
    localStorage.setItem("language", lang)
    window.location.reload()
  }

  const getLanguageValue = (locale: string) => {
    switch (locale) {
      case "en-US":
        return "en"
      case "zh-CN":
        return "zh"
      default:
        return "en"
    }
  }

  return (
    <SettingsContent title={localize("settings.appearance")}>
      <ItemGroup>
        <SettingsItem
          title={localize("settings.theme")}
          description={localize("settings.theme.description")}
          action={{
            type: "select",
            options: [
              { value: "light", label: localize("settings.theme.light") },
              { value: "dark", label: localize("settings.theme.dark") },
              { value: "auto", label: localize("settings.theme.auto") },
            ],
            currentValue: currentTheme,
            onChange: changeTheme,
          }}
        />
        <SettingsItem
          title={localize("settings.language")}
          description={localize("settings.language.description")}
          action={{
            type: "select",
            options: [
              { value: "en", label: localize("settings.language.english") },
              { value: "zh", label: "简体中文" },
            ],
            currentValue: getLanguageValue(currentLanguage),
            onChange: changeLanguage,
          }}
        />
      </ItemGroup>
      <SettingsSection title={localize("settings.notes")}>
        <ItemGroup>
          <SettingsItem
            title={localize("settings.render_markdown")}
            description={localize("settings.render_markdown.description")}
            action={{
              type: "switch",
              currentValue: notesMarkdownRender,
              onChange: () => {
                setNotesMarkdownRender(!notesMarkdownRender)
              },
            }}
          ></SettingsItem>
        </ItemGroup>
      </SettingsSection>
      <SettingsSection title={localize("settings.calendar")}>
        <ItemGroup>
          <SettingsItem
            title={localize("settings.calendar_week_start_day")}
            description={localize("settings.calendar_week_start_day.description")}
            action={{
              type: "select",
              options: getCalendarWeekStartOptions().map((option) => ({
                value: String(option.value),
                label: option.label,
              })),
              currentValue: String(weekStartDay),
              onChange: (value) => setWeekStartDay(Number(value) as CalendarWeekStartDay),
            }}
          />
        </ItemGroup>
      </SettingsSection>
      <SettingsSection title={localize("settings.dock_badge")}>
        <ItemGroup>
          <SettingsItem
            title={localize("settings.dock_badge.count_type")}
            action={{
              type: "select",
              options: [
                { value: "none", label: localize("settings.dock_badge.count_type.none") },
                { value: "overdue", label: localize("settings.dock_badge.count_type.overdue") },
                {
                  value: "overdue_and_today",
                  label: localize("settings.dock_badge.count_type.overdue_and_today"),
                },
                {
                  value: "overdue_today_and_inbox",
                  label: localize("settings.dock_badge.count_type.overdue_today_and_inbox"),
                },
              ],
              currentValue: dockBadgeCountType,
              onChange: (value: string) => setDockBadgeCountType(value as DockBadgeCountType),
            }}
          />
        </ItemGroup>
      </SettingsSection>
      <SettingsSection title={localize("settings.today")}>
        <ItemGroup>
          <SettingsItem
            title={localize("settings.today.group_by_area_project")}
            description={localize("settings.today.group_by_area_project.description")}
            action={{
              type: "switch",
              currentValue: groupTodayByAreaProject,
              onChange: () => {
                setGroupTodayByAreaProject(!groupTodayByAreaProject)
              },
            }}
          />
        </ItemGroup>
      </SettingsSection>
      <SettingsSection title={settingOptions.title} description={settingOptions.description}>
        <ItemGroup>
          <SettingsItem
            title={settingOptions.showFutureTasks.title}
            description={settingOptions.showFutureTasks.description}
            action={{
              type: "switch",
              currentValue: showFutureTasks,
              onChange: setShowFutureTasks,
            }}
          />
          <SettingsItem
            title={settingOptions.showCompletedTasks.title}
            description={settingOptions.showCompletedTasks.description}
            action={{
              type: "switch",
              currentValue: showCompletedTasks,
              onChange: setShowCompletedTasks,
            }}
          />
          <SettingsItem
            title={settingOptions.completedTasksRange.title}
            description={settingOptions.completedTasksRange.description}
            action={{
              type: "select",
              options: [...settingOptions.completedTasksRange.options],
              currentValue: completedTasksRange,
              onChange: (value: string) => setCompletedTasksRange(value as TimeAfterEnum),
            }}
          />
        </ItemGroup>
      </SettingsSection>
    </SettingsContent>
  )
}
