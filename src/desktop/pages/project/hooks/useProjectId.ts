import { useService } from "@/ui/hooks/use-service"
import { useWatchEvent } from "@/ui/hooks/use-watch-event"
import { ITodoService } from "@/services/todo/todoService"
import { useParams } from "react-router"

export const useProjectId = (): string => {
  const { projectUid } = useParams<{ projectUid?: string }>()
  const todoService = useService(ITodoService)
  useWatchEvent(todoService.onStateChange)

  if (!projectUid) {
    return ""
  }

  const projectId = todoService.modelState.taskObjectUidMap.get(projectUid)?.id
  return projectId || ""
}
