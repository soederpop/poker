import type { AGIContainer } from "@soederpop/luca/agi"
import { resolve } from "path"
import { readFileSync, existsSync } from "fs"

import { splitCards } from "./cards"
import { isStandaloneMode } from "../container"

export type SituationStage = "preflop" | "flop" | "turn" | "river"

export type PokerSituation = {
  id: string
  title: string
  stage: SituationStage
  heroCards: [string, string]
  board: string[]
  potSize: number
  toCall: number
  stacks: number[]
  positions: string[]
  actionHistory: string[]
  villain?: string
  stakes?: string
}

function toSituationId(container: AGIContainer, input: string): string {
  const raw = String(input || "").trim()

  if (!raw) {
    throw new Error("Situation reference cannot be empty")
  }

  const normalized = raw.replace(/\\/g, "/")

  if (normalized.startsWith("docs/")) {
    return normalized.slice(5).replace(/\.md$/i, "")
  }

  const docsRoot = container.paths.resolve("docs").replace(/\\/g, "/")
  if (normalized.startsWith(docsRoot)) {
    return normalized.slice(docsRoot.length + 1).replace(/\.md$/i, "")
  }

  return normalized.replace(/\.md$/i, "")
}

function parseNumberList(value: unknown): number[] {
  return String(value || "")
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item))
}

function parseStringList(value: unknown): string[] {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseActionHistory(value: unknown): string[] {
  return String(value || "")
    .split(/\n|;/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseFrontmatter(content: string): { meta: Record<string, string>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) {
    return { meta: {}, body: content }
  }

  const meta: Record<string, string> = {}
  const lines = match[1]!.split(/\r?\n/)
  for (const line of lines) {
    const idx = line.indexOf(":")
    if (idx > 0) {
      const key = line.slice(0, idx).trim()
      const value = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "")
      if (key) meta[key] = value
    }
  }

  return { meta, body: match[2] || "" }
}

function firstMarkdownHeading(body: string): string | null {
  const match = String(body || "").match(/^#\s+(.+)$/m)
  return match ? match[1]!.trim() : null
}

function buildSituation(id: string, meta: Record<string, any>, body = ""): PokerSituation {
  const stage = String(meta.stage || "").trim() as SituationStage

  if (!["preflop", "flop", "turn", "river"].includes(stage)) {
    throw new Error(`Situation ${id} has invalid stage: ${meta.stage}`)
  }

  const heroCards = splitCards(String(meta.heroCards || ""))
  if (heroCards.length !== 2) {
    throw new Error(`Situation ${id} must define heroCards as exactly two cards`)
  }

  const board = splitCards(String(meta.board || ""))
  const potSize = Number(meta.potSize)
  const toCall = Number(meta.toCall)

  if (!Number.isFinite(potSize) || !Number.isFinite(toCall)) {
    throw new Error(`Situation ${id} has invalid potSize/toCall values`)
  }

  return {
    id,
    title: String(meta.title || firstMarkdownHeading(body) || id),
    stage,
    heroCards: [heroCards[0] as string, heroCards[1] as string],
    board,
    potSize,
    toCall,
    stacks: parseNumberList(meta.stacks),
    positions: parseStringList(meta.positions),
    actionHistory: parseActionHistory(meta.actionHistory),
    ...(meta.villain ? { villain: String(meta.villain) } : {}),
    ...(meta.stakes ? { stakes: String(meta.stakes) } : {}),
  }
}

function loadSituationFromFile(ref: string): PokerSituation {
  // Resolve relative to CWD
  let filePath = resolve(process.cwd(), ref)
  if (!filePath.endsWith(".md")) {
    filePath += ".md"
  }

  // Also try with docs/ prefix
  if (!existsSync(filePath)) {
    const withDocs = resolve(process.cwd(), "docs", ref + (ref.endsWith(".md") ? "" : ".md"))
    if (existsSync(withDocs)) {
      filePath = withDocs
    }
  }

  if (!existsSync(filePath)) {
    throw new Error(`Situation file not found: ${ref} (tried ${filePath})`)
  }

  const content = readFileSync(filePath, "utf-8")
  const { meta, body } = parseFrontmatter(content)
  const id = ref.replace(/\.md$/i, "")

  return buildSituation(id, meta, body)
}

export async function loadSituation(container: AGIContainer, ref: string): Promise<PokerSituation> {
  // In standalone mode, load directly from CWD-relative file paths
  if (isStandaloneMode(container)) {
    return loadSituationFromFile(ref)
  }

  if (!container.docs.isLoaded) {
    await container.docs.load()
  }

  const id = toSituationId(container, ref)
  let doc: any

  try {
    doc = container.docs.collection.document(id)
  } catch {
    const Situation = container.docs.models.Situation
    if (!Situation) {
      throw new Error(`Could not find situation \"${ref}\" and no Situation model is loaded`)
    }

    const all = await container.docs.query(Situation).fetchAll()
    const matching = all.find((candidate: any) => candidate.id === id || candidate.id.endsWith(`/${id}`))

    if (!matching) {
      throw new Error(`Situation not found: ${ref}`)
    }

    doc = container.docs.collection.document(matching.id)
  }

  const meta = doc.meta || {}
  return buildSituation(doc.id, { ...meta, title: doc.title })
}
