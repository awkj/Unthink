import fs from "node:fs"
import path from "node:path"
import ts from "typescript"

type Messages = Record<string, string>

const localeFiles = {
  "en-US": "src/locales/en-US.json",
  "zh-CN": "src/locales/zh-CN.json",
} as const

function readMessages(locale: keyof typeof localeFiles): Messages {
  const file = localeFiles[locale]
  const parsed: unknown = JSON.parse(fs.readFileSync(file, "utf8"))
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${file} must contain a JSON object`)
  }

  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value !== "string" || value.length === 0) {
      throw new Error(`${file}: ${key} must be a non-empty string`)
    }
  }
  return parsed as Messages
}

function placeholders(message: string): string[] {
  return [...message.matchAll(/{{\s*([^,}\s]+).*?}}/g)].map((match) => match[1]!).sort()
}

const source = readMessages("en-US")
const sourceKeys = Object.keys(source).sort()
const sourceKeySet = new Set(sourceKeys)

for (const locale of Object.keys(localeFiles) as (keyof typeof localeFiles)[]) {
  const messages = readMessages(locale)
  const keys = Object.keys(messages).sort()
  const missing = sourceKeys.filter((key) => !Object.hasOwn(messages, key))
  const extra = keys.filter((key) => !sourceKeySet.has(key))

  if (missing.length > 0 || extra.length > 0) {
    throw new Error(`${locale}: missing [${missing.join(", ")}], extra [${extra.join(", ")}]`)
  }

  for (const key of sourceKeys) {
    const expected = placeholders(source[key]!)
    const actual = placeholders(messages[key]!)
    if (expected.join("\0") !== actual.join("\0")) {
      throw new Error(`${locale}: interpolation mismatch for ${key}; expected [${expected}], received [${actual}]`)
    }
  }
}

function sourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(entryPath)
    return /\.(?:ts|tsx)$/.test(entry.name) && entryPath !== "src/nls.ts" ? [entryPath] : []
  })
}

for (const file of sourceFiles("src")) {
  const text = fs.readFileSync(file, "utf8")
  const sourceFile = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )

  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "localize") {
      const keyNode = node.arguments[0]
      if (!keyNode || !ts.isStringLiteralLike(keyNode)) {
        throw new Error(
          `${file}:${sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1}: localize key must be a string literal`,
        )
      }

      const key = keyNode.text
      const message = source[key]
      if (message === undefined) {
        throw new Error(`${file}: unknown translation key ${key}`)
      }
      const expected = placeholders(message)
      const valuesNode = node.arguments[1]
      const actual =
        valuesNode && ts.isObjectLiteralExpression(valuesNode)
          ? valuesNode.properties
              .filter(ts.isPropertyAssignment)
              .map((property) => property.name.getText(sourceFile).replaceAll(/["']/g, ""))
              .sort()
          : []

      if (expected.join("\0") !== actual.join("\0")) {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1
        throw new Error(`${file}:${line}: ${key} requires interpolation values [${expected.join(", ")}]`)
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
}

console.log(`Validated ${sourceKeys.length} translations in ${Object.keys(localeFiles).length} locales`)
