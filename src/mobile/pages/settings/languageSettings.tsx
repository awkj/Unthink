import { ListItemGroup } from "@/mobile/components/listItem/listItem"
import { getCurrentLocale } from "@/locales/common/locale"
import { SettingsIcon } from "@/ui/components/icons"
import { localize } from "../../../nls"
import { PageLayout } from "../../components/PageLayout"

export const LanguageSettings = () => {
  const currentLanguage = getCurrentLocale()

  const changeLanguage = (lang: string) => {
    localStorage.setItem("language", lang)
    window.location.reload()
  }

  return (
    <PageLayout
      header={{
        showBack: true,
        id: "language",
        title: localize("settings.language"),
        renderIcon: (className: string) => <SettingsIcon className={className} />,
      }}
    >
      <ListItemGroup
        items={[
          {
            title: localize("settings.language.english"),
            mode: {
              type: "check",
              checked: currentLanguage === "en-US",
            },
            onClick: () => changeLanguage("en"),
          },
          {
            title: "简体中文",
            mode: {
              type: "check",
              checked: currentLanguage === "zh-CN",
            },
            onClick: () => changeLanguage("zh"),
          },
        ]}
      />
    </PageLayout>
  )
}
