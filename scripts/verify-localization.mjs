import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const lock = JSON.parse(await readFile(join(repoRoot, 'upstream-lock.json'), 'utf8'))
const koPath = join(repoRoot, 'src', 'i18n', 'ko.ts')
const koSource = await readFile(koPath, 'utf8')

const cliArgs = process.argv.slice(2)
const upstreamDirIndex = cliArgs.indexOf('--upstream')
const upstreamDirValue =
  upstreamDirIndex >= 0 ? cliArgs[upstreamDirIndex + 1] : cliArgs.find(argument => !argument.startsWith('--'))
const upstreamDir = upstreamDirValue ? resolve(upstreamDirValue) : null
const reportNonHangul = cliArgs.includes('--report-non-hangul')
const reportMissing = cliArgs.includes('--report-missing')
const reportMissingSummary = cliArgs.includes('--report-missing-summary')

async function loadUpstreamFile(name) {
  if (upstreamDir) {
    return readFile(join(upstreamDir, lock.desktopI18nPath, name), 'utf8')
  }

  const url = `https://raw.githubusercontent.com/${lock.repository}/${lock.commit}/${lock.desktopI18nPath}/${name}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Could not fetch ${name}: HTTP ${response.status}`)
  }

  return response.text()
}

const [enSource, referenceSource, typesSource] = await Promise.all([
  loadUpstreamFile('en.ts'),
  loadUpstreamFile(`${lock.referenceLocale}.ts`),
  loadUpstreamFile('types.ts')
])

function unwrapExpression(node) {
  let current = node

  while (
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isParenthesizedExpression(current) ||
    ts.isTypeAssertionExpression(current)
  ) {
    current = current.expression
  }

  return current
}

function findLocaleObject(sourceText, variableName, fileName) {
  const sourceFile = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  let result

  const visit = node => {
    if (result) return

    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === variableName) {
      const initializer = node.initializer ? unwrapExpression(node.initializer) : undefined

      if (initializer && ts.isObjectLiteralExpression(initializer)) {
        result = initializer
      } else if (initializer && ts.isCallExpression(initializer)) {
        const firstArgument = initializer.arguments[0] ? unwrapExpression(initializer.arguments[0]) : undefined
        if (firstArgument && ts.isObjectLiteralExpression(firstArgument)) result = firstArgument
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)

  if (!result) {
    throw new Error(`Could not find the ${variableName} locale object in ${fileName}`)
  }

  return { object: result, sourceFile }
}

function propertyName(node, sourceFile) {
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) return node.text
  if (ts.isComputedPropertyName(node)) return node.expression.getText(sourceFile)
  return node.getText(sourceFile)
}

function objectProperties(object, sourceFile) {
  const properties = new Map()

  for (const property of object.properties) {
    if (ts.isPropertyAssignment(property)) {
      properties.set(propertyName(property.name, sourceFile), unwrapExpression(property.initializer))
    } else if (ts.isShorthandPropertyAssignment(property)) {
      properties.set(property.name.text, property.name)
    } else if (ts.isMethodDeclaration(property)) {
      properties.set(propertyName(property.name, sourceFile), property)
    }
  }

  return properties
}

function collectPropertyPaths(object, sourceFile, prefix = '', result = new Set()) {
  for (const [name, value] of objectProperties(object, sourceFile)) {
    const path = prefix ? `${prefix}.${name}` : name
    result.add(path)

    if (ts.isObjectLiteralExpression(value)) collectPropertyPaths(value, sourceFile, path, result)
  }

  return result
}

function collectLeafPropertyPaths(object, sourceFile, prefix = '', result = new Set()) {
  for (const [name, value] of objectProperties(object, sourceFile)) {
    const path = prefix ? `${prefix}.${name}` : name

    if (ts.isObjectLiteralExpression(value)) {
      collectLeafPropertyPaths(value, sourceFile, path, result)
    } else {
      result.add(path)
    }
  }

  return result
}

function findPropertyValue(object, sourceFile, path) {
  let current = object

  for (const segment of path) {
    if (!ts.isObjectLiteralExpression(current)) return undefined
    current = objectProperties(current, sourceFile).get(segment)
    if (!current) return undefined
  }

  return current
}

