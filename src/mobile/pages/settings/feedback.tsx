import { SettingsIcon } from "@/ui/components/icons"
import { localize } from "../../../nls"
import { PageLayout } from "../../components/PageLayout"
import { styles } from "../../theme"

export const FeedbackPage = () => {
  return (
    <PageLayout
      header={{
        showBack: true,
        id: "feedback",
        title: localize("settings.feedback"),
        renderIcon: (className: string) => <SettingsIcon className={className} />,
      }}
    >
      <div className={styles.settingsPageContent}>
        <p className={`${styles.settingsPageText} ${styles.settingsPageParagraphSpacing}`}>
          {localize("settings.feedback.description")}
        </p>
        <p className={styles.settingsPageEmphasisText}>support@hamsterbase.com</p>
      </div>
    </PageLayout>
  )
}
