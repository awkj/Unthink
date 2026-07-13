import { Text } from "ink"
import { IDatabaseMeta } from "@/services/database/database"

export function DbUseView({ meta }: { meta: IDatabaseMeta }) {
  return (
    <Text>
      <Text color="green">✓</Text> default database → {meta.name}
    </Text>
  )
}
