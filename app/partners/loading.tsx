import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="container mx-auto p-4">
      <Skeleton className="h-10 w-1/3 mb-6 mx-auto" /> {/* Title skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Skeleton className="h-10 col-span-full md:col-span-2 lg:col-span-4" /> {/* Search input skeleton */}
        <Skeleton className="h-10 w-full" /> {/* Select 1 skeleton */}
        <Skeleton className="h-10 w-full" /> {/* Select 2 skeleton */}
        <Skeleton className="h-10 w-full" /> {/* Select 3 skeleton */}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="lg:col-span-2 h-[400px]" /> {/* Map placeholder skeleton */}
        <div className="lg:col-span-1 space-y-4">
          <Skeleton className="h-32 w-full" /> {/* Partner card skeleton */}
          <Skeleton className="h-32 w-full" /> {/* Partner card skeleton */}
          <Skeleton className="h-32 w-full" /> {/* Partner card skeleton */}
        </div>
      </div>
    </div>
  )
}
