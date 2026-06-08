import React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DollarSign,
  FileText,
  Globe,
  Target,
  Clock,
  TrendingUp,
  BarChart3,
  PieChartIcon,
  Building2,
  Users,
  Search,
  Award,
} from "lucide-react"
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts"

interface ReportContentProps {
  summaryData: {
    totalOpportunities: number
    rfpCount: number
    eoiCount: number
    totalBudget: string
    upcomingDeadlines: number
    countriesCount: number
    businessLines: string
    topCountries: string
    winRates: string
  }
  activeFilters: {
    quarter: string
    year: string
    bdCategory: string
    status: string
    country: string
    businessLines: string[]
    clientTypes: string[]
    bdTypes: string[]
    teamMembers: string[]
  }
  filteredData: {
    businessLineData: any[]
    clientTypeData: any[]
    bdTypeData: any[]
    quarterData: any[]
    originData: any[]
    serviceOfferingData: any[]
    rawData: any[]
    teamAssignmentData: any[]
    geoData: any[]
    winRateData: any[]
    statusData: any[]
    budgetData: any[]
  }
}

// CustomTooltip component for charts within the report
function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
        <p className="font-medium text-sm">{payload[0].name}</p>
        <p className="text-sm text-[#383e80]">Count: {payload[0].value}</p>
        {payload[0].payload.percentage && (
          <p className="text-xs text-gray-500">{payload[0].payload.percentage}% of total</p>
        )}
      </div>
    )
  }
  return null
}

