import { type NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"

export async function POST(request: NextRequest) {
  try {
    console.log("[Upload API] Processing file upload...")

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 })
    }

    console.log("[Upload API] File received:", file.name, "Size:", file.size)

    // Validate file type
    const validTypes = ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"]

    if (!validTypes.includes(file.type) && !file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      return NextResponse.json(
        { success: false, error: "Invalid file type. Please upload an Excel file (.xlsx or .xls)" },
        { status: 400 },
      )
    }

    // Read file
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: "array" })

    // Find the main sheet
    const sheetNames = workbook.SheetNames
    console.log("[Upload API] Available sheets:", sheetNames)

    const mainSheet =
      sheetNames.find((name) => name.toLowerCase().includes("bd") || name.toLowerCase().includes("tracker")) ||
      sheetNames[0]

    console.log("[Upload API] Using sheet:", mainSheet)

    const worksheet = workbook.Sheets[mainSheet]
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" })

    // Parse the Excel data
    const parsedData = parseExcelData(jsonData as any[][])

    console.log(`[Upload API] Parsed ${parsedData.length} records from Excel`)

    return NextResponse.json({
      success: true,
      data: parsedData,
      source: "upload",
      stats: {
        totalRecords: parsedData.length,
        lastModified: new Date().toISOString(),
        fileSize: arrayBuffer.byteLength,
        sheets: sheetNames,
        source: "upload",
        fileName: file.name,
      },
    })
  } catch (error) {
    console.error("[Upload API] Error processing file:", error)
    return NextResponse.json(
      {
        success: false,
        error: `Failed to process Excel file: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 },
    )
  }
}

function parseExcelData(rawData: any[][]): any[] {
  if (!rawData || rawData.length < 2) {
    console.log("[Parser] No data to parse")
    return []
  }

  console.log("[Parser] Raw data rows:", rawData.length)

  // Find header row - look for the exact headers from your data
  let headerRowIndex = 0
  for (let i = 0; i < Math.min(10, rawData.length); i++) {
    const row = rawData[i]
    if (row && row.length > 5) {
      const rowStr = row.join(" ").toLowerCase()
      if (
        rowStr.includes("serial number") ||
        rowStr.includes("project title") ||
        rowStr.includes("business line") ||
        rowStr.includes("budget (us$)")
      ) {
        headerRowIndex = i
        break
      }
    }
  }

  const headers = rawData[headerRowIndex]
  console.log("[Parser] Headers found at row", headerRowIndex, ":", headers)

  const dataRows = rawData.slice(headerRowIndex + 1)
  console.log("[Parser] Data rows to process:", dataRows.length)

  // Create exact column mapping based on your Excel headers
  const columnMap: Record<string, number> = {}

  headers.forEach((header, index) => {
    if (!header) return
    const headerStr = header.toString().toLowerCase().trim()

    // Map exact headers from your Excel data
    if (headerStr === "serial number") {
      columnMap.serialNumber = index
    } else if (headerStr === "bd") {
      columnMap.bd = index
    } else if (headerStr === "quarter") {
      columnMap.quarter = index
    } else if (headerStr === "type of client") {
      columnMap.client = index
    } else if (headerStr === "name of organization") {
      columnMap.organization = index
    } else if (headerStr === "project title") {
      columnMap.title = index
    } else if (headerStr === "business line") {
      columnMap.businessLine = index
    } else if (headerStr === "service offering") {
      columnMap.serviceOffering = index
    } else if (headerStr === "type of bd") {
      columnMap.typeBD = index
    } else if (headerStr === "country covered") {
      columnMap.country = index
    } else if (headerStr === "origin of bd") {
      columnMap.origin = index
    } else if (headerStr === "external deadline") {
      columnMap.deadline = index
    } else if (headerStr === "cvs & project profiles") {
      columnMap.cvsProfiles = index
    } else if (headerStr === "workplan & budget") {
      columnMap.workplanBudget = index
    } else if (headerStr === "methodology") {
      columnMap.methodology = index
    } else if (headerStr === "other activity") {
      columnMap.otherActivity = index
    } else if (headerStr === "partners") {
      columnMap.partners = index
    } else if (headerStr === "pc") {
      columnMap.pc = index
    } else if (headerStr === "pd") {
      columnMap.pd = index
    } else if (headerStr === "budget (us$)") {
      columnMap.budget = index
    } else if (headerStr === "status") {
      columnMap.status = index
    } else if (headerStr === "timeframe (months)") {
      columnMap.timeframe = index
    }
  })

  console.log("[Parser] Column mapping:", columnMap)

  const records: any[] = []

  for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
    const row = dataRows[rowIndex]
    if (!row || row.length === 0) continue

    // Skip completely empty rows
    const hasData = row.some((cell) => cell !== null && cell !== undefined && cell.toString().trim() !== "")
    if (!hasData) continue

    const getValue = (field: string): any => {
      const index = columnMap[field]
      if (index === undefined) return ""
      const value = row[index]
      return value !== null && value !== undefined ? value : ""
    }

    const parseNumber = (value: any): number => {
      if (typeof value === "number") return value
      if (typeof value === "string") {
        const cleaned = value.replace(/[,$\s]/g, "")
        const parsed = Number.parseFloat(cleaned)
        return isNaN(parsed) ? 0 : parsed
      }
      return 0
    }

    const parseString = (value: any): string => {
      if (value === null || value === undefined) return ""
      return value.toString().trim()
    }

    // Create record with all fields
    const record = {
      id: `bd_${Date.now()}_${rowIndex}_${Math.random().toString(36).substr(2, 9)}`,
      serialNumber: parseNumber(getValue("serialNumber")) || rowIndex + 1,
      bd: parseString(getValue("bd")),
      quarter: parseString(getValue("quarter")),
      client: parseString(getValue("client")),
      organization: parseString(getValue("organization")),
      title: parseString(getValue("title")),
      businessLine: parseString(getValue("businessLine")),
      serviceOffering: parseString(getValue("serviceOffering")),
      typeBD: parseString(getValue("typeBD")),
      country: parseString(getValue("country")),
      origin: parseString(getValue("origin")),
      deadline: parseString(getValue("deadline")),
      cvsProfiles: parseString(getValue("cvsProfiles")),
      workplanBudget: parseString(getValue("workplanBudget")),
      methodology: parseString(getValue("methodology")),
      otherActivity: parseString(getValue("otherActivity")),
      partners: parseString(getValue("partners")),
      pc: parseString(getValue("pc")),
      pd: parseString(getValue("pd")),
      budget: parseNumber(getValue("budget")),
      status: parseString(getValue("status")),
      timeframe: parseString(getValue("timeframe")),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Only include records that have meaningful data
    if (record.bd || record.title || record.client) {
      records.push(record)
    }
  }

  console.log(`[Parser] Created ${records.length} valid records`)
  return records
}
