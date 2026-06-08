import { type NextRequest, NextResponse } from "next/server"
import { supabase, hasSupabaseCredentials, BUCKET_NAME, FILE_NAME } from "@/lib/supabase-client"

export async function GET(request: NextRequest) {
  try {
    console.log("BD Data Subscribe API called")

    // If no Supabase credentials, return polling mode
    if (!hasSupabaseCredentials || !supabase) {
      console.log("No Supabase credentials, using polling mode")
      return NextResponse.json({
        mode: "polling",
        interval: 30000, // 30 seconds
        message: "Using polling mode - no Supabase credentials",
      })
    }

    // Check if file exists
    const { data: fileList, error: listError } = await supabase.storage.from(BUCKET_NAME).list("", {
      search: FILE_NAME,
    })

    if (listError || !fileList || fileList.length === 0) {
      console.log("File not found, using polling mode")
      return NextResponse.json({
        mode: "polling",
        interval: 30000, // 30 seconds
        message: "File not found - using polling mode",
      })
    }

    // File exists, return real-time subscription info
    return NextResponse.json({
      mode: "realtime",
      channel: `storage:${BUCKET_NAME}`,
      file: FILE_NAME,
      message: "Real-time updates available",
    })
  } catch (error) {
    console.error("Error in subscribe API:", error)

    return NextResponse.json({
      mode: "polling",
      interval: 60000, // 1 minute fallback
      message: `Error occurred - using polling mode: ${error instanceof Error ? error.message : "Unknown error"}`,
    })
  }
}
