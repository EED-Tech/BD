import * as XLSX from "xlsx"
import { supabase, testSupabaseConnection } from "./supabase-client"
import { SAMPLE_DATA } from "./sample-data"

export interface BDRecord {
  serialNumber: number
  bd: string
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
}

export interface ExcelStats {
  totalRecords: number
  lastModified: string
  fileSize: number
  sheets: string[]
  source: "supabase" | "sample" | "cached"
  connectionStatus?: "connected" | "no-buckets" | "no-storage" | "permission-denied" | "file-not-found"
  errorDetails?: string
}

export interface PartnerFirm {
  id: string // Generated ID
  name: string
  country: string
  sector: string
  expertise: string // Comma-separated string
  type: "firm"
  latitude?: number
  longitude?: number
  // Additional contact and business information
  contactPerson?: string
  designation?: string
  email?: string
  phone?: string
  website?: string
  address?: string
  yearFounded?: number
  employeeCount?: string
  services?: string
  regionalPresence?: string
  globalPresence?: boolean
  workedWithBefore?: boolean
  cvUploaded?: boolean
  notes?: string
  lastContact?: string
  partnershipLevel?: string
  certifications?: string
}

export interface PartnerIndividual {
  id: string // Generated ID
  name: string
  country: string
  expertise: string // Comma-separated string
  sector: string
  type: "individual"
  latitude?: number
  longitude?: number
  // Additional contact and professional information
  title?: string
  email?: string
  phone?: string
  linkedIn?: string
  website?: string
  address?: string
  education?: string
  experience?: string
  languages?: string
  availability?: string
  hourlyRate?: string
  currency?: string
  workedWithBefore?: boolean
  cvUploaded?: boolean
  notes?: string
  lastContact?: string
  rating?: number
  certifications?: string
  publications?: string
}

export interface DetailedPartnerFirm {
  id: string
  name: string // "Name of Firm"
  countryHQ: string // "Country HQ"
  regionalPresence: string // "Regional (List the countries)"
  globalPresence: boolean // "Global (Yes/No)"
  yearFounded?: number // "Year Founded"
  contactPersonName: string // "Name of contact person"
  designation: string // "Designation"
  email: string // "Email"
  phone: string // "Phone"
  website: string // "Website"
  workedWithPast: boolean // "Have we worked with them in the past (Yes/No)"
  cvUploaded: boolean // "CV Uploaded (Yes/No)"
}

export type PartnerRecord = PartnerFirm | PartnerIndividual

export interface PartnersStats {
  totalRecords: number
  lastModified: string
  source: "excel" | "api-error"
  errorDetails?: string
}

export interface AllPartnersData {
  firms: PartnerFirm[]
  individuals: PartnerIndividual[]
  detailedFirms: DetailedPartnerFirm[]
}

class SupabaseExcelReader {
  private bucketName: string
  private filePath: string
  private bdCache: { data: BDRecord[]; timestamp: number; etag?: string } | null = null
  private workbookCache: { workbook: XLSX.WorkBook; timestamp: number; etag?: string } | null = null
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
  private usingSampleData = true // Default to sample data for BD
  private connectionTested = false
  private connectionStatus: "connected" | "no-buckets" | "no-storage" | "permission-denied" | "file-not-found" =
    "no-storage"
  private sampleData: { data: BDRecord[]; stats: ExcelStats }

  constructor(bucketName = "bdtracker", filePath = "2025_EED BD Tracker_Live Document.xlsx") {
    this.bucketName = bucketName
    this.filePath = filePath
    this.sampleData = this.initializeSampleData()
  }

  private async testConnection(): Promise<void> {
    try {
      const { success, buckets, error, details } = await testSupabaseConnection()
      this.connectionTested = true

      console.log("Supabase connection test result:", success ? "Success" : "Failed")
      console.log("Details:", details)

      if (!success) {
        if (error && error.message && error.message.includes("permission")) {
          this.connectionStatus = "permission-denied"
        } else {
          this.connectionStatus = "no-storage"
        }
        console.log("Connection failed, status:", this.connectionStatus)
        return
      }

      if (!buckets || buckets.length === 0) {
        this.connectionStatus = "no-buckets"
        console.log("No buckets found")
        return
      }

      console.log("Available buckets:", buckets)

      if (!buckets.includes(this.bucketName)) {
        this.connectionStatus = "no-buckets"
        console.log(`Target bucket "${this.bucketName}" not found in:`, buckets)
        return
      }

      this.connectionStatus = "connected"
      console.log("Connection successful, target bucket found")
    } catch (error) {
      console.error("Connection test error:", error)
      this.connectionStatus = "no-storage"
      this.connectionTested = true
    }
  }

