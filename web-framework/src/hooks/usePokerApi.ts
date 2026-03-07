import { useCallback, useEffect, useMemo, useState, type DependencyList } from "react"

import { PokerApiClient } from "../clients/poker-api"

let sharedClient: PokerApiClient | null = null

export function usePokerApi() {
  return useMemo(() => {
    if (!sharedClient) {
      sharedClient = new PokerApiClient("/api/v1")
    }

    return sharedClient
  }, [])
}

export function useApiResource<T>(
  loader: (api: PokerApiClient) => Promise<T>,
  dependencies: DependencyList,
): {
  data: T | null
  error: string | null
  loading: boolean
  reload: () => void
} {
  const api = usePokerApi()
  const [version, setVersion] = useState(0)
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(() => {
    setVersion((value) => value + 1)
  }, [])

  useEffect(() => {
    let disposed = false
    setLoading(true)
    setError(null)

    void loader(api)
      .then((value) => {
        if (disposed) {
          return
        }
        setData(value)
      })
      .catch((reason: unknown) => {
        if (disposed) {
          return
        }
        setError(reason instanceof Error ? reason.message : String(reason))
      })
      .finally(() => {
        if (!disposed) {
          setLoading(false)
        }
      })

    return () => {
      disposed = true
    }
  }, [api, loader, version, ...dependencies])

  return {
    data,
    error,
    loading,
    reload,
  }
}
