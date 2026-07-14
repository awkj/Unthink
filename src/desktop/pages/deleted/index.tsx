import { EntityHeader } from "@/desktop/components/common/EntityHeader"
import { DesktopPage } from "@/desktop/components/DesktopPage"
import { desktopStyles } from "@/desktop/theme/main"
import { localize } from "@/nls"
import { ThingsDeletedIcon } from "@/ui/components/icons"

export const Deleted = () => (
  <DesktopPage
    header={<EntityHeader renderIcon={() => <ThingsDeletedIcon />} title={localize("deleted")} />}
    showDetailPanel={false}
  >
    <div className={desktopStyles.ViewDetailEmpty}>{localize("deleted.empty")}</div>
  </DesktopPage>
)
