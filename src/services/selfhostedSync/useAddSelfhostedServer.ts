import { DialogAction, DialogActionValue } from "@/ui/types/dialog"
import { useService } from "@/ui/hooks/use-service"
import { useWatchEvent } from "@/ui/hooks/use-watch-event"
import { localize } from "@/nls"
import { ISelfhostedSyncService } from "./selfhostedSyncService"

interface AddServerDialog {
  title: string
  actions: DialogAction[]
  onConfirm(values: DialogActionValue): Promise<void>
}

interface UseAddSelfhostedServerOptions {
  toast(type: "success" | "error", message: string): void
  handleAddServerDialog(options: AddServerDialog): void
}

export const selfhostedSyncPageTitle = localize("sync.serverSettings")

export const useAddSelfhostedServer = (options: UseAddSelfhostedServerOptions) => {
  const selfhostedSyncService = useService(ISelfhostedSyncService)
  useWatchEvent(selfhostedSyncService.onStateChange)

  const title = localize("sync.selfHosted.add")
  const isValidUrl = (url: string): string | undefined => {
    try {
      new URL(url)
      return undefined
    } catch {
      return localize("sync.error.invalidEndpoint")
    }
  }
  const actions: DialogAction[] = [
    {
      key: "endpoint",
      type: "input",
      label: localize("sync.endpoint"),
      placeholder: "https://your-server.com",
      inputType: "url",
      required: true,
      validation: isValidUrl,
    },
    {
      key: "authToken",
      type: "input",
      label: localize("sync.authToken"),
      placeholder: localize("sync.authTokenPlaceholder"),
      inputType: "password",
      required: true,
    },
    {
      key: "folderName",
      type: "input",
      label: localize("sync.folderName"),
      placeholder: localize("sync.folderNamePlaceholder"),
      required: true,
    },
  ] as const

  const addButtonLabel = localize("sync.selfHosted.add")

  const syncButtonLabel = selfhostedSyncService.syncing ? localize("sync.syncing") : localize("sync.syncNow")

  const emptyStateMessage = localize("sync.selfHostedNoConfigDescription")

  const disabledStateMessage = localize("sync.selfHostedOnlyLocalDatabase")

  const formItemsLabel = {
    serverType: localize("sync.serverType"),
    endpoint: localize("sync.endpoint"),
    selfHosted: localize("sync.selfHostedServer"),
    authToken: localize("sync.authToken"),
    folderName: localize("sync.folderName"),
  }

  const handleRemoveServer = async () => {
    try {
      await selfhostedSyncService.removeServer()
      options.toast("success", localize("sync.deleteConfigSuccess"))
    } catch (error) {
      options.toast("error", (error as Error).message)
    }
  }

  const handleSetSyncEnabled = async (enabled: boolean) => {
    try {
      await selfhostedSyncService.setSyncEnabled(enabled)
      options.toast("success", enabled ? localize("sync.resumeSuccess") : localize("sync.pauseSuccess"))
    } catch (error) {
      options.toast("error", (error as Error).message)
    }
  }

  const handleSync = async () => {
    if (selfhostedSyncService.syncing) return
    try {
      await selfhostedSyncService.sync()
      options.toast("success", localize("sync.syncSuccess"))
    } catch (error) {
      options.toast("error", (error as Error).message)
    }
  }

  const onAddServer = () => {
    options.handleAddServerDialog({
      title: title,
      actions: actions,
      onConfirm: async (values) => {
        try {
          await selfhostedSyncService.addServer({
            type: "selfhosted",
            folder: values.folderName as string,
            entrypoint: values.endpoint as string,
            authToken: values.authToken as string,
          })
          options.toast("success", localize("sync.addServerSuccess"))
        } catch (error) {
          options.toast("error", (error as Error).message)
          throw error
        }
      },
    })
  }

  const deleteButtonLabel = localize("sync.deleteServer")

  return {
    title,
    actions,
    pageTitle: localize("sync.serverSettings"),
    addButtonLabel,
    syncButtonLabel,
    emptyStateMessage,
    disabledStateMessage,
    formItemsLabel,
    deleteButtonLabel,
    handleRemoveServer,
    handleSetSyncEnabled,
    handleSync,
    onAddServer,
  }
}
