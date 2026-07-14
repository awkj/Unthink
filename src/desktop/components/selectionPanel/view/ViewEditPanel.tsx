import { EllipsisVertical, ViewIcon } from "@/ui/components/icons"
import { renderRuleError } from "@/core/filter/renderError"
import { compileTaskRule } from "@/core/filter/taskRuleCompiler"
import { getView } from "@/core/state/views/getView"
import { EntityHeader } from "@/desktop/components/common/EntityHeader"
import { NotesField } from "@/desktop/components/selectionPanel/components/NotesField"
import { useDesktopDialog } from "@/desktop/overlay/desktopDialog/useDesktopDialog"
import { DesktopMenuController } from "@/desktop/overlay/desktopMenu/DesktopMenuController"
import { desktopStyles } from "@/desktop/theme/main"
import { useService } from "@/ui/hooks/use-service"
import { useTodoViewSubscription } from "@/ui/hooks/useTodoSelector"
import { localize } from "@/nls"
import { ITodoService, VIEW_SCHEMA_VERSION } from "@/services/todo/todoService"
import React, { useMemo } from "react"
import { useNavigate } from "react-router"
import { IInstantiationService } from "@hamsterbase/foundation/instantiation"

interface ViewEditPanelProps {
  viewUid: string
}

export const ViewEditPanel: React.FC<ViewEditPanelProps> = ({ viewUid }) => {
  const todoService = useService(ITodoService)
  const instantiationService = useService(IInstantiationService)
  const dialog = useDesktopDialog()
  const navigate = useNavigate()
  useTodoViewSubscription(viewUid)

  const view = getView(todoService.modelState, viewUid)

  const rule = view?.rule ?? ""
  const ruleError = useMemo(() => {
    if (rule.trim() === "") return null
    const result = compileTaskRule(rule)
    return result.success ? null : renderRuleError(rule, result.error)
  }, [rule])

  const handleDelete = () => {
    dialog({
      title: localize("view.delete.title"),
      description: localize("view.delete.description"),
      onConfirm: () => {
        todoService.deleteView(viewUid)
        navigate("/desktop/inbox")
      },
    })
  }

  const handleMenuClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    DesktopMenuController.create(
      {
        menuConfig: [
          {
            label: localize("view.menu.delete"),
            onSelect: handleDelete,
            icon: "trash",
            danger: true,
          },
        ],
        x: rect.right,
        y: rect.bottom,
      },
      instantiationService,
    )
  }

  const headerActions = [
    {
      icon: <EllipsisVertical />,
      handleClick: handleMenuClick,
      title: localize("common.more"),
    },
  ]

  if (!view) {
    return null
  }

  // Block edits when the persisted view was written by a newer client —
  // letting the user type would either silently downgrade the rule's
  // schemaVersion or wipe out fields this build doesn't know about.
  if (view.schemaVersion > VIEW_SCHEMA_VERSION) {
    return (
      <div className={desktopStyles.DetailViewContainer}>
        <EntityHeader
          variant="detail"
          editable={false}
          renderIcon={() => <ViewIcon />}
          title={view.name}
          placeholder={localize("view.detail.untitled")}
          extraActions={headerActions}
        />
      </div>
    )
  }

  return (
    <div className={desktopStyles.DetailViewContainer}>
      <EntityHeader
        editable
        disableNewLine
        variant="detail"
        inputKey={`view-name:${viewUid}`}
        renderIcon={() => <ViewIcon />}
        title={view.name}
        placeholder={localize("view.detail.untitled")}
        onSave={(value) => todoService.updateView(viewUid, { name: value.trim() })}
        extraActions={headerActions}
      />

      <div className={desktopStyles.DetailViewContent}>
        <div className={desktopStyles.DetailViewContentInner}>
          <NotesField
            value={view.desc}
            onSave={(value) => todoService.updateView(viewUid, { desc: value })}
            placeholder={localize("view.field.descPlaceholder")}
            className={desktopStyles.DetailViewNotesTextarea}
          />

          <div className={desktopStyles.DetailViewDivider} />

          <div className={desktopStyles.ViewRuleHeader}>
            <span className={desktopStyles.ViewRuleHeaderTitle}>{localize("view.field.rule")}</span>
          </div>
          <NotesField
            value={view.rule}
            onSave={(value) => todoService.updateView(viewUid, { rule: value })}
            placeholder={localize("view.field.rulePlaceholder")}
            className={desktopStyles.ViewFieldRuleInput}
          />
          {ruleError && <pre className={desktopStyles.ViewRuleError}>{ruleError}</pre>}
        </div>
      </div>
    </div>
  )
}
