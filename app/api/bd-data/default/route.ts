/**
 * Serves the bundled default Excel file so the dashboard auto-loads
 * on first visit without requiring a manual upload.
 * Place the Excel at /public/BD_Tracker_Live_Document.xlsx and it
 * will be parsed and returned identically to the upload route.
 */
import { type NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import path from "path"
import fs from "fs"

export async function GET(request: NextRequest) {
  try {
    const filePath = path.join(process.cwd(), "public", "BD_Tracker_Live_Document.xlsx")

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ success: false, error: "Default file not found" }, { status: 404 })
    }

    const buffer = fs.readFileSync(filePath)
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true })
    const sheetNames = workbook.SheetNames

    function sheetToRows(ws: XLSX.WorkSheet): any[][] {
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

    function parseBDRows(rawData: any[][], bdType: "EOI" | "RFP"): any[] {
      if (!rawData || rawData.length < 2) return []
      let headerIdx = 0
      for (let i = 0; i < Math.min(5, rawData.length); i++) {
        const joined = rawData[i].join(" ").toLowerCase()
        if (joined.includes("serial number") || joined.includes("project title")) { headerIdx = i; break }
      }
      const colMap = buildColumnMap(rawData[headerIdx])
      const get = (row: any[], key: string) => { const idx = colMap[key]; return idx !== undefined ? row[idx] ?? "" : "" }
      return rawData.slice(headerIdx + 1).filter(row => row?.some((c: any) => c?.toString().trim())).map((row, ri) => {
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

    function parseFirmRows(rawData: any[][]): any[] {
      if (!rawData || rawData.length < 2) return []
      let headerIdx = 0
      for (let i = 0; i < Math.min(5, rawData.length); i++) {
        const joined = rawData[i].join(" ").toLowerCase()
        if (joined.includes("name of firm") || joined.includes("country hq")) { headerIdx = i; break }
      }
      const colMap = buildColumnMap(rawData[headerIdx])
      const get = (row: any[], key: string) => { const idx = colMap[key]; return idx !== undefined ? row[idx] ?? "" : "" }
      return rawData.slice(headerIdx + 1).filter(row => row?.some((c: any) => c?.toString().trim())).map((row, ri) => {
        const name = str(get(row, "name of firm")); if (!name) return null
        return { id: `firm_${ri}`, type: "firm", name, country: str(get(row, "country hq")), email: str(get(row, "email")), phone: str(get(row, "phone")), website: str(get(row, "website")), contact_person: str(get(row, "name of contact person")), designation: str(get(row, "designation")), workedWithBefore: str(get(row, "have we worked with them in the past (yes/no)")), sector: "", expertise: "" }
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
      return rawData.slice(headerIdx + 1).filter(row => row?.some((c: any) => c?.toString().trim())).map((row, ri) => {
        const name = str(get(row, "name of expert")); if (!name) return null
        return { id: `expert_${ri}`, type: "individual", name, expertise: str(get(row, "expertise")), sector: str(get(row, "sector")), country: str(get(row, "country")), email: str(get(row, "email")), phone: str(get(row, "phone number")), workedWithBefore: str(get(row, "have we worked with this expert before? (yes/no)")), dailyRate: str(get(row, "daily rate")) }
      }).filter(Boolean)
    }

    const eoiSheet   = sheetNames.find((n) => /eoi/i.test(n))
    const propSheet  = sheetNames.find((n) => /proposal/i.test(n))
    const firmSheet  = sheetNames.find((n) => /firm/i.test(n))
    const expertSheet = sheetNames.find((n) => /individual|expert/i.test(n))

    const bdRecords = [
      ...parseBDRows(eoiSheet  ? sheetToRows(workbook.Sheets[eoiSheet])  : [], "EOI"),
      ...parseBDRows(propSheet ? sheetToRows(workbook.Sheets[propSheet]) : [], "RFP"),
    ]
    const partnerRecords = [
      ...parseFirmRows(firmSheet    ? sheetToRows(workbook.Sheets[firmSheet])    : []),
      ...parseExpertRows(expertSheet ? sheetToRows(workbook.Sheets[expertSheet]) : []),
    ]

    const stats = fs.statSync(filePath)
    return NextResponse.json({
      success: true,
      data: bdRecords,
      partners: partnerRecords,
      source: "default",
      stats: {
        totalRecords: bdRecords.length,
        eoiCount: bdRecords.filter(r => r.bd === "EOI").length,
        proposalCount: bdRecords.filter(r => r.bd === "RFP").length,
        partnerCount: partnerRecords.length,
        lastModified: stats.mtime.toISOString(),
        fileSize: stats.size,
        sheets: sheetNames,
        fileName: "BD_Tracker_Live_Document.xlsx",
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: `Failed to load default file: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    )
  }
}
