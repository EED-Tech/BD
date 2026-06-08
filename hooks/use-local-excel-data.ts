"use client"

import { useState, useCallback, useEffect } from "react"

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

export interface PartnerRecord {
  id: string
  type: "firm" | "individual"
  name: string
  country: string
  sector: string
  expertise: string
  email: string
  phone: string
  website?: string
  contact_person?: string
  designation?: string
  workedWithBefore?: string
  regional?: string
  global?: string
  yearFounded?: string
  dailyRate?: string
}

export interface ExcelStats {
  totalRecords: number
  eoiCount: number
  proposalCount: number
  partnerCount: number
  lastModified: string
  fileSize?: number
  sheets?: string[]
  source: "upload" | "session" | "none"
  fileName?: string
}

interface UseLocalExcelDataReturn {
  data: BDRecord[]
  partners: PartnerRecord[]
  stats: ExcelStats | null
  loading: boolean
  error: string | null
  lastUpdated: string | null
  hasData: boolean
  fileName: string | null
  loadFromUpload: (
    records: BDRecord[],
    partnerRecords: PartnerRecord[],
    fileMeta: { name: string; size: number; sheets?: string[]; eoiCount?: number; proposalCount?: number; partnerCount?: number }
  ) => void
  clearData: () => void
  filterByType: (type: "all" | "EOI" | "Proposal") => BDRecord[]
}

const SESSION_KEY      = "bd_tracker_data"
const SESSION_PARTNERS = "bd_tracker_partners"
const SESSION_META_KEY = "bd_tracker_meta"

export function useLocalExcelData(): UseLocalExcelDataReturn {
  const [data, setData]         = useState<BDRecord[]>([])
  const [partners, setPartners] = useState<PartnerRecord[]>([])
  const [stats, setStats]       = useState<ExcelStats | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  useEffect(() => {
    try {
      const savedData     = sessionStorage.getItem(SESSION_KEY)
      const savedPartners = sessionStorage.getItem(SESSION_PARTNERS)
      const savedMeta     = sessionStorage.getItem(SESSION_META_KEY)
      if (savedData && savedMeta) {
        const parsed: BDRecord[]     = JSON.parse(savedData)
        const parsedPartners: PartnerRecord[] = savedPartners ? JSON.parse(savedPartners) : []
        const meta                   = JSON.parse(savedMeta)
        setData(parsed)
        setPartners(parsedPartners)
        setStats({
          totalRecords: parsed.length,
          lastModified: meta.lastModified,
          fileSize: meta.fileSize,
          sheets: meta.sheets,
          source: "session",
          eoiCount: parsed.filter((r) => r.bd === "EOI").length,
          proposalCount: parsed.filter((r) => r.bd === "RFP").length,
          partnerCount: parsedPartners.length,
          fileName: meta.fileName,
        })
        setLastUpdated(meta.lastModified)
        setFileName(meta.fileName)
      }
    } catch (e) {
      console.warn("[LocalExcelData] Could not restore session:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadFromUpload = useCallback(
    (
      records: BDRecord[],
      partnerRecords: PartnerRecord[],
      fileMeta: { name: string; size: number; sheets?: string[]; eoiCount?: number; proposalCount?: number; partnerCount?: number }
    ) => {
      try {
        const now  = new Date().toISOString()
        const meta: ExcelStats = {
          totalRecords:   records.length,
          eoiCount:       fileMeta.eoiCount       ?? records.filter((r) => r.bd === "EOI").length,
          proposalCount:  fileMeta.proposalCount  ?? records.filter((r) => r.bd === "RFP").length,
          partnerCount:   fileMeta.partnerCount   ?? partnerRecords.length,
          lastModified:   now,
          fileSize:       fileMeta.size,
          sheets:         fileMeta.sheets,
          source:         "upload",
          fileName:       fileMeta.name,
        }

        sessionStorage.setItem(SESSION_KEY,      JSON.stringify(records))
        sessionStorage.setItem(SESSION_PARTNERS, JSON.stringify(partnerRecords))
        sessionStorage.setItem(SESSION_META_KEY, JSON.stringify(meta))

        setData(records)
        setPartners(partnerRecords)
        setStats(meta)
        setLastUpdated(now)
        setFileName(fileMeta.name)
        setError(null)
        console.log(`[LocalExcelData] Loaded ${records.length} BD records + ${partnerRecords.length} partners from "${fileMeta.name}"`)
      } catch (e) {
        console.error("[LocalExcelData] Failed to store data:", e)
        setError("Failed to save data to session. File may be too large.")
      }
    },
    []
  )

  const clearData = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(SESSION_PARTNERS)
    sessionStorage.removeItem(SESSION_META_KEY)
    setData([])
    setPartners([])
    setStats(null)
    setLastUpdated(null)
    setFileName(null)
  }, [])

  const filterByType = useCallback(
    (type: "all" | "EOI" | "Proposal"): BDRecord[] => {
      if (type === "all")      return data
      if (type === "EOI")      return data.filter((r) => r.bd === "EOI")
      if (type === "Proposal") return data.filter((r) => r.bd === "RFP")
      return data
    },
    [data]
  )

  return { data, partners, stats, loading, error, lastUpdated, hasData: data.length > 0, fileName, loadFromUpload, clearData, filterByType }
}
