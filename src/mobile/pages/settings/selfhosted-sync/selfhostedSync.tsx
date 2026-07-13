import { CircleCheckIcon, CloudSlashIcon, SettingsIcon } from "@/ui/components/icons"
import { useService } from "@/ui/hooks/use-service"
import { useWatchEvent } from "@/ui/hooks/use-watch-event"
import { localize } from "@/nls"
import { ListItemGroup, ListItemOption } from "@/mobile/components/listItem/listItem"
import { PageState } from "@/mobile/components/page-state"
import { PageLayout } from "@/mobile/components/PageLayout"
import { useDialog } from "@/mobile/overlay/dialog/useDialog"
import { useToast } from "@/mobile/overlay/toast/useToast"
import { styles } from "@/mobile/theme"
import { useAddSelfhostedServer } from "@/services/selfhostedSync/useAddSelfhostedServer"
import { ISelfhostedSyncService } from "@/services/selfhostedSync/selfhostedSyncService.ts"

export const SelfhostedSync = () => {
  const selfhostedSyncService = useService(ISelfhostedSyncService)
  useWatchEvent(selfhostedSyncService.onStateChange)
  const dialog = useDialog()

  const toast = useToast()
  const {
    deleteButtonLabel,
    pageTitle,
    disabledStateMessage,
    emptyStateMessage,
    addButtonLabel,
    syncButtonLabel,
    formItemsLabel,
    handleDeleteServer,
    handleSync,
    onAddServer,
  } = useAddSelfhostedServer({
    toast(_type, message) {
      toast({ message })
    },
    handleAddServerDialog(options) {
      dialog(options)
    },
  })

  const renderPageContent = () => {
    if (!selfhostedSyncService.enabled) {
      return (
        <div className={styles.settingsPageSections}>
          <PageState label={disabledStateMessage} />
        </div>
      )
    }
    if (selfhostedSyncService.hasServer) {
      const configItems: ListItemOption[] = [
        {
          title: formItemsLabel.serverType,
          description: formItemsLabel.selfHosted,
          mode: {
            type: "label",
            label: "",
          },
        },
        {
          title: formItemsLabel.endpoint,
          description: selfhostedSyncService.config?.entrypoint || "",
          mode: {
            type: "label",
            label: "",
          },
        },
        {
          title: formItemsLabel.folderName,
          description: selfhostedSyncService.config?.folder || "",
          mode: {
            type: "label",
            label: "",
          },
        },
        {
          title: localize("sync.status", "Sync Status"),
          description:
            selfhostedSyncService.lastError ??
            (selfhostedSyncService.lastSyncedAt
              ? localize(
                  "sync.lastSyncedAt",
                  "Last synced: {0}",
                  new Date(selfhostedSyncService.lastSyncedAt).toLocaleString(),
                )
              : localize("sync.notSyncedYet", "Not synced yet")),
          mode: {
            type: "label",
            label: "",
          },
        },
      ]

      const actionItems: ListItemOption[] = [
        {
          icon: <CircleCheckIcon className={styles.settingsDatabaseIcon} />,
          title: syncButtonLabel,
          onClick: handleSync,
          mode: {
            type: "button",
            theme: "primary",
            align: "center",
          },
        },
        {
          icon: <CloudSlashIcon className={styles.settingsDatabaseIcon} />,
          title: deleteButtonLabel,
          onClick: handleDeleteServer,
          mode: {
            type: "button",
            theme: "danger",
            align: "center",
          },
        },
      ]

      return (
        <div className={styles.settingsPageSections}>
          <ListItemGroup items={configItems} />
          <ListItemGroup items={actionItems} />
        </div>
      )
    }

    const createItem: ListItemOption = {
      title: addButtonLabel,
      onClick: onAddServer,
      mode: {
        type: "button",
        theme: "primary",
        align: "center",
      },
    }

    return (
      <div className={styles.settingsPageSections}>
        <PageState label={emptyStateMessage} />
        <ListItemGroup items={[createItem]} />
      </div>
    )
  }

  return (
    <PageLayout
      header={{
        showBack: true,
        id: "selfhosted-sync-settings",
        title: pageTitle,
        renderIcon: (className: string) => <SettingsIcon className={className} />,
      }}
    >
      {renderPageContent()}
    </PageLayout>
  )
}
