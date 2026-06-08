"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Users,
  Building2,
  Globe,
  MapPin,
  Briefcase,
  RefreshCw,
  Search,
  Filter,
  Star,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { StarRating } from "./star-rating"
import { PartnerRatingDialog, loadRatings, getPartnerRatingSummary } from "./partner-rating-dialog"
import dynamic from "next/dynamic"

// Dynamically import the Leaflet map component
const LeafletPartnersMap = dynamic(() => import("./leaflet-partners-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] w-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6b7dd1] mx-auto mb-2"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading partners map...</p>
      </div>
    </div>
  ),
})

interface PartnerRating {
  partner_name: string
  partner_type: string
  average_rating: number
  total_ratings: number
  recent_comments?: Array<{
    rating: number
    comment: string
    rated_by: string
    created_at: string
  }>
}

interface Partner {
  id: string
  name: string
  country: string
  sector: string
  expertise: string
  type: "firm" | "individual"
  latitude?: number
  longitude?: number
  contactPerson?: string
  designation?: string
  email?: string
  phone?: string
  website?: string
}

export default function PartnersMapComponent({ partners: partnersProp = [] }: { partners?: any[] }) {
  const [activeTab, setActiveTab] = useState("map")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCountry, setSelectedCountry] = useState<string>("all")
  const [selectedSector, setSelectedSector] = useState<string>("all")
  const [selectedExpertise, setSelectedExpertise] = useState<string>("all")
  const [partnerRatings, setPartnerRatings] = useState<Record<string, PartnerRating>>({})
  const [selectedPartner, setSelectedPartner] = useState<any>(null)
  const [isRatingDialogOpen, setIsRatingDialogOpen] = useState(false)
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set())
  const [allPartners, setAllPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Use partners passed in as a prop (from uploaded Excel)
  useEffect(() => {
    setLoading(true)
    try {
      const mapped: Partner[] = (partnersProp || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        country: p.country || "",
        sector: p.sector || "",
        expertise: p.expertise || "",
        type: p.type as "firm" | "individual",
        email: p.email || "",
        phone: p.phone || "",
        website: p.website || "",
        contactPerson: p.contact_person || "",
        designation: p.designation || "",
      }))
      setAllPartners(mapped)
      setError(null)
    } catch (err) {
      setError("Failed to read partners data")
    } finally {
      setLoading(false)
    }
  }, [partnersProp])

  const handleRatePartner = (partner: any) => {
    setSelectedPartner(partner)
    setIsRatingDialogOpen(true)
  }

  const handleRatingSubmitted = () => {
    // Rebuild ratings map from localStorage after a new rating is saved
    const all = loadRatings()
    const map: Record<string, any> = {}
    all.forEach((r) => {
      const key = `${r.partner_name}_${r.partner_type}`
      if (!map[key]) {
        map[key] = { average_rating: 0, total_ratings: 0, recent_comments: [] }
      }
      map[key].recent_comments.push({
        rating: r.rating,
        comment: r.comment,
        rated_by: r.rated_by,
        created_at: r.created_at,
      })
      map[key].total_ratings += 1
    })
    // Calculate averages
    Object.keys(map).forEach((key) => {
      const comments = map[key].recent_comments
      map[key].average_rating =
        Math.round((comments.reduce((s: number, c: any) => s + c.rating, 0) / comments.length) * 10) / 10
      map[key].recent_comments = comments.slice(-5).reverse()
    })
    setPartnerRatings(map)
  }

  // Load ratings from localStorage on mount
  useEffect(() => {
    handleRatingSubmitted()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Add toggleReviews function
  const toggleReviews = (partnerId: string) => {
    const newExpanded = new Set(expandedReviews)
    if (newExpanded.has(partnerId)) {
      newExpanded.delete(partnerId)
    } else {
      newExpanded.add(partnerId)
    }
    setExpandedReviews(newExpanded)
  }

  // Get unique values for filters
  const uniqueCountries = useMemo(() => {
    const countries = [...new Set(allPartners.map((p) => p.country).filter(Boolean))]
    return countries.sort()
  }, [allPartners])

  const uniqueSectors = useMemo(() => {
    const sectors = [...new Set(allPartners.map((p) => p.sector).filter(Boolean))]
    return sectors.sort()
  }, [allPartners])

  const uniqueExpertise = useMemo(() => {
    const expertise = [
      ...new Set(
        allPartners
          .map((p) => p.expertise)
          .filter(Boolean)
          .flatMap((exp) => exp.split(",").map((e) => e.trim()))
          .filter(Boolean),
      ),
    ]
    return expertise.sort()
  }, [allPartners])

  // Filter partners based on search and filters (without tab filtering)
  const baseFilteredPartners = useMemo(() => {
    let filtered = allPartners

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.country.toLowerCase().includes(searchLower) ||
          p.expertise.toLowerCase().includes(searchLower) ||
          p.sector.toLowerCase().includes(searchLower),
      )
    }

    // Filter by country
    if (selectedCountry !== "all") {
      filtered = filtered.filter((p) => p.country === selectedCountry)
    }

    // Filter by sector
    if (selectedSector !== "all") {
      filtered = filtered.filter((p) => p.sector === selectedSector)
    }

    // Filter by expertise
    if (selectedExpertise !== "all") {
      filtered = filtered.filter((p) => p.expertise.toLowerCase().includes(selectedExpertise.toLowerCase()))
    }

    return filtered
  }, [allPartners, searchTerm, selectedCountry, selectedSector, selectedExpertise])

  // Apply tab filtering on top of base filters
  const filteredPartners = useMemo(() => {
    let filtered = baseFilteredPartners

    // Filter by tab (type)
    if (activeTab === "firms") {
      filtered = filtered.filter((p) => p.type === "firm")
    } else if (activeTab === "experts") {
      filtered = filtered.filter((p) => p.type === "individual")
    }

    return filtered
  }, [baseFilteredPartners, activeTab])

  // Country statistics
  const countryStats = useMemo(() => {
    const stats = filteredPartners.reduce(
      (acc, partner) => {
        if (partner.country) {
          if (!acc[partner.country]) {
            acc[partner.country] = { firms: 0, individuals: 0, total: 0 }
          }
          if (partner.type === "firm") {
            acc[partner.country].firms++
          } else {
            acc[partner.country].individuals++
          }
          acc[partner.country].total++
        }
        return acc
      },
      {} as Record<string, { firms: number; individuals: number; total: number }>,
    )

    return Object.entries(stats)
      .sort(([, a], [, b]) => b.total - a.total)
      .slice(0, 10)
  }, [filteredPartners])

  // Tab counts based on base filtered partners (without tab filtering)
  const tabCounts = useMemo(() => {
    const totalCount = baseFilteredPartners.length
    const firmsCount = baseFilteredPartners.filter((p) => p.type === "firm").length
    const expertsCount = baseFilteredPartners.filter((p) => p.type === "individual").length
    const countriesCount = [...new Set(baseFilteredPartners.map((p) => p.country).filter(Boolean))].length

    return {
      total: totalCount,
      firms: firmsCount,
      experts: expertsCount,
      countries: countriesCount,
    }
  }, [baseFilteredPartners])

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("")
    setSelectedCountry("all")
    setSelectedSector("all")
    setSelectedExpertise("all")
  }

  // Check if any filters are active
  const hasActiveFilters =
    searchTerm || selectedCountry !== "all" || selectedSector !== "all" || selectedExpertise !== "all"

  const getPartnerRating = (partner: any) => {
    const key = `${partner.name}_${partner.type}`
    return partnerRatings[key] || { average_rating: 0, total_ratings: 0, recent_comments: [] }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="border-[#6b7dd1]/20 dark:border-[#6b7dd1]/20 dark:bg-gray-800">
          <CardContent className="h-[200px] flex items-center justify-center">
            <p className="text-gray-500">Loading partners…</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!partnersProp || partnersProp.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="border-[#6b7dd1]/20 dark:border-[#6b7dd1]/20 dark:bg-gray-800">
          <CardContent className="h-[200px] flex items-center justify-center text-center">
            <div>
              <Users className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-medium">No partners data loaded</p>
              <p className="text-sm text-gray-400 mt-1">Upload your Excel file to see partners from the <strong>Partners Firms</strong> and <strong>Partners Individual Experts</strong> sheets.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Partners Network</h1>
          <p className="text-muted-foreground">Global network of partner firms and individual experts</p>
        </div>
        <Button onClick={() => window.location.reload()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[#383e80] text-white border-none shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-white/70">Total Partners</CardDescription>
            <CardTitle className="text-3xl text-white flex items-center">
              <Users className="mr-2 h-6 w-6 text-white/80" />
              {tabCounts.total}
              {hasActiveFilters && <span className="text-lg ml-1">/{allPartners.length}</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-white/70">
              {tabCounts.firms} firms, {tabCounts.experts} individual experts
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#383e80] text-white border-none shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-white/70">Partner Firms</CardDescription>
            <CardTitle className="text-3xl text-white flex items-center">
              <Building2 className="mr-2 h-6 w-6 text-white/80" />
              {tabCounts.firms}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-white/70">Organizations and consulting firms</div>
          </CardContent>
        </Card>

        <Card className="bg-[#383e80] text-white border-none shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-white/70">Individual Experts</CardDescription>
            <CardTitle className="text-3xl text-white flex items-center">
              <Briefcase className="mr-2 h-6 w-6 text-white/80" />
              {tabCounts.experts}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-white/70">Independent consultants and specialists</div>
          </CardContent>
        </Card>

        <Card className="bg-[#383e80] text-white border-none shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-white/70">Countries Covered</CardDescription>
            <CardTitle className="text-3xl text-white flex items-center">
              <Globe className="mr-2 h-6 w-6 text-white/80" />
              {tabCounts.countries}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-white/70">Global network coverage</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="border-[#6b7dd1]/20 dark:border-[#6b7dd1]/20 dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-5 w-5 text-[#383e80]" />
            Search & Filters
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2">
                {
                  [searchTerm, selectedCountry !== "all", selectedSector !== "all", selectedExpertise !== "all"].filter(
                    Boolean,
                  ).length
                }{" "}
                active
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center justify-between">
            <CardDescription>Search and filter partners by name, country, sector, or expertise</CardDescription>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters} className="ml-4 bg-transparent">
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search Input */}
            <div className="space-y-2">
              <Label htmlFor="search">Search Partners</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name, country, expertise..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Country Filter */}
            <div className="space-y-2">
              <Label>Country</Label>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries ({uniqueCountries.length})</SelectItem>
                  {uniqueCountries.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country} ({allPartners.filter((p) => p.country === country).length})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sector Filter */}
            <div className="space-y-2">
              <Label>Sector</Label>
              <Select value={selectedSector} onValueChange={setSelectedSector}>
                <SelectTrigger>
                  <SelectValue placeholder="All Sectors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sectors ({uniqueSectors.length})</SelectItem>
                  {uniqueSectors.map((sector) => (
                    <SelectItem key={sector} value={sector}>
                      {sector} ({allPartners.filter((p) => p.sector === sector).length})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Expertise Filter */}
            <div className="space-y-2">
              <Label>Expertise</Label>
              <Select value={selectedExpertise} onValueChange={setSelectedExpertise}>
                <SelectTrigger>
                  <SelectValue placeholder="All Expertise" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Expertise ({uniqueExpertise.length})</SelectItem>
                  {uniqueExpertise.map((expertise) => (
                    <SelectItem key={expertise} value={expertise}>
                      {expertise} (
                      {allPartners.filter((p) => p.expertise.toLowerCase().includes(expertise.toLowerCase())).length})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Results Summary */}
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing <strong>{tabCounts.total}</strong> of <strong>{allPartners.length}</strong> partners across{" "}
              <strong>{tabCounts.countries}</strong> countries
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full bg-[#6b7dd1] text-white">
          <TabsTrigger
            value="map"
            className="data-[state=active]:bg-[#4f5490] data-[state=active]:text-white text-white/70 hover:text-white"
          >
            <MapPin className="mr-2 h-4 w-4" />
            World Map ({tabCounts.countries} countries)
          </TabsTrigger>
          <TabsTrigger
            value="firms"
            className="data-[state=active]:bg-[#4f5490] data-[state=active]:text-white text-white/70 hover:text-white"
          >
            <Building2 className="mr-2 h-4 w-4" />
            Firms ({tabCounts.firms})
          </TabsTrigger>
          <TabsTrigger
            value="experts"
            className="data-[state=active]:bg-[#4f5490] data-[state=active]:text-white text-white/70 hover:text-white"
          >
            <Users className="mr-2 h-4 w-4" />
            Experts ({tabCounts.experts})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="space-y-4">
          <Card className="border-[#6b7dd1]/20 dark:border-[#6b7dd1]/20 dark:bg-gray-800 overflow-hidden shadow-md">
            <CardHeader className="bg-[#4B518C] text-white">
              <CardTitle className="text-white flex items-center">
                <MapPin className="mr-2 h-5 w-5" />
                Global Partners Distribution
              </CardTitle>
              <CardDescription className="text-white/80">
                Interactive world map showing {tabCounts.total} partners across {tabCounts.countries} countries
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 bg-white dark:bg-gray-800">
              <LeafletPartnersMap partners={baseFilteredPartners} />
            </CardContent>
          </Card>

          {/* Country Statistics */}
          {countryStats.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-[#6b7dd1]/20 dark:border-[#6b7dd1]/20 dark:bg-gray-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-[#383e80]" />
                    Top Countries by Partners
                  </CardTitle>
                  <CardDescription>Countries with the most partners in current selection</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {countryStats.map(([country, stats]) => (
                      <div
                        key={country}
                        className="flex justify-between items-center p-2 rounded-lg bg-gray-50 dark:bg-gray-900"
                      >
                        <div>
                          <span className="font-medium">{country}</span>
                          <div className="text-xs text-gray-500">
                            {stats.firms} firms, {stats.individuals} experts
                          </div>
                        </div>
                        <Badge variant="secondary" className="font-bold">
                          {stats.total}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[#6b7dd1]/20 dark:border-[#6b7dd1]/20 dark:bg-gray-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-[#383e80]" />
                    Top Expertise Areas
                  </CardTitle>
                  <CardDescription>Most common expertise areas in current selection</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {uniqueExpertise
                      .map((expertise) => ({
                        expertise,
                        count: baseFilteredPartners.filter((p) =>
                          p.expertise.toLowerCase().includes(expertise.toLowerCase()),
                        ).length,
                      }))
                      .sort((a, b) => b.count - a.count)
                      .slice(0, 8)
                      .map(({ expertise, count }) => (
                        <div key={expertise} className="flex justify-between items-center">
                          <span className="text-sm">{expertise}</span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="firms" className="space-y-4">
          <Card className="border-[#6b7dd1]/20 dark:border-[#6b7dd1]/20 dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#383e80]" />
                Partner Firms Directory
              </CardTitle>
              <CardDescription>
                {filteredPartners.filter((p) => p.type === "firm").length} partner firms in current selection
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredPartners.filter((p) => p.type === "firm").length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPartners
                    .filter((p) => p.type === "firm")
                    .map((firm) => {
                      const rating = getPartnerRating(firm)
                      // Check if reviews are expanded for this partner
                      const isExpanded = expandedReviews.has(firm.id)
                      return (
                        <Card
                          key={firm.id}
                          className="border border-[#6b7dd1]/20 bg-[#6b7dd1]/5 dark:border-[#6b7dd1]/20 dark:bg-gray-800"
                        >
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <CardTitle className="text-lg">{firm.name}</CardTitle>
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                  <MapPin className="h-4 w-4" />
                                  {firm.country}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-1">
                                  <StarRating rating={rating.average_rating} size="sm" />
                                  <span className="text-xs text-gray-500">({rating.total_ratings})</span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRatePartner(firm)}
                                  className="text-xs h-6 px-2"
                                >
                                  <Star className="h-3 w-3 mr-1" />
                                  Rate
                                </Button>
                              </div>
                            </div>

                            {rating.recent_comments && rating.recent_comments.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleReviews(firm.id)}
                                  className="w-full justify-between p-2 h-auto text-sm font-medium text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950"
                                >
                                  <span>Recent Reviews ({rating.recent_comments.length})</span>
                                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </Button>

                                {isExpanded && (
                                  <div className="mt-2 space-y-2">
                                    {rating.recent_comments.map((review, index) => (
                                      <div key={index} className="bg-gray-50 dark:bg-gray-900 p-3 rounded text-xs">
                                        <div className="flex items-center gap-1 mb-1">
                                          <StarRating rating={review.rating} size="xs" showRating={false} />
                                          <span className="text-gray-500">
                                            by {review.rated_by} • {new Date(review.created_at).toLocaleDateString()}
                                          </span>
                                        </div>
                                        {review.comment && (
                                          <p className="text-gray-600 dark:text-gray-400 italic">"{review.comment}"</p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex items-center gap-2 pt-2">
                              {firm.globalPresence && (
                                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                                  Global
                                </Badge>
                              )}
                              {firm.workedWithBefore && (
                                <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                                  Past Work
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2 pt-0">
                            {firm.sector && (
                              <div>
                                <span className="text-sm font-medium">Sector:</span>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{firm.sector}</p>
                              </div>
                            )}
                            {firm.expertise && (
                              <div>
                                <span className="text-sm font-medium">Expertise:</span>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{firm.expertise}</p>
                              </div>
                            )}

                            {/* Contact Information */}
                            {(firm.email || firm.phone || firm.website) && (
                              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                  Contact Information:
                                </span>
                                <div className="mt-1 space-y-1">
                                  {firm.email && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-gray-500">📧</span>
                                      <span className="text-xs text-gray-600 dark:text-gray-400">{firm.email}</span>
                                    </div>
                                  )}
                                  {firm.phone && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-gray-500">📞</span>
                                      <span className="text-xs text-gray-600 dark:text-gray-400">{firm.phone}</span>
                                    </div>
                                  )}
                                  {firm.website && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-gray-500">🌐</span>
                                      <a
                                        href={
                                          firm.website.startsWith("http") ? firm.website : `https://${firm.website}`
                                        }
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 hover:underline"
                                      >
                                        {firm.website}
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Additional Business Information */}
                            {(firm.contactPerson || firm.yearFounded || firm.employeeCount) && (
                              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                                  Business Details:
                                </span>
                                <div className="mt-1 space-y-1">
                                  {firm.contactPerson && (
                                    <div className="text-xs">
                                      <span className="text-gray-500">Contact Person:</span>
                                      <span className="ml-1 text-gray-600 dark:text-gray-400">
                                        {firm.contactPerson}
                                        {firm.designation && ` (${firm.designation})`}
                                      </span>
                                    </div>
                                  )}
                                  {firm.yearFounded && (
                                    <div className="text-xs">
                                      <span className="text-gray-500">Founded:</span>
                                      <span className="ml-1 text-gray-600 dark:text-gray-400">{firm.yearFounded}</span>
                                    </div>
                                  )}
                                  {firm.employeeCount && (
                                    <div className="text-xs">
                                      <span className="text-gray-500">Employees:</span>
                                      <span className="ml-1 text-gray-600 dark:text-gray-400">
                                        {firm.employeeCount}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-gray-500">
                    {hasActiveFilters
                      ? "No partner firms match your current filters"
                      : "No partner firms data available"}
                  </p>
                  <p className="text-sm text-gray-400">
                    {hasActiveFilters ? (
                      <Button variant="link" onClick={clearFilters} className="p-0 h-auto">
                        Clear filters to see all firms
                      </Button>
                    ) : (
                      'Check the "Partners Firms" sheet in your Excel file'
                    )}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="experts" className="space-y-4">
          <Card className="border-[#6b7dd1]/20 dark:border-[#6b7dd1]/20 dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-5 w-5 text-[#383e80]" />
                Individual Experts Directory
              </CardTitle>
              <CardDescription>
                {filteredPartners.filter((p) => p.type === "individual").length} individual experts in current selection
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredPartners.filter((p) => p.type === "individual").length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPartners
                    .filter((p) => p.type === "individual")
                    .map((expert) => {
                      const rating = getPartnerRating(expert)
                      // Check if reviews are expanded for this partner
                      const isExpanded = expandedReviews.has(expert.id)
                      return (
                        <Card
                          key={expert.id}
                          className="border border-[#6b7dd1]/20 bg-[#6b7dd1]/5 dark:border-[#6b7dd1]/20 dark:bg-gray-800"
                        >
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <CardTitle className="text-lg">{expert.name}</CardTitle>
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                  <MapPin className="h-4 w-4" />
                                  {expert.country}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-1">
                                  <StarRating rating={rating.average_rating} size="sm" />
                                  <span className="text-xs text-gray-500">({rating.total_ratings})</span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRatePartner(expert)}
                                  className="text-xs h-6 px-2"
                                >
                                  <Star className="h-3 w-3 mr-1" />
                                  Rate
                                </Button>
                              </div>
                            </div>

                            {rating.recent_comments && rating.recent_comments.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleReviews(expert.id)}
                                  className="w-full justify-between p-2 h-auto text-sm font-medium text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950"
                                >
                                  <span>Recent Reviews ({rating.recent_comments.length})</span>
                                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </Button>

                                {isExpanded && (
                                  <div className="mt-2 space-y-2">
                                    {rating.recent_comments.map((review, index) => (
                                      <div key={index} className="bg-gray-50 dark:bg-gray-900 p-3 rounded text-xs">
                                        <div className="flex items-center gap-1 mb-1">
                                          <StarRating rating={review.rating} size="xs" showRating={false} />
                                          <span className="text-gray-500">
                                            by {review.rated_by} • {new Date(review.created_at).toLocaleDateString()}
                                          </span>
                                        </div>
                                        {review.comment && (
                                          <p className="text-gray-600 dark:text-gray-400 italic">"{review.comment}"</p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex items-center gap-2 pt-2">
                              {expert.availability && (
                                <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                                  {expert.availability}
                                </Badge>
                              )}
                              {expert.workedWithBefore && (
                                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                                  Past Work
                                </Badge>
                              )}
                              {expert.rating && (
                                <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                                  ⭐ {expert.rating}
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2 pt-0">
                            {expert.title && (
                              <div>
                                <span className="text-sm font-medium">Title:</span>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{expert.title}</p>
                              </div>
                            )}
                            {expert.sector && (
                              <div>
                                <span className="text-sm font-medium">Sector:</span>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{expert.sector}</p>
                              </div>
                            )}
                            {expert.expertise && (
                              <div>
                                <span className="text-sm font-medium">Expertise:</span>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{expert.expertise}</p>
                              </div>
                            )}

                            {/* Contact Information */}
                            {(expert.email || expert.phone || expert.website || expert.linkedIn) && (
                              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                  Contact Information:
                                </span>
                                <div className="mt-1 space-y-1">
                                  {expert.email && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-gray-500">📧</span>
                                      <span className="text-xs text-gray-600 dark:text-gray-400">{expert.email}</span>
                                    </div>
                                  )}
                                  {expert.phone && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-gray-500">📞</span>
                                      <span className="text-xs text-gray-600 dark:text-gray-400">{expert.phone}</span>
                                    </div>
                                  )}
                                  {expert.website && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-gray-500">🌐</span>
                                      <a
                                        href={
                                          expert.website.startsWith("http")
                                            ? expert.website
                                            : `https://${expert.website}`
                                        }
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 hover:underline"
                                      >
                                        {expert.website}
                                      </a>
                                    </div>
                                  )}
                                  {expert.linkedIn && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-gray-500">💼</span>
                                      <a
                                        href={
                                          expert.linkedIn.startsWith("http")
                                            ? expert.linkedIn
                                            : `https://${expert.linkedIn}`
                                        }
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 hover:underline"
                                      >
                                        LinkedIn
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Professional Information */}
                            {(expert.education || expert.experience || expert.languages || expert.hourlyRate) && (
                              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                                  Professional Details:
                                </span>
                                <div className="mt-1 space-y-1">
                                  {expert.education && (
                                    <div className="text-xs">
                                      <span className="text-gray-500">Education:</span>
                                      <span className="ml-1 text-gray-600 dark:text-gray-400">{expert.education}</span>
                                    </div>
                                  )}
                                  {expert.experience && (
                                    <div className="text-xs">
                                      <span className="text-gray-500">Experience:</span>
                                      <span className="ml-1 text-gray-600 dark:text-gray-400">{expert.experience}</span>
                                    </div>
                                  )}
                                  {expert.languages && (
                                    <div className="text-xs">
                                      <span className="text-gray-500">Languages:</span>
                                      <span className="ml-1 text-gray-600 dark:text-gray-400">{expert.languages}</span>
                                    </div>
                                  )}
                                  {expert.hourlyRate && (
                                    <div className="text-xs">
                                      <span className="text-gray-500">Rate:</span>
                                      <span className="ml-1 text-gray-600 dark:text-gray-400">
                                        {expert.hourlyRate}
                                        {expert.currency && ` ${expert.currency}`}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-gray-500">
                    {hasActiveFilters
                      ? "No individual experts match your current filters"
                      : "No individual experts data available"}
                  </p>
                  <p className="text-sm text-gray-400">
                    {hasActiveFilters ? (
                      <Button variant="link" onClick={clearFilters} className="p-0 h-auto">
                        Clear filters to see all experts
                      </Button>
                    ) : (
                      'Check the "Partners Individual Experts" sheet in your Excel file'
                    )}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>



      <PartnerRatingDialog
        partner={selectedPartner}
        isOpen={isRatingDialogOpen}
        onClose={() => setIsRatingDialogOpen(false)}
        onRatingSubmitted={handleRatingSubmitted}
      />
    </div>
  )
}
