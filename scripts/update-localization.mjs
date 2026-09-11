import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const upstreamIndex = args.indexOf('--upstream')
const upstream = upstreamIndex >= 0 ? resolve(args[upstreamIndex + 1]) : null

if (!upstream) throw new Error('Usage: node scripts/update-localization.mjs --upstream <hermes-agent>')

const lockPath = join(repoRoot, 'upstream-lock.json')
const koPath = join(repoRoot, 'src', 'i18n', 'ko.ts')
const i18nPath = join(upstream, 'apps', 'desktop', 'src', 'i18n')
const [enSource, koSource] = await Promise.all([readFile(join(i18nPath, 'en.ts'), 'utf8'), readFile(koPath, 'utf8')])

function unwrap(node) {
  let current = node
  while (
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isParenthesizedExpression(current) ||
    ts.isTypeAssertionExpression(current)
  )
    current = current.expression
  return current
}

function localeObject(source, variable, fileName) {
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  let object
  const visit = node => {
    if (object) return
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === variable) {
      const value = node.initializer ? unwrap(node.initializer) : null
      if (value && ts.isObjectLiteralExpression(value)) object = value
      if (value && ts.isCallExpression(value)) {
        const argument = value.arguments[0] ? unwrap(value.arguments[0]) : null
        if (argument && ts.isObjectLiteralExpression(argument)) object = argument
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  if (!object) throw new Error(`Could not find ${variable} in ${fileName}`)
  return { file, object }
}

function nameOf(node, file) {
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) return node.text
  if (ts.isComputedPropertyName(node)) return node.expression.getText(file)
  return node.getText(file)
}

function propertyMap(object, file) {
  const result = new Map()
  for (const property of object.properties) {
    if (ts.isPropertyAssignment(property) || ts.isMethodDeclaration(property)) {
      result.set(nameOf(property.name, file), property)
    } else if (ts.isShorthandPropertyAssignment(property)) {
      result.set(property.name.text, property)
    }
  }
  return result
}

function valueOf(property) {
  if (ts.isPropertyAssignment(property)) return unwrap(property.initializer)
  return null
}

const en = localeObject(enSource, 'en', 'en.ts')
const ko = localeObject(koSource, 'ko', 'ko.ts')
const pending = []
const removals = []

function valueShape(property) {
  if (ts.isMethodDeclaration(property)) return 'callable'
  const value = valueOf(property)
  if (!value) return 'other'
  if (ts.isObjectLiteralExpression(value)) return 'object'
  if (ts.isArrowFunction(value) || ts.isFunctionExpression(value)) return 'callable'
  return 'other'
}

function parameterCount(property) {
  if (ts.isMethodDeclaration(property)) return property.parameters.length
  const value = valueOf(property)
  return value && (ts.isArrowFunction(value) || ts.isFunctionExpression(value)) ? value.parameters.length : null
}

function findMissing(enObject, koObject, path = []) {
  const enProperties = propertyMap(enObject, en.file)
  const koProperties = propertyMap(koObject, ko.file)

  for (const [name, koProperty] of koProperties) {
    if (!enProperties.has(name)) removals.push({ koProperty, path: [...path, name].join('.') })
  }

  for (const [name, enProperty] of enProperties) {
    const koProperty = koProperties.get(name)
    if (!koProperty) {
      pending.push({
        enProperty,
        koObject,
        koProperty: null,
        path: [...path, name].join('.')
      })
      continue
    }

    if (
      valueShape(enProperty) !== valueShape(koProperty) ||
      (valueShape(enProperty) === 'callable' && parameterCount(enProperty) !== parameterCount(koProperty))
    ) {
      pending.push({
        enProperty,
        koObject,
        koProperty,
        path: [...path, name].join('.')
      })
      continue
    }

    const enValue = valueOf(enProperty)
    const koValue = valueOf(koProperty)
    if (enValue && koValue && ts.isObjectLiteralExpression(enValue) && ts.isObjectLiteralExpression(koValue)) {
      findMissing(enValue, koValue, [...path, name])
    }
  }
}

findMissing(en.object, ko.object)
console.log(
  `Found ${pending.filter(item => !item.koProperty).length} missing, ${pending.filter(item => item.koProperty).length} changed, and ${removals.length} stale property subtree(s).`
)

const skipExact = new Set([
  'API',
  'CLI',
  'Codex',
  'Discord',
  'Git',
  'GitHub',
  'GPU',
  'Hermes',
  'Hermes Cloud',
  'HUD',
  'JSON',
  'MCP',
  'Nous',
  'Nous Portal',
  'OAuth',
  'PID',
  'RAM',
  'SSH',
  'URL',
  'WebSocket'
])
const cache = new Map()

function shouldTranslate(text) {
  const trimmed = text.trim()
  if (!/[A-Za-z]/u.test(trimmed) || skipExact.has(trimmed)) return false
  if (/^(?:https?:\/\/|git@|~\/|\/|[A-Z0-9_]+$)/u.test(trimmed)) return false
  return true
}

async function translate(text) {
  if (!shouldTranslate(text)) return text
  if (cache.has(text)) return cache.get(text)

  const url = new URL('https://translate.googleapis.com/translate_a/single')
  url.searchParams.set('client', 'gtx')
  url.searchParams.set('sl', 'en')
  url.searchParams.set('tl', 'ko')
  url.searchParams.set('dt', 't')
  url.searchParams.set('q', text)

  let lastError
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const payload = await response.json()
      const translated = payload[0].map(part => part[0]).join('')
      cache.set(text, translated)
      return translated
    } catch (error) {
      lastError = error
      await new Promise(resolveDelay => setTimeout(resolveDelay, attempt * 750))
    }
  }
  throw new Error(`Could not translate ${JSON.stringify(text)}: ${lastError}`)
}

