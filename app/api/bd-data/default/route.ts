export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"

const FILE_NAME = "BD_Tracker_Live Document.xlsx"

export async function GET(request: NextRequest) {
  try {
    const XLSX = await import("xlsx")

    // Derive the base URL from the incoming request — works locally and on Netlify
    const { origin } = new URL(request.url)
    const fileUrl = `${origin}/${encodeURIComponent(FILE_NAME)}`

    const res = await fetch(fileUrl)
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: `File not found at ${fileUrl} (status ${res.status})` },
        { status: 404 }
      )
    }

    const arrayBuffer = await res.arrayBuffer()
    const buffer      = Buffer.from(arrayBuffer)
    const workbook    = XLSX.read(buffer, { type: "buffer", cellDates: true })
    const sheetNames  = workbook.SheetNames

    function sheetToRows(ws: any): any[][] {
      return XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false }) as any[][]
    }
    function buildColMap(headers: any[]): Record<string, number> {
      const map: Record<string, number> = {}
      headers.forEach((h, i) => {
        if (h) map[h.toString().toLowerCase().trim().replace(/\s+/g, " ")] = i
      })
      return map
    }
    const str = (v: any) => (v == null ? "" : v.toString().trim())
    const num = (v: any) => {
      if (typeof v === "number") return v
      const n = parseFloat(String(v).replace(/[,$\s]/g, ""))
      return isNaN(n) ? 0 : n
    }

    function parseBDRows(rawData: any[][], bdType: "EOI" | "RFP") {
      if (!rawData || rawData.length < 2) return []
      let hi = 0
      for (let i = 0; i < Math.min(5, rawData.length); i++) {
        if (rawData[i].join(" ").toLowerCase().includes("project title")) { hi = i; break }
      }
      const cm = buildColMap(rawData[hi])
      const g = (row: any[], key: string) => { const idx = cm[key]; return idx !== undefined ? row[idx] ?? "" : "" }
      return rawData.slice(hi + 1)
        .filter(row => row?.some((c: any) => c?.toString().trim()))
        .map((row, ri) => {
          const title = str(g(row, "project title")), org = str(g(row, "name of organization"))
          if (!title && !org) return null
          return {
            id: `${bdType}_${ri}_${Math.random().toString(36).substr(2, 6)}`,
            bd: bdType, serialNumber: num(g(row, "serial number")) || ri + 1,
            year: str(g(row, "year")), quarter: str(g(row, "quarter")),
            client: str(g(row, "type of client")), organization: org, title,
            businessLine: str(g(row, "business line")), serviceOffering: str(g(row, "service offering")),
            typeBD: str(g(row, "type of bd")), country: str(g(row, "country covered")),
            origin: str(g(row, "origin of bd")), deadline: str(g(row, "external deadline")),
            cvsProfiles: str(g(row, "cvs & project profiles")), workplanBudget: str(g(row, "workplan & budget")),
            methodology: str(g(row, "methodology")), otherActivity: str(g(row, "other activity")),
            partners: str(g(row, "partners")), pc: str(g(row, "pc")), pd: str(g(row, "pd")),
            budget: num(g(row, "budget (us$)")),
            status: str(g(row, "status")) || str(g(row, "won")),
            timeframe: str(g(row, "timeframe (months)")),
            created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          }
        }).filter(Boolean)
    }

    function parseFirmRows(rawData: any[][]) {
      if (!rawData || rawData.length < 2) return []
      let hi = 0
      for (let i = 0; i < Math.min(5, rawData.length); i++) {
        if (rawData[i].join(" ").toLowerCase().match(/name of firm|country hq/)) { hi = i; break }
      }
      const cm = buildColMap(rawData[hi])
      const g = (row: any[], key: string) => { const idx = cm[key]; return idx !== undefined ? row[idx] ?? "" : "" }
      return rawData.slice(hi + 1).filter(row => row?.some((c: any) => c?.toString().trim())).map((row, ri) => {
        const name = str(g(row, "name of firm")); if (!name) return null
        return { id: `firm_${ri}`, type: "firm", name, country: str(g(row, "country hq")), email: str(g(row, "email")), phone: str(g(row, "phone")), website: str(g(row, "website")), contact_person: str(g(row, "name of contact person")), designation: str(g(row, "designation")), workedWithBefore: str(g(row, "have we worked with them in the past (yes/no)")), sector: "", expertise: "" }
      }).filter(Boolean)
    }

    function parseExpertRows(rawData: any[][]) {
      if (!rawData || rawData.length < 2) return []
      let hi = 0
      for (let i = 0; i < Math.min(5, rawData.length); i++) {
        if (rawData[i].join(" ").toLowerCase().match(/name of expert|expertise/)) { hi = i; break }
      }
      const cm = buildColMap(rawData[hi])
      const g = (row: any[], key: string) => { const idx = cm[key]; return idx !== undefined ? row[idx] ?? "" : "" }
      return rawData.slice(hi + 1).filter(row => row?.some((c: any) => c?.toString().trim())).map((row, ri) => {
        const name = str(g(row, "name of expert")); if (!name) return null
        return { id: `expert_${ri}`, type: "individual", name, expertise: str(g(row, "expertise")), sector: str(g(row, "sector")), country: str(g(row, "country")), email: str(g(row, "email")), phone: str(g(row, "phone number")), workedWithBefore: str(g(row, "have we worked with this expert before? (yes/no)")), dailyRate: str(g(row, "daily rate")) }
      }).filter(Boolean)
    }

    const eoiSheet    = sheetNames.find(n => /eoi/i.test(n))
    const propSheet   = sheetNames.find(n => /proposal/i.test(n))
    const firmSheet   = sheetNames.find(n => /firm/i.test(n))
    const expertSheet = sheetNames.find(n => /individual|expert/i.test(n))

    const bdRecords = [
      ...parseBDRows(eoiSheet  ? sheetToRows(workbook.Sheets[eoiSheet])  : [], "EOI"),
      ...parseBDRows(propSheet ? sheetToRows(workbook.Sheets[propSheet]) : [], "RFP"),
    ]
    const partnerRecords = [
      ...parseFirmRows(firmSheet     ? sheetToRows(workbook.Sheets[firmSheet])    : []),
      ...parseExpertRows(expertSheet ? sheetToRows(workbook.Sheets[expertSheet])  : []),
    ]

    return NextResponse.json({
      success: true,
      data: bdRecords,
      partners: partnerRecords,
      source: "default",
      stats: {
        totalRecords:  bdRecords.length,
        eoiCount:      bdRecords.filter((r: any) => r.bd === "EOI").length,
        proposalCount: bdRecords.filter((r: any) => r.bd === "RFP").length,
        partnerCount:  partnerRecords.length,
        // fetch() has no mtime — use a fixed sentinel so callers don't break
        lastModified:  new Date().toISOString(),
        fileSize:      buffer.byteLength,
        sheets:        sheetNames,
        fileName:      FILE_NAME,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: `Failed to load default file: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    )
  }
}
