import { useCallback, useEffect, useMemo, useState } from "react"

import type { GoldenFixtureReplayFrame } from "../types"

export function useFixtureReplay(frames: GoldenFixtureReplayFrame[]) {
  const [frameIndex, setFrameIndex] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [isPlaying, setIsPlaying] = useState(false)

  const maxFrame = Math.max(0, frames.length - 1)

  useEffect(() => {
    setFrameIndex((index) => Math.max(0, Math.min(maxFrame, index)))
  }, [maxFrame])

  useEffect(() => {
    if (!isPlaying || frames.length <= 1) {
      return
    }

    const delay = Math.max(140, Math.round(900 / Math.max(0.5, speed)))
    const timer = window.setInterval(() => {
      setFrameIndex((index) => {
        if (index >= maxFrame) {
          setIsPlaying(false)
          return index
        }

        return index + 1
      })
    }, delay)

    return () => {
      window.clearInterval(timer)
    }
  }, [frames.length, isPlaying, maxFrame, speed])

  const stop = useCallback(() => {
    setIsPlaying(false)
  }, [])

  const play = useCallback(() => {
    if (frames.length > 1) {
      setIsPlaying(true)
    }
  }, [frames.length])

  const togglePlay = useCallback(() => {
    setIsPlaying((playing) => !playing)
  }, [])

  const goToFrame = useCallback((index: number) => {
    setFrameIndex(Math.max(0, Math.min(maxFrame, Math.floor(index))))
  }, [maxFrame])

  const nextFrame = useCallback(() => {
    setFrameIndex((index) => Math.max(0, Math.min(maxFrame, index + 1)))
  }, [maxFrame])

  const prevFrame = useCallback(() => {
    setFrameIndex((index) => Math.max(0, Math.min(maxFrame, index - 1)))
  }, [maxFrame])

  const currentFrame = useMemo(() => frames[frameIndex] || null, [frameIndex, frames])

  return {
    frameIndex,
    maxFrame,
    speed,
    isPlaying,
    currentFrame,
    setSpeed,
    stop,
    play,
    togglePlay,
    goToFrame,
    nextFrame,
    prevFrame,
  }
}
