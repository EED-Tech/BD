import { NextResponse } from "next/server"
import { supabase, hasSupabaseCredentials, BUCKET_NAME, FILE_NAME } from "@/lib/supabase-client"

export async function GET() {
  try {
    console.log("[Supabase Debug] Starting debug check...")

    const response = {
      credentials: {
        hasSupabaseCredentials,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "✓ Set" : "✗ Missing",
        supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? "✓ Set" : "✗ Missing",
      },
      configuration: {
        bucketName: BUCKET_NAME,
        fileName: FILE_NAME,
      },
      connection: null as any,
      filesList: null as any,
      fileExists: null as any,
    }

    if (!hasSupabaseCredentials || !supabase) {
      return NextResponse.json({
        ...response,
        status: "error",
        message: "Supabase credentials not configured",
      })
    }

    // Test bucket connection
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    response.connection = {
      status: bucketsError ? "error" : "connected",
      bucketsAvailable: buckets?.length || 0,
      bucketsFound: buckets?.map((b) => b.name) || [],
      error: bucketsError?.message,
    }

    // Try to list files in bucket
    const { data: files, error: filesError } = await supabase.storage.from(BUCKET_NAME).list()
    
    response.filesList = {
      status: filesError ? "error" : "success",
      count: files?.length || 0,
      files: files?.map((f) => ({ name: f.name, size: f.metadata?.size || 0 })) || [],
      error: filesError?.message,
    }

    // Check if our specific file exists
    if (files) {
      const fileExists = files.some((f) => f.name === FILE_NAME)
      response.fileExists = {
        fileName: FILE_NAME,
        exists: fileExists,
        message: fileExists 
          ? `✓ File "${FILE_NAME}" found in bucket`
          : `✗ File "${FILE_NAME}" not found. Available files: ${files.map(f => f.name).join(", ")}`,
      }
    }

    return NextResponse.json({
      ...response,
      status: "success",
      message: "Supabase connection test complete",
    })
  } catch (error) {
    console.error("[Supabase Debug] Error:", error)
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
        error: String(error),
      },
      { status: 500 },
    )
  }
}
