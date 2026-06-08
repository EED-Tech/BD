"use client"

import { useState, useEffect, useCallback } from "react"

export interface BDRecord {
  id: string
  serialNumber: number
  bd: string
  year: string
  quarter: string
  client: string
  organization: string
  title: string
  businessLine: string
  serviceOffering: string
  typeBD: string
  country: string
  origin: string
  deadline: string
  cvsProfiles: string
  workplanBudget: string
  methodology: string
  otherActivity: string
  partners: string
  pc: string
  pd: string
  budget: number
  status: string
  timeframe: string
  created_at: string
  updated_at: string
}

export interface ExcelStats {
  totalRecords: number
  lastModified: string
  fileSize?: number
  sheets?: string[]
  source: "database" | "excel" | "cached"
  eoiCount?: number
  proposalCount?: number
}

interface UseSupabaseExcelDataReturn {
  data: BDRecord[]
  stats: ExcelStats | null
  loading: boolean
  error: string | null
  lastUpdated: string | null
  refreshData: () => Promise<void>
  isConnected: boolean
  filterByType: (type: "all" | "EOI" | "Proposal") => BDRecord[]
}

export function useSupabaseExcelData(): UseSupabaseExcelDataReturn {
  const [data, setData] = useState<BDRecord[]>([])
  const [stats, setStats] = useState<ExcelStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true)
      setError(null)

      console.log("[Hook] Fetching BD data...")
      const url = forceRefresh ? "/api/bd-data?refresh=true" : "/api/bd-data"
      const response = await fetch(url, {
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      const result = await response.json()
      console.log("[Hook] API response:", result)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${result.error || response.statusText}`)
      }

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch data")
      }

      setData(result.data || [])
      setStats(result.stats || null)
      setLastUpdated(new Date().toISOString())
      setIsConnected(true)

      console.log(`[Hook] Loaded ${result.data?.length || 0} records from ${result.source}`)
      if (result.stats) {
        console.log(`[Hook] EOIs: ${result.stats.eoiCount || 0}, Proposals: ${result.stats.proposalCount || 0}`)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"
      console.error("[Hook] Error fetching Excel data:", errorMessage)
      setError(`Data fetch error: ${errorMessage}`)
      setIsConnected(false)
      // Don't clear existing data on error
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshData = useCallback(async () => {
    await fetchData(true)
  }, [fetchData])

  const filterByType = useCallback((type: "all" | "EOI" | "Proposal"): BDRecord[] => {
    if (type === "all") return data
    if (type === "EOI") return data.filter((r) => r.bd === "EOI")
    if (type === "Proposal") return data.filter((r) => r.bd === "RFP" || r.bd === "RFI")
    return data
  }, [data])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    stats,
    loading,
    error,
    lastUpdated,
    refreshData,
    isConnected,
    filterByType,
  }
}
