/**
 * Partner Ratings API — localStorage-backed (no database required)
 * Ratings are stored in the browser via the client; this API is kept as a
 * thin pass-through so the dialog component doesn't need refactoring.
 *
 * Since Next.js API routes run server-side and can't access localStorage,
 * we simply return success and let the client manage persistence directly.
 * The actual storage logic lives in the PartnerRatingDialog component.
 */
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  // Ratings are managed client-side; return empty so the component falls
  // back to its local state without errors.
  return NextResponse.json([])
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { partnerName, partnerType, rating, comment, ratedBy } = body

    if (!partnerName || !partnerType || !rating) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate rating value
    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 })
    }

    // Return the rating entry so the client can persist it locally
    const entry = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      partner_name: partnerName,
      partner_type: partnerType,
      rating,
      comment: comment || null,
      rated_by: ratedBy || "anonymous",
      created_at: new Date().toISOString(),
    }

    return NextResponse.json({ success: true, entry })
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to process rating: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    )
  }
}
