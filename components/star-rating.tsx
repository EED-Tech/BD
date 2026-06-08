"use client"

import { useState } from "react"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface StarRatingProps {
  rating: number
  onRatingChange?: (rating: number) => void
  readonly?: boolean
  size?: "xs" | "sm" | "md" | "lg"
  className?: string
  showRating?: boolean
}

export { StarRating }
export default function StarRating({
  rating,
  onRatingChange,
  readonly = false,
  size = "md",
  className,
  showRating = true,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0)

  const sizeClasses = {
    xs: "h-2.5 w-2.5", // Added xs size for small review displays
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  }

  const handleClick = (value: number) => {
    if (!readonly && onRatingChange) {
      onRatingChange(value)
    }
  }

  const handleMouseEnter = (value: number) => {
    if (!readonly) {
      setHoverRating(value)
    }
  }

  const handleMouseLeave = () => {
    if (!readonly) {
      setHoverRating(0)
    }
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= (hoverRating || rating)
        return (
          <Star
            key={star}
            className={cn(
              sizeClasses[size],
              isFilled ? "fill-yellow-400 text-yellow-400" : "text-gray-300",
              !readonly && "cursor-pointer hover:scale-110 transition-transform",
            )}
            onClick={() => handleClick(star)}
            onMouseEnter={() => handleMouseEnter(star)}
            onMouseLeave={handleMouseLeave}
          />
        )
      })}
      {showRating && <span className="text-sm text-muted-foreground ml-1">({rating.toFixed(1)})</span>}
    </div>
  )
}