async function translateBatch(texts) {
  if (texts.length === 0) return
  const payloadText = texts
    .map((value, index) => `ZXQID${String(index).padStart(4, '0')} ${value.replaceAll('\n', ' ZXQNL ')}`)
    .join('\n')
  const url = new URL('https://translate.googleapis.com/translate_a/single')
  url.searchParams.set('client', 'gtx')
  url.searchParams.set('sl', 'en')
  url.searchParams.set('tl', 'ko')
  url.searchParams.set('dt', 't')
  url.searchParams.set('q', payloadText)

  let lastError
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const payload = await response.json()
      const output = payload[0].map(part => part[0]).join('')
      const found = new Map()
      const pattern = /ZXQID(\d{4})\s*([\s\S]*?)(?=\n?ZXQID\d{4}|$)/gu
      for (const match of output.matchAll(pattern)) {
        const value = match[2]
          .replace(/\r?\n$/u, '')
          .replaceAll(' ZXQNL ', '\n')
          .replaceAll('ZXQNL', '\n')
        found.set(Number(match[1]), value)
      }
      if (found.size !== texts.length) throw new Error(`Expected ${texts.length} rows, received ${found.size}`)
      texts.forEach((value, index) => cache.set(value, found.get(index)))
      return
    } catch (error) {
      lastError = error
      await new Promise(resolveDelay => setTimeout(resolveDelay, attempt * 2500))
    }
  }
  throw new Error(`Could not translate batch: ${lastError}`)
}

function quote(text, original) {
  if (original.startsWith("'"))
    return `'${text.replaceAll('\\', '\\\\').replaceAll("'", "\\'").replaceAll('\n', '\\n')}'`
  return JSON.stringify(text)
}

function collectTextNodes(root, file) {
  const nodes = []
  const visit = node => {
    if (ts.isPropertyAssignment(node)) {
      visit(node.initializer)
      return
    }
    if (ts.isMethodDeclaration(node)) {
      if (node.body) visit(node.body)
      return
    }
    if (ts.isTemplateExpression(node)) {
      nodes.push({ kind: 'template', node })
      return
    }
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      nodes.push({ kind: 'literal', node })
      return
    }
    ts.forEachChild(node, visit)
  }
  visit(root)
  return nodes
}

async function translatedProperty(property) {
  const start = property.getStart(en.file)
  let text = enSource.slice(start, property.end)
  const replacements = []

  for (const item of collectTextNodes(property, en.file)) {
    if (item.kind === 'literal') {
      const translated = await translate(item.node.text)
      replacements.push({
        start: item.node.getStart(en.file) - start,
        end: item.node.end - start,
        text: ts.isNoSubstitutionTemplateLiteral(item.node)
          ? `\`${translated.replaceAll('`', '\\`')}\``
          : quote(translated, item.node.getText(en.file))
      })
      continue
    }

    const parts = [item.node.head.text, ...item.node.templateSpans.map(span => span.literal.text)]
    const translatedParts = []
    for (const part of parts) translatedParts.push(await translate(part))
    let rendered = '`' + translatedParts[0].replaceAll('`', '\\`')
    item.node.templateSpans.forEach((span, index) => {
      rendered += '${' + span.expression.getText(en.file) + '}'
      rendered += translatedParts[index + 1].replaceAll('`', '\\`')
    })
    rendered += '`'
    replacements.push({
      start: item.node.getStart(en.file) - start,
      end: item.node.end - start,
      text: rendered
    })
  }

  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    text = text.slice(0, replacement.start) + replacement.text + text.slice(replacement.end)
  }
  return text
}

