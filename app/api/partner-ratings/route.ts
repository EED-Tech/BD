import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { searchParams } = new URL(request.url)
    const partnerName = searchParams.get("partnerName")
    const partnerType = searchParams.get("partnerType")

    if (!partnerName || !partnerType) {
      console.log("[EED] Fetching all partner ratings...")

      // Get all ratings with averages using the database function
      const { data: allRatings, error: allRatingsError } = await supabase.rpc("get_all_partner_ratings")

      if (allRatingsError) {
        console.error("[EED] Error fetching all ratings:", allRatingsError)
        // Fallback to manual calculation if function doesn't exist
        const { data: ratings, error: ratingsError } = await supabase
          .from("partner_ratings")
          .select("*")
          .order("created_at", { ascending: false })

        if (ratingsError) {
          console.error("[EED] Error fetching ratings fallback:", ratingsError)
          return NextResponse.json([])
        }

        // Calculate averages manually
        const ratingsMap = new Map()
        ratings?.forEach((rating) => {
          const key = `${rating.partner_name}_${rating.partner_type}`
          if (!ratingsMap.has(key)) {
            ratingsMap.set(key, {
              partner_name: rating.partner_name,
              partner_type: rating.partner_type,
              ratings: [],
              total: 0,
              sum: 0,
            })
          }
          const entry = ratingsMap.get(key)
          entry.ratings.push(rating)
          entry.total += 1
          entry.sum += rating.rating
        })

        const result = Array.from(ratingsMap.values()).map((entry) => ({
          partner_name: entry.partner_name,
          partner_type: entry.partner_type,
          average_rating: entry.sum / entry.total,
          total_ratings: entry.total,
        }))

        console.log("[EED] Calculated ratings manually:", result)
        return NextResponse.json(result)
      }

      console.log("[EED] Fetched all ratings from function:", allRatings)
      return NextResponse.json(allRatings || [])
    }

    const { data: avgData, error: avgError } = await supabase.rpc("get_partner_average_rating", {
      p_name: partnerName,
      p_type: partnerType,
    })

    if (avgError) {
      console.error("Error fetching average rating:", avgError)
      return NextResponse.json({
        averageRating: 0,
        totalRatings: 0,
        ratings: [],
      })
    }

    // Get individual ratings
    const { data: ratings, error: ratingsError } = await supabase
      .from("partner_ratings")
      .select("*")
      .eq("partner_name", partnerName)
      .eq("partner_type", partnerType)
      .order("created_at", { ascending: false })

    if (ratingsError) {
      console.error("Error fetching ratings:", ratingsError)
      return NextResponse.json({
        averageRating: 0,
        totalRatings: 0,
        ratings: [],
      })
    }

    const result = avgData?.[0] || { avg_rating: 0, total_ratings: 0 }

    return NextResponse.json({
      averageRating: Number.parseFloat(result.avg_rating) || 0,
      totalRatings: result.total_ratings || 0,
      ratings: ratings || [],
    })
  } catch (error) {
    console.error("Error in partner ratings GET:", error)
    return NextResponse.json({
      averageRating: 0,
      totalRatings: 0,
      ratings: [],
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[EED] Environment check:")
    console.log("- NEXT_PUBLIC_SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "✓ Set" : "✗ Missing")
    console.log("- NEXT_PUBLIC_SUPABASE_ANON_KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✓ Set" : "✗ Missing")

    const supabase = await createClient()

    const body = await request.json()
    const { partnerName, partnerType, rating, comment, ratedBy } = body

    console.log("[EED] Received rating submission:", { partnerName, partnerType, rating, comment, ratedBy })

    if (!partnerName || !partnerType || !rating) {
      return NextResponse.json({ error: "Partner name, type, and rating are required" }, { status: 400 })
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 })
    }

    console.log("[EED] Testing database connection...")
    const { data: connectionTest, error: connectionError } = await supabase
      .from("partner_ratings")
      .select("count")
      .limit(1)
      .single()

    if (connectionError) {
      console.error("[EED] Database connection test failed:", connectionError)
      if (connectionError.code === "42P01") {
        return NextResponse.json(
          {
            error: "Database table not found. Please contact administrator to set up the ratings system.",
          },
          { status: 500 },
        )
      }
      // Continue with insertion attempt even if connection test fails
    } else {
      console.log("[EED] Database connection test successful")
    }

    const insertData = {
      partner_name: partnerName,
      partner_type: partnerType,
      rating: rating,
      comment: comment || null,
      rated_by: ratedBy || "anonymous",
    }

    console.log("[EED] Attempting to insert:", insertData)

    const { data, error } = await supabase.from("partner_ratings").insert(insertData).select()

    if (error) {
      console.error("[EED] Error inserting rating:")
      console.error("- Code:", error.code)
      console.error("- Message:", error.message)
      console.error("- Details:", error.details)
      console.error("- Hint:", error.hint)

      // Handle specific error cases
      if (error.code === "42P01") {
        return NextResponse.json(
          {
            error: "Database table not found. Please contact administrator to set up the ratings system.",
          },
          { status: 500 },
        )
      } else if (error.code === "23505") {
        return NextResponse.json(
          {
            error: "You have already rated this partner.",
          },
          { status: 400 },
        )
      } else {
        return NextResponse.json(
          {
            error: `Failed to save rating: ${error.message || "Unknown database error"}`,
          },
          { status: 500 },
        )
      }
    }

    console.log("[EED] Successfully inserted rating:", data)

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[EED] Error in partner ratings POST - Full error:", error)
    console.error("[EED] Error stack:", error instanceof Error ? error.stack : "No stack trace")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