export const ReportContent = React.forwardRef<HTMLDivElement, ReportContentProps>(
  ({ summaryData, activeFilters, filteredData }, ref) => {
    const COLORS = [
      "#383E80", // Primary brand color
      "#4B518C", // Secondary brand color
      "#7377A6", // Tertiary brand color
      "#9B9EBF", // Light brand color
      "#C3C5D8", // Lightest brand color
    ]

    return (
      <div
        ref={ref}
        className="p-8 bg-white text-gray-900 w-[8.5in] min-h-[11in] mx-auto shadow-lg"
        style={{ fontFamily: "sans-serif" }}
      >
        <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-200">
          <h1 className="text-3xl font-bold text-[#383E80]">Business Development Report</h1>
          <p className="text-sm text-gray-600">Generated on: {new Date().toLocaleDateString()}</p>
        </div>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-[#4B518C] mb-4">Summary Metrics</h2>
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-l-4 border-[#383E80] shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium text-gray-700">Total Opportunities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#383E80] flex items-center">
                  <Target className="mr-2 h-6 w-6 text-[#383E80]/80" />
                  {summaryData.totalOpportunities}
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-[#4B518C] shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium text-gray-700">RFP / EOI</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#4B518C] flex items-center">
                  <FileText className="mr-2 h-6 w-6 text-[#4B518C]/80" />
                  {summaryData.rfpCount} / {summaryData.eoiCount}
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-[#7377A6] shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium text-gray-700">Total Budget Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#7377A6] flex items-center">
                  <DollarSign className="mr-2 h-6 w-6 text-[#7377A6]/80" />
                  {summaryData.totalBudget}
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-[#9B9EBF] shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium text-gray-700">Countries Covered</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#9B9EBF] flex items-center">
                  <Globe className="mr-2 h-6 w-6 text-[#9B9EBF]/80" />
                  {summaryData.countriesCount}
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-[#C3C5D8] shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium text-gray-700">Upcoming Deadlines</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#C3C5D8] flex items-center">
                  <Clock className="mr-2 h-6 w-6 text-[#C3C5D8]/80" />
                  {summaryData.upcomingDeadlines}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-[#4B518C] mb-4">Key Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium text-gray-700 flex items-center">
                  <BarChart3 className="mr-2 h-5 w-5 text-gray-600" />
                  Business Line Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{summaryData.businessLines || "N/A"}</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium text-gray-700 flex items-center">
                  <Globe className="mr-2 h-5 w-5 text-gray-600" />
                  Top Countries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{summaryData.topCountries || "N/A"}</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium text-gray-700 flex items-center">
                  <TrendingUp className="mr-2 h-5 w-5 text-gray-600" />
                  Win Rates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{summaryData.winRates || "N/A"}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-[#4B518C] mb-4">Active Filters</h2>
          <div className="flex flex-wrap gap-2">
            {activeFilters.quarter !== "All Quarters" && (
              <Badge className="bg-[#7377A6] text-white">Quarter: {activeFilters.quarter}</Badge>
            )}
            {activeFilters.year !== "All Years" && (
              <Badge className="bg-[#7377A6] text-white">Year: {activeFilters.year}</Badge>
            )}
            {activeFilters.bdCategory !== "All" && (
              <Badge className="bg-[#7377A6] text-white">BD Category: {activeFilters.bdCategory}</Badge>
            )}
            {activeFilters.status !== "All" && (
              <Badge className="bg-[#7377A6] text-white">Status: {activeFilters.status}</Badge>
            )}
            {activeFilters.country !== "All" && (
              <Badge className="bg-[#7377A6] text-white">Country: {activeFilters.country}</Badge>
            )}
            {activeFilters.businessLines.length > 0 && (
              <Badge className="bg-[#7377A6] text-white">
                Business Lines: {activeFilters.businessLines.join(", ")}
              </Badge>
            )}
            {activeFilters.clientTypes.length > 0 && (
              <Badge className="bg-[#7377A6] text-white">Client Types: {activeFilters.clientTypes.join(", ")}</Badge>
            )}
            {activeFilters.bdTypes.length > 0 && (
              <Badge className="bg-[#7377A6] text-white">BD Types: {activeFilters.bdTypes.join(", ")}</Badge>
            )}
            {activeFilters.teamMembers.length > 0 && (
              <Badge className="bg-[#7377A6] text-white">Team Members: {activeFilters.teamMembers.join(", ")}</Badge>
            )}
            {Object.values(activeFilters).every((filter) =>
              Array.isArray(filter)
                ? filter.length === 0
                : filter === "All" || filter === "All Quarters" || filter === "All Years",
            ) && <p className="text-gray-600">No active filters applied.</p>}
          </div>
        </section>

        <section className="mb-8 break-before-page">
          <h2 className="text-2xl font-semibold text-[#4B518C] mb-4">Dashboard Visualizations</h2>
          <div className="grid grid-cols-1 gap-6">
            {/* Business Line Distribution */}
            <Card className="shadow-sm" style={{ breakInside: "avoid", pageBreakInside: "avoid !important" }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium text-gray-700 flex items-center">
                  <PieChartIcon className="mr-2 h-5 w-5 text-gray-600" />
                  Business Line Distribution
                </CardTitle>
                <CardDescription className="text-gray-600">Breakdown of opportunities by business line</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[300px]">
                  {filteredData.businessLineData && filteredData.businessLineData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={filteredData.businessLineData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percentage }) =>
                            `${name.length > 15 ? `${name.slice(0, 15)}...` : name}: ${percentage}%`
                          }
                        >
                          {filteredData.businessLineData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip active={true} payload={[]} />} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">No data available</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Client Type Distribution */}
            <Card className="shadow-sm" style={{ breakInside: "avoid", pageBreakInside: "avoid !important" }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium text-gray-700 flex items-center">
                  <Building2 className="mr-2 h-5 w-5 text-gray-600" />
                  Client Type Distribution
                </CardTitle>
                <CardDescription className="text-gray-600">Breakdown of opportunities by client type</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[300px]">
                  {filteredData.clientTypeData && filteredData.clientTypeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={filteredData.clientTypeData}
                        layout="vertical"
                        margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                      >
                        <XAxis type="number" hide tickFormatter={(value) => Math.round(value).toString()} />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={120}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => (value.length > 20 ? `${value.slice(0, 20)}...` : value)}
                        />
                        <Tooltip content={<CustomTooltip active={true} payload={[]} />} />
                        <Bar dataKey="value" fill={COLORS[1]} radius={4} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">No data available</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Origin of BD */}
            <Card className="shadow-sm" style={{ breakInside: "avoid", pageBreakInside: "avoid !important" }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium text-gray-700 flex items-center">
                  <Search className="mr-2 h-5 w-5 text-gray-600" />
                  Origin of BD
                </CardTitle>
                <CardDescription className="text-gray-600">How opportunities are sourced</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[300px]">
                  {filteredData.originData && filteredData.originData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={filteredData.originData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percentage }) =>
                            `${name.length > 12 ? `${name.slice(0, 12)}...` : name}: ${percentage}%`
                          }
                        >
                          {filteredData.originData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip active={true} payload={[]} />} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">No data available</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Status Distribution */}
            <Card className="shadow-sm" style={{ breakInside: "avoid", pageBreakInside: "avoid !important" }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium text-gray-700 flex items-center">
                  <Award className="mr-2 h-5 w-5 text-gray-600" />
                  Status Distribution
                </CardTitle>
                <CardDescription className="text-gray-600">Current status of all opportunities</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[300px]">
                  {filteredData.statusData && filteredData.statusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={filteredData.statusData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percentage }) =>
                            `${name.length > 12 ? `${name.slice(0, 12)}...` : name}: ${percentage}%`
                          }
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
                        <Tooltip content={<CustomTooltip active={true} payload={[]} />} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">No data available</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Role Assignment Distribution */}
            <Card className="shadow-sm" style={{ breakInside: "avoid", pageBreakInside: "avoid !important" }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium text-gray-700 flex items-center">
                  <Users className="mr-2 h-5 w-5 text-gray-600" />
                  Role Assignment Distribution
                </CardTitle>
                <CardDescription className="text-gray-600">Number of assignments by role type</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[300px]">
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
                          width={120}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => (value.length > 20 ? `${value.slice(0, 20)}...` : value)}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload
                              const contributors = Object.entries(data.members || {}).sort(
                                ([, countA], [, countB]) => countB - countA,
                              )
                              return (
                                <div className="bg-white p-3 border rounded shadow-lg">
                                  <p className="font-medium">{data.role}</p>
                                  <p className="text-sm">Total Assignments: {data.count}</p>
                                  <p className="text-sm">Unique Members: {data.uniqueMembers}</p>
                                  {contributors.length > 0 && (
                                    <div className="mt-2">
                                      <p className="text-sm font-medium">Assignments per Member:</p>
                                      <p className="text-xs text-gray-700">
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
                    <div className="h-full flex items-center justify-center text-gray-500">No data available</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Win Rate by Business Line */}
            <Card className="shadow-sm" style={{ breakInside: "avoid", pageBreakInside: "avoid !important" }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium text-gray-700 flex items-center">
                  <TrendingUp className="mr-2 h-5 w-5 text-gray-600" />
                  Win Rate by Business Line
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Success rate across different business lines
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[300px]">
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
                          fontSize={12}
                          tickFormatter={(value) => (value.length > 15 ? `${value.slice(0, 15)}...` : value)}
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
                                <div className="bg-white p-3 border rounded shadow-lg">
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
                    <div className="h-full flex items-center justify-center text-gray-500">No data available</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Top Countries by Opportunities */}
            <Card className="shadow-sm" style={{ breakInside: "avoid", pageBreakInside: "avoid !important" }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium text-gray-700 flex items-center">
                  <Globe className="mr-2 h-5 w-5 text-gray-600" />
                  Top Countries by Opportunities
                </CardTitle>
                <CardDescription className="text-gray-600">Countries with most BD opportunities</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[300px]">
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
                          width={120}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => (value.length > 15 ? `${value.slice(0, 15)}...` : value)}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-white p-2 border rounded shadow-sm">
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
                    <div className="h-full flex items-center justify-center text-gray-500">No data available</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <footer className="mt-12 pt-4 border-t border-gray-200 text-center text-sm text-gray-500">
          Business Development Dashboard Report &copy; {new Date().getFullYear()}
        </footer>
      </div>
    )
  },
)

ReportContent.displayName = "ReportContent"
