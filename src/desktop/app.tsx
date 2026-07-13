import { checkPlatform } from "@/ui/browser/checkPlatform"
import { SidebarLayout } from "@/desktop/components/SidebarLayout/SidebarLayout.tsx"
import { desktopStyles } from "@/desktop/theme/main"
import { ImagePreviewOverlay } from "@/desktop/overlay/imagePreview/ImagePreviewOverlay"
import { DatePickerOverlay } from "@/desktop/overlay/datePicker/DatePickerOverlay"
import { DesktopDialog } from "@/desktop/overlay/desktopDialog/DesktopDialog"
import { DesktopMenu } from "@/desktop/overlay/desktopMenu/DesktopMenu.tsx"
import { DesktopMessage } from "@/desktop/overlay/desktopMessage/DesktopMessage"
import { CommandPaletteOverlay } from "@/desktop/overlay/commandPalette/CommandPaletteOverlay"
import { RecurringTaskSettingsOverlay } from "@/desktop/overlay/recurringTaskSettings/RecurringTaskSettingsOverlay"
import { TagEditorOverlay } from "@/desktop/overlay/tagEditor/TagEditorOverlay"
import { TimePickerOverlay } from "@/desktop/overlay/timePicker/TimePickerOverlay"
import { TreeSelectOverlay } from "@/desktop/overlay/treeSelect/TreeSelectOverlay"
import { AreaPage } from "@/desktop/pages/area"
import { Completed } from "@/desktop/pages/completed"
import { FutureProjects } from "@/desktop/pages/futureProjects"
import { Inbox } from "@/desktop/pages/inbox"
import { ProjectPage } from "@/desktop/pages/project"
import { Schedule } from "@/desktop/pages/schedule"
import { AppearanceSettings } from "@/desktop/pages/settings-page/AppearanceSettings"
import { ImportExportSettings } from "@/desktop/pages/settings-page/ImportExportSettings"
import { SelfHostedSyncSettings } from "@/desktop/pages/settings-page/sync/SelfHostedSyncSettings.tsx"
import { AISettings } from "@/desktop/pages/settings-page/AISettings"
import { Today } from "@/desktop/pages/today/today.tsx"
import { AIChat } from "@/desktop/pages/ai-chat"
import { ViewDetailPage } from "@/desktop/pages/views"
import { useInputFocused } from "@/ui/hooks/global/useInputFocused"
import { useService } from "@/ui/hooks/use-service"
import { useSafeArea } from "@/ui/hooks/useSafeArea"
import { IMenuService } from "@/services/menu/menuService"
import { INavigationService } from "@/services/navigationService/navigationService"
import { ITodoService } from "@/services/todo/todoService"
import React, { useEffect } from "react"
import { Navigate, useRoutes, useLocation, useNavigate } from "react-router"

const DesktopNavigationBridge: React.FC = () => {
  const navigate = useNavigate()
  const navigationService = useService(INavigationService)

  useEffect(() => {
    const backDisposable = navigationService.onGoBack(() => {
      if (window.history.state && window.history.state.idx > 0) {
        navigate(-1)
      }
    })

    const forwardDisposable = navigationService.onGoForward(() => {
      navigate(1)
    })

    return () => {
      backDisposable.dispose()
      forwardDisposable.dispose()
    }
  }, [navigate, navigationService])

  return null
}

export const App = () => {
  useInputFocused()
  const { isTauri } = checkPlatform()

  const location = useLocation()
  const menuService = useService(IMenuService)
  const todoService = useService(ITodoService)
  useEffect(() => {
    todoService.clearUndoHistory()
  }, [location.pathname, todoService])

  useEffect(() => {
    menuService.updateMenu()
  }, [menuService])

  useSafeArea()

  const element = useRoutes([
    {
      path: "/desktop",
      children: [
        {
          path: "",
          element: <SidebarLayout setting={false} />,
          children: [
            {
              index: true,
              element: <Navigate to="inbox" replace />,
            },
            {
              path: "ai-chat",
              element: <AIChat />,
            },
            {
              path: "inbox",
              element: <Inbox />,
            },
            {
              path: "today",
              element: <Today />,
            },
            {
              path: "schedule",
              element: <Schedule />,
            },
            {
              path: "completed",
              element: <Completed />,
            },
            {
              path: "future_projects",
              element: <FutureProjects />,
            },
            {
              path: "area/:areaUid",
              element: <AreaPage />,
            },
            {
              path: "project/:projectUid",
              element: <ProjectPage />,
            },
            {
              path: "views/:viewUid",
              element: <ViewDetailPage />,
            },
          ],
        },
        {
          path: "settings",
          element: <SidebarLayout setting={true} />,
          children: [
            {
              path: "",
              children: [
                {
                  index: true,
                  element: <Navigate to="appearance" replace />,
                },
                {
                  path: "appearance",
                  element: <AppearanceSettings />,
                },
                {
                  path: "selfhosted-sync",
                  element: <SelfHostedSyncSettings />,
                },
                {
                  path: "import-export",
                  element: <ImportExportSettings />,
                },
                {
                  path: "ai",
                  element: <AISettings />,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      path: "*",
      element: <Navigate to="/desktop/inbox" replace />,
    },
  ])

  return (
    <div>
      {isTauri && (
        <div
          className={desktopStyles.DragBar}
          data-tauri-drag-region
          style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
        />
      )}
      <DesktopNavigationBridge />
      {element}
      <DesktopMenu />
      <DatePickerOverlay />
      <TimePickerOverlay />
      <TagEditorOverlay />
      <RecurringTaskSettingsOverlay />
      <DesktopDialog />
      <DesktopMessage />
      <ImagePreviewOverlay />
      <TreeSelectOverlay />
      <CommandPaletteOverlay />
    </div>
  )
}
