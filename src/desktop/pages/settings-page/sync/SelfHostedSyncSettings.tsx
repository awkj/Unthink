import { CloseIcon } from "@/ui/components/icons"
import { InfoItem } from "@/desktop/components/InfoItem"
import { SettingButton } from "@/desktop/components/settings/Button/Button"
import { ItemGroup } from "@/desktop/components/settings/ItemGroup"
import { SettingsContent } from "@/desktop/components/settings/SettingsContent/SettingsContent"
import { SettingsEmptyStateAction } from "@/desktop/components/settings/SettingsEmptyStateAction"
import { SettingsItem } from "@/desktop/components/settings/SettingsItem"
import { useDesktopMessage } from "@/desktop/overlay/desktopMessage/useDesktopMessage"
import { desktopStyles } from "@/desktop/theme/main"
import { useService } from "@/ui/hooks/use-service"
import { useWatchEvent } from "@/ui/hooks/use-watch-event"
import { localize } from "@/nls"
import { useAddSelfhostedServer } from "@/services/selfhostedSync/useAddSelfhostedServer"
import { ISelfhostedSyncService } from "@/services/selfhostedSync/selfhostedSyncService"
import React, { useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router"
import { TestIds } from "@/testIds"

export const SelfHostedSyncSettings: React.FC = () => {
  const selfhostedSyncService = useService(ISelfhostedSyncService)
  useWatchEvent(selfhostedSyncService.onStateChange)
  const showMessage = useDesktopMessage()
  const location = useLocation()
  const navigate = useNavigate()
  const [endpoint, setEndpoint] = useState("")
  const [authToken, setAuthToken] = useState("")
  const [folder, setFolder] = useState("")
  const {
    syncButtonLabel,
    pageTitle,
    disabledStateMessage,
    formItemsLabel,
    handleRemoveServer,
    handleSetSyncEnabled,
    handleSync,
    deleteButtonLabel,
  } = useAddSelfhostedServer({
    toast(type, message) {
      showMessage({
        type: type,
        message,
      })
    },
    handleAddServerDialog() {
      // The desktop settings page uses an inline dialog to stay pixel-aligned with ui-pc.
    },
  })
  const emptyStateTitle = localize("sync.selfHostedServer")
  const emptyStateDescription = localize("sync.selfHostedNoConfigDescription")
  const addServerButtonLabel = localize("sync.addServer")
  const addServerDialogTitle = localize("sync.selfHosted.add")
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const dialog = searchParams.get("dialog")
  const isAddServerDialogVisible = dialog === "add-server"
  const isEditServerDialogVisible = dialog === "edit-server"
  const isServerDialogVisible = isAddServerDialogVisible || isEditServerDialogVisible
  const serverSavedMessage = isEditServerDialogVisible
    ? localize("sync.updateServerSuccess")
    : localize("sync.addServerSuccess")
  const authTokenPlaceholder = isEditServerDialogVisible
    ? localize("sync.authTokenUpdatePlaceholder")
    : localize("sync.authTokenPlaceholder")
  const confirmButtonLabel = isEditServerDialogVisible ? localize("common.save") : localize("confirm")
  const isEndpointValid = useMemo(() => {
    if (!endpoint.trim()) return false
    try {
      new URL(endpoint.trim())
      return true
    } catch {
      return false
    }
  }, [endpoint])
  const isServerFormValid =
    isEndpointValid && folder.trim() !== "" && (isEditServerDialogVisible || authToken.trim() !== "")

  const openAddServerDialog = () => {
    setEndpoint("")
    setAuthToken("")
    setFolder("")
    navigate(`${location.pathname}?dialog=add-server`)
  }

  const openEditServerDialog = () => {
    const config = selfhostedSyncService.config
    if (!config) return
    setEndpoint(config.entrypoint)
    setAuthToken("")
    setFolder(config.folder)
    navigate(`${location.pathname}?dialog=edit-server`)
  }

  const closeAddServerDialog = () => {
    navigate(location.pathname, { replace: true })
  }

  const handleConfirmServer = async () => {
    if (!isServerFormValid) return

    try {
      const currentConfig = selfhostedSyncService.config
      if (isEditServerDialogVisible && currentConfig) {
        await selfhostedSyncService.updateServer({
          type: "selfhosted",
          entrypoint: endpoint.trim(),
          authToken: authToken.trim() || currentConfig.authToken,
          folder: folder.trim(),
        })
      } else {
        await selfhostedSyncService.addServer({
          type: "selfhosted",
          entrypoint: endpoint.trim(),
          authToken: authToken.trim(),
          folder: folder.trim(),
        })
      }
      showMessage({
        type: "success",
        message: serverSavedMessage,
      })
      setEndpoint("")
      setAuthToken("")
      setFolder("")
      closeAddServerDialog()
    } catch (error) {
      showMessage({
        type: "error",
        message: (error as Error).message,
      })
    }
  }

  const renderDisabledView = () => {
    if (selfhostedSyncService.enabled) {
      if (selfhostedSyncService.hasServer) {
        const config = selfhostedSyncService.config
        if (!config) return null
        return (
          <>
            <ItemGroup>
              <SettingsItem
                title={formItemsLabel.selfHosted}
                description={localize("sync.serverInfoDescription")}
                action={{
                  type: "button",
                  label: localize("sync.editServer"),
                  onClick: openEditServerDialog,
                  disabled: selfhostedSyncService.syncing,
                }}
              />
              <InfoItem label={formItemsLabel.endpoint} value={config.entrypoint} />
              <InfoItem label={formItemsLabel.folderName} value={config.folder} />
            </ItemGroup>
            <ItemGroup>
              <SettingsItem
                title={localize("sync.syncEnabled")}
                description={localize("sync.syncEnabled.description")}
                action={{
                  type: "switch",
                  currentValue: selfhostedSyncService.syncEnabled,
                  onChange: (enabled) => void handleSetSyncEnabled(enabled),
                  disabled: selfhostedSyncService.syncing,
                }}
              />
              <InfoItem
                label={localize("sync.status")}
                value={
                  !selfhostedSyncService.syncEnabled
                    ? localize("sync.paused")
                    : (selfhostedSyncService.lastError ??
                      (selfhostedSyncService.lastSyncedAt
                        ? localize("sync.lastSyncedAt", {
                            0: new Date(selfhostedSyncService.lastSyncedAt).toLocaleString(),
                          })
                        : localize("sync.notSyncedYet")))
                }
              />
              <SettingsItem
                title={localize("sync.syncNow")}
                description={localize("sync.manualSyncDescription")}
                action={{
                  type: "button",
                  label: syncButtonLabel,
                  onClick: handleSync,
                  disabled: !selfhostedSyncService.syncEnabled || selfhostedSyncService.syncing,
                }}
              />
            </ItemGroup>
            <ItemGroup>
              <div className={desktopStyles.SettingsItemContainer}>
                <div className={desktopStyles.SettingsItemContentWrapper}>
                  <span className={desktopStyles.SettingsItemTitle}>{deleteButtonLabel}</span>
                  <span className={desktopStyles.SettingsItemDescription}>
                    {localize("sync.deleteServer.description")}
                  </span>
                </div>
                <div className={desktopStyles.SettingsItemActionWrapper}>
                  <SettingButton color="danger" size="small" onClick={handleRemoveServer} inline>
                    {deleteButtonLabel}
                  </SettingButton>
                </div>
              </div>
            </ItemGroup>
          </>
        )
      } else {
        return (
          <ItemGroup>
            <div className={desktopStyles.SettingsItemContainer}>
              <div className={desktopStyles.SettingsItemContentWrapper}>
                <span className={desktopStyles.SettingsItemTitle}>{emptyStateTitle}</span>
                <span className={desktopStyles.SettingsItemDescription}>{emptyStateDescription}</span>
              </div>
              <div className={desktopStyles.SettingsItemActionWrapper}>
                <SettingsEmptyStateAction onClick={openAddServerDialog}>
                  {addServerButtonLabel}
                </SettingsEmptyStateAction>
              </div>
            </div>
          </ItemGroup>
        )
      }
    }

    return (
      <ItemGroup>
        <div className={desktopStyles.SettingsDisabledStateContainer}>
          <p className={desktopStyles.SettingsDisabledStateText}>{disabledStateMessage}</p>
        </div>
      </ItemGroup>
    )
  }

  return (
    <SettingsContent title={pageTitle}>
      {renderDisabledView()}
      {isServerDialogVisible && (
        <div className={desktopStyles.SettingsDialogRoot}>
          <div className={desktopStyles.SettingsDialogBackdrop} onClick={closeAddServerDialog} />
          <div className={desktopStyles.SettingsDialogSurface} data-test-id={TestIds.DesktopDialog.Container}>
            <div className={desktopStyles.SettingsDialogHeader}>
              <h3 className={desktopStyles.SettingsDialogTitle}>
                {isEditServerDialogVisible ? localize("sync.editServerTitle") : addServerDialogTitle}
              </h3>
              <button
                type="button"
                className={desktopStyles.SettingsDialogCloseButton}
                onClick={closeAddServerDialog}
                aria-label={localize("common.close")}
              >
                <CloseIcon className={desktopStyles.SettingsDialogCloseIcon} strokeWidth={1.75} />
              </button>
            </div>
            <div className={desktopStyles.SettingsDialogContent}>
              <div className={desktopStyles.SettingsDialogActions}>
                <div className={desktopStyles.SettingsDialogField}>
                  <label className={desktopStyles.SettingsDialogLabel}>
                    {formItemsLabel.endpoint}
                    <span className={desktopStyles.SettingsDialogRequired}>*</span>
                  </label>
                  <input
                    type="url"
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    className={desktopStyles.SettingsDialogInput}
                    placeholder="https://your-server.com"
                  />
                </div>
                <div className={desktopStyles.SettingsDialogField}>
                  <label className={desktopStyles.SettingsDialogLabel}>
                    {formItemsLabel.authToken}
                    {!isEditServerDialogVisible && <span className={desktopStyles.SettingsDialogRequired}>*</span>}
                  </label>
                  <input
                    type="password"
                    value={authToken}
                    onChange={(e) => setAuthToken(e.target.value)}
                    className={desktopStyles.SettingsDialogInput}
                    placeholder={authTokenPlaceholder}
                  />
                </div>
                <div className={desktopStyles.SettingsDialogField}>
                  <label className={desktopStyles.SettingsDialogLabel}>
                    {formItemsLabel.folderName}
                    <span className={desktopStyles.SettingsDialogRequired}>*</span>
                  </label>
                  <input
                    type="text"
                    value={folder}
                    onChange={(e) => setFolder(e.target.value)}
                    className={desktopStyles.SettingsDialogInput}
                    placeholder={localize("sync.folderNamePlaceholder")}
                  />
                </div>
              </div>
            </div>
            <div className={desktopStyles.SettingsDialogFooter}>
              <button type="button" className={desktopStyles.SettingsDialogCancelButton} onClick={closeAddServerDialog}>
                {localize("common.cancel")}
              </button>
              <button
                type="button"
                className={desktopStyles.SettingsDialogConfirmButton}
                disabled={!isServerFormValid || selfhostedSyncService.syncing}
                onClick={handleConfirmServer}
              >
                {confirmButtonLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </SettingsContent>
  )
}
