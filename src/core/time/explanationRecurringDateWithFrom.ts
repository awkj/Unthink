import { localize } from "@/nls"
import { explanationRecurringDate } from "./explanationRecurringDate"
import { parseRecurringRule } from "./parseRecurringRule"

export function explanationRecurringRuleWithFrom(dateRule: string) {
  if (!dateRule) return ""
  const parsedRule = parseRecurringRule(dateRule)
  if (!parsedRule.valid) return localize("recurring_task.invalid_rule")
  const prefix: Record<string, string> = {
    due: localize("recurring_task.due_prefix"),
    start: localize("recurring_task.start_prefix"),
  }
  const explanation = explanationRecurringDate(parsedRule)
  return (prefix[parsedRule.from || ""] || localize("recurring_task.base_prefix")) + " " + explanation
}
