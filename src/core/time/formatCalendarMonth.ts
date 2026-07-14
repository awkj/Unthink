import { format } from "date-fns"
import { getCurrentLocale } from "@/locales/common/locale"

export const formatCalendarMonth = (date: Date) => {
  if (getCurrentLocale() === "zh-CN") {
    return format(date, "yyyy 年 M 月")
  }
  return format(date, "MMMM yyyy")
}
