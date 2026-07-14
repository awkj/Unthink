// Historical sentinel used by tasks that were placed in the removed Someday list.
// Keep recognizing it so those tasks remain visible in Pending as undated tasks.
export const SOMEDAY_TIMESTAMP = Date.UTC(2999, 11, 31)

export function isSomeday(timestamp: number | null | undefined): boolean {
  return timestamp === SOMEDAY_TIMESTAMP
}
