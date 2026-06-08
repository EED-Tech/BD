import { type NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 })
    }

    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ]
    if (!validTypes.includes(file.type) && !file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      return NextResponse.json(
        { success: false, error: "Invalid file type. Please upload an Excel file (.xlsx or .xls)" },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true })
    const sheetNames = workbook.SheetNames
    console.log("[Upload API] Sheets found:", sheetNames)

    // ── BD Tracker rows (EOIs + Proposals) ──────────────────────────────────
    const eoiSheet   = sheetNames.find((n) => /eoi/i.test(n))
    const propSheet  = sheetNames.find((n) => /proposal/i.test(n))

    const eoiRows   = eoiSheet  ? sheetToRows(workbook.Sheets[eoiSheet])  : []
    const propRows  = propSheet ? sheetToRows(workbook.Sheets[propSheet]) : []

    const eoiRecords  = parseBDRows(eoiRows,  "EOI")
    const propRecords = parseBDRows(propRows, "RFP")
    const bdRecords   = [...eoiRecords, ...propRecords]

    // ── Partners ─────────────────────────────────────────────────────────────
    const firmSheet   = sheetNames.find((n) => /firm/i.test(n))
    const expertSheet = sheetNames.find((n) => /individual|expert/i.test(n))

    const firmRows   = firmSheet   ? sheetToRows(workbook.Sheets[firmSheet])   : []
    const expertRows = expertSheet ? sheetToRows(workbook.Sheets[expertSheet]) : []

    const firmPartners   = parseFirmRows(firmRows)
    const expertPartners = parseExpertRows(expertRows)
    const partnerRecords = [...firmPartners, ...expertPartners]

    console.log(`[Upload API] BD records: ${bdRecords.length} | Partners: ${partnerRecords.length}`)

    return NextResponse.json({
      success: true,
      data: bdRecords,
      partners: partnerRecords,
      source: "upload",
      stats: {
        totalRecords: bdRecords.length,
        eoiCount: eoiRecords.length,
        proposalCount: propRecords.length,
        partnerCount: partnerRecords.length,
        lastModified: new Date().toISOString(),
        fileSize: arrayBuffer.byteLength,
        sheets: sheetNames,
        fileName: file.name,
      },
    })
  } catch (error) {
    console.error("[Upload API] Error:", error)
    return NextResponse.json(
      { success: false, error: `Failed to process file: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    )
  }
}

// ─── helpers ────────────────────────────────────────────────────────────────

function sheetToRows(ws: XLSX.WorkSheet): any[][] {
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false }) as any[][]
}

function buildColumnMap(headers: any[]): Record<string, number> {
  const map: Record<string, number> = {}
  headers.forEach((h, i) => {
    if (!h) return
    const s = h.toString().toLowerCase().trim().replace(/\s+/g, " ")
    map[s] = i
  })
  return map
}

function str(v: any): string {
  if (v === null || v === undefined) return ""
  return v.toString().trim()
}

function num(v: any): number {
  if (typeof v === "number") return v
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/[,$\s]/g, ""))
    return isNaN(n) ? 0 : n
  }
  return 0
}

// ─── BD rows parser ─────────────────────────────────────────────────────────

function parseBDRows(rawData: any[][], bdType: "EOI" | "RFP"): any[] {
  if (!rawData || rawData.length < 2) return []

  // find header row
  let headerIdx = 0
  for (let i = 0; i < Math.min(5, rawData.length); i++) {
    const joined = rawData[i].join(" ").toLowerCase()
    if (joined.includes("serial number") || joined.includes("project title")) { headerIdx = i; break }
  }

  const colMap = buildColumnMap(rawData[headerIdx])
  const dataRows = rawData.slice(headerIdx + 1)

  const get = (row: any[], key: string) => {
    const idx = colMap[key]
    return idx !== undefined ? row[idx] ?? "" : ""
  }

  const records: any[] = []
  dataRows.forEach((row, ri) => {
    if (!row || !row.some((c: any) => c !== null && c !== undefined && c.toString().trim() !== "")) return

    const title = str(get(row, "project title"))
    const org   = str(get(row, "name of organization"))
    if (!title && !org) return

    records.push({
      id: `${bdType}_${ri}_${Math.random().toString(36).substr(2, 6)}`,
      bd: bdType,
      serialNumber: num(get(row, "serial number")) || ri + 1,
      year: str(get(row, "year")),
      quarter: str(get(row, "quarter")),
      client: str(get(row, "type of client")),
      organization: org,
      title,
      businessLine: str(get(row, "business line")),
      serviceOffering: str(get(row, "service offering")),
      typeBD: str(get(row, "type of bd")),
      country: str(get(row, "country covered")),
      origin: str(get(row, "origin of bd")),
      deadline: str(get(row, "external deadline")),
      cvsProfiles: str(get(row, "cvs & project profiles")),
      workplanBudget: str(get(row, "workplan & budget")),
      methodology: str(get(row, "methodology")),
      otherActivity: str(get(row, "other activity")),
      partners: str(get(row, "partners")),
      pc: str(get(row, "pc")),
      pd: str(get(row, "pd")),
      budget: num(get(row, "budget (us$)")),
      // EOI sheet has "Status" column; Proposal sheet has "Won" column
      status: str(get(row, "status")) || str(get(row, "won")),
      timeframe: str(get(row, "timeframe (months)")),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  })

  return records
}

// ─── Partners Firms parser ───────────────────────────────────────────────────

function parseFirmRows(rawData: any[][]): any[] {
  if (!rawData || rawData.length < 2) return []

  let headerIdx = 0
  for (let i = 0; i < Math.min(5, rawData.length); i++) {
    const joined = rawData[i].join(" ").toLowerCase()
    if (joined.includes("name of firm") || joined.includes("country hq")) { headerIdx = i; break }
  }

  const colMap = buildColumnMap(rawData[headerIdx])
  const dataRows = rawData.slice(headerIdx + 1)

  const get = (row: any[], key: string) => {
    const idx = colMap[key]
    return idx !== undefined ? row[idx] ?? "" : ""
  }

  const records: any[] = []
  dataRows.forEach((row, ri) => {
    if (!row || !row.some((c: any) => c !== null && c !== undefined && c.toString().trim() !== "")) return
    const name = str(get(row, "name of firm"))
    if (!name) return

    records.push({
      id: `firm_${ri}_${Math.random().toString(36).substr(2, 6)}`,
      type: "firm",
      name,
      country: str(get(row, "country hq")),
      regional: str(get(row, "regional (list the countries)")),
      global: str(get(row, "global (yes/no)")),
      yearFounded: str(get(row, "year founded")),
      contact_person: str(get(row, "name of contact person")),
      designation: str(get(row, "designation")),
      email: str(get(row, "email")),
      phone: str(get(row, "phone")),
      website: str(get(row, "website")),
      workedWithBefore: str(get(row, "have we worked with them in the past (yes/no)")),
      cvUploaded: str(get(row, "cv uploaded (yes/no)")),
      sector: "",       // firms sheet has no sector column – leave blank
      expertise: "",
    })
  })

  return records
}

// ─── Partners Individual Experts parser ──────────────────────────────────────

function parseExpertRows(rawData: any[][]): any[] {
  if (!rawData || rawData.length < 2) return []

  let headerIdx = 0
  for (let i = 0; i < Math.min(5, rawData.length); i++) {
    const joined = rawData[i].join(" ").toLowerCase()
    if (joined.includes("name of expert") || joined.includes("expertise")) { headerIdx = i; break }
  }

  const colMap = buildColumnMap(rawData[headerIdx])
  const dataRows = rawData.slice(headerIdx + 1)

  const get = (row: any[], key: string) => {
    const idx = colMap[key]
    return idx !== undefined ? row[idx] ?? "" : ""
  }

  const records: any[] = []
  dataRows.forEach((row, ri) => {
    if (!row || !row.some((c: any) => c !== null && c !== undefined && c.toString().trim() !== "")) return
    const name = str(get(row, "name of expert"))
    if (!name) return

    records.push({
      id: `expert_${ri}_${Math.random().toString(36).substr(2, 6)}`,
      type: "individual",
      name,
      expertise: str(get(row, "expertise")),
      sector: str(get(row, "sector")),
      country: str(get(row, "country")),
      email: str(get(row, "email")),
      phone: str(get(row, "phone number")),
      workedWithBefore: str(get(row, "have we worked with this expert before? (yes/no)")),
      dailyRate: str(get(row, "daily rate")),
      cvUploaded: str(get(row, "cv uploaded (yes/no)")),
      contact_person: "",
      designation: "",
      website: "",
    })
  })

  return records
}
