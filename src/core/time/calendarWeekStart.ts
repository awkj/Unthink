import { localize } from "@/nls"

export type CalendarWeekStartDay = 0 | 1 | 2 | 3 | 4 | 5 | 6

export function getCalendarLeadingDaysCount(date: Date, weekStartDay: CalendarWeekStartDay) {
  return (date.getDay() - weekStartDay + 7) % 7
}

export function getCalendarWeekdayLabels(weekStartDay: CalendarWeekStartDay) {
  const weekdays = [
    localize("date_picker.sunday"),
    localize("date_picker.monday"),
    localize("date_picker.tuesday"),
    localize("date_picker.wednesday"),
    localize("date_picker.thursday"),
    localize("date_picker.friday"),
    localize("date_picker.saturday"),
  ]

  return [...weekdays.slice(weekStartDay), ...weekdays.slice(0, weekStartDay)]
}

export function getCalendarWeekStartOptions(): Array<{ value: CalendarWeekStartDay; label: string }> {
  return [
    { value: 1, label: localize("settings.weekday.monday") },
    { value: 2, label: localize("settings.weekday.tuesday") },
    { value: 3, label: localize("settings.weekday.wednesday") },
    { value: 4, label: localize("settings.weekday.thursday") },
    { value: 5, label: localize("settings.weekday.friday") },
    { value: 6, label: localize("settings.weekday.saturday") },
    { value: 0, label: localize("settings.weekday.sunday") },
  ]
}
