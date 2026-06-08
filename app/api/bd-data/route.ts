import { type NextRequest, NextResponse } from "next/server"
import { supabase, hasSupabaseCredentials, BUCKET_NAME, FILE_NAME } from "@/lib/supabase-client"
import { SAMPLE_DATA } from "@/lib/sample-data"
import * as XLSX from "xlsx"

export async function GET(request: NextRequest) {
  try {
    console.log("[BD Data API] Starting request...")
    console.log("[BD Data API] Supabase credentials available:", hasSupabaseCredentials)
    console.log("[BD Data API] Bucket name:", BUCKET_NAME)
    console.log("[BD Data API] File name:", FILE_NAME)

    // If no credentials, return sample data
    if (!hasSupabaseCredentials || !supabase) {
      console.warn("[BD Data API] No Supabase credentials - sending sample data")
      return NextResponse.json({
        success: true,
        source: "sample",
        data: SAMPLE_DATA,
        stats: {
          totalRecords: SAMPLE_DATA.length,
          lastModified: new Date().toISOString(),
          source: "sample",
        },
      })
    }

    console.log("[BD Data API] Fetching Excel file from Supabase Storage...")
    console.log(`[BD Data API] Looking for file: "${FILE_NAME}" in bucket: "${BUCKET_NAME}"`)

    const { data: fileData, error: downloadError } = await supabase.storage.from(BUCKET_NAME).download(FILE_NAME)

    if (downloadError || !fileData) {
      // Build a readable error message
      const errMsg =
        downloadError?.message ||
        (typeof downloadError === "string" && downloadError) ||
        JSON.stringify(downloadError ?? {}) ||
        "Unknown download error"

      console.error("[BD Data API] ❌ File download failed:", errMsg)
      console.error("[BD Data API] Full error object:", downloadError)

      const { data: files, error: listError } = await supabase.storage.from(BUCKET_NAME).list()

      if (listError) {
        console.error("[BD Data API] Cannot list bucket files:", listError)
      } else {
        console.log(
          "[BD Data API] 📁 Available files in bucket:",
          files?.map((f) => `"${f.name}"`)?.join(", "),
        )
      }

      // Return sample data as fallback
      return NextResponse.json({
        success: true,
        source: "sample",
        data: SAMPLE_DATA,
        stats: {
          totalRecords: SAMPLE_DATA.length,
          lastModified: new Date().toISOString(),
          source: "sample",
          error: `Excel file not found or inaccessible: ${errMsg}`,
        },
      })
    }

    console.log("[BD Data API] ✓ Excel file downloaded successfully from Supabase!")
    console.log("[BD Data API] File size:", (fileData.size / 1024).toFixed(1), "KB")

    // Parse Excel file
    const arrayBuffer = await fileData.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: "array" })

    // Get all sheet names
    const sheetNames = workbook.SheetNames
    console.log("[BD Data API] Available sheets:", sheetNames)

    // Find EOI and Proposal sheets - look for exact names first
    let eoiSheet = sheetNames.find((name) => name.toLowerCase() === "eois tracker 2025")
    let proposalSheet = sheetNames.find((name) => name.toLowerCase() === "proposals tracker 2025")
    
    // Fallback to partial matching if exact names not found
    if (!eoiSheet) {
      eoiSheet = sheetNames.find((name) => name.toLowerCase().includes("eoi") && name.toLowerCase().includes("tracker"))
    }
    if (!proposalSheet) {
      proposalSheet = sheetNames.find((name) => 
        (name.toLowerCase().includes("proposal") || name.toLowerCase().includes("rfp")) && 
        name.toLowerCase().includes("tracker")
      )
    }
    
    // Final fallback to any sheet with eoi or proposal keywords
    if (!eoiSheet) {
      eoiSheet = sheetNames.find((name) => name.toLowerCase().includes("eoi"))
    }
    if (!proposalSheet) {
      proposalSheet = sheetNames.find((name) => 
        name.toLowerCase().includes("proposal") || 
        name.toLowerCase().includes("rfp") ||
        name.toLowerCase().includes("rfi")
      )
    }

    console.log("[BD Data API] Found EOI sheet:", eoiSheet)
    console.log("[BD Data API] Found Proposal sheet:", proposalSheet)

    let parsedData: any[] = []

    // Parse EOI sheet if it exists
    if (eoiSheet) {
      const eoisData = parseExcelData(XLSX.utils.sheet_to_json(workbook.Sheets[eoiSheet], { header: 1, defval: "" }) as any[][], "EOI")
      parsedData = [...parsedData, ...eoisData]
      console.log(`[BD Data API] Parsed ${eoisData.length} EOI records`)
    }

    // Parse Proposal sheet if it exists
    if (proposalSheet) {
      const proposalsData = parseExcelData(XLSX.utils.sheet_to_json(workbook.Sheets[proposalSheet], { header: 1, defval: "" }) as any[][], "RFP")
      parsedData = [...parsedData, ...proposalsData]
      console.log(`[BD Data API] Parsed ${proposalsData.length} Proposal records`)
    }

    // If neither sheet found, use fallback logic to find any data sheet
    if (!eoiSheet && !proposalSheet) {
      const bdSheet =
        sheetNames.find(
          (name) =>
            name.toLowerCase().includes("bd 2025") ||
            name.toLowerCase().includes("bd2025") ||
            name.toLowerCase() === "bd 2025",
        ) ||
        sheetNames.find((name) => name.toLowerCase().includes("bd") && name.toLowerCase().includes("2025")) ||
        sheetNames.find((name) => name.toLowerCase().includes("bd") || name.toLowerCase().includes("tracker")) ||
        sheetNames[0]

      console.log("[BD Data API] Using fallback BD sheet:", bdSheet)
      parsedData = parseExcelData(XLSX.utils.sheet_to_json(workbook.Sheets[bdSheet], { header: 1, defval: "" }) as any[][])
    }

    console.log(`[BD Data API] Parsed ${parsedData.length} total records from Excel`)

    return NextResponse.json({
      success: true,
      data: parsedData,
      source: "excel",
      stats: {
        totalRecords: parsedData.length,
        lastModified: new Date().toISOString(),
        fileSize: arrayBuffer.byteLength,
        sheets: sheetNames,
        source: "excel",
        eoiCount: parsedData.filter((r) => r.bd === "EOI").length,
        proposalCount: parsedData.filter((r) => r.bd === "RFP" || r.bd === "RFI").length,
      },
    })
  } catch (error) {
    console.error("[BD Data API] Unexpected error:", error instanceof Error ? error.message : error)
    // Return sample data as fallback
    return NextResponse.json({
      success: true,
      source: "sample",
      data: SAMPLE_DATA,
      stats: {
        totalRecords: SAMPLE_DATA.length,
        lastModified: new Date().toISOString(),
        source: "sample",
        error: `Server error: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
    })
  }
}

function parseExcelData(rawData: any[][], defaultBDType: string = "RFP"): any[] {
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
    } else if (headerStr === "year") {
      columnMap.year = index
    } else if (headerStr === "name") {
      columnMap.name = index
    } else if (headerStr === "position" || headerStr === "role") {
      columnMap.role = index
    } else if (headerStr === "expertise" || headerStr === "expertise area") {
      columnMap.expertise = index
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
      bd: parseString(getValue("bd")) || defaultBDType,
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
      year: parseString(getValue("year")) || new Date().getFullYear().toString(),
      name: parseString(getValue("name")),
      role: parseString(getValue("role")),
      expertise: parseString(getValue("expertise")),
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

export async function POST(request: NextRequest) {
  return GET(request)
}