  private async fetchWorkbook(forceRefresh = false): Promise<XLSX.WorkBook | null> {
    // Check cache first
    if (!forceRefresh && this.workbookCache && Date.now() - this.workbookCache.timestamp < this.CACHE_DURATION) {
      console.log("Using cached Excel workbook")
      return this.workbookCache.workbook
    }

    // Test Supabase connection
    if (!this.connectionTested || forceRefresh) {
      await this.testConnection()
    }

    if (this.connectionStatus !== "connected") {
      console.warn("Not connected to Supabase, cannot fetch workbook.")
      return null
    }

    try {
      console.log("Fetching Excel workbook from Supabase Storage...")
      const { data: fileData, error: downloadError } = await supabase.storage
        .from(this.bucketName)
        .download(this.filePath)

      if (downloadError || !fileData) {
        throw new Error(`Failed to download file "${this.filePath}": ${downloadError?.message || "No data"}`)
      }

      const arrayBuffer = await fileData.arrayBuffer()
      if (arrayBuffer.byteLength === 0) {
        throw new Error("Downloaded file is empty")
      }

      const workbook = XLSX.read(arrayBuffer, { type: "array" })
      this.workbookCache = { workbook, timestamp: Date.now() }
      this.usingSampleData = false // We successfully fetched from Supabase

      console.log("Workbook fetched and cached successfully.")
      console.log("Available sheets:", workbook.SheetNames)
      return workbook
    } catch (error) {
      console.error("Error fetching workbook:", error)
      this.connectionStatus = "file-not-found" // Or other appropriate status
      return null
    }
  }

  async fetchExcelData(forceRefresh = false): Promise<{ data: BDRecord[]; stats: ExcelStats }> {
    try {
      // Check BD cache first
      if (
        !forceRefresh &&
        this.bdCache &&
        !this.usingSampleData &&
        Date.now() - this.bdCache.timestamp < this.CACHE_DURATION
      ) {
        console.log("Using cached BD Excel data")
        return {
          data: this.bdCache.data,
          stats: {
            totalRecords: this.bdCache.data.length,
            lastModified: new Date(this.bdCache.timestamp).toISOString(),
            fileSize: 0,
            sheets: ["BD 2025"],
            source: "cached",
            connectionStatus: this.connectionStatus,
          },
        }
      }

      const workbook = await this.fetchWorkbook(forceRefresh)

      if (!workbook) {
        // Fallback to sample data if workbook couldn't be fetched
        return this.getSampleDataWithStatus()
      }

      // Look specifically for BD 2025 sheet
      const sheetName = this.findBDSheet(workbook.SheetNames)
      console.log("Using BD sheet:", sheetName)

      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      const data = this.parseBDData(jsonData as any[][])

      this.bdCache = { data, timestamp: Date.now() } // Cache BD data specifically

      const stats: ExcelStats = {
        totalRecords: data.length,
        lastModified: new Date().toISOString(),
        fileSize: 0, // Can't easily get file size from workbook cache
        sheets: workbook.SheetNames,
        source: "supabase",
        connectionStatus: "connected",
      }
      return { data, stats }
    } catch (error) {
      console.error("Error parsing BD data from workbook:", error)
      return this.getSampleDataWithStatus()
    }
  }

