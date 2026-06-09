"use client"

import React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts"
import {
  ArrowUpRight,
  PieChartIcon,
  Users,
  Map,
  Calendar,
  Clock,
  Globe,
  FileText,
  BarChart3,
  TrendingUp,
  Target,
  Search,
  Building2,
  Briefcase,
  AlertCircle,
  ArrowDownRight,
  Award,
  DollarSign,
  X,
  Download,
  ChevronDown,
  ChevronUp,
  Filter,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import dynamic from "next/dynamic"
import { ThemeToggle } from "@/components/theme-toggle"
import { useTheme } from "@/components/theme-provider"
import { useLocalExcelData } from "@/hooks/use-local-excel-data"
import { ExcelUpload } from "@/components/excel-upload"
import PartnersMapComponent from "@/components/partners-map-component"
import { ReportContent } from "@/components/report-content"

const teamMembersByGroup = {
  "Team Chi": ["TS", "DW", "CN", "MaK", "WM", "GJ", "MW"],
  "Team Phi": ["EO", "AK", "AA", "IM", "CM", "MEK"],
  "Team Kappa": ["AM", "SM", "SC", "LO"],
  "Team Gamma": ["RG", "PA", "RA", "IC", "EG"],
  "Team Delta": ["MB", "JI", "MK", "IG", "CA"],
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.log("Map component error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }

    return this.props.children
  }
}

function CustomTooltip({ active, payload, isDarkMode }) {
  if (active && payload && payload.length) {
    return (
      <div
        className={`${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} p-3 border rounded shadow-lg`}
      >
        <p className="font-medium text-xs">{payload[0].name}</p>
        <p className="text-xs text-[#383e80]">Count: {payload[0].value}</p>
        {payload[0].payload.percentage && (
          <p className="text-xs text-gray-500">{payload[0].payload.percentage}% of total</p>
        )}
      </div>
    )
  }

  return null
}

const MapComponent = dynamic(() => import("../components/map-component"), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] w-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6b7dd1] mx-auto mb-2"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading map...</p>
      </div>
    </div>
  ),
})

