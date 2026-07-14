import { EntityHeader } from "@/desktop/components/common/EntityHeader"
import { DesktopPage } from "@/desktop/components/DesktopPage"
import { desktopStyles } from "@/desktop/theme/main"
import { localize } from "@/nls"
import {
  BoxIcon,
  CircleQuestionMark,
  SubtaskIcon,
  ThingsAnytimeIcon,
  ThingsAreaIcon,
  ThingsDeletedIcon,
  ThingsInboxIcon,
  ThingsLogbookIcon,
  ThingsScheduleIcon,
  ThingsTodayIcon,
  ThingsViewIcon,
} from "@/ui/components/icons"
import React from "react"

interface GuideCardProps {
  description: string
  icon: React.ReactNode
  title: string
}

const GuideCard: React.FC<GuideCardProps> = ({ description, icon, title }) => (
  <div className={desktopStyles.GuideListCard}>
    <div className={desktopStyles.GuideListIcon}>
      {React.isValidElement<{ className?: string }>(icon)
        ? React.cloneElement(icon, { className: desktopStyles.GuideListIconSvg })
        : icon}
    </div>
    <div className={desktopStyles.GuideListCardBody}>
      <div className={desktopStyles.GuideListCardTitle}>{title}</div>
      <div className={desktopStyles.GuideListCardDescription}>{description}</div>
    </div>
  </div>
)

const systemLists: GuideCardProps[] = [
  {
    title: localize("guide.inbox.title"),
    description: localize("guide.inbox.description"),
    icon: <ThingsInboxIcon />,
  },
  {
    title: localize("guide.today.title"),
    description: localize("guide.today.description"),
    icon: <ThingsTodayIcon />,
  },
  {
    title: localize("guide.schedule.title"),
    description: localize("guide.schedule.description"),
    icon: <ThingsScheduleIcon />,
  },
  {
    title: localize("guide.pending.title"),
    description: localize("guide.pending.description"),
    icon: <ThingsAnytimeIcon />,
  },
  {
    title: localize("guide.completed.title"),
    description: localize("guide.completed.description"),
    icon: <ThingsLogbookIcon />,
  },
  {
    title: localize("guide.deleted.title"),
    description: localize("guide.deleted.description"),
    icon: <ThingsDeletedIcon />,
  },
]

const workflowSteps = [
  {
    title: localize("guide.workflow.capture.title"),
    description: localize("guide.workflow.capture.description"),
  },
  {
    title: localize("guide.workflow.decide.title"),
    description: localize("guide.workflow.decide.description"),
  },
  {
    title: localize("guide.workflow.organize.title"),
    description: localize("guide.workflow.organize.description"),
  },
  {
    title: localize("guide.workflow.review.title"),
    description: localize("guide.workflow.review.description"),
  },
]

export const Guide = () => (
  <DesktopPage
    showDetailPanel={false}
    header={<EntityHeader renderIcon={() => <CircleQuestionMark />} title={localize("guide.title")} />}
  >
    <div className={desktopStyles.GuidePageContent}>
      <p className={desktopStyles.GuideIntro}>{localize("guide.intro")}</p>

      <section className={desktopStyles.GuideSection}>
        <div className={desktopStyles.GuideSectionHeader}>
          <h2 className={desktopStyles.GuideSectionTitle}>{localize("guide.systemLists.title")}</h2>
          <p className={desktopStyles.GuideSectionDescription}>{localize("guide.systemLists.description")}</p>
        </div>
        <div className={desktopStyles.GuideListGrid}>
          {systemLists.map((item) => (
            <GuideCard key={item.title} {...item} />
          ))}
        </div>
      </section>

      <section className={desktopStyles.GuideSection}>
        <div className={desktopStyles.GuideSectionHeader}>
          <h2 className={desktopStyles.GuideSectionTitle}>{localize("guide.organization.title")}</h2>
          <p className={desktopStyles.GuideSectionDescription}>{localize("guide.organization.description")}</p>
        </div>
        <div className={desktopStyles.GuideHierarchyGrid}>
          <div className={desktopStyles.GuideHierarchyCard}>
            <div className={desktopStyles.GuideHierarchyHeader}>
              <ThingsAreaIcon className={desktopStyles.GuideHierarchyIcon} />
              <h3 className={desktopStyles.GuideHierarchyTitle}>{localize("guide.area.title")}</h3>
            </div>
            <p className={desktopStyles.GuideHierarchyDescription}>{localize("guide.area.description")}</p>
          </div>
          <div className={desktopStyles.GuideHierarchyCard}>
            <div className={desktopStyles.GuideHierarchyHeader}>
              <BoxIcon className={desktopStyles.GuideHierarchyIcon} />
              <h3 className={desktopStyles.GuideHierarchyTitle}>{localize("guide.project.title")}</h3>
            </div>
            <p className={desktopStyles.GuideHierarchyDescription}>{localize("guide.project.description")}</p>
          </div>
          <div className={desktopStyles.GuideHierarchyCard}>
            <div className={desktopStyles.GuideHierarchyHeader}>
              <SubtaskIcon className={desktopStyles.GuideHierarchyIcon} />
              <h3 className={desktopStyles.GuideHierarchyTitle}>{localize("guide.task.title")}</h3>
            </div>
            <p className={desktopStyles.GuideHierarchyDescription}>{localize("guide.task.description")}</p>
          </div>
        </div>
      </section>

      <section className={desktopStyles.GuideSection}>
        <div className={desktopStyles.GuideSectionHeader}>
          <h2 className={desktopStyles.GuideSectionTitle}>{localize("guide.view.title")}</h2>
          <p className={desktopStyles.GuideSectionDescription}>{localize("guide.view.sectionDescription")}</p>
        </div>
        <div className={desktopStyles.GuideViewPanel}>
          <div className={desktopStyles.GuideViewIcon}>
            <ThingsViewIcon className={desktopStyles.GuideHierarchyIcon} />
          </div>
          <div className={desktopStyles.GuideViewBody}>
            <h3 className={desktopStyles.GuideViewTitle}>{localize("guide.view.cardTitle")}</h3>
            <p className={desktopStyles.GuideViewDescription}>{localize("guide.view.description")}</p>
            <div className={desktopStyles.GuideViewExamples}>
              <span className={desktopStyles.GuideViewExample}>{localize("guide.view.example.overdue")}</span>
              <span className={desktopStyles.GuideViewExample}>{localize("guide.view.example.work")}</span>
              <span className={desktopStyles.GuideViewExample}>{localize("guide.view.example.week")}</span>
            </div>
          </div>
        </div>
      </section>

      <section className={desktopStyles.GuideSection}>
        <div className={desktopStyles.GuideSectionHeader}>
          <h2 className={desktopStyles.GuideSectionTitle}>{localize("guide.workflow.title")}</h2>
        </div>
        <div className={desktopStyles.GuideSteps}>
          {workflowSteps.map((step, index) => (
            <div key={step.title} className={desktopStyles.GuideStep}>
              <div className={desktopStyles.GuideStepNumber}>{index + 1}</div>
              <div className={desktopStyles.GuideStepBody}>
                <div className={desktopStyles.GuideStepTitle}>{step.title}</div>
                <div className={desktopStyles.GuideStepDescription}>{step.description}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  </DesktopPage>
)
