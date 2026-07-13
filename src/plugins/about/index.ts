import { AboutPlugin } from "./definitions"
import { AboutWeb } from "./web"

const About: AboutPlugin = new AboutWeb()

export * from "./definitions"
export { About }
