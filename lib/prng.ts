export class PRNG {
  private state: number

  constructor(seed: number) {
    const normalized = Number(seed) || Date.now()
    this.state = normalized >>> 0

    if (this.state === 0) {
      this.state = 0x6d2b79f5
    }
  }

  nextInt32(): number {
    let x = this.state
    x ^= x << 13
    x ^= x >>> 17
    x ^= x << 5
    this.state = x >>> 0
    return this.state
  }

  next(): number {
    return this.nextInt32() / 0x100000000
  }

  nextInt(maxExclusive: number): number {
    if (!Number.isFinite(maxExclusive) || maxExclusive <= 0) {
      throw new Error(`nextInt requires maxExclusive > 0, got ${maxExclusive}`)
    }

    return Math.floor(this.next() * maxExclusive)
  }

  pick<T>(items: T[]): T {
    if (items.length === 0) {
      throw new Error("Cannot pick from an empty list")
    }

    return items[this.nextInt(items.length)] as T
  }

  shuffle<T>(items: T[]): T[] {
    const copy = [...items]

    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = this.nextInt(i + 1)
      ;[copy[i], copy[j]] = [copy[j] as T, copy[i] as T]
    }

    return copy
  }
}