  async fetchPartnersData(forceRefresh = false): Promise<{ data: AllPartnersData; stats: PartnersStats }> {
    const workbook = await this.fetchWorkbook(forceRefresh)

    if (!workbook) {
      // Fallback to empty data with error status if workbook couldn't be fetched
      return {
        data: { firms: [], individuals: [], detailedFirms: [] },
        stats: {
          totalRecords: 0,
          lastModified: new Date().toISOString(),
          source: "api-error",
          errorDetails:
            this.connectionStatus === "connected"
              ? "Workbook parsing failed"
              : `Supabase connection: ${this.connectionStatus}`,
        },
      }
    }

    let firms: PartnerFirm[] = []
    let individuals: PartnerIndividual[] = []
    let detailedFirms: DetailedPartnerFirm[] = []
    let totalParsed = 0

    try {
      console.log("Available sheets for partners:", workbook.SheetNames)

      // Parse "Partners Firms" sheet (for map data)
      const firmsSheetName = workbook.SheetNames.find(
        (name) =>
          name.toLowerCase().includes("partners firms") ||
          name.toLowerCase().includes("partner firms") ||
          name.toLowerCase() === "partners firms",
      )

      if (firmsSheetName) {
        console.log(`Parsing sheet: ${firmsSheetName}`)
        const firmsWorksheet = workbook.Sheets[firmsSheetName]
        const firmsJsonData = XLSX.utils.sheet_to_json(firmsWorksheet, { header: 1 })
        firms = this.parsePartnerFirms(firmsJsonData as any[][])
        totalParsed += firms.length
        console.log(`Parsed ${firms.length} partner firms`)
      } else {
        console.warn("Sheet 'Partners Firms' not found. Available sheets:", workbook.SheetNames)
      }

      // Parse "Partners Individual Experts" sheet (for map data)
      const individualsSheetName = workbook.SheetNames.find(
        (name) =>
          name.toLowerCase().includes("partners individual experts") ||
          name.toLowerCase().includes("partner individual experts") ||
          name.toLowerCase().includes("individual experts") ||
          name.toLowerCase() === "partners individual experts",
      )

      if (individualsSheetName) {
        console.log(`Parsing sheet: ${individualsSheetName}`)
        const individualsWorksheet = workbook.Sheets[individualsSheetName]
        const individualsJsonData = XLSX.utils.sheet_to_json(individualsWorksheet, { header: 1 })
        individuals = this.parsePartnerIndividuals(individualsJsonData as any[][])
        totalParsed += individuals.length
        console.log(`Parsed ${individuals.length} individual experts`)
      } else {
        console.warn("Sheet 'Partners Individual Experts' not found. Available sheets:", workbook.SheetNames)
      }

      // Parse "Partners Firms Detailed" sheet (for table data) - optional
      const detailedFirmsSheetName = workbook.SheetNames.find(
        (name) =>
          name.toLowerCase().includes("partners firms detailed") ||
          name.toLowerCase().includes("partners firms info") ||
          name.toLowerCase().includes("detailed firms"),
      )

      if (detailedFirmsSheetName) {
        console.log(`Parsing sheet: ${detailedFirmsSheetName}`)
        const detailedFirmsWorksheet = workbook.Sheets[detailedFirmsSheetName]
        const detailedFirmsJsonData = XLSX.utils.sheet_to_json(detailedFirmsWorksheet, { header: 1 })
        detailedFirms = this.parseDetailedPartnerFirms(detailedFirmsJsonData as any[][])
        totalParsed += detailedFirms.length
        console.log(`Parsed ${detailedFirms.length} detailed firms`)
      } else {
        console.log("No detailed firms sheet found - this is optional")
      }

      console.log(`Successfully parsed ${totalParsed} total partner records across sheets.`)

      return {
        data: { firms, individuals, detailedFirms },
        stats: {
          totalRecords: firms.length + individuals.length + detailedFirms.length,
          lastModified: new Date().toISOString(),
          source: "excel",
        },
      }
    } catch (error) {
      console.error("Error parsing partners data from workbook:", error)
      return {
        data: { firms: [], individuals: [], detailedFirms: [] },
        stats: {
          totalRecords: 0,
          lastModified: new Date().toISOString(),
          source: "api-error",
          errorDetails: error instanceof Error ? error.message : "Unknown parsing error",
        },
      }
    }
  }

  private findBDSheet(sheetNames: string[]): string {
    // Priority order for BD sheet selection
    const bdSheetPriorities = [
      (name: string) => name.toLowerCase() === "bd 2025",
      (name: string) => name.toLowerCase().includes("bd 2025"),
      (name: string) => name.toLowerCase().includes("bd2025"),
      (name: string) => name.toLowerCase().includes("bd") && name.toLowerCase().includes("2025"),
      (name: string) => name.toLowerCase().includes("bd") && name.toLowerCase().includes("tracker"),
      (name: string) => name.toLowerCase().includes("tracker"),
      (name: string) => name.toLowerCase().includes("bd"),
      (name: string) => name.toLowerCase().includes("2025"),
      (name: string) => name.toLowerCase().includes("data"),
      (name: string) =>
        !name.toLowerCase().includes("template") &&
        !name.toLowerCase().includes("example") &&
        !name.toLowerCase().includes("partner"),
    ]

    for (const priority of bdSheetPriorities) {
      const match = sheetNames.find(priority)
      if (match) {
        console.log(`Found BD sheet using priority: ${match}`)
        return match
      }
    }

    console.log(`No specific BD sheet found, using first sheet: ${sheetNames[0]}`)
    return sheetNames[0]
  }

  private initializeSampleData(): { data: BDRecord[]; stats: ExcelStats } {
    const stats: ExcelStats = {
      totalRecords: SAMPLE_DATA.length,
      lastModified: new Date().toISOString(),
      fileSize: 0,
      sheets: ["Sample Data"],
      source: "sample",
      connectionStatus: this.connectionStatus,
    }

    return { data: SAMPLE_DATA, stats }
  }

