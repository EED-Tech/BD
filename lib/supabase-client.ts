import { createClient } from "@supabase/supabase-js"

// Environment variables with fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ""
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

// Export constants
export const BUCKET_NAME = "BDTracker"
export const FILE_NAME = "BD Tracker_Live Document.xlsx"

// Check if we have valid credentials
export const hasSupabaseCredentials = !!(supabaseUrl && supabaseKey)
export const hasServiceRoleKey = !!(supabaseUrl && supabaseServiceRoleKey)

// Create client with service role key for server-side access (better permissions)
// Falls back to public key if service role key is not available
const activeKey = supabaseServiceRoleKey || supabaseKey
export const supabase = !!(supabaseUrl && activeKey) ? createClient(supabaseUrl, activeKey) : null

// Test connection function
export async function testSupabaseConnection() {
  if (!supabase) {
    return {
      success: false,
      error: new Error("No Supabase credentials configured"),
      buckets: [],
      details: "Missing NEXT_PUBLIC_SUPABASE_URL or authentication keys",
    }
  }

  try {
    const { data: buckets, error } = await supabase.storage.listBuckets()

    if (error) {
      return {
        success: false,
        error,
        buckets: [],
        details: `Storage error: ${error.message}`,
      }
    }

    return {
      success: true,
      buckets: buckets?.map((b) => b.name) || [],
      details: `Found ${buckets?.length || 0} storage buckets`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
      buckets: [],
      details: `Connection test failed: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}
