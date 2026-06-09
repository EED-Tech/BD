import { type NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"

// Force dynamic — prevents Next.js from statically rendering this route at build time
export const dynamic = "force-dynamic"

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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.log("[Partners API] Missing Supabase credentials")
      return NextResponse.json({ error: "Missing credentials", data: [] }, { status: 500 })
    }

    // createClient is called here — inside the handler — never at build time
    const { createClient } = await import("@supabase/supabase-js")
    const supabase = createClient(supabaseUrl, supabaseKey)

    const bucketName = "BDTracker"
    const fileName = "BD Tracker_Live Document.xlsx"

    console.log("[Partners API] Fetching Excel file from Supabase Storage...")

    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(fileName)

    if (downloadError || !fileData) {
      console.error("[Partners API] Download error:", downloadError)
      return NextResponse.json({ error: "Failed to download Excel file", data: [] }, { status: 500 })
    }

    console.log("[Partners API] ✓ Excel file downloaded successfully!")

    const arrayBuffer = await fileData.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: "array" })
    const sheetNames = workbook.SheetNames

    console.log("[Partners API] Available sheets:", sheetNames)

    const partners: Partner[] = []

    // ── Partners Firms ────────────────────────────────────────────────────────
    const firmsSheet = sheetNames.find(
      (n) => n.toLowerCase().includes("partners") && n.toLowerCase().includes("firms"),
    )
    if (firmsSheet) {
      const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[firmsSheet], {
        header: 1, defval: "",
      }) as any[][]

      if (sheetData.length > 1) {
        const headerMap: Record<string, number> = {}
        sheetData[0].forEach((h, i) => {
          const clean = h?.toString().toLowerCase().trim()
          if (clean) headerMap[clean] = i
        })
        for (let i = 1; i < sheetData.length; i++) {
          const row = sheetData[i]
          const name = row[headerMap["name"] || headerMap["firm name"] || 0]?.toString().trim()
          if (name) {
            partners.push({
              id: `firm_${i}_${Date.now()}`, name, type: "firm",
              country:        row[headerMap["country"]        ?? 1]?.toString().trim(),
              sector:         row[headerMap["sector"]         ?? 2]?.toString().trim(),
              expertise:      row[headerMap["expertise"]      ?? 3]?.toString().trim(),
              contact_person: row[headerMap["contact person"] ?? 4]?.toString().trim(),
              designation:    row[headerMap["designation"]    ?? 5]?.toString().trim(),
              email:          row[headerMap["email"]          ?? 6]?.toString().trim(),
              phone:          row[headerMap["phone"]          ?? 7]?.toString().trim(),
              website:        row[headerMap["website"]        ?? 8]?.toString().trim(),
            })
          }
        }
        console.log(`[Partners API] Parsed ${partners.length} firm records`)
      }
    }

    // ── Partners Individual Experts ───────────────────────────────────────────
    const expertsSheet = sheetNames.find(
      (n) => n.toLowerCase().includes("partners") && n.toLowerCase().includes("expert"),
    )
    if (expertsSheet) {
      const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[expertsSheet], {
        header: 1, defval: "",
      }) as any[][]

      if (sheetData.length > 1) {
        const headerMap: Record<string, number> = {}
        sheetData[0].forEach((h, i) => {
          const clean = h?.toString().toLowerCase().trim()
          if (clean) headerMap[clean] = i
        })
        const before = partners.length
        for (let i = 1; i < sheetData.length; i++) {
          const row = sheetData[i]
          const name = row[headerMap["name"] || headerMap["expert name"] || 0]?.toString().trim()
          if (name) {
            partners.push({
              id: `expert_${i}_${Date.now()}`, name, type: "individual",
              country:     row[headerMap["country"]     ?? 1]?.toString().trim(),
              sector:      row[headerMap["sector"]      ?? 2]?.toString().trim(),
              expertise:   row[headerMap["expertise"]   ?? 3]?.toString().trim(),
              designation: row[headerMap["designation"] ?? 4]?.toString().trim(),
              email:       row[headerMap["email"]       ?? 5]?.toString().trim(),
              phone:       row[headerMap["phone"]       ?? 6]?.toString().trim(),
              website:     row[headerMap["website"]     ?? 7]?.toString().trim(),
            })
          }
        }
        console.log(`[Partners API] Parsed ${partners.length - before} expert records`)
      }
    }

    console.log(`[Partners API] Total partners: ${partners.length}`)
    return NextResponse.json(partners)
  } catch (error) {
    console.error("[Partners API] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error", data: [] },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