  private getSampleDataWithStatus(): { data: BDRecord[]; stats: ExcelStats } {
    this.usingSampleData = true

    let errorDetails = ""
    switch (this.connectionStatus) {
      case "no-storage":
        errorDetails =
          "Supabase Storage is not accessible. Please check if Storage is enabled in your Supabase project."
        break
      case "no-buckets":
        errorDetails = `No storage buckets found or bucket "${this.bucketName}" doesn't exist. Please create the bucket and upload your Excel file.`
        break
      case "permission-denied":
        errorDetails =
          "Storage access denied. Please check your RLS policies and ensure the anonymous key has storage permissions."
        break
      case "file-not-found":
        errorDetails = `Excel file "${this.filePath}" not found in bucket "${this.bucketName}".`
        break
      default:
        errorDetails = "Using sample data for demonstration."
    }

    const stats: ExcelStats = {
      totalRecords: SAMPLE_DATA.length,
      lastModified: new Date().toISOString(),
      fileSize: 0,
      sheets: ["Sample Data"],
      source: "sample",
      connectionStatus: this.connectionStatus,
      errorDetails,
    }

    return { data: SAMPLE_DATA, stats }
  }

  private parseBDData(rawData: any[][]): BDRecord[] {
    if (!rawData || rawData.length < 2) {
      throw new Error("Excel file appears to be empty or invalid for BD data")
    }

    // Find header row
    let headerRowIndex = 0
    for (let i = 0; i < Math.min(5, rawData.length); i++) {
      const row = rawData[i]
      if (
        row &&
        row.some(
          (cell) =>
            typeof cell === "string" &&
            (cell.toLowerCase().includes("serial") ||
              cell.toLowerCase().includes("bd") ||
              cell.toLowerCase().includes("quarter") ||
              cell.toLowerCase().includes("project title")),
        )
      ) {
        headerRowIndex = i
        break
      }
    }

    const headers = rawData[headerRowIndex]
    const dataRows = rawData.slice(headerRowIndex + 1)

    console.log("Found BD headers:", headers)
    console.log("BD data rows count:", dataRows.length)

    // Create column mapping with improved field detection
    const columnMap = this.createBDColumnMapping(headers)
    console.log("BD Column mapping:", columnMap)

    const records: BDRecord[] = []

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]
      if (!row || row.length === 0) continue

      // Skip empty rows
      if (row.every((cell) => !cell || cell.toString().trim() === "")) continue

