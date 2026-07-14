import { PROJECT_COMMIT_HASH } from "@/core/version"
import { ListItemGroup, ListItemOption } from "@/mobile/components/listItem/listItem"
import { useNavigate } from "react-router"
import { SettingsIcon } from "@/ui/components/icons"
import { localize } from "../../../nls"
import { PageLayout } from "../../components/PageLayout"

export const AboutPage = () => {
  const navigate = useNavigate()

  const items: ListItemOption[] = [
    {
      title: localize("settings.about.commit"),
      mode: {
        type: "label",
        label: PROJECT_COMMIT_HASH.slice(0, 16),
      },
    },
    {
      title: localize("settings.feedback"),
      onClick: () => navigate("/settings/feedback"),
      mode: {
        type: "navigation",
      },
    },
  ]

  return (
    <PageLayout
      header={{
        showBack: true,
        id: "about",
        title: localize("settings.about"),
        renderIcon: (className: string) => <SettingsIcon className={className} />,
      }}
    >
      <ListItemGroup items={items} />
    </PageLayout>
  )
}
