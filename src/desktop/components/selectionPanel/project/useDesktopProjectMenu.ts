import { getProject } from "@/core/state/getProject"
import { useDesktopDialog } from "@/desktop/overlay/desktopDialog/useDesktopDialog"
import { DesktopMenuController, IMenuConfig } from "@/desktop/overlay/desktopMenu/DesktopMenuController.ts"
import { useService } from "@/ui/hooks/use-service.ts"
import { localize } from "@/nls.ts"
import { ITodoService } from "@/services/todo/todoService.ts"
import { TestIds } from "@/testIds.ts"
import type { TreeID } from "loro-crdt"
import { useNavigate } from "react-router"
import { ICommandService } from "@hamsterbase/foundation/commands"
import { IInstantiationService } from "@hamsterbase/foundation/instantiation"

export const useDesktopProjectMenu = (taskId: TreeID) => {
  const instantiationService = useService(IInstantiationService)
  const todoService = useService(ITodoService)
  const commandService = useService(ICommandService)
  const navigate = useNavigate()
  const dialog = useDesktopDialog()

  const handleCancelProject = () => {
    const project = getProject(todoService.modelState, taskId)
    if (!project) return

    if (project.status === "canceled") return

    const leftProject = project.totalTasks - project.completedTasks

    if (leftProject === 0) {
      todoService.transitionProjectState({ projectId: taskId, projectStatus: "canceled" })
      return
    }

    dialog({
      title: localize("project.cancel_project"),
      description: localize("project.toggle_status_description", { 0: leftProject }),
      hideFooter: true,
      actions: [
        {
          type: "button",
          key: "as_completed",
          size: "medium",
          variant: "solid",
          color: "primary",
          label: localize("tasks.mark_as_completed"),
          onclick: async () => {
            todoService.transitionProjectState({
              projectId: taskId,
              projectStatus: "canceled",
              taskStatus: "completed",
            })
          },
        },
        {
          type: "button",
          key: "as_canceled",
          size: "medium",
          label: localize("tasks.mark_as_canceled"),
          onclick: async () => {
            todoService.transitionProjectState({
              projectId: taskId,
              projectStatus: "canceled",
              taskStatus: "canceled",
            })
          },
        },
        {
          type: "button",
          key: "cancel",
          size: "medium",
          label: localize("common.cancel"),
          onclick: async () => {},
        },
      ],
    })
  }

  const handleAddHeading = () => {
    commandService.executeCommand("CreateHeader")
  }

  const handleDeleteProject = () => {
    dialog({
      title: localize("task.delete_project_confirm_title"),
      description: localize("task.delete_project_confirm_description"),
      onConfirm: () => {
        todoService.deleteItem(taskId)
        navigate("/desktop/inbox")
      },
    })
  }

  function createMenuConfig(): IMenuConfig[] {
    const project = getProject(todoService.modelState, taskId)
    return [
      {
        label: localize("project.add_heading"),
        testId: TestIds.ProjectDetailPanel.AddHeadingMenuItem,
        onSelect: handleAddHeading,
        icon: "heading",
        shortcut: "H",
      },
      {
        label: localize("project.cancel_project"),
        testId: TestIds.ProjectDetailPanel.CancelProjectMenuItem,
        onSelect: handleCancelProject,
        icon: "x-circle",
        disabled: project?.status === "canceled",
        dividerAbove: true,
      },
      {
        label: localize("task.delete_project"),
        onSelect: handleDeleteProject,
        icon: "trash",
        dividerAbove: true,
        danger: true,
      },
    ]
  }

  function openDesktopProjectMenu(x: number, y: number) {
    const menuConfig = createMenuConfig()
    DesktopMenuController.create(
      {
        menuConfig,
        x,
        y,
      },
      instantiationService,
    )
  }

  return {
    openDesktopProjectMenu: openDesktopProjectMenu,
  }
}
