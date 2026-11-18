import { useEffect, useState } from 'react'
import type { PaginationInfo } from '../components/PaginationControls'

export type PaginatedResponse<T> = {
  data: T[]
  pagination: PaginationInfo
}

const initialPagination: PaginationInfo = {
  currentPage: 1,
  pageSize: 20,
  totalRecords: 0,
  totalPages: 0,
}

export function useServerPagination<T>({
  apiUrl,
  endpoint,
  enabled,
  filters,
  onUnauthorized,
}: {
  apiUrl: string
  endpoint: string
  enabled: boolean
  filters?: Record<string, string | undefined>
  onUnauthorized: () => void
}) {
  const [data, setData] = useState<T[]>([])
  const [pagination, setPagination] = useState(initialPagination)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const filterKey = JSON.stringify(filters ?? {})

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (!enabled || search.trim() !== debouncedSearch) return

    const controller = new AbortController()
    const params = new URLSearchParams({
      page: String(page),
      limit: String(pageSize),
    })
    if (debouncedSearch) params.set('search', debouncedSearch)
    const stableFilters = JSON.parse(filterKey) as Record<string, string | undefined>
    for (const [key, value] of Object.entries(stableFilters)) {
      if (value) params.set(key, value)
    }

    const loadingTimer = window.setTimeout(() => {
      if (!controller.signal.aborted) setLoading(true)
    }, 0)
    void fetch(`${apiUrl}${endpoint}?${params.toString()}`, {
      credentials: 'include',
      signal: controller.signal,
    }).then(async (response) => {
      if (response.status === 401) onUnauthorized()
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { message?: string | string[] } | null
        const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message
        throw new Error(message || `Could not load records. (${response.status})`)
      }
      return response.json() as Promise<PaginatedResponse<T>>
    }).then((result) => {
      if (controller.signal.aborted) return
      setError('')
      setData(result.data)
      setPagination(result.pagination)
      if (result.pagination.currentPage !== page) setPage(result.pagination.currentPage)
    }).catch((requestError: unknown) => {
      if (controller.signal.aborted) return
      setError(requestError instanceof Error ? requestError.message : 'Could not load records.')
    }).finally(() => {
      window.clearTimeout(loadingTimer)
      if (!controller.signal.aborted) setLoading(false)
    })

    return () => {
      window.clearTimeout(loadingTimer)
      controller.abort()
    }
  }, [apiUrl, endpoint, enabled, page, pageSize, search, debouncedSearch, filterKey, refreshKey, onUnauthorized])

  function changeSearch(value: string) {
    setSearch(value)
    setPage(1)
  }

  function changePageSize(value: number) {
    setPageSize(value)
    setPage(1)
  }

  function changePage(value: number) {
    setPage(Math.max(1, value))
  }

  function refresh() {
    setRefreshKey((key) => key + 1)
  }

  return {
    data,
    pagination,
    loading,
    error,
    search,
    setSearch: changeSearch,
    setPage: changePage,
    setPageSize: changePageSize,
    refresh,
  }
}
