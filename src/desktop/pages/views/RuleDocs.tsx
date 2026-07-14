import {
  AlarmIcon,
  CalendarRangeIcon,
  CheckIcon,
  ChevronRightIcon,
  CircleIcon,
  CopyIcon,
  TagIcon,
  TodayIcon,
} from "@/ui/components/icons"
import { useDesktopMessage } from "@/desktop/overlay/desktopMessage/useDesktopMessage"
import { desktopStyles } from "@/desktop/theme/main"
import { useService } from "@/ui/hooks/use-service"
import { localize } from "@/nls"
import { ITodoService } from "@/services/todo/todoService"
import React, { useState } from "react"

const AI_PROMPT_URL = "https://tasks.hamsterbase.com/view-rules.txt"

interface RuleDocsProps {
  viewUid: string
}

interface Starter {
  label: string
  rule: string
  icon: React.ComponentType<{ className?: string }>
  danger?: boolean
}

// Strip `item.` so the preview reads cleanly. The right-side Rule editor still
// shows the full expression after the starter is applied.
function shortenRule(rule: string): string {
  return rule.replace(/\bitem\./g, "")
}

const constants: { name: string; meaning: string }[] = [
  { name: "TODAY", meaning: "Today's UTC midnight timestamp" },
  { name: "DAY", meaning: "Milliseconds in a day (86,400,000)" },
]

const fields: { name: string; type: string }[] = [
  { name: "item.title", type: "string" },
  { name: "item.notes", type: "string" },
  { name: "item.status", type: "'created' | 'completed' | 'canceled'" },
  { name: "item.tags", type: "string[]" },
  { name: "item.startDate", type: "number | null" },
  { name: "item.dueDate", type: "number | null" },
  { name: "item.completionAt", type: "number | null" },
  { name: "item.createdAt", type: "number" },
  { name: "item.parent", type: "'inbox' | 'project' | 'area' | 'heading' | 'task'" },
  { name: "item.projectTitle", type: "string" },
  { name: "item.areaTitle", type: "string" },
]

const operators: { op: string; note: string }[] = [
  { op: "===  !==", note: "equality" },
  { op: ">   >=   <   <=", note: "comparison (numeric fields only)" },
  { op: "&&   ||   !", note: "logical and / or / not" },
  { op: "+  -  *  /", note: "arithmetic (in numeric RHS, e.g. TODAY + 7 * DAY)" },
  { op: "arr.includes('x')", note: "array contains" },
  { op: "field === null", note: "null check (numeric fields only)" },
]

