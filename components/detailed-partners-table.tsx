"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RefreshCw, Search, Download, ExternalLink, Mail, Phone, Globe, Star } from "lucide-react"
import { useSupabasePartnersData } from "@/hooks/use-supabase-partners-data"
import StarRating from "./star-rating"
import PartnerRatingDialog from "./partner-rating-dialog"

interface PartnerRating {
  averageRating: number
  totalRatings: number
}

export default function DetailedPartnersTable() {
  const { detailedFirms, stats, loading, error, refreshData } = useSupabasePartnersData()
  const [partnerRatings, setPartnerRatings] = useState<Record<string, PartnerRating>>({})
  const [ratingDialog, setRatingDialog] = useState<{
    open: boolean
    partnerName: string
    partnerType: "individual" | "firm"
  }>({
    open: false,
    partnerName: "",
    partnerType: "firm",
  })

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCountry, setSelectedCountry] = useState<string>("all")
  const [selectedGlobalPresence, setSelectedGlobalPresence] = useState<string>("all")
  const [selectedWorkedWith, setSelectedWorkedWith] = useState<string>("all")

  const fetchPartnerRating = async (partnerName: string, partnerType: "individual" | "firm") => {
    try {
      const response = await fetch(
        `/api/partner-ratings?partnerName=${encodeURIComponent(partnerName)}&partnerType=${partnerType}`,
      )
      if (response.ok) {
        const data = await response.json()
        return {
          averageRating: data.averageRating || 0,
          totalRatings: data.totalRatings || 0,
        }
      }
    } catch (error) {
      console.error("Error fetching rating for", partnerName, error)
    }
    return { averageRating: 0, totalRatings: 0 }
  }

  useEffect(() => {
    const loadRatings = async () => {
      if (detailedFirms.length > 0) {
        const ratings: Record<string, PartnerRating> = {}

        for (const firm of detailedFirms) {
          const rating = await fetchPartnerRating(firm.name, "firm")
          ratings[firm.name] = rating
        }

        setPartnerRatings(ratings)
      }
    }

    loadRatings()
  }, [detailedFirms])

  const handleRatingSubmitted = async () => {
    // Refresh the specific partner's rating
    if (ratingDialog.partnerName) {
      const updatedRating = await fetchPartnerRating(ratingDialog.partnerName, ratingDialog.partnerType)
      setPartnerRatings((prev) => ({
        ...prev,
        [ratingDialog.partnerName]: updatedRating,
      }))
    }
  }

  // Filter detailed firms based on search and filters
  const filteredFirms = useMemo(() => {
    let filtered = detailedFirms

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (firm) =>
          firm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          firm.countryHQ.toLowerCase().includes(searchTerm.toLowerCase()) ||
          firm.contactPersonName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          firm.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
          firm.email.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Filter by country
    if (selectedCountry !== "all") {
      filtered = filtered.filter((firm) => firm.countryHQ === selectedCountry)
    }

    // Filter by global presence
    if (selectedGlobalPresence !== "all") {
      const isGlobal = selectedGlobalPresence === "yes"
      filtered = filtered.filter((firm) => firm.globalPresence === isGlobal)
    }

    // Filter by worked with past
    if (selectedWorkedWith !== "all") {
      const workedWith = selectedWorkedWith === "yes"
      filtered = filtered.filter((firm) => firm.workedWithPast === workedWith)
    }

    return filtered
  }, [detailedFirms, searchTerm, selectedCountry, selectedGlobalPresence, selectedWorkedWith])

  // Get unique countries for filter
  const countries = useMemo(() => {
    const uniqueCountries = [...new Set(detailedFirms.map((firm) => firm.countryHQ).filter(Boolean))]
    return uniqueCountries.sort()
  }, [detailedFirms])

  const exportToCSV = () => {
    const headers = [
      "Name",
      "Country HQ",
      "Regional Presence",
      "Global Presence",
      "Year Founded",
      "Contact Person",
      "Designation",
      "Email",
      "Phone",
      "Website",
      "Worked With Past",
      "CV Uploaded",
      "Average Rating",
      "Total Ratings",
    ]

    const csvContent = [
      headers.join(","),
      ...filteredFirms.map((firm) => {
        const rating = partnerRatings[firm.name] || { averageRating: 0, totalRatings: 0 }
        return [
          `"${firm.name}"`,
          `"${firm.countryHQ}"`,
          `"${firm.regionalPresence}"`,
          firm.globalPresence ? "Yes" : "No",
          firm.yearFounded || "",
          `"${firm.contactPersonName}"`,
          `"${firm.designation}"`,
          `"${firm.email}"`,
          `"${firm.phone}"`,
          `"${firm.website}"`,
          firm.workedWithPast ? "Yes" : "No",
          firm.cvUploaded ? "Yes" : "No",
          rating.averageRating.toFixed(1),
          rating.totalRatings,
        ].join(",")
      }),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `detailed-partners-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Detailed Partners</h1>
            <p className="text-muted-foreground">Loading detailed partner information...</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Detailed Partners</h1>
          <p className="text-muted-foreground">Comprehensive information about partner firms</p>
          {error && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">{error}</p>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToCSV} variant="outline" size="sm" disabled={filteredFirms.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={refreshData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Firms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{detailedFirms.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Global Firms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{detailedFirms.filter((f) => f.globalPresence).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Worked With Before</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{detailedFirms.filter((f) => f.workedWithPast).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Filtered Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredFirms.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters & Search</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search firms, contacts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Country HQ</Label>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {countries.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Global Presence</Label>
              <Select value={selectedGlobalPresence} onValueChange={setSelectedGlobalPresence}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="yes">Global</SelectItem>
                  <SelectItem value="no">Regional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Worked With Before</Label>
              <Select value={selectedWorkedWith} onValueChange={setSelectedWorkedWith}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Partner Firms Details</CardTitle>
          <CardDescription>Comprehensive information about {filteredFirms.length} partner firms</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredFirms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No partner firms found matching your criteria.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Firm Name</TableHead>
                    <TableHead>Country HQ</TableHead>
                    <TableHead>Presence</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Contact Info</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFirms.map((firm) => {
                    const rating = partnerRatings[firm.name] || { averageRating: 0, totalRatings: 0 }
                    return (
                      <TableRow key={firm.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{firm.name}</div>
                            {firm.yearFounded && (
                              <div className="text-xs text-muted-foreground">Founded: {firm.yearFounded}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{firm.countryHQ}</div>
                            {firm.regionalPresence && (
                              <div className="text-xs text-muted-foreground">Regional: {firm.regionalPresence}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={firm.globalPresence ? "default" : "secondary"}>
                            {firm.globalPresence ? "Global" : "Regional"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{firm.contactPersonName}</div>
                            {firm.designation && (
                              <div className="text-xs text-muted-foreground">{firm.designation}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {firm.email && (
                              <div className="flex items-center text-xs">
                                <Mail className="h-3 w-3 mr-1" />
                                <a href={`mailto:${firm.email}`} className="hover:underline">
                                  {firm.email}
                                </a>
                              </div>
                            )}
                            {firm.phone && (
                              <div className="flex items-center text-xs">
                                <Phone className="h-3 w-3 mr-1" />
                                {firm.phone}
                              </div>
                            )}
                            {firm.website && (
                              <div className="flex items-center text-xs">
                                <Globe className="h-3 w-3 mr-1" />
                                <a
                                  href={firm.website.startsWith("http") ? firm.website : `https://${firm.website}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline"
                                >
                                  Website
                                </a>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <StarRating rating={rating.averageRating} readonly size="sm" />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setRatingDialog({
                                  open: true,
                                  partnerName: firm.name,
                                  partnerType: "firm",
                                })
                              }
                              className="h-6 px-2 text-xs"
                            >
                              <Star className="h-3 w-3 mr-1" />
                              Rate
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant={firm.workedWithPast ? "default" : "outline"} className="text-xs">
                              {firm.workedWithPast ? "Worked With" : "New Partner"}
                            </Badge>
                            <Badge variant={firm.cvUploaded ? "default" : "outline"} className="text-xs">
                              {firm.cvUploaded ? "CV Available" : "No CV"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {firm.email && (
                              <Button size="sm" variant="ghost" asChild>
                                <a href={`mailto:${firm.email}`}>
                                  <Mail className="h-3 w-3" />
                                </a>
                              </Button>
                            )}
                            {firm.website && (
                              <Button size="sm" variant="ghost" asChild>
                                <a
                                  href={firm.website.startsWith("http") ? firm.website : `https://${firm.website}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Source Info */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Data Source Information</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <div>Source: {stats.source}</div>
            <div>Total Records: {stats.totalRecords}</div>
            <div>Last Modified: {new Date(stats.lastModified).toLocaleString()}</div>
            {stats.errorDetails && <div className="text-yellow-600">Note: {stats.errorDetails}</div>}
          </CardContent>
        </Card>
      )}

      <PartnerRatingDialog
        open={ratingDialog.open}
        onOpenChange={(open) => setRatingDialog((prev) => ({ ...prev, open }))}
        partnerName={ratingDialog.partnerName}
        partnerType={ratingDialog.partnerType}
        onRatingSubmitted={handleRatingSubmitted}
      />
    </div>
  )
}
