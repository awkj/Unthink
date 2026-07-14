import { SettingsIcon } from "@/ui/components/icons"
import { encodePatch } from "@/core/export/encode"
import { useService } from "@/ui/hooks/use-service.ts"
import { ListItemGroup } from "@/mobile/components/listItem/listItem"
import { PageLayout } from "@/mobile/components/PageLayout.tsx"
import { useToast } from "@/mobile/overlay/toast/useToast"
import { localize } from "@/nls.ts"
import { ITodoService } from "@/services/todo/todoService"

export const ExportSettings = () => {
  const todoService = useService(ITodoService)
  const toast = useToast()
  const handleExport = async () => {
    try {
      const { content, dataStr } = encodePatch(todoService.exportPatch({}, todoService.storageId))
      void content
      const downloadAnchorNode = document.createElement("a")
      downloadAnchorNode.setAttribute("href", dataStr)
      downloadAnchorNode.setAttribute("download", "todo-export.hbTask")
      document.body.appendChild(downloadAnchorNode)
      downloadAnchorNode.click()
      downloadAnchorNode.remove()
    } catch (error) {
      toast({ message: (error as Error).message })
    }
  }

  return (
    <PageLayout
      header={{
        showBack: true,
        id: "export",
        title: localize("settings.export"),
        renderIcon: (className: string) => <SettingsIcon className={className} />,
      }}
    >
      <ListItemGroup
        items={[
          {
            title: localize("settings.export"),
            mode: {
              type: "button",
              theme: "primary",
              align: "center",
            },
            onClick: handleExport,
          },
        ]}
        subtitle={localize("settings.export.description")}
      />
    </PageLayout>
  )
}
