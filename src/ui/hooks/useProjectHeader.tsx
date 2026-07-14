import { ArchiveIcon, DeleteIcon, MoveIcon, EditIcon } from "@/ui/components/icons"
import { ProjectHeadingInfo } from "@/core/state/type"
import { MobileProjectCheckbox } from "@/mobile/components/icon/MobileProjectCheckbox"
import { useDialog } from "@/mobile/overlay/dialog/useDialog"
import { usePopupAction } from "@/mobile/overlay/popupAction/usePopupAction"
import { useProjectAreaSelector } from "@/mobile/overlay/projectAreaSelector/useProjectAreaSelector"
import { localize } from "@/nls"
import { ITodoService } from "@/services/todo/todoService"
import { TreeID } from "loro-crdt"
import { useService } from "./use-service"
import { useToast } from "@/mobile/overlay/toast/useToast"

interface IUseProjectHeaderOptions {
  projectHeadingInfo: ProjectHeadingInfo
}

export const useProjectHeader = (options: IUseProjectHeaderOptions) => {
  const { projectHeadingInfo } = options
  const popupAction = usePopupAction()
  const todoService = useService(ITodoService)
  const dialog = useDialog()
  const toast = useToast()
  const projectAreaSelector = useProjectAreaSelector()

  function handleDeleteHeading() {
    dialog({
      title: localize("project_heading.delete_heading"),
      description: localize("project_heading.delete_heading_description"),
      confirmText: localize("project_heading.delete"),
      onConfirm: () => {
        todoService.deleteItem(projectHeadingInfo.id)
      },
      onCancel: () => {},
    })
  }

  function handleConvertToProject() {
    dialog({
      title: localize("project_heading.convert_to_project"),
      description: localize("project_heading.convert_to_project_description"),
      confirmText: localize("project_heading.convert"),
      onConfirm: () => {
        todoService.covertToProject(projectHeadingInfo.id)
      },
      onCancel: () => {},
    })
  }

  const handleMoveToProject = () => {
    projectAreaSelector({
      currentItemId: projectHeadingInfo.id,
      onConfirm: (id: TreeID | null) => {
        if (!id) {
          return
        }
        todoService.updateProjectHeading(projectHeadingInfo.id, {
          position: { parentId: id, type: "firstElement" },
        })
        toast({
          message: localize("move_success"),
        })
      },
    })
  }

  function handleArchiveHeading() {
    const isArchived = projectHeadingInfo.isArchived
    todoService.updateProjectHeading(projectHeadingInfo.id, {
      archivedDate: isArchived ? null : Date.now(),
    })
  }

  function handleMenuClick() {
    popupAction({
      groups: [
        {
          items: [
            {
              icon: <EditIcon />,
              name: localize("project_heading.edit_title"),
              onClick: () => {
                todoService.editItem(projectHeadingInfo.id)
              },
            },
            {
              icon: <MobileProjectCheckbox progress={60} status={"created"} size="large" />,
              name: localize("project_heading.convert_to_project"),
              onClick: handleConvertToProject,
            },
            {
              icon: <MoveIcon />,
              name: localize("project_heading.move"),
              onClick: handleMoveToProject,
            },
            {
              icon: <ArchiveIcon />,
              name: projectHeadingInfo.isArchived
                ? localize("project_heading.unarchive")
                : localize("project_heading.archive"),
              onClick: handleArchiveHeading,
            },
          ],
        },
        {
          items: [
            {
              icon: <DeleteIcon />,
              name: localize("project_heading.delete_heading"),
              danger: true,
              onClick: handleDeleteHeading,
            },
          ],
        },
      ],
    })
  }

  return {
    projectHeadingInfo,
    handleMenuClick,
  }
}
