import { localize } from "@/nls"
import { RecurringDateRule } from "./parseRecurringRule"

const labels = {
  due: localize("recurring_task.due_prefix"),
  start: localize("recurring_task.start_prefix"),
  completion: localize("recurring_task.base_prefix"),
  nextYearJan1: localize("recurringDate.nextYearJan1"),
  nextMonth1st: localize("recurringDate.nextMonth1st"),
  nextMonday: localize("recurringDate.nextMonday"),
  years: localize("recurringDate.years"),
  year: localize("recurringDate.year"),
  months: localize("recurringDate.months"),
  month: localize("recurringDate.month"),
  weeks: localize("recurringDate.weeks"),
  week: localize("recurringDate.week"),
  days: localize("recurringDate.days"),
  day: localize("recurringDate.day"),
  then: localize("recurringDate.then"),
  tomorrow: localize("recurringDate.tomorrow"),
}

function formatDay(num: number): string {
  return `${num > 0 ? "+" : ""}${num} ${num > 1 ? labels.days : labels.day}`
}

function formatWeek(num: number): string {
  return `+${num} ${num > 1 ? labels.weeks : labels.week}`
}

function formatMonth(num: number): string {
  return `+${num} ${num > 1 ? labels.months : labels.month}`
}
function formatYear(num: number): string {
  return `+${num} ${num > 1 ? labels.years : labels.year}`
}

/**
 * Generate human-readable explanation for recurring date calculation
 * Examples:
 * - "// Next year + 10 months"
 * - "// Next month + 14 months" (for 15m)
 * - "// Next year + 2 months + 5 days"
 */
export function explanationRecurringDate(rule: RecurringDateRule): string {
  if (!rule.valid) {
    return localize("recurring_task.invalid_rule")
  }
  const { years = 0, months = 0, weeks = 0, days = 0 } = rule
  const parts: string[] = []

  if (years > 0) {
    if (years === 1) {
      parts.push(labels.nextYearJan1)
    } else {
      parts.push(`${labels.nextYearJan1}`, formatYear(years - 1))
    }

    // If months are also specified with years
    if (months > 0) {
      parts.push(formatMonth(months))
    }
  } else if (months > 0) {
    parts.push(labels.nextMonth1st)
    if (months > 1) {
      parts.push(formatMonth(months - 1))
    }
  }

  if (weeks > 0) {
    if (weeks === 1 && days === 0) {
      parts.push(labels.nextMonday)
    } else if (weeks === 1 && days !== 0) {
      parts.push(labels.nextMonday, `+${days} ${labels.days}`)
    } else if (days !== 0) {
      parts.push(labels.nextMonday, formatWeek(weeks - 1), `+${days} ${labels.days}`)
    } else {
      parts.push(labels.nextMonday, formatWeek(weeks - 1))
    }
  } else if (days === 1 && years === 0 && months === 0) {
    parts.push(labels.tomorrow)
  } else if (days !== 0) {
    parts.push(formatDay(days))
  }

  return parts.join(" " + labels.then + " ")
}