const sourceTexts = new Set()
for (const item of pending) {
  for (const textNode of collectTextNodes(item.enProperty, en.file)) {
    if (textNode.kind === 'literal') {
      if (shouldTranslate(textNode.node.text)) sourceTexts.add(textNode.node.text)
    } else {
      const parts = [textNode.node.head.text, ...textNode.node.templateSpans.map(span => span.literal.text)]
      for (const part of parts) if (shouldTranslate(part)) sourceTexts.add(part)
    }
  }
}

const sourceQueue = [...sourceTexts]
const batches = []
let currentBatch = []
let currentLength = 0
for (const text of sourceQueue) {
  if (currentBatch.length >= 12 || currentLength + text.length > 2600) {
    batches.push(currentBatch)
    currentBatch = []
    currentLength = 0
  }
  currentBatch.push(text)
  currentLength += text.length
}
if (currentBatch.length > 0) batches.push(currentBatch)

let batchCursor = 0
let sourceCompleted = 0
async function translationWorker() {
  while (batchCursor < batches.length) {
    const index = batchCursor
    batchCursor += 1
    await translateBatch(batches[index])
    sourceCompleted += batches[index].length
    if (sourceCompleted % 48 === 0 || sourceCompleted === sourceQueue.length) {
      console.log(`Translated text ${sourceCompleted}/${sourceQueue.length}`)
    }
  }
}
await Promise.all(Array.from({ length: 2 }, () => translationWorker()))

const translated = []
let completed = 0
for (const item of pending) {
  translated.push({ ...item, text: await translatedProperty(item.enProperty) })
  completed += 1
  if (completed % 25 === 0 || completed === pending.length) console.log(`Translated ${completed}/${pending.length}`)
}

const grouped = new Map()
for (const item of translated) {
  if (item.koProperty) continue
  const entries = grouped.get(item.koObject) ?? []
  entries.push(item)
  grouped.set(item.koObject, entries)
}

const edits = []
for (const item of translated.filter(value => value.koProperty)) {
  const enColumn = en.file.getLineAndCharacterOfPosition(item.enProperty.getStart(en.file)).character
  const koColumn = ko.file.getLineAndCharacterOfPosition(item.koProperty.getStart(ko.file)).character
  const lines = item.text.split('\n')
  const normalized = [
    lines[0],
    ...lines.slice(1).map(value => ' '.repeat(koColumn) + value.slice(Math.min(enColumn, value.search(/\S|$/u))))
  ].join('\n')
  edits.push({
    start: item.koProperty.getStart(ko.file),
    end: item.koProperty.end,
    text: normalized
  })
}

for (const item of removals) {
  let end = item.koProperty.end
  if (koSource[end] === ',') end += 1
  edits.push({ start: item.koProperty.getFullStart(), end, text: '' })
}

for (const [object, entries] of grouped) {
  const close = object.end - 1
  const line = ko.file.getLineAndCharacterOfPosition(close)
  const parentIndent = ' '.repeat(line.character)
  const childIndent = parentIndent + '  '
  const blocks = entries.map(item => {
    const sourceColumn = en.file.getLineAndCharacterOfPosition(item.enProperty.getStart(en.file)).character
    const lines = item.text.split('\n')
    const normalized = [
      lines[0],
      ...lines.slice(1).map(value => value.slice(Math.min(sourceColumn, value.search(/\S|$/u))))
    ]
    return normalized.map(value => childIndent + value).join('\n')
  })
  const previous = koSource.slice(0, close).trimEnd().at(-1)
  edits.push({
    start: close,
    end: close,
    text: `${previous === ',' ? '' : ','}\n${blocks.join(',\n')}\n${parentIndent}`
  })
}

let updated = koSource
for (const edit of edits.sort((a, b) => b.start - a.start)) {
  updated = updated.slice(0, edit.start) + edit.text + updated.slice(edit.end)
}

await writeFile(koPath, updated, 'utf8')
const lock = JSON.parse(await readFile(lockPath, 'utf8'))
lock.commit = await readFile(
  join(upstream, 'apps', 'desktop', 'release', 'win-unpacked', 'resources', 'install-stamp.json'),
  'utf8'
)
  .then(value => JSON.parse(value).commit)
  .catch(() => lock.commit)
lock.syncedAt = new Date().toISOString().slice(0, 10)
await writeFile(lockPath, JSON.stringify(lock, null, 2) + '\n', 'utf8')
console.log(`Updated ${koPath}`)
