import { SettingsIcon } from "@/ui/components/icons"
import { getCalendarWeekStartOptions, type CalendarWeekStartDay } from "@/core/time/calendarWeekStart"
import { useConfig } from "@/ui/hooks/useConfig"
import { ListItemGroup } from "@/mobile/components/listItem/listItem"
import { PageLayout } from "@/mobile/components/PageLayout"
import { localize } from "@/nls"
import { calendarWeekStartDayConfigKey } from "@/services/config/config"

export const CalendarSettings = () => {
  const { value: weekStartDay, setValue: setWeekStartDay } = useConfig(calendarWeekStartDayConfigKey())

  return (
    <PageLayout
      header={{
        showBack: true,
        id: "calendarSettings",
        title: localize("settings.calendar"),
        renderIcon: (className: string) => <SettingsIcon className={className} />,
      }}
    >
      <ListItemGroup
        title={localize("settings.calendar_week_start_day")}
        subtitle={localize("settings.calendar_week_start_day.description")}
        items={getCalendarWeekStartOptions().map((option) => ({
          title: option.label,
          mode: {
            type: "check",
            checked: weekStartDay === option.value,
          },
          onClick: () => setWeekStartDay(option.value as CalendarWeekStartDay),
        }))}
      />
    </PageLayout>
  )
}