export const RuleDocs: React.FC<RuleDocsProps> = ({ viewUid }) => {
  const todoService = useService(ITodoService)
  const desktopMessage = useDesktopMessage()
  const [referenceOpen, setReferenceOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopyAiPrompt = async () => {
    try {
      const response = await fetch(AI_PROMPT_URL)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const text = await response.text()
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
      desktopMessage({
        type: "success",
        message: localize("view.docs.ai.copySuccess"),
      })
    } catch {
      desktopMessage({
        type: "error",
        message: localize("view.docs.ai.copyFailed"),
      })
    }
  }

  const starters: Starter[] = [
    {
      label: localize("view.docs.starter.notCompleted"),
      rule: "item.status === 'created'",
      icon: CircleIcon,
    },
    {
      label: localize("view.docs.starter.overdue"),
      rule: "item.dueDate !== null && item.dueDate < TODAY",
      icon: AlarmIcon,
      danger: true,
    },
    {
      label: localize("view.docs.starter.dueIn7Days"),
      rule: "item.dueDate !== null && item.dueDate < TODAY + 7 * DAY",
      icon: CalendarRangeIcon,
    },
    {
      label: localize("view.docs.starter.pending"),
      rule: "item.status === 'created' && item.startDate === null",
      icon: TodayIcon,
    },
    {
      label: localize("view.docs.starter.taggedWork"),
      rule: "item.tags.includes('work')",
      icon: TagIcon,
    },
  ]

  const handleStarterClick = (rule: string) => {
    todoService.updateView(viewUid, { rule })
  }

  return (
    <div className={desktopStyles.RuleDocsContainer}>
      <div>
        <div className={desktopStyles.RuleDocsIntroTitle}>{localize("view.docs.introTitle")}</div>
        <div className={desktopStyles.RuleDocsIntroBody}>{localize("view.docs.introBody")}</div>
      </div>

      <section>
        <div className={desktopStyles.RuleDocsSectionHeading}>{localize("view.docs.starters")}</div>
        <div className={desktopStyles.RuleDocsStarterGrid}>
          {starters.map((s) => {
            const Icon = s.icon
            return (
              <button
                type="button"
                key={s.rule}
                className={desktopStyles.RuleDocsStarterCard}
                onClick={() => handleStarterClick(s.rule)}
              >
                <div className={desktopStyles.RuleDocsStarterHeader}>
                  <Icon
                    className={s.danger ? desktopStyles.RuleDocsStarterIconDanger : desktopStyles.RuleDocsStarterIcon}
                  />
                  <span className={desktopStyles.RuleDocsStarterLabel}>{s.label}</span>
                </div>
                <code className={desktopStyles.RuleDocsStarterCode}>{shortenRule(s.rule)}</code>
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <div className={desktopStyles.RuleDocsSectionHeading}>{localize("view.docs.ai.title")}</div>
        <div className={desktopStyles.RuleDocsAiDesc}>{localize("view.docs.ai.desc")}</div>

        <div className={desktopStyles.RuleDocsAiActions}>
          <button type="button" className={desktopStyles.RuleDocsAiCopyButton} onClick={handleCopyAiPrompt}>
            {copied ? (
              <CheckIcon className={desktopStyles.RuleDocsAiCopyIcon} />
            ) : (
              <CopyIcon className={desktopStyles.RuleDocsAiCopyIcon} />
            )}
            <span>{copied ? localize("view.docs.ai.copied") : localize("view.docs.ai.copyButton")}</span>
          </button>
          <a
            href={AI_PROMPT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={desktopStyles.RuleDocsAiViewLink}
          >
            {localize("view.docs.ai.viewSource")}
          </a>
        </div>
      </section>

      <section>
        <button
          type="button"
          className={desktopStyles.RuleDocsReferenceToggle}
          onClick={() => setReferenceOpen((v) => !v)}
        >
          <ChevronRightIcon
            className={
              referenceOpen ? desktopStyles.RuleDocsReferenceChevronOpen : desktopStyles.RuleDocsReferenceChevron
            }
          />
          <span>{localize("view.docs.referenceToggle")}</span>
        </button>

        {referenceOpen && (
          <div className={desktopStyles.RuleDocsReferenceBody}>
            <div>
              <div className={desktopStyles.RuleDocsSectionHeading}>{localize("view.docs.fields")}</div>
              <div className={desktopStyles.RuleDocsList}>
                {fields.map((f) => (
                  <div key={f.name} className={desktopStyles.RuleDocsRow}>
                    <code className={desktopStyles.RuleDocsRowLabel}>{f.name}</code>
                    <code className={desktopStyles.RuleDocsRowCode}>{f.type}</code>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className={desktopStyles.RuleDocsSectionHeading}>{localize("view.docs.constants")}</div>
              <div className={desktopStyles.RuleDocsList}>
                {constants.map((c) => (
                  <div key={c.name} className={desktopStyles.RuleDocsRow}>
                    <code className={desktopStyles.RuleDocsRowLabel}>{c.name}</code>
                    <span className={desktopStyles.RuleDocsRowNote}>{c.meaning}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className={desktopStyles.RuleDocsSectionHeading}>{localize("view.docs.operators")}</div>
              <div className={desktopStyles.RuleDocsList}>
                {operators.map((o) => (
                  <div key={o.op} className={desktopStyles.RuleDocsRow}>
                    <code className={desktopStyles.RuleDocsRowLabel}>{o.op}</code>
                    <span className={desktopStyles.RuleDocsRowNote}>{o.note}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
