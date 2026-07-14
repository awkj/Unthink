import { getTodayTimestampInUtc } from "@/core/time/getTodayTimestampInUtc"
import { SOMEDAY_TIMESTAMP } from "@/core/time/someday"
import { getViewItems } from "@/core/state/views/getViewItems"
import { EntityHeader } from "@/desktop/components/common/EntityHeader"
import { DesktopPage } from "@/desktop/components/DesktopPage"
import { TagFilterBar } from "@/desktop/components/filter/TagFilterBar"
import { useTagFilter } from "@/desktop/components/filter/useTagFilter"
import { ListContainer } from "@/desktop/components/listContainer/ListContainer"
import { TaskListItem } from "@/desktop/components/todo/TaskListItem"
import { TodayGroupHeader } from "@/desktop/components/todo/TodayGroupHeader"
import { useDesktopTaskDisplaySettings } from "@/desktop/hooks/useDesktopTaskDisplaySettings"
import { desktopStyles } from "@/desktop/theme/main"
import { localize } from "@/nls"
import { IListService } from "@/services/list/listService"
import { ITodoService } from "@/services/todo/todoService"
import { TestIds } from "@/testIds"
import { Funnel, ThingsAnytimeIcon } from "@/ui/components/icons"
import { TaskList } from "@/ui/components/taskList/taskList"
import { useService } from "@/ui/hooks/use-service"
import { useWatchEvent } from "@/ui/hooks/use-watch-event"
import { useSynchronizeState } from "@/ui/hooks/useSyncedState"
import { DndContext } from "@dnd-kit/core"
import type { TreeID } from "loro-crdt"
import React, { useEffect, useState } from "react"

function isSameTags(a: string[], b: string[]) {
  if (a.length !== b.length) return false
  return a.every((tag, index) => tag === b[index])
}

interface BuiltInViewProps {
  emptyLabel: string
  icon: React.ReactNode
  listName: string
  rule: string
  title: string
}

const BuiltInView: React.FC<BuiltInViewProps> = ({ emptyLabel, icon, listName, rule, title }) => {
  const todoService = useService(ITodoService)
  const listService = useService(IListService)
  useWatchEvent(todoService.onStateChange)
  useWatchEvent(listService.onMainListChange)

  const { showCompletedTasks, completedAfter, openTaskDisplaySettings } = useDesktopTaskDisplaySettings(listName, {
    hideShowFutureTasks: true,
  })
  const [allTags, setAllTags] = useState<string[]>([])
  const tagFilter = useTagFilter(allTags)
  const today = getTodayTimestampInUtc()
  const viewItems = getViewItems(
    rule,
    todoService.modelState,
    today,
    {
      showCompletedTasks,
      showFutureTasks: true,
      currentDate: today,
      completedAfter,
      recentChangedTaskSet: new Set<TreeID>(todoService.keepAliveElements as TreeID[]),
    },
    tagFilter.currentTag,
  )

  useSynchronizeState(setAllTags, viewItems.allTags, isSameTags)

  const itemIdsKey = viewItems.itemIds.join(",")
  useEffect(() => {
    if (listService.mainList?.name === listName) {
      listService.mainList.updateItems(viewItems.itemIds)
    } else {
      listService.setMainList(new TaskList(listName, viewItems.itemIds, [], null, null))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listService, listName, itemIdsKey])

  const mainListReady = listService.mainList?.name === listName
  const isTagFilterActive = tagFilter.currentTag.type !== "all"

  return (
    <DesktopPage
      header={
        <EntityHeader
          renderIcon={() => icon}
          title={title}
          extraActions={[
            {
              icon: <Funnel strokeWidth={1.5} />,
              handleClick: tagFilter.clickFilter,
              title: localize("tasks.filterByTag"),
              testId: TestIds.EntityHeader.FilterToggleButton,
              isActive: tagFilter.isFilterOpen || isTagFilterActive,
            },
          ]}
          internalActions={{ displaySettings: { onOpen: (right, bottom) => openTaskDisplaySettings(right, bottom) } }}
          titleDetail={
            tagFilter.isFilterOpen ? (
              <TagFilterBar tags={tagFilter.tags} selected={tagFilter.currentTag} onSelect={tagFilter.selectTag} />
            ) : null
          }
        />
      }
    >
      {viewItems.items.length === 0 && <div className={desktopStyles.ViewDetailEmpty}>{emptyLabel}</div>}
      {viewItems.items.length > 0 && mainListReady && (
        <DndContext>
          <ListContainer taskList={listService.mainList}>
            {viewItems.groups.map((group) => (
              <React.Fragment key={group.id}>
                {group.kind !== "noParent" && (
                  <TodayGroupHeader id={group.id} variant={group.kind} title={group.title} />
                )}
                {group.tasks.map((task) => (
                  <TaskListItem
                    key={task.id}
                    task={task}
                    taskList={listService.mainList!}
                    willDisappear={viewItems.willDisappearObjectIdSet.has(task.id)}
                    disableDrag
                    hideProjectTitle
                  />
                ))}
              </React.Fragment>
            ))}
          </ListContainer>
        </DndContext>
      )}
    </DesktopPage>
  )
}

export const Pending = () => (
  <BuiltInView
    listName="Pending"
    rule={`item.status === 'created' && (item.startDate === null || item.startDate === ${SOMEDAY_TIMESTAMP})`}
    title={localize("pending")}
    emptyLabel={localize("pending.empty")}
    icon={<ThingsAnytimeIcon />}
  />
)
