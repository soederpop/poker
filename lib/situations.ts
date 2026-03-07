import type { AGIContainer } from "@soederpop/luca/agi"

import { splitCards } from "./cards"

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

export async function loadSituation(container: AGIContainer, ref: string): Promise<PokerSituation> {
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
    id: doc.id,
    title: doc.title,
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
