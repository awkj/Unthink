import { getTodayTimestampInUtc } from "@/core/time/getTodayTimestampInUtc"
import { ruleFactory } from "./ruleFactory"
import { taskRuleSchema } from "./taskRuleSchema"
import type { ParseResult } from "./ruleFactory"

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Constants available in task-rule expressions:
 *   TODAY   — today's UTC midnight timestamp (resolved at compile time)
 *   DAY     — milliseconds in a day (86_400_000), enables `TODAY - 10 * DAY`
 */
export function compileTaskRule(rule: string): ParseResult {
  const constants = {
    TODAY: getTodayTimestampInUtc(),
    DAY: DAY_MS,
  }
  return ruleFactory(taskRuleSchema, { constants })(rule)
}
