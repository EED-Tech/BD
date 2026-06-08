"use client"

import { useState, useEffect, useCallback } from "react"
import SupabaseExcelReader, {
  type PartnersStats,
  type DetailedPartnerFirm,
  type PartnerFirm,
  type PartnerIndividual,
} from "@/lib/supabase-excel-reader"

interface UseSupabasePartnersDataReturn {
  firms: PartnerFirm[]
  individuals: PartnerIndividual[]
  detailedFirms: DetailedPartnerFirm[]
  stats: PartnersStats | null
  loading: boolean
  error: string | null
  lastUpdated: string | null
  refreshData: () => Promise<void>
}

// Instantiate the reader once
const excelReader = new SupabaseExcelReader()

export function useSupabasePartnersData(): UseSupabasePartnersDataReturn {
  const [firms, setFirms] = useState<PartnerFirm[]>([])
  const [individuals, setIndividuals] = useState<PartnerIndividual[]>([])
  const [detailedFirms, setDetailedFirms] = useState<DetailedPartnerFirm[]>([])
  const [stats, setStats] = useState<PartnersStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true)
      setError(null)

      console.log("[Partners Hook] Fetching partner data from Excel reader...")
      const result = await excelReader.fetchPartnersData(forceRefresh)

      setFirms(result.data.firms || [])
      setIndividuals(result.data.individuals || [])
      setDetailedFirms(result.data.detailedFirms || [])
      setStats(result.stats || null)
      setLastUpdated(new Date().toISOString())

      if (result.stats?.source === "api-error") {
        setError(result.stats.errorDetails || "Failed to load partners data from Excel.")
      } else {
        setError(null) // Clear any previous errors
      }

      console.log(
        `[Partners Hook] Loaded ${result.data.firms?.length || 0} firms, ${
          result.data.individuals?.length || 0
        } individuals, and ${result.data.detailedFirms?.length || 0} detailed firms from ${result.stats?.source}`,
      )
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"
      console.error("[Partners Hook] Error fetching partners data:", errorMessage)
      setError(`Partners data fetch error: ${errorMessage}`)
      setStats((prev) => ({
        ...(prev || { totalRecords: 0, lastModified: new Date().toISOString() }),
        source: "api-error",
        errorDetails: errorMessage,
      }))
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshData = useCallback(async () => {
    await fetchData(true)
  }, [fetchData])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    firms,
    individuals,
    detailedFirms,
    stats,
    loading,
    error,
    lastUpdated,
    refreshData,
  }
}
