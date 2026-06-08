"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { StarRating } from "./star-rating"
import { toast } from "sonner"

export const RATINGS_KEY = "bd_tracker_partner_ratings"

export interface RatingEntry {
  id: string
  partner_name: string
  partner_type: string
  rating: number
  comment: string | null
  rated_by: string
  created_at: string
}

/** Load all ratings from localStorage */
export function loadRatings(): RatingEntry[] {
  try {
    const raw = localStorage.getItem(RATINGS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/** Save a new rating entry and return the updated list */
export function saveRating(entry: RatingEntry): RatingEntry[] {
  const all = loadRatings()
  all.push(entry)
  localStorage.setItem(RATINGS_KEY, JSON.stringify(all))
  return all
}

/** Get aggregated rating info for a single partner */
export function getPartnerRatingSummary(partnerName: string, partnerType: string) {
  const all = loadRatings().filter(
    (r) => r.partner_name === partnerName && r.partner_type === partnerType
  )
  if (all.length === 0) return { average_rating: 0, total_ratings: 0, recent_comments: [] }
  const avg = all.reduce((sum, r) => sum + r.rating, 0) / all.length
  return {
    average_rating: Math.round(avg * 10) / 10,
    total_ratings: all.length,
    recent_comments: all
      .slice(-5)
      .reverse()
      .map((r) => ({
        rating: r.rating,
        comment: r.comment,
        rated_by: r.rated_by,
        created_at: r.created_at,
      })),
  }
}

interface PartnerRatingDialogProps {
  partner: any
  isOpen: boolean
  onClose: () => void
  onRatingSubmitted: () => void
}

export function PartnerRatingDialog({
  partner,
  isOpen,
  onClose,
  onRatingSubmitted,
}: PartnerRatingDialogProps) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [ratedBy, setRatedBy] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a rating")
      return
    }

    setIsSubmitting(true)
    try {
      const entry: RatingEntry = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        partner_name: partner.name,
        partner_type: partner.type,
        rating,
        comment: comment.trim() || null,
        rated_by: ratedBy.trim() || "anonymous",
        created_at: new Date().toISOString(),
      }

      saveRating(entry)
      toast.success("Rating saved!")
      setRating(0)
      setComment("")
      setRatedBy("")
      onClose()
      onRatingSubmitted()
    } catch (error) {
      toast.error("Failed to save rating. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setRating(0)
      setComment("")
      setRatedBy("")
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Rate Partner</DialogTitle>
          <DialogDescription>Rate your experience working with {partner?.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Rating</Label>
            <StarRating rating={rating} onRatingChange={setRating} size="lg" className="justify-center" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ratedBy">Your name / initials</Label>
            <Input
              id="ratedBy"
              placeholder="e.g. AK"
              value={ratedBy}
              onChange={(e) => setRatedBy(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="comment">Comment (Optional)</Label>
            <Textarea
              id="comment"
              placeholder="Share your experience working with this partner..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || rating === 0}
            className="bg-[#383e80] hover:bg-[#383e80]/90"
          >
            {isSubmitting ? "Saving..." : "Save Rating"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default PartnerRatingDialog