      try {
        const record = this.parseBDRow(row, columnMap)
        if (record) {
          records.push(record)
        }
      } catch (error) {
        console.warn(`Error parsing BD row ${i + headerRowIndex + 2}:`, error)
      }
    }

    if (records.length === 0) {
      throw new Error("No valid BD data records found in Excel file")
    }

    console.log(`Parsed ${records.length} BD records successfully`)
    return records
  }

  private createBDColumnMapping(headers: any[]): Record<string, number> {
    const mapping: Record<string, number> = {}

    const fieldMappings = {
      serialNumber: ["serial", "number", "no", "#"],
      bd: ["bd", "type", "rfp", "eoi"],
      quarter: ["quarter", "q1", "q2", "q3", "q4"],
      client: ["client", "customer", "type of client"],
      organization: ["organization", "organisation", "org", "name of organization"],
      title: ["title", "name", "project", "project title"],
      businessLine: ["business", "line", "sector", "business line"],
      serviceOffering: ["service", "offering", "service offering"],
      typeBD: ["type", "bd type", "category", "type of bd"],
      country: ["country", "location", "region", "country covered"],
      origin: ["origin", "source", "origin of bd"],
      deadline: ["deadline", "due", "date", "external deadline"],
      cvsProfiles: ["cvs", "cv", "profile", "cvs & project profiles"],
      workplanBudget: ["workplan", "budget", "plan", "workplan & budget"],
      methodology: ["methodology", "method"],
      otherActivity: ["other", "activity", "other activity"],
      partners: ["partner", "collaboration", "partners"],
      pc: ["pc", "project coordinator"],
      pd: ["pd", "project director"],
      budget: ["budget", "amount", "value", "cost", "budget (us$)"],
      status: ["status", "state"],
      timeframe: ["timeframe", "duration", "time", "timeframe (months)"],
    }

    headers.forEach((header, index) => {
      if (!header) return

      const headerStr = header.toString().toLowerCase().trim()

      for (const [field, keywords] of Object.entries(fieldMappings)) {
        if (keywords.some((keyword) => headerStr.includes(keyword))) {
          mapping[field] = index
          break
        }
      }
    })

    return mapping
  }

  private parseBDRow(row: any[], columnMap: Record<string, number>): BDRecord | null {
    const getValue = (field: string): any => {
      const index = columnMap[field]
      return index !== undefined ? row[index] : ""
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
      if (!value) return ""
      return value.toString().trim()
    }

    const serialNumber = parseNumber(getValue("serialNumber"))
    const title = parseString(getValue("title"))
    const bd = parseString(getValue("bd"))

    // Skip rows without essential data
    if (!serialNumber && !title && !bd) {
      return null
    }

    return {
      serialNumber: serialNumber || 0,
      bd: bd,
      quarter: parseString(getValue("quarter")),
      client: parseString(getValue("client")),
      organization: parseString(getValue("organization")),
      title: title,
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
    }
  }

  private parsePartnerFirms(rawData: any[][]): PartnerFirm[] {
    if (!rawData || rawData.length < 2) {
      console.warn("No data to parse for Partner Firms sheet.")
      return []
    }

    console.log("Parsing Partner Firms data, rows:", rawData.length)

    // Find header row
    let headerRowIndex = 0
    for (let i = 0; i < Math.min(5, rawData.length); i++) {
      const row = rawData[i]
      if (
        row &&
        row.some(
          (cell) =>
            typeof cell === "string" &&
            (cell.toLowerCase().includes("firm") ||
              cell.toLowerCase().includes("name") ||
              cell.toLowerCase().includes("country") ||
              cell.toLowerCase().includes("sector")),
        )
      ) {
        headerRowIndex = i
        break
      }
    }

    const headers = rawData[headerRowIndex]
    const dataRows = rawData.slice(headerRowIndex + 1)

    console.log("Partner Firms headers:", headers)

    const columnMap: Record<string, number> = {}
    headers.forEach((header, index) => {
      if (typeof header === "string") {
        const normalizedHeader = header.toLowerCase().trim()

        // Basic fields
        if (
          normalizedHeader.includes("firm name") ||
          normalizedHeader.includes("name of firm") ||
          normalizedHeader.includes("company name") ||
          (normalizedHeader.includes("name") && !normalizedHeader.includes("contact"))
        ) {
          columnMap.name = index
        } else if (normalizedHeader.includes("country")) {
          columnMap.country = index
        } else if (normalizedHeader.includes("sector")) {
          columnMap.sector = index
        } else if (normalizedHeader.includes("expertise")) {
          columnMap.expertise = index
        } else if (normalizedHeader.includes("latitude") || normalizedHeader.includes("lat")) {
          columnMap.latitude = index
        } else if (
          normalizedHeader.includes("longitude") ||
          normalizedHeader.includes("lng") ||
          normalizedHeader.includes("long")
        ) {
          columnMap.longitude = index
        }

        // Contact information
        else if (
          normalizedHeader.includes("contact person") ||
          normalizedHeader.includes("contact name") ||
          normalizedHeader.includes("representative")
        ) {
          columnMap.contactPerson = index
        } else if (normalizedHeader.includes("designation") || normalizedHeader.includes("title")) {
          columnMap.designation = index
        } else if (normalizedHeader.includes("email")) {
          columnMap.email = index
        } else if (normalizedHeader.includes("phone") || normalizedHeader.includes("telephone")) {
          columnMap.phone = index
        } else if (normalizedHeader.includes("website") || normalizedHeader.includes("url")) {
          columnMap.website = index
        } else if (normalizedHeader.includes("address")) {
          columnMap.address = index
        }

        // Business information
        else if (normalizedHeader.includes("year founded") || normalizedHeader.includes("established")) {
          columnMap.yearFounded = index
        } else if (normalizedHeader.includes("employee") || normalizedHeader.includes("staff")) {
          columnMap.employeeCount = index
        } else if (normalizedHeader.includes("services") || normalizedHeader.includes("offerings")) {
          columnMap.services = index
        } else if (normalizedHeader.includes("regional presence")) {
          columnMap.regionalPresence = index
        } else if (normalizedHeader.includes("global presence") || normalizedHeader.includes("global")) {
          columnMap.globalPresence = index
        } else if (normalizedHeader.includes("worked with") || normalizedHeader.includes("past work")) {
          columnMap.workedWithBefore = index
        } else if (normalizedHeader.includes("cv uploaded") || normalizedHeader.includes("documents")) {
          columnMap.cvUploaded = index
        } else if (normalizedHeader.includes("notes") || normalizedHeader.includes("comments")) {
          columnMap.notes = index
        } else if (normalizedHeader.includes("last contact") || normalizedHeader.includes("last updated")) {
          columnMap.lastContact = index
        } else if (normalizedHeader.includes("partnership level") || normalizedHeader.includes("tier")) {
          columnMap.partnershipLevel = index
        } else if (normalizedHeader.includes("certification") || normalizedHeader.includes("accreditation")) {
          columnMap.certifications = index
        }
      }
    })

    console.log("Partner Firms column mapping:", columnMap)

    const firms: PartnerFirm[] = []
    dataRows.forEach((row, rowIndex) => {
      const name = row[columnMap.name]?.toString().trim() || ""
      if (!name) return // Skip rows without a name

      const parseBoolean = (value: any): boolean => {
        if (typeof value === "boolean") return value
        if (typeof value === "string") {
          const lower = value.toLowerCase().trim()
          return lower === "yes" || lower === "true" || lower === "1"
        }
        return false
      }

      const parseNumber = (value: any): number | undefined => {
        if (typeof value === "number") return value
        if (typeof value === "string") {
          const parsed = Number.parseInt(value.trim())
          return isNaN(parsed) ? undefined : parsed
        }
        return undefined
      }

      const latitude = columnMap.latitude !== undefined ? Number.parseFloat(row[columnMap.latitude]) : undefined
      const longitude = columnMap.longitude !== undefined ? Number.parseFloat(row[columnMap.longitude]) : undefined

      firms.push({
        id: `firm_${rowIndex}_${Math.random().toString(36).substr(2, 9)}`,
        name: name,
        country: row[columnMap.country]?.toString().trim() || "",
        sector: row[columnMap.sector]?.toString().trim() || "",
        expertise: row[columnMap.expertise]?.toString().trim() || "",
        type: "firm",
        latitude: !isNaN(latitude) ? latitude : undefined,
        longitude: !isNaN(longitude) ? longitude : undefined,

        // Contact information
        contactPerson: row[columnMap.contactPerson]?.toString().trim() || undefined,
        designation: row[columnMap.designation]?.toString().trim() || undefined,
        email: row[columnMap.email]?.toString().trim() || undefined,
        phone: row[columnMap.phone]?.toString().trim() || undefined,
        website: row[columnMap.website]?.toString().trim() || undefined,
        address: row[columnMap.address]?.toString().trim() || undefined,

        // Business information
        yearFounded: parseNumber(row[columnMap.yearFounded]),
        employeeCount: row[columnMap.employeeCount]?.toString().trim() || undefined,
        services: row[columnMap.services]?.toString().trim() || undefined,
        regionalPresence: row[columnMap.regionalPresence]?.toString().trim() || undefined,
        globalPresence:
          columnMap.globalPresence !== undefined ? parseBoolean(row[columnMap.globalPresence]) : undefined,
        workedWithBefore:
          columnMap.workedWithBefore !== undefined ? parseBoolean(row[columnMap.workedWithBefore]) : undefined,
        cvUploaded: columnMap.cvUploaded !== undefined ? parseBoolean(row[columnMap.cvUploaded]) : undefined,
        notes: row[columnMap.notes]?.toString().trim() || undefined,
        lastContact: row[columnMap.lastContact]?.toString().trim() || undefined,
        partnershipLevel: row[columnMap.partnershipLevel]?.toString().trim() || undefined,
        certifications: row[columnMap.certifications]?.toString().trim() || undefined,
      })
    })

    console.log(`Parsed ${firms.length} partner firms`)
    return firms
  }

  private parsePartnerIndividuals(rawData: any[][]): PartnerIndividual[] {
    if (!rawData || rawData.length < 2) {
      console.warn("No data to parse for Partner Individual Experts sheet.")
      return []
    }

    console.log("Parsing Partner Individual Experts data, rows:", rawData.length)

    // Find header row
    let headerRowIndex = 0
    for (let i = 0; i < Math.min(5, rawData.length); i++) {
      const row = rawData[i]
      if (
        row &&
        row.some(
          (cell) =>
            typeof cell === "string" &&
            (cell.toLowerCase().includes("expert") ||
              cell.toLowerCase().includes("name") ||
              cell.toLowerCase().includes("country") ||
              cell.toLowerCase().includes("expertise")),
        )
      ) {
        headerRowIndex = i
        break
      }
    }

    const headers = rawData[headerRowIndex]
    const dataRows = rawData.slice(headerRowIndex + 1)

    console.log("Partner Individual Experts headers:", headers)

    const columnMap: Record<string, number> = {}
    headers.forEach((header, index) => {
      if (typeof header === "string") {
        const normalizedHeader = header.toLowerCase().trim()

        // Basic fields
        if (
          normalizedHeader.includes("expert name") ||
          normalizedHeader.includes("name of expert") ||
          normalizedHeader.includes("full name") ||
          (normalizedHeader.includes("name") && !normalizedHeader.includes("contact"))
        ) {
          columnMap.name = index
        } else if (normalizedHeader.includes("country")) {
          columnMap.country = index
        } else if (normalizedHeader.includes("expertise")) {
          columnMap.expertise = index
        } else if (normalizedHeader.includes("sector")) {
          columnMap.sector = index
        } else if (normalizedHeader.includes("latitude") || normalizedHeader.includes("lat")) {
          columnMap.latitude = index
        } else if (
          normalizedHeader.includes("longitude") ||
          normalizedHeader.includes("lng") ||
          normalizedHeader.includes("long")
        ) {
          columnMap.longitude = index
        }

        // Professional information
        else if (normalizedHeader.includes("title") || normalizedHeader.includes("position")) {
          columnMap.title = index
        } else if (normalizedHeader.includes("email")) {
          columnMap.email = index
        } else if (normalizedHeader.includes("phone") || normalizedHeader.includes("telephone")) {
          columnMap.phone = index
        } else if (normalizedHeader.includes("linkedin")) {
          columnMap.linkedIn = index
        } else if (normalizedHeader.includes("website") || normalizedHeader.includes("url")) {
          columnMap.website = index
        } else if (normalizedHeader.includes("address")) {
          columnMap.address = index
        } else if (normalizedHeader.includes("education") || normalizedHeader.includes("qualification")) {
          columnMap.education = index
        } else if (normalizedHeader.includes("experience") || normalizedHeader.includes("background")) {
          columnMap.experience = index
        } else if (normalizedHeader.includes("language")) {
          columnMap.languages = index
        } else if (normalizedHeader.includes("availability") || normalizedHeader.includes("status")) {
          columnMap.availability = index
        } else if (normalizedHeader.includes("hourly rate") || normalizedHeader.includes("rate")) {
          columnMap.hourlyRate = index
        } else if (normalizedHeader.includes("currency")) {
          columnMap.currency = index
        } else if (normalizedHeader.includes("worked with") || normalizedHeader.includes("past work")) {
          columnMap.workedWithBefore = index
        } else if (normalizedHeader.includes("cv uploaded") || normalizedHeader.includes("documents")) {
          columnMap.cvUploaded = index
        } else if (normalizedHeader.includes("notes") || normalizedHeader.includes("comments")) {
          columnMap.notes = index
        } else if (normalizedHeader.includes("last contact") || normalizedHeader.includes("last updated")) {
          columnMap.lastContact = index
        } else if (normalizedHeader.includes("rating") || normalizedHeader.includes("score")) {
          columnMap.rating = index
        } else if (normalizedHeader.includes("certification") || normalizedHeader.includes("accreditation")) {
          columnMap.certifications = index
        } else if (normalizedHeader.includes("publication") || normalizedHeader.includes("research")) {
          columnMap.publications = index
        }
      }
    })

    console.log("Partner Individual Experts column mapping:", columnMap)

    const individuals: PartnerIndividual[] = []
    dataRows.forEach((row, rowIndex) => {
      const name = row[columnMap.name]?.toString().trim() || ""
      if (!name) return // Skip rows without a name

      const parseBoolean = (value: any): boolean => {
        if (typeof value === "boolean") return value
        if (typeof value === "string") {
          const lower = value.toLowerCase().trim()
          return lower === "yes" || lower === "true" || lower === "1"
        }
        return false
      }

      const parseNumber = (value: any): number | undefined => {
        if (typeof value === "number") return value
        if (typeof value === "string") {
          const parsed = Number.parseFloat(value.trim())
          return isNaN(parsed) ? undefined : parsed
        }
        return undefined
      }

      const latitude = columnMap.latitude !== undefined ? Number.parseFloat(row[columnMap.latitude]) : undefined
      const longitude = columnMap.longitude !== undefined ? Number.parseFloat(row[columnMap.longitude]) : undefined

      individuals.push({
        id: `individual_${rowIndex}_${Math.random().toString(36).substr(2, 9)}`,
        name: name,
        country: row[columnMap.country]?.toString().trim() || "",
        expertise: row[columnMap.expertise]?.toString().trim() || "",
        sector: row[columnMap.sector]?.toString().trim() || "",
        type: "individual",
        latitude: !isNaN(latitude) ? latitude : undefined,
        longitude: !isNaN(longitude) ? longitude : undefined,

        // Professional information
        title: row[columnMap.title]?.toString().trim() || undefined,
        email: row[columnMap.email]?.toString().trim() || undefined,
        phone: row[columnMap.phone]?.toString().trim() || undefined,
        linkedIn: row[columnMap.linkedIn]?.toString().trim() || undefined,
        website: row[columnMap.website]?.toString().trim() || undefined,
        address: row[columnMap.address]?.toString().trim() || undefined,
        education: row[columnMap.education]?.toString().trim() || undefined,
        experience: row[columnMap.experience]?.toString().trim() || undefined,
        languages: row[columnMap.languages]?.toString().trim() || undefined,
        availability: row[columnMap.availability]?.toString().trim() || undefined,
        hourlyRate: row[columnMap.hourlyRate]?.toString().trim() || undefined,
        currency: row[columnMap.currency]?.toString().trim() || undefined,
        workedWithBefore:
          columnMap.workedWithBefore !== undefined ? parseBoolean(row[columnMap.workedWithBefore]) : undefined,
        cvUploaded: columnMap.cvUploaded !== undefined ? parseBoolean(row[columnMap.cvUploaded]) : undefined,
        notes: row[columnMap.notes]?.toString().trim() || undefined,
        lastContact: row[columnMap.lastContact]?.toString().trim() || undefined,
        rating: parseNumber(row[columnMap.rating]),
        certifications: row[columnMap.certifications]?.toString().trim() || undefined,
        publications: row[columnMap.publications]?.toString().trim() || undefined,
      })
    })

    console.log(`Parsed ${individuals.length} individual experts`)
    return individuals
  }

  private parseDetailedPartnerFirms(rawData: any[][]): DetailedPartnerFirm[] {
    if (!rawData || rawData.length < 2) {
      console.warn("No data to parse for Detailed Partner Firms sheet.")
      return []
    }

    const headers = rawData[0] // Assuming first row is headers
    const dataRows = rawData.slice(1)

    const columnMap: Record<keyof DetailedPartnerFirm, number> = {} as any
    headers.forEach((header, index) => {
      if (typeof header === "string") {
        const normalizedHeader = header.toLowerCase().trim()
        if (normalizedHeader.includes("name of firm")) columnMap.name = index
        else if (normalizedHeader.includes("country hq")) columnMap.countryHQ = index
        else if (normalizedHeader.includes("regional (list the countries)")) columnMap.regionalPresence = index
        else if (normalizedHeader.includes("global (yes/no)")) columnMap.globalPresence = index
        else if (normalizedHeader.includes("year founded")) columnMap.yearFounded = index
        else if (normalizedHeader.includes("name of contact person")) columnMap.contactPersonName = index
        else if (normalizedHeader.includes("designation")) columnMap.designation = index
        else if (normalizedHeader.includes("email")) columnMap.email = index
        else if (normalizedHeader.includes("phone")) columnMap.phone = index
        else if (normalizedHeader.includes("website")) columnMap.website = index
        else if (normalizedHeader.includes("have we worked with them in the past (yes/no)"))
          columnMap.workedWithPast = index
        else if (normalizedHeader.includes("cv uploaded (yes/no)")) columnMap.cvUploaded = index
      }
    })

    const detailedFirms: DetailedPartnerFirm[] = []
    dataRows.forEach((row, rowIndex) => {
      const name = row[columnMap.name]?.toString().trim() || ""
      if (!name) return // Skip rows without a name

      const parseBoolean = (value: any): boolean => {
        if (typeof value === "string") {
          return value.toLowerCase().trim() === "yes"
        }
        return false
      }

      const parseNumber = (value: any): number | undefined => {
        if (typeof value === "number") return value
        if (typeof value === "string") {
          const parsed = Number.parseInt(value.trim())
          return isNaN(parsed) ? undefined : parsed
        }
        return undefined
      }

      detailedFirms.push({
        id: `detailed_firm_${rowIndex}_${Math.random().toString(36).substr(2, 9)}`,
        name: name,
        countryHQ: row[columnMap.countryHQ]?.toString().trim() || "",
        regionalPresence: row[columnMap.regionalPresence]?.toString().trim() || "",
        globalPresence: parseBoolean(row[columnMap.globalPresence]),
        yearFounded: parseNumber(row[columnMap.yearFounded]),
        contactPersonName: row[columnMap.contactPersonName]?.toString().trim() || "",
        designation: row[columnMap.designation]?.toString().trim() || "",
        email: row[columnMap.email]?.toString().trim() || "",
        phone: row[columnMap.phone]?.toString().trim() || "",
        website: row[columnMap.website]?.toString().trim() || "",
        workedWithPast: parseBoolean(row[columnMap.workedWithPast]),
        cvUploaded: parseBoolean(row[columnMap.cvUploaded]),
      })
    })
    return detailedFirms
  }

  async checkForUpdates(): Promise<boolean> {
    if (this.usingSampleData || this.connectionStatus !== "connected") {
      return false
    }

    try {
      const { data: fileList, error } = await supabase.storage.from(this.bucketName).list("", {
        limit: 100,
      })

      if (error || !fileList || fileList.length === 0) {
        return false
      }

      const fileInfo = fileList.find((f) => f.name === this.filePath)
      if (!fileInfo) {
        return false
      }

      const lastModified = new Date(fileInfo.updated_at || fileInfo.created_at)

      if (this.bdCache) {
        const cacheTime = new Date(this.bdCache.timestamp)
        return lastModified > cacheTime
      }

      return true
    } catch (error) {
      console.warn("Error checking for updates:", error)
      return false
    }
  }
}

export default SupabaseExcelReader
