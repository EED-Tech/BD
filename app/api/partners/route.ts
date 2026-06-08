import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import * as XLSX from "xlsx"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
)

interface Partner {
  id: string
  name: string
  type: "firm" | "individual"
  country?: string
  sector?: string
  expertise?: string
  contact_person?: string
  designation?: string
  email?: string
  phone?: string
  website?: string
}

export async function GET(request: NextRequest) {
  try {
    console.log("[Partners API] Starting request...")

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log("[Partners API] Missing Supabase credentials")
      return NextResponse.json({ error: "Missing credentials", data: [] }, { status: 500 })
    }

    const bucketName = "BDTracker"
    const fileName = "BD Tracker_Live Document.xlsx"

    console.log(`[Partners API] Fetching Excel file from Supabase Storage...`)

    // Download the file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(fileName)

    if (downloadError || !fileData) {
      console.error("[Partners API] Download error:", downloadError)
      return NextResponse.json({ error: "Failed to download Excel file", data: [] }, { status: 500 })
    }

    console.log(`[Partners API] ✓ Excel file downloaded successfully!`)

    // Parse the Excel file
    const arrayBuffer = await fileData.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: "array" })
    const sheetNames = workbook.SheetNames

    console.log("[Partners API] Available sheets:", sheetNames)

    const partners: Partner[] = []

    // Parse Partners Firms sheet
    const partnersFirmsSheet = sheetNames.find((name) =>
      name.toLowerCase().includes("partners") && name.toLowerCase().includes("firms"),
    )
    if (partnersFirmsSheet) {
      console.log(`[Partners API] Parsing Partners Firms sheet: ${partnersFirmsSheet}`)
      const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[partnersFirmsSheet], {
        header: 1,
        defval: "",
      }) as any[][]

      if (sheetData.length > 1) {
        const headers = sheetData[0]
        const headerMap: Record<string, number> = {}
        headers.forEach((header, index) => {
          const clean = header?.toString().toLowerCase().trim()
          if (clean) headerMap[clean] = index
        })

        console.log(`[Partners API] Partners Firms headers:`, headers)

        for (let i = 1; i < sheetData.length; i++) {
          const row = sheetData[i]
          const name = row[headerMap["name"] || headerMap["firm name"] || 0]?.toString().trim()

          if (name && name.length > 0) {
            partners.push({
              id: `firm_${i}_${Date.now()}`,
              name,
              type: "firm",
              country: row[headerMap["country"] || 1]?.toString().trim(),
              sector: row[headerMap["sector"] || 2]?.toString().trim(),
              expertise: row[headerMap["expertise"] || 3]?.toString().trim(),
              contact_person: row[headerMap["contact person"] || 4]?.toString().trim(),
              designation: row[headerMap["designation"] || 5]?.toString().trim(),
              email: row[headerMap["email"] || 6]?.toString().trim(),
              phone: row[headerMap["phone"] || 7]?.toString().trim(),
              website: row[headerMap["website"] || 8]?.toString().trim(),
            })
          }
        }
        console.log(`[Partners API] Parsed ${partners.length} Partners Firms records`)
      }
    }

    // Parse Partners Individual Experts sheet
    const partnersExpertsSheet = sheetNames.find((name) =>
      name.toLowerCase().includes("partners") && name.toLowerCase().includes("expert"),
    )
    if (partnersExpertsSheet) {
      console.log(`[Partners API] Parsing Partners Individual Experts sheet: ${partnersExpertsSheet}`)
      const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[partnersExpertsSheet], {
        header: 1,
        defval: "",
      }) as any[][]

      if (sheetData.length > 1) {
        const headers = sheetData[0]
        const headerMap: Record<string, number> = {}
        headers.forEach((header, index) => {
          const clean = header?.toString().toLowerCase().trim()
          if (clean) headerMap[clean] = index
        })

        console.log(`[Partners API] Partners Experts headers:`, headers)

        const startIndex = partners.length
        for (let i = 1; i < sheetData.length; i++) {
          const row = sheetData[i]
          const name = row[headerMap["name"] || headerMap["expert name"] || 0]?.toString().trim()

          if (name && name.length > 0) {
            partners.push({
              id: `expert_${i}_${Date.now()}`,
              name,
              type: "individual",
              country: row[headerMap["country"] || 1]?.toString().trim(),
              sector: row[headerMap["sector"] || 2]?.toString().trim(),
              expertise: row[headerMap["expertise"] || 3]?.toString().trim(),
              designation: row[headerMap["designation"] || 4]?.toString().trim(),
              email: row[headerMap["email"] || 5]?.toString().trim(),
              phone: row[headerMap["phone"] || 6]?.toString().trim(),
              website: row[headerMap["website"] || 7]?.toString().trim(),
            })
          }
        }
        console.log(`[Partners API] Parsed ${partners.length - startIndex} Partners Experts records`)
      }
    }

    console.log(`[Partners API] Total unique partners: ${partners.length}`)
    return NextResponse.json(partners)
  } catch (error) {
    console.error("[Partners API] Error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message, data: [] }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
