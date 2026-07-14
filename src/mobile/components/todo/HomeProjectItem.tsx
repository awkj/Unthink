import { ProjectInfoState } from "@/core/state/type.ts"
import { useService } from "@/ui/hooks/use-service"
import { MobileTestIds } from "@/mobile/testids"
import { useCancelEdit } from "@/ui/hooks/useCancelEdit"
import { useEdit } from "@/ui/hooks/useEdit"
import { styles } from "@/mobile/theme"
import { localize } from "@/nls"
import { ITodoService } from "@/services/todo/todoService"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import classNames from "classnames"
import React from "react"
import { DragItem } from "../dnd/DragItem"
import { TaskItemCompletionAt } from "../taskItem/taskItemCompletionAt"
import { TaskItemDueDate } from "../taskItem/TaskItemDueDate"
import { TaskItemIcons } from "../taskItem/TaskItemIcons"
import { TaskItemSubtitle } from "../taskItem/TaskItemSubtitle"
import { TaskItemTitle } from "../taskItem/taskItemTitle"
import useNavigate from "@/ui/hooks/useNavigate"
import { MobileProjectCheckbox } from "../icon/MobileProjectCheckbox"

interface ProjectItemProps {
  projectInfo: ProjectInfoState
  hideSubtitle?: boolean
  className?: string
}

export const HomeProjectItem: React.FC<ProjectItemProps> = ({ projectInfo, hideSubtitle, className }) => {
  const navigate = useNavigate()
  const todoService = useService(ITodoService)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, node } = useSortable({
    id: projectInfo.id,
  })
  const { itemClassName, shouldIgnoreClick, isEditing, endEditing } = useCancelEdit(node, projectInfo.id)
  const { textAreaProps } = useEdit({
    isEditing,
    title: projectInfo.title,
    onSave: (title: string) => {
      todoService.updateProject(projectInfo.id, { title })
    },
    singleLine: true,
    onConfirm: endEditing,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  const titleNode = isEditing ? (
    <input {...textAreaProps} className={styles.homeProjectItemEditingInput} />
  ) : (
    <TaskItemTitle
      testId={MobileTestIds.ProjectItem.Title}
      title={projectInfo.title}
      isCanceled={projectInfo.status === "canceled"}
      isCompleted={projectInfo.status === "completed"}
      emptyText={localize("project.untitled")}
    />
  )

  if (isDragging) {
    return <DragItem ref={setNodeRef} attributes={attributes} listeners={listeners} style={style} />
  }

  return (
    <div
      data-testid={MobileTestIds.ProjectItem.Root}
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={classNames(styles.homeProjectItemRoot, itemClassName, className, {
        [styles.taskItemEditingShadow]: isEditing,
        [styles.taskItemEditingRound]: isEditing,
      })}
      onClick={(e) => {
        if (shouldIgnoreClick(e)) {
          return
        }
        navigate({ path: `/project/${projectInfo.uid}` })
      }}
    >
      <button className={classNames(styles.taskItemIconSize)}>
        <MobileProjectCheckbox status={projectInfo.status} progress={projectInfo.progress} />
      </button>
      <div className={styles.homeProjectItemContent}>
        <div className={styles.homeProjectItemTitleRow}>
          {titleNode}
          {!isEditing && (
            <>
              <div className={styles.homeProjectItemMetaIcons}>
                <TaskItemIcons tags={projectInfo.tags} notes={projectInfo.notes} navIcon={false} />
              </div>
            </>
          )}
        </div>
        {!hideSubtitle && projectInfo.areaTitle && <TaskItemSubtitle title={projectInfo.areaTitle} />}
      </div>
      <TaskItemCompletionAt completionAt={projectInfo.completionAt} status={projectInfo.status} />
      {projectInfo.status === "created" && <TaskItemDueDate dueDate={projectInfo.dueDate} />}
    </div>
  )
}
