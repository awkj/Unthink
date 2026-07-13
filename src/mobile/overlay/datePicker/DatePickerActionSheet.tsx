import { formatCalendarMonth } from "@/core/time/formatCalendarMonth"
import type { CalendarWeekStartDay } from "@/core/time/calendarWeekStart"
import { useConfig } from "@/ui/hooks/useConfig"
import { useService } from "@/ui/hooks/use-service"
import { useWatchEvent } from "@/ui/hooks/use-watch-event"
import { ActionSheet } from "@/mobile/components/ActionSheet"
import { styles } from "@/mobile/theme"
import { calendarWeekStartDayConfigKey } from "@/services/config/config"
import { IWorkbenchOverlayService } from "@/services/overlay/WorkbenchOverlayService"
import { OverlayEnum } from "@/services/overlay/overlayEnum"
import React, { useEffect } from "react"
import { List, type ListImperativeAPI, type RowComponentProps, useListRef } from "react-window"
import { DatePickerActionSheetController } from "./DatePickerActionSheetController"
import { DayButton } from "./DayButton"
import { WeekdayHeader } from "./WeekdayHeader"
import { DAY_CELL_HEIGHT, GAP_HEIGHT, ITEM_HEIGHT, MONTH_HEADER_HEIGHT } from "./constant"

interface MonthGridProps {
  days: Array<{
    date: Date
    value: number | null
    isCurrentMonth: boolean
    isSelected: boolean
  }>
  onSelectDate: (date: Date) => void
}

const MonthGrid: React.FC<MonthGridProps> = ({ days, onSelectDate }) => {
  return (
    <div className={`grid grid-cols-7 gap-1 ${styles.datePickerBackground} ${styles.datePickerContentPadding} py-1`}>
      {days.map((day, dayIndex) => (
        <DayButton key={dayIndex} day={day} onSelect={onSelectDate} />
      ))}
    </div>
  )
}

interface MonthRowProps {
  controller: DatePickerActionSheetController
  weekStartDay: CalendarWeekStartDay
}

function MonthRow({ controller, index, style, weekStartDay }: RowComponentProps<MonthRowProps>) {
  const monthData = controller.getMonthData(index, weekStartDay)
  return (
    <div style={style}>
      <div
        className={`flex justify-between items-center sticky top-[00px] ${styles.datePickerHeaderBackground} ${styles.datePickerHeaderPadding} z-10`}
      >
        <span className={`font-medium ${styles.datePickerTitlePadding}`}>{formatCalendarMonth(monthData.date)}</span>
      </div>
      <MonthGrid days={monthData.days} onSelectDate={(date) => controller.selectDate(date)} />
    </div>
  )
}

// Main DatePickerActionSheet component
export const DatePickerActionSheet: React.FC = () => {
  const workbenchOverlayService = useService(IWorkbenchOverlayService)
  useWatchEvent(workbenchOverlayService.onOverlayChange)
  const controller: DatePickerActionSheetController | null = workbenchOverlayService.getOverlay(OverlayEnum.datePicker)
  useWatchEvent(controller?.onStatusChange)
  const { value: weekStartDay } = useConfig(calendarWeekStartDayConfigKey())
  const listRef = useListRef(null) as React.RefObject<ListImperativeAPI | null>

  const getItemSize = (index: number) => {
    if (!controller) return 0
    const rowCount = controller.getMonthRowCount(index, weekStartDay)
    return MONTH_HEADER_HEIGHT + rowCount * (DAY_CELL_HEIGHT + GAP_HEIGHT) + GAP_HEIGHT
  }

  // Scroll to current month when component mounts
  useEffect(() => {
    if (!controller) return
    listRef.current?.scrollToRow({ index: controller.getCurrentMonthIndex(), align: "start" })
  }, [controller, listRef])

  if (!controller) return null

  return (
    <ActionSheet
      zIndex={controller.zIndex}
      onClose={() => controller.dispose()}
      className={styles.datePickerBackground}
      contentClassName={styles.datePickerActionSheetPadding}
    >
      <div>
        <WeekdayHeader weekStartDay={weekStartDay} />
        <List
          listRef={listRef}
          rowComponent={MonthRow}
          rowCount={1000}
          rowHeight={getItemSize}
          rowProps={{ controller, weekStartDay }}
          style={{ height: ITEM_HEIGHT, width: "100%" }}
        />
      </div>
    </ActionSheet>
  )
}