function objectFromValue(value) {
  const unwrapped = value ? unwrapExpression(value) : undefined
  if (!unwrapped) return undefined
  if (ts.isObjectLiteralExpression(unwrapped)) return unwrapped
  if (ts.isCallExpression(unwrapped)) {
    const firstArgument = unwrapped.arguments[0] ? unwrapExpression(unwrapped.arguments[0]) : undefined
    if (firstArgument && ts.isObjectLiteralExpression(firstArgument)) return firstArgument
  }
  return undefined
}

function compareCoverage(label, expected, actual) {
  const missing = [...expected].filter(path => !actual.has(path))

  if (missing.length > 0) {
    throw new Error(`${label} is missing ${missing.length} key(s):\n- ${missing.join('\n- ')}`)
  }

  return { expected: expected.size, actual: actual.size }
}

const enLocale = findLocaleObject(enSource, 'en', 'en.ts')
const koLocale = findLocaleObject(koSource, 'ko', 'ko.ts')
const referenceLocale = findLocaleObject(referenceSource, lock.referenceLocale, `${lock.referenceLocale}.ts`)

if (reportMissing || reportMissingSummary) {
  const koreanPaths = collectPropertyPaths(koLocale.object, koLocale.sourceFile)
  const missingLeaves = [...collectLeafPropertyPaths(enLocale.object, enLocale.sourceFile)].filter(
    path => !koreanPaths.has(path)
  )

  if (reportMissing) {
    console.log(`Missing Korean leaf paths (${missingLeaves.length}):`)
    for (const path of missingLeaves) {
      const value = findPropertyValue(enLocale.object, enLocale.sourceFile, path.split('.'))
      console.log(`${path}\t${value?.getText(enLocale.sourceFile) ?? '<unknown>'}`)
    }
  }

  if (reportMissingSummary) {
    const counts = new Map()
    for (const path of missingLeaves) {
      const group = path.split('.').slice(0, 2).join('.')
      counts.set(group, (counts.get(group) ?? 0) + 1)
    }
    console.log(`Missing Korean leaf paths (${missingLeaves.length}), grouped:`)
    for (const [group, count] of [...counts].sort((a, b) => b[1] - a[1])) {
      console.log(`${String(count).padStart(4)}  ${group}`)
    }

    if (!reportMissing) process.exit(0)
  }
}

const translationCoverage = compareCoverage(
  'Korean locale',
  collectPropertyPaths(enLocale.object, enLocale.sourceFile),
  collectPropertyPaths(koLocale.object, koLocale.sourceFile)
)

const fieldCoverage = {}
for (const fieldName of ['fieldLabels', 'fieldDescriptions']) {
  const referenceField = objectFromValue(
    findPropertyValue(referenceLocale.object, referenceLocale.sourceFile, ['settings', fieldName])
  )
  const koreanField = objectFromValue(findPropertyValue(koLocale.object, koLocale.sourceFile, ['settings', fieldName]))

  if (!referenceField || !koreanField) {
    throw new Error(`Could not inspect settings.${fieldName}`)
  }

  fieldCoverage[fieldName] = compareCoverage(
    `settings.${fieldName}`,
    collectPropertyPaths(referenceField, referenceLocale.sourceFile),
    collectPropertyPaths(koreanField, koLocale.sourceFile)
  )
}

const temporaryRoot = await mkdtemp(join(tmpdir(), 'hermes-ko-verify-'))

