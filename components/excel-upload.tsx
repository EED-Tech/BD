"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { Upload, FileSpreadsheet, X, CheckCircle, AlertCircle, RefreshCw } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface FileMeta {
  name: string
  size: number
  sheets?: string[]
  eoiCount?: number
  proposalCount?: number
  partnerCount?: number
}

interface ExcelUploadProps {
  onDataLoaded: (data: any[], partners: any[], fileMeta: FileMeta) => void
  onError: (error: string) => void
  compact?: boolean
  currentFileName?: string | null
}

export function ExcelUpload({ onDataLoaded, onError, compact = false, currentFileName }: ExcelUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle")
  const [statusMessage, setStatusMessage] = useState("")

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const files = Array.from(e.dataTransfer.files)
      const excelFile = files.find(
        (file) =>
          file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
          file.type === "application/vnd.ms-excel" ||
          file.name.endsWith(".xlsx") ||
          file.name.endsWith(".xls")
      )
      if (excelFile) {
        handleFileUpload(excelFile)
      } else {
        onError("Please upload a valid Excel file (.xlsx or .xls)")
      }
    },
    [onError]
  )

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileUpload(file)
    // Reset input so the same file can be re-selected
    e.target.value = ""
  }, [])

  const handleFileUpload = async (file: File) => {
    setIsUploading(true)
    setUploadProgress(0)
    setUploadedFile(file)
    setUploadStatus("idle")

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) { clearInterval(progressInterval); return 90 }
          return prev + 10
        })
      }, 100)

      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/bd-data/upload", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`)

      const result = await response.json()

      if (result.success) {
        setUploadStatus("success")
        setStatusMessage(`Loaded ${result.data.length} BD records + ${(result.partners || []).length} partners from "${file.name}"`)
        onDataLoaded(result.data, result.partners || [], {
          name: file.name,
          size: file.size,
          sheets: result.stats?.sheets,
          eoiCount: result.stats?.eoiCount,
          proposalCount: result.stats?.proposalCount,
          partnerCount: result.stats?.partnerCount,
        })
      } else {
        throw new Error(result.error || "Failed to parse Excel file")
      }
    } catch (error) {
      setUploadStatus("error")
      const errorMessage = error instanceof Error ? error.message : "Upload failed"
      setStatusMessage(errorMessage)
      onError(errorMessage)
    } finally {
      setIsUploading(false)
    }
  }

  const clearUpload = () => {
    setUploadedFile(null)
    setUploadStatus("idle")
    setStatusMessage("")
    setUploadProgress(0)
  }

  // Compact mode: just a "Replace file" button shown in the header area
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileSelect}
          className="hidden"
          id="excel-upload-compact"
        />
        <label htmlFor="excel-upload-compact">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-[#6b7dd1] text-[#6b7dd1] hover:bg-[#6b7dd1]/10 cursor-pointer"
            disabled={isUploading}
          >
            <span>
              <RefreshCw className={`h-3 w-3 mr-1 ${isUploading ? "animate-spin" : ""}`} />
              {isUploading ? "Loading…" : "Load new file"}
            </span>
          </Button>
        </label>
        {uploadStatus === "success" && (
          <span className="text-xs text-green-600 dark:text-green-400">✓ Updated</span>
        )}
        {uploadStatus === "error" && (
          <span className="text-xs text-red-500 truncate max-w-[200px]">{statusMessage}</span>
        )}
      </div>
    )
  }

  // Full drop-zone mode (shown on first load when no data exists)
  return (
    <Card className="border-[#6b7dd1]/20 dark:border-[#6b7dd1]/20 dark:bg-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-[#383e80]" />
          Load BD Tracker Excel File
        </CardTitle>
        <CardDescription>
          Download the latest Excel from SharePoint, then drop or browse it here. No database needed — data loads
          directly from the file.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!uploadedFile ? (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver
                ? "border-[#383e80] bg-[#383e80]/5"
                : "border-gray-300 dark:border-gray-600 hover:border-[#383e80]/50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">Drop your Excel file here, or click to browse</p>
            <p className="text-sm text-gray-500 mb-4">Supports .xlsx and .xls files</p>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
              id="excel-upload"
            />
            <Button asChild className="bg-[#383e80] hover:bg-[#383e80]/90">
              <label htmlFor="excel-upload" className="cursor-pointer">
                Browse Files
              </label>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-[#383e80]" />
                <div>
                  <p className="font-medium">{uploadedFile.name}</p>
                  <p className="text-sm text-gray-500">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={clearUpload} disabled={isUploading}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Processing file…</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {uploadStatus === "success" && (
              <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">{statusMessage}</AlertDescription>
              </Alert>
            )}

            {uploadStatus === "error" && (
              <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 dark:text-red-200">{statusMessage}</AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
