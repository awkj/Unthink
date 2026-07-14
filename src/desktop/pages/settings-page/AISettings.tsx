import { ItemGroup } from "@/desktop/components/settings/ItemGroup"
import { SettingsContent } from "@/desktop/components/settings/SettingsContent/SettingsContent"
import { SettingsItem } from "@/desktop/components/settings/SettingsItem"
import { SettingsSection } from "@/desktop/components/settings/SettingsSection"
import { useConfig } from "@/ui/hooks/useConfig"
import { localize } from "@/nls"
import {
  aiApiTokenConfigKey,
  aiApiUrlConfigKey,
  aiModelNameConfigKey,
  showAIEntryConfigKey,
} from "@/services/config/config"
import React from "react"

export const AISettings: React.FC = () => {
  const { value: apiUrl, setValue: setApiUrl } = useConfig(aiApiUrlConfigKey())
  const { value: apiToken, setValue: setApiToken } = useConfig(aiApiTokenConfigKey())
  const { value: modelName, setValue: setModelName } = useConfig(aiModelNameConfigKey())
  const { value: showAIEntry, setValue: setShowAIEntry } = useConfig(showAIEntryConfigKey())

  return (
    <SettingsContent title={localize("settings.ai")}>
      <SettingsSection title={localize("settings.ai.display")}>
        <ItemGroup>
          <SettingsItem
            title={localize("settings.ai.show_entry")}
            description={localize("settings.ai.show_entry.description")}
            action={{
              type: "switch",
              currentValue: showAIEntry,
              onChange: setShowAIEntry,
            }}
          />
        </ItemGroup>
      </SettingsSection>
      <SettingsSection title={localize("settings.ai.api")}>
        <ItemGroup>
          <SettingsItem
            title={localize("settings.ai.api_url")}
            description={localize("settings.ai.api_url.description")}
            action={{
              type: "input",
              inputType: "url",
              placeholder: "https://api.deepseek.com",
              currentValue: apiUrl,
              onChange: setApiUrl,
            }}
          />
          <SettingsItem
            title={localize("settings.ai.api_token")}
            description={localize("settings.ai.api_token.description")}
            action={{
              type: "input",
              inputType: "password",
              revealable: true,
              placeholder: localize("settings.ai.api_token.placeholder"),
              currentValue: apiToken,
              onChange: setApiToken,
            }}
          />
          <SettingsItem
            title={localize("settings.ai.model_name")}
            description={localize("settings.ai.model_name.description")}
            action={{
              type: "input",
              inputType: "text",
              placeholder: "deepseek-v4-pro",
              currentValue: modelName,
              onChange: setModelName,
            }}
          />
        </ItemGroup>
      </SettingsSection>
    </SettingsContent>
  )
}
