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
import StarRating from "./star-rating"
import { toast } from "sonner"

interface PartnerRatingDialogProps {
  partner: any
  isOpen: boolean
  onClose: () => void
  onRatingSubmitted: () => void
}

export function PartnerRatingDialog({ partner, isOpen, onClose, onRatingSubmitted }: PartnerRatingDialogProps) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a rating")
      return
    }

    setIsSubmitting(true)
    try {
      console.log("[EED] Submitting rating for partner:", partner)
      const requestBody = {
        partnerName: partner.name,
        partnerType: partner.type,
        rating,
        comment: comment.trim() || null,
        ratedBy: "current_user", // You can replace this with actual user identification
      }
      console.log("[EED] Request body:", requestBody)

      const response = await fetch("/api/partner-ratings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      console.log("[EED] Response status:", response.status)
      const responseData = await response.json()
      console.log("[EED] Response data:", responseData)

      if (!response.ok) {
        throw new Error(responseData.error || "Failed to submit rating")
      }

      toast.success("Rating submitted successfully!")
      setRating(0)
      setComment("")
      onClose()
      onRatingSubmitted()
    } catch (error) {
      console.error("[EED] Error submitting rating:", error)
      toast.error("Failed to submit rating. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || rating === 0}>
            {isSubmitting ? "Submitting..." : "Submit Rating"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default PartnerRatingDialog
