/**
 * Serves the bundled default Excel file so the dashboard auto-loads
 * on first visit without requiring a manual upload.
 *
 * Fetches the file via HTTP (from /public) instead of fs.readFileSync
 * so it works regardless of what process.cwd() resolves to at runtime.
 */
import { type NextRequest, NextResponse } from "next/server"

const FILE_NAME = "BD Tracker_Live Document.xlsx"

export async function GET(request: NextRequest) {
  try {
    // Derive the base URL from the incoming request — works in dev and production
    const { origin } = new URL(request.url)
    const fileUrl = `${origin}/${encodeURIComponent(FILE_NAME)}`

    const fileRes = await fetch(fileUrl)
    if (!fileRes.ok) {
      return NextResponse.json(
        { success: false, error: `Default file not found (${fileRes.status}). Place "${FILE_NAME}" in /public.` },
        { status: 404 }
      )
    }

    const arrayBuffer = await fileRes.arrayBuffer()

    // Dynamic import keeps xlsx out of the browser bundle
    const XLSX = await import("xlsx")
    const workbook  = XLSX.read(arrayBuffer, { type: "array", cellDates: true })
    const sheetNames = workbook.SheetNames

    // ── helpers ──────────────────────────────────────────────────────────────
    function sheetToRows(ws: any): any[][] {
      return XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false }) as any[][]
    }
    function buildColumnMap(headers: any[]): Record<string, number> {
      const map: Record<string, number> = {}
      headers.forEach((h, i) => {
        if (!h) return
        map[h.toString().toLowerCase().trim().replace(/\s+/g, " ")] = i
      })
      return map
    }
    function str(v: any): string { return v == null ? "" : v.toString().trim() }
    function num(v: any): number {
      if (typeof v === "number") return v
      if (typeof v === "string") { const n = parseFloat(v.replace(/[,$\s]/g, "")); return isNaN(n) ? 0 : n }
      return 0
    }

    // ── BD rows (EOIs + Proposals) ───────────────────────────────────────────
    function parseBDRows(rawData: any[][], bdType: "EOI" | "RFP"): any[] {
      if (!rawData || rawData.length < 2) return []
      let headerIdx = 0
      for (let i = 0; i < Math.min(5, rawData.length); i++) {
        const joined = rawData[i].join(" ").toLowerCase()
        if (joined.includes("serial number") || joined.includes("project title")) { headerIdx = i; break }
      }
      const colMap = buildColumnMap(rawData[headerIdx])
      const get = (row: any[], key: string) => { const idx = colMap[key]; return idx !== undefined ? row[idx] ?? "" : "" }
      return rawData.slice(headerIdx + 1)
        .filter(row => row?.some((c: any) => c?.toString().trim()))
        .map((row, ri) => {
          const title = str(get(row, "project title")), org = str(get(row, "name of organization"))
          if (!title && !org) return null
          return {
            id: `${bdType}_${ri}_${Math.random().toString(36).substr(2, 6)}`,
            bd: bdType, serialNumber: num(get(row, "serial number")) || ri + 1,
            year: str(get(row, "year")), quarter: str(get(row, "quarter")),
            client: str(get(row, "type of client")), organization: org, title,
            businessLine: str(get(row, "business line")), serviceOffering: str(get(row, "service offering")),
            typeBD: str(get(row, "type of bd")), country: str(get(row, "country covered")),
            origin: str(get(row, "origin of bd")), deadline: str(get(row, "external deadline")),
            cvsProfiles: str(get(row, "cvs & project profiles")), workplanBudget: str(get(row, "workplan & budget")),
            methodology: str(get(row, "methodology")), otherActivity: str(get(row, "other activity")),
            partners: str(get(row, "partners")), pc: str(get(row, "pc")), pd: str(get(row, "pd")),
            budget: num(get(row, "budget (us$)")),
            status: str(get(row, "status")) || str(get(row, "won")),
            timeframe: str(get(row, "timeframe (months)")),
            created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          }
        }).filter(Boolean)
    }

    // ── Partners ─────────────────────────────────────────────────────────────
    function parseFirmRows(rawData: any[][]): any[] {
      if (!rawData || rawData.length < 2) return []
      let headerIdx = 0
      for (let i = 0; i < Math.min(5, rawData.length); i++) {
        const joined = rawData[i].join(" ").toLowerCase()
        if (joined.includes("name of firm") || joined.includes("country hq")) { headerIdx = i; break }
      }
      const colMap = buildColumnMap(rawData[headerIdx])
      const get = (row: any[], key: string) => { const idx = colMap[key]; return idx !== undefined ? row[idx] ?? "" : "" }
      return rawData.slice(headerIdx + 1)
        .filter(row => row?.some((c: any) => c?.toString().trim()))
        .map((row, ri) => {
          const name = str(get(row, "name of firm")); if (!name) return null
          return {
            id: `firm_${ri}`, type: "firm", name,
            country: str(get(row, "country hq")), email: str(get(row, "email")),
            phone: str(get(row, "phone")), website: str(get(row, "website")),
            contact_person: str(get(row, "name of contact person")),
            designation: str(get(row, "designation")),
            workedWithBefore: str(get(row, "have we worked with them in the past (yes/no)")),
            sector: "", expertise: "",
          }
        }).filter(Boolean)
    }

    function parseExpertRows(rawData: any[][]): any[] {
      if (!rawData || rawData.length < 2) return []
      let headerIdx = 0
      for (let i = 0; i < Math.min(5, rawData.length); i++) {
        const joined = rawData[i].join(" ").toLowerCase()
        if (joined.includes("name of expert") || joined.includes("expertise")) { headerIdx = i; break }
      }
      const colMap = buildColumnMap(rawData[headerIdx])
      const get = (row: any[], key: string) => { const idx = colMap[key]; return idx !== undefined ? row[idx] ?? "" : "" }
      return rawData.slice(headerIdx + 1)
        .filter(row => row?.some((c: any) => c?.toString().trim()))
        .map((row, ri) => {
          const name = str(get(row, "name of expert")); if (!name) return null
          return {
            id: `expert_${ri}`, type: "individual", name,
            expertise: str(get(row, "expertise")), sector: str(get(row, "sector")),
            country: str(get(row, "country")), email: str(get(row, "email")),
            phone: str(get(row, "phone number")),
            workedWithBefore: str(get(row, "have we worked with this expert before? (yes/no)")),
            dailyRate: str(get(row, "daily rate")),
          }
        }).filter(Boolean)
    }

    // ── Parse all sheets ──────────────────────────────────────────────────────
    const eoiSheet    = sheetNames.find((n) => /eoi/i.test(n))
    const propSheet   = sheetNames.find((n) => /proposal/i.test(n))
    const firmSheet   = sheetNames.find((n) => /firm/i.test(n))
    const expertSheet = sheetNames.find((n) => /individual|expert/i.test(n))

    const bdRecords = [
      ...parseBDRows(eoiSheet  ? sheetToRows(workbook.Sheets[eoiSheet])  : [], "EOI"),
      ...parseBDRows(propSheet ? sheetToRows(workbook.Sheets[propSheet]) : [], "RFP"),
    ]
    const partnerRecords = [
      ...parseFirmRows(firmSheet      ? sheetToRows(workbook.Sheets[firmSheet])    : []),
      ...parseExpertRows(expertSheet  ? sheetToRows(workbook.Sheets[expertSheet])  : []),
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
        lastModified:  new Date().toISOString(),
        fileSize:      arrayBuffer.byteLength,
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