export default function PowerBIDashboard() {
  const { theme } = useTheme()
  const isDarkMode = theme === "dark"
  const reportRef = useRef<HTMLDivElement>(null)

  const {
    data: rawDataset,
    partners,
    stats,
    loading: dataLoading,
    error: dataError,
    lastUpdated,
    hasData,
    fileName: loadedFileName,
    loadFromUpload,
    clearData,
    filterByType,
  } = useLocalExcelData()

  const currentYear  = new Date().getFullYear().toString()
  const currentMonth = new Date().getMonth() + 1
  const currentQuarterDefault = currentMonth <= 3 ? "Q1" : currentMonth <= 6 ? "Q2" : currentMonth <= 9 ? "Q3" : "Q4"

  const [activeTab, setActiveTab] = useState("overview")
  const [dataTypeFilter, setDataTypeFilter] = useState<"all" | "EOI" | "Proposal">("all")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [activeFilters, setActiveFilters] = useState({
    quarter: currentQuarterDefault,
    year: currentYear,
    bdCategory: "All",
    teamGroup: "All Teams",
    teamMembers: [],
    businessLines: [],
    bdTypes: [],
    clientTypes: [],
    status: "All",
    country: "All",
  })

  const [filteredData, setFilteredData] = useState({
    businessLineData: [],
    clientTypeData: [],
    bdTypeData: [],
    quarterData: [],
    originData: [],
    serviceOfferingData: [],
    rawData: [],
    teamAssignmentData: [],
    geoData: [],
    winRateData: [],
    statusData: [],
    budgetData: [],
  })


  // Extract unique years from data
  const getAvailableYears = useCallback(() => {
    const dataSource = rawDataset
    if (!dataSource || dataSource.length === 0) return ["All Years"]
    
    const yearsSet = new Set<string>()
    yearsSet.add("All Years")
    
    dataSource.forEach((item) => {
      if (item.year) {
        const yearStr = item.year.toString().trim()
        if (yearStr) {
          yearsSet.add(yearStr)
        }
      }
    })
    
    // Sort years in descending order
    return Array.from(yearsSet).sort((a, b) => {
      if (a === "All Years") return -1
      if (b === "All Years") return 1
      return parseInt(b) - parseInt(a)
    })
  }, [rawDataset])

  const [availableYears, setAvailableYears] = useState<string[]>([])

  // Update available years whenever data changes
  useEffect(() => {
    const years = getAvailableYears()
    setAvailableYears(years)
  }, [getAvailableYears])

  // Auto-load the default Excel from /public on first visit (if no session data)
  useEffect(() => {
    if (hasData) return // already loaded from sessionStorage or a previous upload
    const load = async () => {
      try {
        const res = await fetch("/api/bd-data/default")
        if (!res.ok) return // no default file present — user will upload manually
        const result = await res.json()
        if (result.success && result.data?.length) {
          loadFromUpload(result.data, result.partners || [], {
            name: result.stats.fileName,
            size: result.stats.fileSize,
            sheets: result.stats.sheets,
            eoiCount: result.stats.eoiCount,
            proposalCount: result.stats.proposalCount,
            partnerCount: result.stats.partnerCount,
          })
        }
      } catch {
        // silently ignore — user can still upload manually
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const aggregateByField = (data, field) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.log(`No data to aggregate for field: ${field}`)
      return []
    }

    const aggregated = {}
    const total = data.length

    data.forEach((item) => {
      const value = item[field]
      if (value && value.toString().trim() !== "") {
        const key = value.toString().trim()
        if (!aggregated[key]) {
          aggregated[key] = 0
        }
        aggregated[key] += 1
      }
    })

    let result = Object.entries(aggregated).map(([name, value]) => ({
      name,
      value,
      percentage: total > 0 ? ((value / total) * 100).toFixed(1) : 0,
    }))

    if (field === "quarter") {
      const quarterOrder = ["Q1", "Q2", "Q3", "Q4"]
      result = result.sort((a, b) => {
        const aIndex = quarterOrder.indexOf(a.name)
        const bIndex = quarterOrder.indexOf(b.name)
        if (aIndex === -1 && bIndex === -1) return a.name.localeCompare(b.name)
        if (aIndex === -1) return 1
        if (bIndex === -1) return -1
        return aIndex - bIndex
      })
    } else {
      result = result.sort((a, b) => b.value - a.value)
    }

    console.log(`Aggregated ${field}:`, result)
    return result
  }

  const filterTeamDataByDate = (data, filteredRawData) => {
    if (!data || !Array.isArray(data)) return []

    let filtered = [...data]

    // The dataset passed in is already year+quarter filtered at the BD record level.
    // We only need to apply team-member filter here and cross-check against
    // the filtered project titles so team entries stay in sync.

    if (activeFilters.teamMembers.length > 0) {
      filtered = filtered.filter((item) => item.name && activeFilters.teamMembers.includes(item.name))
    }

    const filteredProjectTitles = new Set(filteredRawData.map((item) => item.title))
    filtered = filtered.filter((item) => filteredProjectTitles.has(item.projectTitle))

    return filtered
  }

  const parseDeadlineDate = (dateString) => {
    if (!dateString || dateString.trim() === "") return null

    try {
      // Handle Excel serial numbers (like 45712, 45713)
      if (typeof dateString === "string" && /^\d+$/.test(dateString.trim())) {
        const serialNumber = Number.parseInt(dateString.trim(), 10)
        // Excel serial date: days since January 1, 1900 (with leap year bug correction)
        const excelEpoch = new Date(1900, 0, 1)
        const date = new Date(excelEpoch.getTime() + (serialNumber - 2) * 24 * 60 * 60 * 1000)
        return date
      }

      // Handle M/D/YYYY format (like 9/12/2025)
      if (typeof dateString === "string" && dateString.includes("/")) {
        const parts = dateString.trim().split("/")
        if (parts.length === 3) {
          const month = Number.parseInt(parts[0], 10)
          const day = Number.parseInt(parts[1], 10)
          const year = Number.parseInt(parts[2], 10)

          // Validate the parts
          if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year > 1900) {
            return new Date(year, month - 1, day) // month is 0-indexed in Date constructor
          }
        }
      }

      // Fallback to standard Date parsing
      const date = new Date(dateString)
      return isNaN(date.getTime()) ? null : date
    } catch (error) {
      console.error("Error parsing deadline date:", dateString, error)
      return null
    }
  }

  const isWithinNext7Days = (dateString) => {
    const deadline = parseDeadlineDate(dateString)
    if (!deadline) return false

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const deadlineNormalized = new Date(deadline)
    deadlineNormalized.setHours(0, 0, 0, 0)

    const diffTime = deadlineNormalized - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    // Return true for deadlines that are today (0) or in the future (1-7 days)
    return diffDays >= 0 && diffDays <= 7
  }

  const isFutureDeadline = (dateString) => {
    const deadline = parseDeadlineDate(dateString)
    if (!deadline) return false

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const deadlineNormalized = new Date(deadline)
    deadlineNormalized.setHours(0, 0, 0, 0)

    return deadlineNormalized >= today
  }

  const handleUploadedData = (data: any[], partnerData: any[], fileMeta: { name: string; size: number; sheets?: string[]; eoiCount?: number; proposalCount?: number; partnerCount?: number }) => {
    loadFromUpload(data, partnerData, fileMeta)
    console.log("Uploaded data received:", data.length, "records,", partnerData.length, "partners")
  }

  const handleUploadError = (error: string) => {
    console.error("Upload error:", error)
  }

  const handleFilterChange = (filterType, value) => {
    setActiveFilters((prev) => {
      const newFilters = { ...prev }

      if (
        filterType === "quarter" ||
        filterType === "year" ||
        filterType === "bdCategory" ||
        filterType === "status" ||
        filterType === "country" ||
        filterType === "teamGroup"
      ) {
        newFilters[filterType] = value
      } else {
        if (newFilters[filterType].includes(value)) {
          newFilters[filterType] = newFilters[filterType].filter((item) => item !== value)
        } else {
          newFilters[filterType] = [...newFilters[filterType], value]
        }
      }

      return newFilters
    })
  }

  const clearFilters = () => {
    setActiveFilters({
      quarter: "All Quarters",
      year: "All Years",
      bdCategory: "All",
      teamGroup: "All Teams",
      teamMembers: [],
      businessLines: [],
      bdTypes: [],
      clientTypes: [],
      status: "All",
      country: "All",
    })
  }

  const removeFilter = (filterType, value) => {
    setActiveFilters((prev) => {
      const newFilters = { ...prev }
      if (Array.isArray(newFilters[filterType])) {
        newFilters[filterType] = newFilters[filterType].filter((item) => item !== value)
      } else {
        newFilters[filterType] =
          filterType === "quarter"
            ? "All Quarters"
            : filterType === "year"
              ? "All Years"
              : filterType === "bdCategory"
                ? "All"
                : filterType === "status"
                  ? "All"
                  : filterType === "country"
                    ? "All"
                    : "All"
      }
      return newFilters
    })
  }

  const generateTeamAssignmentData = (dataset, selectedTeamGroup) => {
    if (!dataset || !Array.isArray(dataset)) return []

    const teamData = []
    const roles = ["cvsProfiles", "workplanBudget", "methodology", "otherActivity", "pc", "pd"]
    const roleNames = {
      cvsProfiles: "CVS & Project profiles",
      workplanBudget: "Workplan & Budget",
      methodology: "Methodology",
      otherActivity: "Other activity",
      pc: "PC",
      pd: "PD",
    }

    const membersInSelectedGroup =
      selectedTeamGroup !== "All Teams" ? teamMembersByGroup[selectedTeamGroup] || [] : null

    roles.forEach((role) => {
      dataset.forEach((item) => {
        if (item[role] && item[role].toString().trim() !== "") {
          const memberName = item[role].toString().trim()

          // Only include the member if no specific team group is selected,
          // or if a team group is selected AND the member is in that group.
          if (!membersInSelectedGroup || membersInSelectedGroup.includes(memberName)) {
            teamData.push({
              name: memberName,
              value: 1,
              role: roleNames[role],
              year: item.year || "",
              quarter: item.quarter || "",
              projectTitle: item.title || "",
              bd: item.bd || "",
            })
          }
        }
      })
    })

    return teamData
  }

  const generateGeoData = (dataset) => {
    if (!dataset || !Array.isArray(dataset)) return []

    const countryCount = {}
    dataset.forEach((item) => {
      if (item.country && item.country.toString().trim() !== "") {
        const countries = item.country
          .toString()
          .split(/[,&]/)
          .map((c) => c.trim())
        countries.forEach((country) => {
          if (country && country !== "") {
            countryCount[country] = (countryCount[country] || 0) + 1
          }
        })
      }
    })

    const countryCoords = {
      Kenya: { lat: 0.0236, lng: 37.9062 },
      Ethiopia: { lat: 9.145, lng: 40.4897 },
      Senegal: { lat: 14.4974, lng: -14.4524 },
      Malawi: { lat: -13.2543, lng: 34.3015 },
      Uganda: { lat: 1.3733, lng: 32.2903 },
      Ghana: { lat: 7.9465, lng: -1.0232 },
      Zambia: { lat: -13.1339, lng: 27.8493 },
      Somalia: { lat: 2.0469, lng: 45.3182 },
      Tanzania: { lat: -6.369, lng: 34.8888 },
      "Burkina Faso": { lat: 9.3077, lng: 2.3158 },
      Mozambique: { lat: -18.6657, lng: 35.5296 },
      Zanzibar: { lat: -6.1659, lng: 39.2026 },
      Nigeria: { lat: 9.082, lng: 8.6753 },
      Liberia: { lat: 6.4281, lng: -9.4295 },
      "Democratic Republic of Congo": { lat: -4.0383, lng: 21.7587 },
    }

    return Object.entries(countryCount)
      .map(([country, count]) => ({
        country,
        value: count,
        lat: countryCoords[country]?.lat || 0,
        lng: countryCoords[country]?.lng || 0,
        businessLines: [
          ...new Set(
            dataset
              .filter((item) => item.country && item.country.toString().includes(country))
              .map((item) => item.businessLine)
              .filter((bl) => bl && bl.toString().trim() !== ""),
          ),
        ],
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
  }

  const downloadCSV = () => {
    if (!filteredData.rawData || filteredData.rawData.length === 0) {
      alert("No data available to download")
      return
    }

    const headers = [
      "Project Title",
      "Business Line",
      "Client Type",
      "BD Type",
      "Quarter",
      "Status",
      "Country",
      "Budget",
      "PC",
      "PD",
      "Methodology",
      "CVS Profiles",
      "Workplan Budget",
      "Other Activity",
      "Origin",
      "Service Offering",
      "Deadline",
    ]

    const csvContent = [
      headers.join(","),
      ...filteredData.rawData.map((row) =>
        [
          `"${row.title || ""}"`,
          `"${row.businessLine || ""}"`,
          `"${row.client || ""}"`,
          `"${row.typeBD || ""}"`,
          `"${row.quarter || ""}"`,
          `"${row.status || ""}"`,
          `"${row.country || ""}"`,
          `"${row.budget || ""}"`,
          `"${row.pc || ""}"`,
          `"${row.pd || ""}"`,
          `"${row.methodology || ""}"`,
          `"${row.cvsProfiles || ""}"`,
          `"${row.workplanBudget || ""}"`,
          `"${row.otherActivity || ""}"`,
          `"${row.origin || ""}"`,
          `"${row.serviceOffering || ""}"`,
          `"${row.deadline || ""}"`,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `bd-dashboard-data-${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const downloadPdf = async () => {
    try {
      const response = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summaryData: {
            totalOpportunities,
            rfpCount,
            eoiCount,
            totalBudget: totalBudget > 0 ? `$${(totalBudget / 1000000).toFixed(1)}M` : "$0",
            upcomingDeadlines,
            countriesCount: filteredData.geoData?.length || 0,
          },
          activeFilters,
          filteredData: {
            rawData: filteredData.rawData || [],
            businessLineData: filteredData.businessLineData || [],
            clientTypeData: filteredData.clientTypeData || [],
            bdTypeData: filteredData.bdTypeData || [],
            geoData: filteredData.geoData || [],
            statusData: filteredData.statusData || [],
            winRateData: filteredData.winRateData || [],
            originData: filteredData.originData || [],
            serviceOfferingData: filteredData.serviceOfferingData || [],
          },
        }),
      })
      if (!response.ok) throw new Error("Report generation failed")
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `BD_Report_${activeFilters.year}_${activeFilters.quarter}_${new Date().toISOString().split("T")[0]}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error generating report:", error)
      alert("Failed to generate report. Please try again.")
    }
  }

  const getCurrentQuarter = () => {
    const month = new Date().getMonth() + 1 // getMonth() returns 0-11, so add 1
    if (month >= 1 && month <= 3) return "Q1"
    if (month >= 4 && month <= 6) return "Q2"
    if (month >= 7 && month <= 9) return "Q3"
    return "Q4"
  }

  const getPreviousQuarter = (currentQuarter: string) => {
    const quarterMap: { [key: string]: string } = {
      Q1: "Q4",
      Q2: "Q1",
      Q3: "Q2",
      Q4: "Q3",
    }
    return quarterMap[currentQuarter]
  }

  const currentQuarter = getCurrentQuarter()
  const previousQuarter = getPreviousQuarter(currentQuarter)

  const currentQuarterCount = (filteredData.rawData || []).filter((item) => item.quarter === currentQuarter).length
  const previousQuarterCount = (filteredData.rawData || []).filter((item) => item.quarter === previousQuarter).length

  const quarterGrowth =
    previousQuarterCount > 0 ? ((currentQuarterCount - previousQuarterCount) / previousQuarterCount) * 100 : 0

  const upcomingDeadlines = (filteredData.rawData || []).filter((item) => isWithinNext7Days(item.deadline)).length
  const totalFutureDeadlines = (filteredData.rawData || []).filter((item) => isFutureDeadline(item.deadline)).length

  useEffect(() => {
    if (filteredData.rawData && filteredData.rawData.length > 0) {
      console.log(
        "[v0] Sample deadline data:",
        filteredData.rawData.slice(0, 5).map((item) => ({
          title: item.title,
          deadline: item.deadline,
          parsed: parseDeadlineDate(item.deadline),
          isFuture: isFutureDeadline(item.deadline),
          isNext7Days: isWithinNext7Days(item.deadline),
        })),
      )
      console.log("[v0] Total future deadlines:", totalFutureDeadlines)
      console.log("[v0] Upcoming deadlines (next 7 days):", upcomingDeadlines)
    }
  }, [filteredData.rawData, totalFutureDeadlines, upcomingDeadlines])

  useEffect(() => {
    console.log("Applying filters. Raw dataset length:", rawDataset?.length || 0)
    console.log("Active filters:", activeFilters)
    console.log("Data type filter:", dataTypeFilter)

    const dataSource = rawDataset
    if (!dataSource || dataSource.length === 0) {
      console.log("No raw data available")
      setFilteredData({
        businessLineData: [],
        clientTypeData: [],
        bdTypeData: [],
        quarterData: [],
        originData: [],
        serviceOfferingData: [],
        rawData: [],
        teamAssignmentData: [],
        geoData: [],
        winRateData: [],
        statusData: [],
        budgetData: [],
      })
      return
    }

    // First apply data type filter (EOI vs Proposal)
    let filteredRawData = [...dataSource]
    
    if (dataTypeFilter !== "all") {
      filteredRawData = filterByType(dataTypeFilter)
      console.log(`After data type filter (${dataTypeFilter}):`, filteredRawData.length)
    }

    console.log("Starting with data:", filteredRawData.length)

    if (activeFilters.bdCategory !== "All") {
      filteredRawData = filteredRawData.filter((item) => {
        if (!item.bd) return false
        const bdValue = item.bd.toString().trim()

        if (activeFilters.bdCategory === "RFP") {
          return bdValue === "RFP"
        } else if (activeFilters.bdCategory === "EOI") {
          return bdValue === "EOI"
        }
        return false
      })
      console.log(`After BD category filter (${activeFilters.bdCategory}):`, filteredRawData.length)
    }

    if (activeFilters.quarter !== "All Quarters") {
      filteredRawData = filteredRawData.filter((item) => item.quarter === activeFilters.quarter)
      console.log(`After quarter filter (${activeFilters.quarter}):`, filteredRawData.length)
    }

    if (activeFilters.status !== "All") {
      filteredRawData = filteredRawData.filter((item) => item.status === activeFilters.status)
      console.log(`After status filter (${activeFilters.status}):`, filteredRawData.length)
    }

    if (activeFilters.year !== "All Years") {
      const beforeCount = filteredRawData.length
      filteredRawData = filteredRawData.filter((item) => {
        // Only filter BD records (EOI/RFP) by year
        // Teams, Partners, and other records don't have year columns, so skip them
        if (item.bd === "EOI" || item.bd === "RFP") {
          if (item.year) {
            return item.year.toString().trim() === activeFilters.year
          }
          return false
        }
        // Keep all non-BD records (teams, partners, etc.)
        return true
      })
      console.log(`[v0] Year filter (${activeFilters.year}): ${beforeCount} -> ${filteredRawData.length} records`)
    }

    if (activeFilters.country !== "All") {
      filteredRawData = filteredRawData.filter(
        (item) => item.country && item.country.toString().toLowerCase().includes(activeFilters.country.toLowerCase()),
      )
      console.log(`After country filter (${activeFilters.country}):`, filteredRawData.length)
    }

    if (activeFilters.teamGroup !== "All Teams") {
      const membersInGroup = teamMembersByGroup[activeFilters.teamGroup] || []
      if (membersInGroup.length > 0) {
        filteredRawData = filteredRawData.filter((item) => {
          const teamFields = [
            item.pc,
            item.pd,
            item.cvsProfiles,
            item.workplanBudget,
            item.methodology,
            item.otherActivity,
          ]
          return teamFields.some(
            (field) =>
              field && membersInGroup.some((member) => field.toString().toLowerCase().includes(member.toLowerCase())),
          )
        })
        console.log(`After team group filter (${activeFilters.teamGroup}):`, filteredRawData.length)
      }
    }

    if (activeFilters.businessLines.length > 0) {
      filteredRawData = filteredRawData.filter((item) => activeFilters.businessLines.includes(item.businessLine))
      console.log(`After business lines filter:`, filteredRawData.length)
    }

    if (activeFilters.clientTypes.length > 0) {
      filteredRawData = filteredRawData.filter((item) => activeFilters.clientTypes.includes(item.client))
      console.log(`After client types filter:`, filteredRawData.length)
    }

    if (activeFilters.bdTypes.length > 0) {
      filteredRawData = filteredRawData.filter((item) => activeFilters.bdTypes.includes(item.typeBD))
      console.log(`After BD types filter:`, filteredRawData.length)
    }

    if (activeFilters.teamMembers.length > 0) {
      filteredRawData = filteredRawData.filter((item) => {
        const teamFields = [
          item.pc,
          item.pd,
          item.cvsProfiles,
          item.workplanBudget,
          item.methodology,
          item.otherActivity,
        ]
        return teamFields.some(
          (field) =>
            field &&
            activeFilters.teamMembers.some((member) => field.toString().toLowerCase().includes(member.toLowerCase())),
        )
      })
      console.log(`After team members filter:`, filteredRawData.length)
    }

    const businessLineData = aggregateByField(filteredRawData, "businessLine")
    const clientTypeData = aggregateByField(filteredRawData, "client")
    const bdTypeData = aggregateByField(filteredRawData, "typeBD")
    const quarterData = aggregateByField(filteredRawData, "quarter")
    const originData = aggregateByField(filteredRawData, "origin")
    const serviceOfferingData = aggregateByField(filteredRawData, "serviceOffering")
    const statusData = aggregateByField(filteredRawData, "status")

    const budgetData = filteredRawData
      .filter((item) => {
        const budget = Number.parseFloat(item.budget)
        return !isNaN(budget) && budget > 0
      })
      .reduce((acc, item) => {
        const budget = Number.parseFloat(item.budget)
        const range =
          budget < 100000
            ? "< $100K"
            : budget < 250000
              ? "$100K - $250K"
              : budget < 500000
                ? "$250K - $500K"
                : "> $500K"
        acc[range] = (acc[range] || 0) + 1
        return acc
      }, {})

    const budgetRangeOrder = ["< $100K", "$100K - $250K", "$250K - $500K", "> $500K"]

    const budgetRangeData = Object.entries(budgetData)
      .map(([range, count]) => ({
        name: range,
        value: count,
      }))
      .sort((a, b) => budgetRangeOrder.indexOf(a.name) - budgetRangeOrder.indexOf(b.name))

    // CORRECTED CALL: Pass activeFilters.teamGroup to generateTeamAssignmentData
    const teamAssignmentData = generateTeamAssignmentData(filteredRawData, activeFilters.teamGroup)
    const filteredTeamData = filterTeamDataByDate(teamAssignmentData, filteredRawData)
    console.log("[v0] Filtered data for team calc:", {
      year: activeFilters.year,
      filteredRawDataCount: filteredRawData.length,
      sample2026Records: filteredRawData.filter(r => r.year === "2026").slice(0, 2).map(r => ({ pc: r.pc, pd: r.pd, methodology: r.methodology })),
      teamAssignmentDataCount: teamAssignmentData.length,
    })
    const geoData = generateGeoData(filteredRawData)

    const businessLines = [
      ...new Set(dataSource.map((item) => item.businessLine).filter((bl) => bl && bl.toString().trim() !== "")),
    ]

    const winRateData = businessLines
      .map((bl) => {
        const total = filteredRawData.filter((item) => item.businessLine === bl).length
        const won = filteredRawData.filter((item) => item.businessLine === bl && item.status === "Won").length
        const submitted = filteredRawData.filter(
          (item) => item.businessLine === bl && item.status === "Submitted",
        ).length
        const lost = filteredRawData.filter((item) => item.businessLine === bl && item.status === "Lost").length
        return {
          name: bl,
          winRate: total > 0 ? Number.parseFloat(((won / total) * 100).toFixed(1)) : 0,
          total,
          won,
          submitted,
          lost,
          inProgress: total - won - submitted - lost,
        }
      })
      .filter((item) => item.total > 0)
      .sort((a, b) => b.winRate - a.winRate)

    const newFilteredData = {
      businessLineData,
      clientTypeData,
      bdTypeData,
      quarterData,
      originData,
      serviceOfferingData,
      rawData: filteredRawData,
      teamAssignmentData: filteredTeamData,
      geoData,
      winRateData,
      statusData,
      budgetData: budgetRangeData,
    }

    console.log("Generated filtered data:", newFilteredData)
    setFilteredData(newFilteredData)
  }, [activeFilters, rawDataset, dataTypeFilter, filterByType])

  if (dataLoading && (!rawDataset || rawDataset.length === 0)) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-[#383e80] text-white px-6 py-4">
          <h1 className="text-2xl font-bold">Business Development Dashboard</h1>
          <p className="text-sm opacity-90">Loading data...</p>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#383e80] mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading Excel data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (dataError && (!rawDataset || rawDataset.length === 0)) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-[#383e80] text-white px-6 py-4">
          <h1 className="text-2xl font-bold">Business Development Dashboard</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="h-12 w-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold">!</span>
            </div>
            <p className="text-red-600 dark:text-red-400 mb-4">Error reading file: {dataError}</p>
            <p className="text-gray-500 text-sm">Try uploading the Excel file again below.</p>
            <div className="mt-6">
              <ExcelUpload onDataLoaded={handleUploadedData} onError={handleUploadError} compact={true} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const q1Count = (filteredData.rawData || []).filter((item) => item.quarter === "Q1").length
  const q2Count = (filteredData.rawData || []).filter((item) => item.quarter === "Q2").length

  const totalOpportunities = filteredData.rawData?.length || 0

  const rfpCount =
    filteredData.rawData?.filter((item) => {
      if (!item.bd) return false
      const bdValue = item.bd.toString().trim()
      return bdValue === "RFP"
    }).length || 0

  const eoiCount =
    filteredData.rawData?.filter((item) => {
      if (!item.bd) return false
      const bdValue = item.bd.toString().trim()
      return bdValue === "EOI"
    }).length || 0

  console.log("All BD values in data:", [...new Set(filteredData.rawData?.map((item) => item.bd).filter((bd) => bd))])
  console.log("RFP count:", rfpCount, "EOI count:", eoiCount)
  console.log(
    "Sample BD values:",
    filteredData.rawData?.slice(0, 5).map((item) => ({ title: item.title, bd: item.bd })),
  )

  const totalBudget = (filteredData.rawData || [])
    .map((item) => {
      let budgetValue = item.budget
      if (typeof budgetValue === "string") {
        budgetValue = budgetValue.replace(/[$,\s]/g, "")
      }
      const budget = Number.parseFloat(budgetValue)
      return !isNaN(budget) && budget > 0 ? budget : 0
    })
    .reduce((sum, budget) => sum + budget, 0)

  console.log("Budget calculation details:")
  console.log(
    "Sample budget values:",
    filteredData.rawData?.slice(0, 5).map((item) => ({
      title: item.title,
      budget: item.budget,
      parsed: Number.parseFloat(typeof item.budget === "string" ? item.budget.replace(/[$,\s]/g, "") : item.budget),
    })),
  )
  console.log("Total budget calculated:", totalBudget)

  const COLORS = ["#383E80", "#4B518C", "#7377A6", "#9B9EBF", "#C3C5D8"]

  const getUniqueValues = (field) => {
    if (!rawDataset || rawDataset.length === 0) return []
    return [
      ...new Set(rawDataset.map((item) => item[field]).filter((value) => value && value.toString().trim() !== "")),
    ].sort((a, b) => a.localeCompare(b))
  }

  const uniqueBusinessLines = getUniqueValues("businessLine")
  const uniqueClientTypes = getUniqueValues("client")
  const uniqueBdTypes = getUniqueValues("typeBD")
  const uniqueStatuses = getUniqueValues("status")
  const uniqueCountries = [
    ...new Set(
      rawDataset?.flatMap((item) =>
        item.country
          ? item.country
              .toString()
              .split(/[,&]/)
              .map((c) => c.trim())
              .filter((c) => c)
          : [],
      ) || [],
    ),
  ].sort((a, b) => a.localeCompare(b))

  const uniqueTeamMembers = [
    ...new Set(
      [
        ...getUniqueValues("pc"),
        ...getUniqueValues("pd"),
        ...getUniqueValues("cvsProfiles"),
        ...getUniqueValues("workplanBudget"),
        ...getUniqueValues("methodology"),
        ...getUniqueValues("otherActivity"),
      ].filter((member) => member && member.toString().trim() !== ""),
    ),
  ].sort((a, b) => a.localeCompare(b))

  const getActiveFilterCount = () => {
    let count = 0
    if (activeFilters.quarter !== "All Quarters") count++
    if (activeFilters.year !== "All Years") count++
    if (activeFilters.bdCategory !== "All") count++
    if (activeFilters.teamGroup !== "All Teams") count++
    if (activeFilters.status !== "All") count++
    if (activeFilters.country !== "All") count++
    count += activeFilters.teamMembers.length
    count += activeFilters.businessLines.length
    count += activeFilters.bdTypes.length
    count += activeFilters.clientTypes.length
    return count
  }

  console.log("Rendering dashboard with data:", {
    totalOpportunities,
    businessLineDataLength: filteredData.businessLineData?.length,
    clientTypeDataLength: filteredData.clientTypeData?.length,
    rawDataLength: rawDataset?.length,
  })

  return (
    <div className="flex flex-col min-h-screen bg-background dark:bg-background transition-colors duration-200">
      <header className="bg-[#383e80] text-white dark:bg-[#383e80] px-4 py-3 transition-colors duration-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Business Development Dashboard</h1>
            <p className="text-xs opacity-90">Real-time BD tracking and analytics</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs opacity-90">
              Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleString() : "Never"}
            </span>

            <div className="relative">
              <Select>
                <SelectTrigger className="w-auto bg-white/10 border-white/20 text-white hover:bg-white/20">
                  <Download className="h-4 w-4" />
                </SelectTrigger>
                <SelectContent>
                  <div
                    onClick={downloadCSV}
                    className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <FileText className="h-4 w-4" />
                    Download CSV
                  </div>
                  <div
                    onClick={downloadPdf}
                    className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <FileText className="h-4 w-4" />
                    Download Report (.pdf)
                  </div>
                </SelectContent>
              </Select>
            </div>

            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="flex-1 p-4">
        {/* ── File status bar ── */}
        <div className="mb-4 flex items-center justify-between gap-4 px-3 py-2 rounded-lg border border-[#6b7dd1]/20 bg-white dark:bg-gray-800 text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-[#383e80] shrink-0" />
            {hasData ? (
              <span className="text-gray-700 dark:text-gray-200 truncate">
                <span className="font-semibold">{loadedFileName}</span>
                {stats && (
                  <span className="text-gray-400 dark:text-gray-500 ml-2">
                    {stats.totalRecords} records · {stats.eoiCount ?? 0} EOIs · {stats.proposalCount ?? 0} RFPs
                    {lastUpdated && <> · {new Date(lastUpdated).toLocaleTimeString()}</>}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-gray-400 italic">No data — loading default file…</span>
            )}
          </div>
          <ExcelUpload
            onDataLoaded={handleUploadedData}
            onError={handleUploadError}
            compact={true}
            currentFileName={loadedFileName}
          />
        </div>


        <div className="mb-6">
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <Card className="border-[#6b7dd1]/20 dark:border-[#6b7dd1]/20 dark:bg-gray-800">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Filter className="h-5 w-5 text-[#383e80]" />
                      <span>Filters</span>
                      {getActiveFilterCount() > 0 && (
                        <Badge variant="secondary" className="bg-[#383e80] text-white">
                          {getActiveFilterCount()} active
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getActiveFilterCount() > 0 && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            clearFilters()
                          }}
                          variant="outline"
                          size="sm"
                          className="border-[#6b7dd1] text-[#6b7dd1] hover:bg-[#6b7dd1]/10 bg-transparent"
                        >
                          Clear All
                        </Button>
                      )}
                      {filtersOpen ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quarter-select" className="text-sm font-medium">
                        Quarter
                      </Label>
                      <Select
                        value={activeFilters.quarter}
                        onValueChange={(value) => handleFilterChange("quarter", value)}
                      >
                        <SelectTrigger id="quarter-select" className="w-full">
                          <SelectValue placeholder="Select quarter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="All Quarters">All Quarters</SelectItem>
                          <SelectItem value="Q1">Q1</SelectItem>
                          <SelectItem value="Q2">Q2</SelectItem>
                          <SelectItem value="Q3">Q3</SelectItem>
                          <SelectItem value="Q4">Q4</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="year-select" className="text-sm font-medium">
                        Year
                      </Label>
                      <Select value={activeFilters.year} onValueChange={(value) => handleFilterChange("year", value)}>
                        <SelectTrigger id="year-select" className="w-full">
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableYears.map((year) => (
                            <SelectItem key={year} value={year}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bd-category-select" className="text-sm font-medium">
                        BD Type
                      </Label>
                      <Select
                        value={activeFilters.bdCategory}
                        onValueChange={(value) => handleFilterChange("bdCategory", value)}
                      >
                        <SelectTrigger id="bd-category-select" className="w-full">
                          <SelectValue placeholder="Select BD type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="All">All</SelectItem>
                          <SelectItem value="RFP">RFP</SelectItem>
                          <SelectItem value="EOI">EOI</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status-select" className="text-sm font-medium">
                        Status
                      </Label>
                      <Select
                        value={activeFilters.status}
                        onValueChange={(value) => handleFilterChange("status", value)}
                      >
                        <SelectTrigger id="status-select" className="w-full">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="All">All Statuses</SelectItem>
                          {uniqueStatuses.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="country-select" className="text-sm font-medium">
                        Country
                      </Label>
                      <Select
                        value={activeFilters.country}
                        onValueChange={(value) => handleFilterChange("country", value)}
                      >
                        <SelectTrigger id="country-select" className="w-full">
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="All">All Countries</SelectItem>
                          {uniqueCountries.map((country) => (
                            <SelectItem key={country} value={country}>
                              {country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="team-group-select" className="text-sm font-medium">
                        Team Group
                      </Label>
                      <Select
                        value={activeFilters.teamGroup}
                        onValueChange={(value) => handleFilterChange("teamGroup", value)}
                      >
                        <SelectTrigger id="team-group-select" className="w-full">
                          <SelectValue placeholder="Select team group" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="All Teams">All Teams</SelectItem>
                          {Object.keys(teamMembersByGroup).sort((a, b) => a.localeCompare(b)).map((groupName) => (
                            <SelectItem key={groupName} value={groupName}>
                              {groupName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Team Members</Label>
                      <Select onValueChange={(value) => handleFilterChange("teamMembers", value)}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select team member" />
                        </SelectTrigger>
                        <SelectContent>
                          {uniqueTeamMembers.map((member) => (
                            <SelectItem key={member} value={member}>
                              {member}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {activeFilters.teamMembers.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {activeFilters.teamMembers.map((member) => (
                            <Badge key={member} variant="secondary" className="text-xs">
                              {member}
                              <button
                                onClick={() => removeFilter("teamMembers", member)}
                                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Business Lines</Label>
                      <Select onValueChange={(value) => handleFilterChange("businessLines", value)}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select business line" />
                        </SelectTrigger>
                        <SelectContent>
                          {uniqueBusinessLines.map((line) => (
                            <SelectItem key={line} value={line}>
                              {line}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {activeFilters.businessLines.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {activeFilters.businessLines.map((line) => (
                            <Badge key={line} variant="secondary" className="text-xs">
                              {line}
                              <button
                                onClick={() => removeFilter("businessLines", line)}
                                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Client Types</Label>
                      <Select onValueChange={(value) => handleFilterChange("clientTypes", value)}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select client type" />
                        </SelectTrigger>
                        <SelectContent>
                          {uniqueClientTypes.map((client) => (
                            <SelectItem key={client} value={client}>
                              {client}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {activeFilters.clientTypes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {activeFilters.clientTypes.map((client) => (
                            <Badge key={client} variant="secondary" className="text-xs">
                              {client}
                              <button
                                onClick={() => removeFilter("clientTypes", client)}
                                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">BD Categories</Label>
                      <Select onValueChange={(value) => handleFilterChange("bdTypes", value)}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select BD category" />
                        </SelectTrigger>
                        <SelectContent>
                          {uniqueBdTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {activeFilters.bdTypes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {activeFilters.bdTypes.map((type) => (
                            <Badge key={type} variant="secondary" className="text-xs">
                              {type}
                              <button
                                onClick={() => removeFilter("bdTypes", type)}
                                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>

        <div className="grid grid-cols-1 gap-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="bg-[#383e80] text-white border-none shadow-md">
              <CardHeader className="pb-2">
                <CardDescription className="text-white/70">Total Opportunities</CardDescription>
                <CardTitle className="text-3xl text-white flex items-center">
                  <Target className="mr-2 h-6 w-6 text-white/80" />
                  {totalOpportunities}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-white/70 flex items-center">
                  {quarterGrowth >= 0 ? (
                    <ArrowUpRight className="mr-1 h-3 w-3 text-green-300" />
                  ) : (
                    <ArrowDownRight className="mr-1 h-3 w-3 text-red-300" />
                  )}
                  <span className={`font-medium ${quarterGrowth >= 0 ? "text-green-300" : "text-red-300"}`}>
                    {Math.abs(quarterGrowth).toFixed(1)}%
                  </span>{" "}
                  from {previousQuarter} to {currentQuarter}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#383e80] text-white border-none shadow-md">
              <CardHeader className="pb-2">
                <CardDescription className="text-white/70">RFP vs EOI</CardDescription>
                <CardTitle className="text-3xl text-white flex items-center">
                  <FileText className="mr-2 h-6 w-6 text-white/80" />
                  {rfpCount} / {eoiCount}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge className="bg-white/20 text-white">
                    RFP: {totalOpportunities > 0 ? Math.round((rfpCount / totalOpportunities) * 100) : 0}%
                  </Badge>
                  <Badge className="bg-white/20 text-white">
                    EOI: {totalOpportunities > 0 ? Math.round((eoiCount / totalOpportunities) * 100) : 0}%
                  </Badge>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#383e80] text-white border-none shadow-md">
              <CardHeader className="pb-2">
                <CardDescription className="text-white/70">Countries Covered</CardDescription>
                <CardTitle className="text-3xl text-white flex items-center">
                  <Globe className="mr-2 h-6 w-6 text-white/80" />
                  {filteredData.geoData?.length || 0}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-white/70">Primarily in East and West Africa</div>
              </CardContent>
            </Card>
            <Card className="bg-[#383e80] text-white border-none shadow-md">
              <CardHeader className="pb-2">
                <CardDescription className="text-white/70">Upcoming Deadlines</CardDescription>
                <CardTitle className="text-3xl text-white flex items-center">
                  <Clock className="mr-2 h-6 w-6 text-white/80" />
                  {totalFutureDeadlines}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-white/70 flex items-center">
                  <AlertCircle className="mr-1 h-3 w-3 text-red-300" />
                  <span className="text-red-300 font-medium">{upcomingDeadlines}</span> deadlines in the next 7 days
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#383e80] text-white border-none shadow-md">
              <CardHeader className="pb-2">
                <CardDescription className="text-white/70">Total Budget Value</CardDescription>
                <CardTitle className="text-2xl text-white flex items-center">
                  <DollarSign className="mr-2 h-6 w-6 text-white/80" />
                  {totalBudget > 0 ? (totalBudget / 1000000).toFixed(1) : 0}M
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-white/70">
                  Avg: $
                  {totalOpportunities > 0 && totalBudget > 0 ? Math.round(totalBudget / totalOpportunities / 1000) : 0}K
                  per opportunity
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-6 w-full bg-[#6b7dd1] text-white">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-[#4f5490] data-[state=active]:text-white text-white/70 hover:text-white"
            >
              <PieChartIcon className="mr-2 h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="bd-analysis"
              className="data-[state=active]:bg-[#4f5490] data-[state=active]:text-white text-white/70 hover:text-white"
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              BD Analysis
            </TabsTrigger>
            <TabsTrigger
              value="team"
              className="data-[state=active]:bg-[#4f5490] data-[state=active]:text-white text-white/70 hover:text-white"
            >
              <Users className="mr-2 h-4 w-4" />
              Team
            </TabsTrigger>
            <TabsTrigger
              value="advanced-metrics"
              className="data-[state=active]:bg-[#4f5490] data-[state=active]:text-white text-white/70 hover:text-white"
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              Advanced Metrics
            </TabsTrigger>
            <TabsTrigger
              value="map-view"
              className="data-[state=active]:bg-[#4f5490] data-[state=active]:text-white text-white/70 hover:text-white"
            >
              <Map className="mr-2 h-4 w-4" />
              Map View
            </TabsTrigger>
            <TabsTrigger
              value="partners-map"
              className="data-[state=active]:bg-[#4f5490] data-[state=active]:text-white text-white/70 hover:text-white"
            >
              <Users className="mr-2 h-4 w-4" />
              Partners Map
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-[#6b7dd1]/20 dark:border-[#6b7dd1]/20 dark:bg-gray-800 overflow-hidden shadow-md">
                <CardHeader className="bg-[#4B518C] text-white">
                  <CardTitle className="text-white flex items-center">
                    <PieChartIcon className="mr-2 h-5 w-5" />
                    Business Line Distribution
                  </CardTitle>
                  <CardDescription className="text-white/80">
                    Breakdown of opportunities by business line ({filteredData.businessLineData?.length || 0}{" "}
                    categories)
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 bg-white dark:bg-gray-800">
                  <div className="h-80">
                    {filteredData.businessLineData && filteredData.businessLineData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={filteredData.businessLineData}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            outerRadius={75}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percentage, cx, cy, midAngle, outerRadius: or, index }) => {
                              const pct = parseFloat(percentage)
                              if (pct < 5) return null
                              const RADIAN = Math.PI / 180
                              const radius = or + 18
                              const x = cx + radius * Math.cos(-midAngle * RADIAN)
                              const y = cy + radius * Math.sin(-midAngle * RADIAN)
                              return (
                                <text x={x} y={y} textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" style={{ fontSize: "9px", fill: "#444" }}>
                                  {`${name}: ${pct}%`}
                                </text>
                              )
                            }}
                          >
                            {filteredData.businessLineData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip isDarkMode={isDarkMode} />} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <PieChartIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No business line data available</p>
                          <p className="text-sm">Check your filters or data source</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[#6b7dd1]/20 dark:border-[#6b7dd1]/20 dark:bg-gray-800 overflow-hidden shadow-md">
                <CardHeader className="bg-[#4B518C] text-white">
                  <CardTitle className="text-white flex items-center">
                    <Building2 className="mr-2 h-5 w-5" />
                    Client Type Distribution
                  </CardTitle>
                  <CardDescription className="text-white/80">
                    Breakdown of opportunities by client type ({filteredData.clientTypeData?.length || 0} types)
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 bg-white dark:bg-gray-800">
                  <div className="h-80">
                    {filteredData.clientTypeData && filteredData.clientTypeData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={filteredData.clientTypeData}
                          layout="vertical"
                          margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                        >
                          <XAxis type="number" tickFormatter={(value) => Math.round(value).toString()} />
                          <YAxis
                            dataKey="name"
                            type="category"
                            width={140}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 10 }}
                            tickFormatter={(value) => value}
                          />
                          <Tooltip content={<CustomTooltip isDarkMode={isDarkMode} />} />
                          <Bar dataKey="value" fill={COLORS[1]} radius={4} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No client type data available</p>
                          <p className="text-sm">Check your filters or data source</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[#6b7dd1]/20 dark:border-[#6b7dd1]/20 dark:bg-gray-800 overflow-hidden shadow-md">
                <CardHeader className="bg-[#4B518C] text-white">
                  <CardTitle className="text-white flex items-center">
                    <Briefcase className="mr-2 h-5 w-5" />
                    BD Type Distribution
                  </CardTitle>
                  <CardDescription className="text-white/80">
                    Core vs Adjacent vs New opportunities ({filteredData.bdTypeData?.length || 0} types)
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 bg-white dark:bg-gray-800">
                  <div className="h-80">
                    {filteredData.bdTypeData && filteredData.bdTypeData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={filteredData.bdTypeData}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            outerRadius={75}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percentage, cx, cy, midAngle, outerRadius: or, index }) => {
                              const pct = parseFloat(percentage)
                              if (pct < 5) return null
                              const RADIAN = Math.PI / 180
                              const radius = or + 18
                              const x = cx + radius * Math.cos(-midAngle * RADIAN)
                              const y = cy + radius * Math.sin(-midAngle * RADIAN)
                              return (
                                <text x={x} y={y} textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" style={{ fontSize: "9px", fill: "#444" }}>
                                  {`${name}: ${pct}%`}
                                </text>
                              )
                            }}
                          >
                            {filteredData.bdTypeData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip isDarkMode={isDarkMode} />} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <Briefcase className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No BD type data available</p>
                          <p className="text-sm">Check your filters or data source</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[#6b7dd1]/20 dark:border-[#6b7dd1]/20 dark:bg-gray-800 overflow-hidden shadow-md">
                <CardHeader className="bg-[#4B518C] text-white">
                  <CardTitle className="text-white flex items-center">
                    <Calendar className="mr-2 h-5 w-5" />
                    Quarter Distribution
                  </CardTitle>
                  <CardDescription className="text-white/80">
                    Opportunities by quarter ({filteredData.quarterData?.length || 0} quarters)
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 bg-white dark:bg-gray-800">
                  <div className="h-80">
                    {filteredData.quarterData && filteredData.quarterData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={filteredData.quarterData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                          <XAxis dataKey="name" />
                          <YAxis tickFormatter={(value) => Math.round(value).toString()} />
                          <Tooltip content={<CustomTooltip isDarkMode={isDarkMode} />} />
                          <Bar dataKey="value" fill={COLORS[2]} radius={4} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No quarter data available</p>
                          <p className="text-sm">Check your filters or data source</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="bd-analysis" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-[#6b7dd1]/20 dark:border-[#6b7dd1]/20 dark:bg-gray-800 overflow-hidden shadow-md">
                <CardHeader className="bg-[#4B518C] text-white">
                  <CardTitle className="text-white flex items-center">
                    <Search className="mr-2 h-5 w-5" />
                    Origin of BD
                  </CardTitle>
                  <CardDescription className="text-white/80">How opportunities are sourced</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 bg-white dark:bg-gray-800">
                  <div className="h-80">
                    {filteredData.originData && filteredData.originData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={filteredData.originData}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            outerRadius={75}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percentage, cx, cy, midAngle, outerRadius: or, index }) => {
                              const pct = parseFloat(percentage)
                              if (pct < 5) return null
                              const RADIAN = Math.PI / 180
                              const radius = or + 18
                              const x = cx + radius * Math.cos(-midAngle * RADIAN)
                              const y = cy + radius * Math.sin(-midAngle * RADIAN)
                              return (
                                <text x={x} y={y} textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" style={{ fontSize: "9px", fill: "#444" }}>
                                  {`${name}: ${pct}%`}
                                </text>
                              )
                            }}
                          >
                            {filteredData.originData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip isDarkMode={isDarkMode} />} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No origin data available</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[#6b7dd1]/20 dark:border-[#6b7dd1]/20 dark:bg-gray-800 overflow-hidden shadow-md">
                <CardHeader className="bg-[#4B518C] text-white">
                  <CardTitle className="text-white flex items-center">
                    <BarChart3 className="mr-2 h-5 w-5" />
                    Service Offering
                  </CardTitle>
                  <CardDescription className="text-white/80">Types of services offered</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 bg-white dark:bg-gray-800">
                  <div className="h-80">
                    {filteredData.serviceOfferingData && filteredData.serviceOfferingData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={filteredData.serviceOfferingData}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            outerRadius={75}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percentage, cx, cy, midAngle, outerRadius: or, index }) => {
                              const pct = parseFloat(percentage)
                              if (pct < 5) return null
                              const RADIAN = Math.PI / 180
                              const radius = or + 18
                              const x = cx + radius * Math.cos(-midAngle * RADIAN)
                              const y = cy + radius * Math.sin(-midAngle * RADIAN)
                              return (
                                <text x={x} y={y} textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" style={{ fontSize: "9px", fill: "#444" }}>
                                  {`${name}: ${pct}%`}
                                </text>
                              )
                            }}
                          >
                            {filteredData.serviceOfferingData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip isDarkMode={isDarkMode} />} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No service offering data available</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[#6b7dd1]/20 dark:border-[#6b7dd1]/20 dark:bg-gray-800 overflow-hidden shadow-md">
                <CardHeader className="bg-[#4B518C] text-white">
                  <CardTitle className="text-white flex items-center">
                    <DollarSign className="mr-2 h-5 w-5" />
                    Budget Distribution
                  </CardTitle>
                  <CardDescription className="text-white/80">Project budget ranges</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 bg-white dark:bg-gray-800">
                  <div className="h-80">
                    {filteredData.budgetData && filteredData.budgetData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={filteredData.budgetData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <XAxis dataKey="name" />
                          <YAxis tickFormatter={(value) => Math.round(value).toString()} />
                          <Tooltip content={<CustomTooltip isDarkMode={isDarkMode} />} />
                          <Bar dataKey="value" fill={COLORS[0]} radius={4} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No budget data available</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[#6b7dd1]/20 dark:border-[#6b7dd1]/20 dark:bg-gray-800 overflow-hidden shadow-md">
                <CardHeader className="bg-[#4B518C] text-white">
                  <CardTitle className="text-white flex items-center">
                    <Award className="mr-2 h-5 w-5" />
                    Status Distribution
                  </CardTitle>
                  <CardDescription className="text-white/80">Current status of all opportunities</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 bg-white dark:bg-gray-800">
                  <div className="h-80">
                    {filteredData.statusData && filteredData.statusData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={filteredData.statusData}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            outerRadius={75}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percentage, cx, cy, midAngle, outerRadius: or, index }) => {
                              const pct = parseFloat(percentage)
                              if (pct < 5) return null
                              const RADIAN = Math.PI / 180
                              const radius = or + 18
                              const x = cx + radius * Math.cos(-midAngle * RADIAN)
                              const y = cy + radius * Math.sin(-midAngle * RADIAN)
                              return (
                                <text x={x} y={y} textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" style={{ fontSize: "9px", fill: "#444" }}>
                                  {`${name}: ${pct}%`}
                                </text>
                              )
                            }}
                          >
                            {filteredData.statusData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  entry.name === "Won"
                                    ? COLORS[2]
                                    : entry.name === "Lost"
                                      ? COLORS[4]
                                      : entry.name === "Submitted"
                                        ? COLORS[1]
                                        : entry.name === "Under development"
                                          ? COLORS[3]
                                          : COLORS[index % COLORS.length]
                                }
                              />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip isDarkMode={isDarkMode} />} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <Award className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No status data available</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="team" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="bg-[#383e80] text-white border-none shadow-md">
                <CardHeader className="pb-2">
                  <CardDescription className="text-white/70">Methodology Assignments</CardDescription>
                  <CardTitle className="text-3xl text-white flex items-center">
                    <FileText className="mr-2 h-6 w-6 text-white/80" />
                    {filteredData.teamAssignmentData?.filter((t) => t.role === "Methodology").length || 0}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-white/70">Total methodology assignments across all projects</div>
                  <div className="mt-2 text-sm">
                    Top contributors:{" "}
                    <span className="font-medium text-white">
                      {(() => {
                        const methodologyAssignments =
                          filteredData.teamAssignmentData?.filter((t) => t.role === "Methodology") || []
                        const contributorCounts = {}
                        methodologyAssignments.forEach((assignment) => {
                          contributorCounts[assignment.name] = (contributorCounts[assignment.name] || 0) + 1
                        })
                        return (
                          Object.entries(contributorCounts)
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 3)
                            .map(([name, count]) => `${name} (${count})`)
                            .join(", ") || "None"
                        )
                      })()}
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[#383e80] text-white border-none shadow-md">
                <CardHeader className="pb-2">
                  <CardDescription className="text-white/70">PC Assignments</CardDescription>
                  <CardTitle className="text-3xl text-white flex items-center">
                    <Users className="mr-2 h-6 w-6 text-white/80" />
                    {filteredData.teamAssignmentData?.filter((t) => t.role === "PC").length || 0}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-white/70">Total PC assignments across all projects</div>
                  <div className="mt-2 text-sm">
                    Top contributors:{" "}
                    <span className="font-medium text-white">
                      {(() => {
                        const pcAssignments = filteredData.teamAssignmentData?.filter((t) => t.role === "PC") || []
                        const contributorCounts = {}
                        pcAssignments.forEach((assignment) => {
                          contributorCounts[assignment.name] = (contributorCounts[assignment.name] || 0) + 1
                        })
                        return (
                          Object.entries(contributorCounts)
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 3)
                            .map(([name, count]) => `${name} (${count})`)
                            .join(", ") || "None"
                        )
                      })()}
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[#383e80] text-white border-none shadow-md">
                <CardHeader className="pb-2">
                  <CardDescription className="text-white/70">PD Assignments</CardDescription>
                  <CardTitle className="text-3xl text-white flex items-center">
                    <Briefcase className="mr-2 h-6 w-6 text-white/80" />
                    {filteredData.teamAssignmentData?.filter((t) => t.role === "PD").length || 0}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-white/70">Total PD assignments across all projects</div>
                  <div className="mt-2 text-sm">
                    Top contributors:{" "}
                    <span className="font-medium text-white">
                      {(() => {
                        const pdAssignments = filteredData.teamAssignmentData?.filter((t) => t.role === "PD") || []
                        const contributorCounts = {}
                        pdAssignments.forEach((assignment) => {
                          contributorCounts[assignment.name] = (contributorCounts[assignment.name] || 0) + 1
                        })
                        return (
                          Object.entries(contributorCounts)
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 3)
                            .map(([name, count]) => `${name} (${count})`)
                            .join(", ") || "None"
                        )
                      })()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <Card className="border-[#6b7dd1]/20 dark:border-[#6b7dd1]/20 dark:bg-gray-800 overflow-hidden shadow-md">
                <CardHeader className="bg-[#4B518C] text-white">
                  <CardTitle className="text-white flex items-center">
                    <Users className="mr-2 h-5 w-5" />
                    Role Assignment Distribution
                  </CardTitle>
                  <CardDescription className="text-white/80">
                    Number of assignments by role type (including multiple assignments per person)
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 bg-white dark:bg-gray-800">
                  <div className="h-80">
                    {filteredData.teamAssignmentData && filteredData.teamAssignmentData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={Object.entries(
                            filteredData.teamAssignmentData.reduce((acc, item) => {
                              if (!acc[item.role]) {
                                acc[item.role] = { count: 0, members: {} }
                              }
                              acc[item.role].count += 1
                              acc[item.role].members[item.name] = (acc[item.role].members[item.name] || 0) + 1
                              return acc
                            }, {}),
                          )
                            .map(([role, data]) => ({
                              role,
                              count: data.count,
                              uniqueMembers: Object.keys(data.members).length,
                              members: data.members,
                              topContributor:
                                Object.entries(data.members).sort(([, a], [, b]) => b - a)[0]?.[0] || "None",
                              topContributorCount:
                                Object.entries(data.members).sort(([, a], [, b]) => b - a)[0]?.[1] || 0,
                            }))
                            .sort((a, b) => b.count - a.count)}
                          layout="vertical"
                          margin={{ top: 20, right: 30, left: 120, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" tickFormatter={(value) => Math.round(value).toString()} />
                          <YAxis
                            dataKey="role"
                            type="category"
                            width={140}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 10 }}
                            tickFormatter={(value) => value}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload
                                const contributors = Object.entries(data.members || {}).sort(
                                  ([, countA], [, countB]) => countB - countA,
                                )

                                return (
                                  <div className="bg-white dark:bg-gray-800 p-3 border rounded shadow-lg dark:border-gray-700">
                                    <p className="font-medium">{data.role}</p>
                                    <p className="text-sm">Total Assignments: {data.count}</p>
                                    <p className="text-sm">Team Members: {data.uniqueMembers}</p>
                                    {contributors.length > 0 && (
                                      <div className="mt-2">
                                        <p className="text-sm font-medium">Assignments per Member:</p>
                                        <p className="text-xs text-gray-700 dark:text-gray-300">
                                          {contributors.map(([name, count]) => `${name}: ${count}`).join(", ")}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Bar dataKey="count" fill="#8884d8">
                            {Object.keys(
                              filteredData.teamAssignmentData.reduce((acc, item) => {
                                acc[item.role] = true
                                return acc
                              }, {}),
                            ).map((role, index) => {
                              const roleColors = {
                                Methodology: COLORS[0],
                                PC: COLORS[1],
                                PD: COLORS[2],
                                "CVS & Project profiles": COLORS[3],
                                "Workplan & Budget": COLORS[4],
                                "Other activity": COLORS[0],
                              }
                              return (
                                <Cell key={`cell-${index}`} fill={roleColors[role] || COLORS[index % COLORS.length]} />
                              )
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No team assignment data available</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="advanced-metrics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-[#6b7dd1]/20 dark:border-[#6b7dd1]/20 dark:bg-gray-800 overflow-hidden shadow-md">
                <CardHeader className="bg-[#4B518C] text-white">
                  <CardTitle className="text-white flex items-center">
                    <TrendingUp className="mr-2 h-5 w-5" />
                    Win Rate by Business Line
                  </CardTitle>
                  <CardDescription className="text-white/80">
                    Success rate across different business lines
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 bg-white dark:bg-gray-800">
                  <div className="h-80">
                    {filteredData.winRateData && filteredData.winRateData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={filteredData.winRateData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="name"
                            angle={-45}
                            textAnchor="end"
                            height={100}
                            interval={0}
                            tick={{ fontSize: 9 }}
                            tickFormatter={(value) => value}
                          />
                          <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                          <Tooltip
                            formatter={(value, name) => {
                              if (name === "winRate") return [`${value}%`, "Win Rate"]
                              return [value, name]
                            }}
                            labelFormatter={(label) => `Business Line: ${label}`}
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload
                                return (
                                  <div className="bg-white dark:bg-gray-800 p-3 border rounded shadow-lg dark:border-gray-700">
                                    <p className="font-medium">{label}</p>
                                    <p className="text-sm" style={{ color: COLORS[2] }}>
                                      Won: {data.won}
                                    </p>
                                    <p className="text-sm" style={{ color: COLORS[1] }}>
                                      Submitted: {data.submitted}
                                    </p>
                                    <p className="text-sm" style={{ color: COLORS[3] }}>
                                      In Progress: {data.inProgress}
                                    </p>
                                    <p className="text-sm font-medium">Win Rate: {data.winRate}%</p>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Bar dataKey="winRate" fill={COLORS[0]} radius={4} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No win rate data available</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[#6b7dd1]/20 dark:border-[#6b7dd1]/20 dark:bg-gray-800 overflow-hidden shadow-md">
                <CardHeader className="bg-[#4B518C] text-white">
                  <CardTitle className="text-white flex items-center">
                    <BarChart3 className="mr-2 h-5 w-5" />
                    Pipeline Analysis
                  </CardTitle>
                  <CardDescription className="text-white/80">Opportunities by status and business line</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 bg-white dark:bg-gray-800">
                  <div className="h-80">
                    {filteredData.winRateData && filteredData.winRateData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={filteredData.winRateData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="name"
                            angle={-45}
                            textAnchor="end"
                            height={100}
                            interval={0}
                            tick={{ fontSize: 9 }}
                            tickFormatter={(value) => value}
                          />
                          <YAxis tickFormatter={(value) => Math.round(value).toString()} />
                          <Tooltip
                            formatter={(value, name) => [value, name]}
                            labelFormatter={(label) => `Business Line: ${label}`}
                          />
                          <Legend />
                          <Bar dataKey="won" stackId="a" fill={COLORS[2]} name="Won" />
                          <Bar dataKey="submitted" stackId="a" fill={COLORS[1]} name="Submitted" />
                          <Bar dataKey="inProgress" stackId="a" fill={COLORS[3]} name="In Progress" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No pipeline data available</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="map-view" className="space-y-4">
            <Card className="border-[#6b7dd1]/20 dark:border-[#6b7dd1]/20 dark:bg-gray-800 overflow-hidden shadow-md">
              <CardHeader className="bg-[#4B518C] text-white">
                <CardTitle className="text-white flex items-center">
                  <Map className="mr-2 h-5 w-5" />
                  Geographic Distribution
                </CardTitle>
                <CardDescription className="text-white/80">
                  Business development opportunities across Africa
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 bg-white dark:bg-gray-800">
                <div className="h-[500px] w-full">
                  <ErrorBoundary
                    fallback={
                      <div className="h-full w-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <div className="text-center">
                          <div className="h-12 w-12 bg-[#383e80] rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-white font-bold">🗺️</span>
                          </div>
                          <p className="text-gray-600 dark:text-gray-400">Map temporarily unavailable</p>
                          <p className="text-sm text-gray-500 dark:text-gray-500">
                            Geographic data shown in charts below
                          </p>
                        </div>
                      </div>
                    }
                  >
                    <MapComponent geoData={filteredData.geoData} isDarkMode={isDarkMode} />
                  </ErrorBoundary>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-[#6b7dd1]/20 dark:border-[#6b7dd1]/20 dark:bg-gray-800 overflow-hidden shadow-md">
                <CardHeader className="bg-[#4B518C] text-white">
                  <CardTitle className="text-white flex items-center">
                    <Globe className="mr-2 h-5 w-5" />
                    Top Countries by Opportunities
                  </CardTitle>
                  <CardDescription className="text-white/80">Countries with most BD opportunities</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 bg-white dark:bg-gray-800">
                  <div className="h-80">
                    {filteredData.geoData && filteredData.geoData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={filteredData.geoData.slice(0, 10)}
                          layout="vertical"
                          margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                        >
                          <XAxis type="number" tickFormatter={(value) => Math.round(value).toString()} />
                          <YAxis
                            dataKey="country"
                            type="category"
                            width={140}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 10 }}
                            tickFormatter={(value) => value}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-white dark:bg-gray-800 p-2 border rounded shadow-sm dark:border-gray-700">
                                    <p className="font-medium">{payload[0].payload.country}</p>
                                    <p className="text-sm">Opportunities: {payload[0].payload.value}</p>
                                    <p className="text-sm">
                                      Business Lines: {payload[0].payload.businessLines?.join(", ") || "N/A"}
                                    </p>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Bar dataKey="value" fill={COLORS[0]} radius={4} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <Globe className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No geographic data available</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[#6b7dd1]/20 dark:border-[#6b7dd1]/20 dark:bg-gray-800 overflow-hidden shadow-md">
                <CardHeader className="bg-[#4B518C] text-white">
                  <CardTitle className="text-white flex items-center">
                    <Building2 className="mr-2 h-5 w-5" />
                    Regional Distribution
                  </CardTitle>
                  <CardDescription className="text-white/80">Opportunities by African region</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 bg-white dark:bg-gray-800">
                  <div className="h-80">
                    {filteredData.geoData && filteredData.geoData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={(() => {
                              const regionMapping = {
                                "East Africa": ["Kenya", "Ethiopia", "Uganda", "Tanzania", "Malawi", "Zambia"],
                                "West Africa": [
                                  "Senegal",
                                  "Ghana",
                                  "Burkina Faso",
                                  "Benin",
                                  "Togo",
                                  "Nigeria",
                                  "Liberia",
                                ],
                                "Central Africa": ["Democratic Republic of Congo"],
                                "Southern Africa": ["South Africa", "Mozambique"],
                                "Horn of Africa": ["Somalia"],
                                "Indian Ocean": ["Zanzibar"],
                                "Multi-regional": [
                                  "Africa",
                                  "African Countries",
                                  "COMESA Countries",
                                  "West & Southern Africa",
                                  "Sub-Saharan Africa",
                                ],
                              }

                              const regionCount = {}
                              filteredData.geoData.forEach((item) => {
                                let assigned = false
                                for (const [region, countries] of Object.entries(regionMapping)) {
                                  if (countries.some((country) => item.country.includes(country))) {
                                    regionCount[region] = (regionCount[region] || 0) + item.value
                                    assigned = true
                                    break
                                  }
                                }
                                if (!assigned) {
                                  regionCount["Other"] = (regionCount["Other"] || 0) + item.value
                                }
                              })

                              const totalValue = Object.values(regionCount).reduce((sum, val) => sum + val, 0)

                              return Object.entries(regionCount).map(([name, value], index) => ({
                                name,
                                value,
                                percentage: totalValue > 0 ? ((value / totalValue) * 100).toFixed(1) : 0,
                              }))
                            })()}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            outerRadius={75}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percentage, cx, cy, midAngle, outerRadius: or, index }) => {
                              const pct = parseFloat(percentage)
                              if (pct < 5) return null
                              const RADIAN = Math.PI / 180
                              const radius = or + 18
                              const x = cx + radius * Math.cos(-midAngle * RADIAN)
                              const y = cy + radius * Math.sin(-midAngle * RADIAN)
                              return (
                                <text x={x} y={y} textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" style={{ fontSize: "9px", fill: "#444" }}>
                                  {`${name}: ${pct}%`}
                                </text>
                              )
                            }}
                          >
                            {(() => {
                              const regionMapping = {
                                "East Africa": ["Kenya", "Ethiopia", "Uganda", "Tanzania", "Malawi", "Zambia"],
                                "West Africa": [
                                  "Senegal",
                                  "Ghana",
                                  "Burkina Faso",
                                  "Benin",
                                  "Togo",
                                  "Nigeria",
                                  "Liberia",
                                ],
                                "Central Africa": ["Democratic Republic of Congo"],
                                "Southern Africa": ["South Africa", "Mozambique"],
                                "Horn of Africa": ["Somalia"],
                                "Indian Ocean": ["Zanzibar"],
                                "Multi-regional": [
                                  "Africa",
                                  "African Countries",
                                  "COMESA Countries",
                                  "West & Southern Africa",
                                  "Sub-Saharan Africa",
                                ],
                              }

                              const regionCount = {}
                              filteredData.geoData.forEach((item) => {
                                let assigned = false
                                for (const [region, countries] of Object.entries(regionMapping)) {
                                  if (countries.some((country) => item.country.includes(country))) {
                                    regionCount[region] = (regionCount[region] || 0) + item.value
                                    assigned = true
                                    break
                                  }
                                }
                                if (!assigned) {
                                  regionCount["Other"] = (regionCount["Other"] || 0) + item.value
                                }
                              })

                              return Object.entries(regionCount).map(([name, value], index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))
                            })()}
                          </Pie>
                          <Tooltip content={<CustomTooltip isDarkMode={isDarkMode} />} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No regional data available</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="partners-map" className="space-y-4">
            <PartnersMapComponent partners={partners} />
          </TabsContent>
        </Tabs>
      </div>

      <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        <ReportContent
          ref={reportRef}
          summaryData={{
            totalOpportunities,
            rfpCount,
            eoiCount,
            totalBudget: totalBudget > 0 ? `$${(totalBudget / 1000000).toFixed(1)}M` : "$0",
            upcomingDeadlines,
            countriesCount: filteredData.geoData?.length || 0,
            businessLines: filteredData.businessLineData?.map((bl) => `${bl.name}: ${bl.value}`).join(", ") || "None",
            topCountries:
              filteredData.geoData
                ?.slice(0, 5)
                .map((geo) => `${geo.country}: ${geo.value}`)
                .join(", ") || "None",
            winRates:
              filteredData.winRateData
                ?.slice(0, 3)
                .map((wr) => `${wr.name}: ${wr.winRate}%`)
                .join(", ") || "None",
          }}
          activeFilters={activeFilters}
          filteredData={filteredData}
        />
      </div>
    </div>
  )
}
