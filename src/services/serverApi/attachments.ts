import { LocalServerClient } from "./client"

export interface SelfhostedAttachmentConfig {
  transport: "server"
}

export class Attachments {
  constructor(private client: LocalServerClient) {}

  config(): Promise<SelfhostedAttachmentConfig> {
    return this.client.get<SelfhostedAttachmentConfig>("v1/attachments/config")
  }
}
