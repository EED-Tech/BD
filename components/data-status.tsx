"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Database, FileSpreadsheet, AlertCircle, CheckCircle, Clock } from "lucide-react"
import type { ExcelStats } from "@/hooks/use-supabase-excel-data"

interface DataStatusProps {
  isConnected: boolean
  lastUpdated: string | null
  stats: ExcelStats | null
  onRefresh: () => void
  loading: boolean
  error: string | null
}

export function DataStatus({ isConnected, lastUpdated, stats, onRefresh, loading, error }: DataStatusProps) {
  const getStatusIcon = () => {
    if (loading) return <Clock className="h-4 w-4 animate-spin" />
    if (error) return <AlertCircle className="h-4 w-4 text-red-500" />
    if (isConnected) return <CheckCircle className="h-4 w-4 text-green-500" />
    return <AlertCircle className="h-4 w-4 text-yellow-500" />
  }

  const getStatusText = () => {
    if (loading) return "Loading data..."
    if (error) return "Connection error"
    if (isConnected) return "Connected"
    return "Disconnected"
  }

  const getSourceIcon = () => {
    if (stats?.source === "database") return <Database className="h-4 w-4" />
    if (stats?.source === "excel") return <FileSpreadsheet className="h-4 w-4" />
    return <FileSpreadsheet className="h-4 w-4" />
  }

  return (
    <Card className="border-[#6b7dd1]/20 dark:border-[#6b7dd1]/20 dark:bg-gray-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <CardTitle className="text-base">Data Connection Status</CardTitle>
          </div>
          <Button
            onClick={onRefresh}
            disabled={loading}
            variant="outline"
            size="sm"
            className="border-[#6b7dd1] text-[#6b7dd1] hover:bg-[#6b7dd1]/10 bg-transparent"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
        <CardDescription>{getStatusText()}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status:</span>
            <Badge variant={isConnected ? "default" : "destructive"} className="bg-[#383e80]">
              {isConnected ? "Online" : "Offline"}
            </Badge>
          </div>

          {stats && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Source:</span>
                <div className="flex items-center gap-1">
                  {getSourceIcon()}
                  <Badge variant="outline" className="border-[#6b7dd1] text-[#6b7dd1]">
                    {stats.source === "database" ? "Database" : "Excel File"}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Records:</span>
                <Badge variant="outline" className="border-[#6b7dd1] text-[#6b7dd1]">
                  {stats.totalRecords}
                </Badge>
              </div>
            </>
          )}

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Last Updated:</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : "Never"}
            </span>
          </div>
        </div>

        {stats?.eoiCount !== undefined && stats?.proposalCount !== undefined && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-md">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-purple-700 dark:text-purple-400">EOI</span>
                <Badge className="bg-purple-500">{stats.eoiCount}</Badge>
              </div>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Proposals & RFPs</span>
                <Badge className="bg-blue-500">{stats.proposalCount}</Badge>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-red-700 dark:text-red-400">Error Details:</span>
            </div>
            <p className="text-sm text-red-600 dark:text-red-300 mt-1">{error}</p>
          </div>
        )}

        {stats?.source === "excel" && stats.fileSize && (
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Excel File Info:</span>
            </div>
            <div className="text-sm text-blue-600 dark:text-blue-300 mt-1">
              <p>File size: {(stats.fileSize / 1024).toFixed(1)} KB</p>
              {stats.sheets && <p>Sheets: {stats.sheets.join(", ")}</p>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