try {
  await writeFile(join(temporaryRoot, 'types.ts'), typesSource, 'utf8')
  await writeFile(join(temporaryRoot, 'ko.ts'), koSource, 'utf8')
  await writeFile(
    join(temporaryRoot, 'define-locale.ts'),
    `import type { Translations } from './types'\n\n` +
      `type TranslationOverride<T> = T extends (...args: never[]) => string\n` +
      `  ? T\n` +
      `  : T extends readonly unknown[]\n` +
      `    ? T\n` +
      `    : T extends string\n` +
      `      ? string\n` +
      `      : T extends object\n` +
      `        ? { [K in keyof T]?: TranslationOverride<T[K]> }\n` +
      `        : T\n\n` +
      `export type TranslationOverrides = TranslationOverride<Translations>\n` +
      `export function defineLocale(overrides: TranslationOverrides): Translations {\n` +
      `  return overrides as Translations\n` +
      `}\n`,
    'utf8'
  )

  const fieldCopyPath = join(temporaryRoot, 'stubs', 'app', 'settings', 'field-copy.ts')
  await import('node:fs/promises').then(({ mkdir }) => mkdir(dirname(fieldCopyPath), { recursive: true }))
  await writeFile(
    fieldCopyPath,
    `export interface FieldCopyTree { [key: string]: string | FieldCopyTree }\n` +
      `export function defineFieldCopy(copy: FieldCopyTree): Record<string, string> {\n` +
      `  return copy as Record<string, string>\n` +
      `}\n`,
    'utf8'
  )

  const tipCatalogPath = join(temporaryRoot, 'stubs', 'lib', 'tips', 'catalog.ts')
  await import('node:fs/promises').then(({ mkdir }) => mkdir(dirname(tipCatalogPath), { recursive: true }))
  await writeFile(
    tipCatalogPath,
    `export type TipId =\n` +
      `  | 'artifacts'\n` +
      `  | 'command-palette'\n` +
      `  | 'composer-mentions'\n` +
      `  | 'cron'\n` +
      `  | 'messaging'\n` +
      `  | 'new-session'\n` +
      `  | 'profiles'\n` +
      `  | 'right-pane'\n` +
      `  | 'skills'\n`,
    'utf8'
  )

  const compilerOptions = {
    baseUrl: temporaryRoot,
    ignoreDeprecations: '6.0',
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    noEmit: true,
    paths: { '@/*': ['stubs/*'] },
    skipLibCheck: true,
    strict: true,
    target: ts.ScriptTarget.ES2022
  }
  const program = ts.createProgram([join(temporaryRoot, 'ko.ts')], compilerOptions)
  const diagnostics = ts.getPreEmitDiagnostics(program)

  if (diagnostics.length > 0) {
    const formatted = ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: name => name,
      getCurrentDirectory: () => temporaryRoot,
      getNewLine: () => '\n'
    })
    throw new Error(`TypeScript validation failed:\n${formatted}`)
  }
} finally {
  await rm(temporaryRoot, { recursive: true, force: true })
}

const koreanTextNodes = []
const visitKoreanText = node => {
  if (ts.isPropertyAssignment(node)) {
    visitKoreanText(node.initializer)
    return
  }
  if (ts.isShorthandPropertyAssignment(node)) return
  if (ts.isMethodDeclaration(node)) {
    if (node.body) visitKoreanText(node.body)
    return
  }
  if (ts.isTemplateExpression(node)) {
    koreanTextNodes.push(node.head.text + node.templateSpans.map(span => span.literal.text).join(''))
    for (const span of node.templateSpans) visitKoreanText(span.expression)
    return
  }
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    koreanTextNodes.push(node.text)
    return
  }
  ts.forEachChild(node, visitKoreanText)
}
visitKoreanText(koLocale.object)

const hangulTexts = koreanTextNodes.filter(text => /[가-힣]/u.test(text)).length
const hangulRatio = koreanTextNodes.length === 0 ? 0 : (hangulTexts / koreanTextNodes.length) * 100

console.log(`✓ Translation structure: ${translationCoverage.expected}/${translationCoverage.expected} upstream paths`)
console.log(`✓ Field labels: ${fieldCoverage.fieldLabels.expected}/${fieldCoverage.fieldLabels.expected} paths`)
console.log(
  `✓ Field descriptions: ${fieldCoverage.fieldDescriptions.expected}/${fieldCoverage.fieldDescriptions.expected} paths`
)
console.log('✓ TypeScript compatibility: 0 diagnostics')
console.log(`ℹ Korean-bearing text nodes: ${hangulTexts}/${koreanTextNodes.length} (${hangulRatio.toFixed(1)}%)`)
console.log(`✓ Verified against ${lock.repository}@${lock.commit.slice(0, 12)}`)

if (reportNonHangul) {
  const nonHangul = [...new Set(koreanTextNodes.filter(text => !/[가-힣]/u.test(text) && /[A-Za-z]{2}/u.test(text)))]
  console.log(`\nNon-Hangul text nodes (${nonHangul.length} unique):`)
  for (const text of nonHangul) console.log(`- ${JSON.stringify(text)}`)
}
