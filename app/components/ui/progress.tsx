"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressProps {
  value?: number;
  className?: string;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative h-4 w-full overflow-hidden rounded-full bg-gray-200",
        className
      )}
      {...props}
    >
      <div
        className="h-full transition-all duration-300 ease-in-out rounded-full"
        style={{ 
          width: `${Math.min(100, Math.max(0, value))}%`,
          background: 'linear-gradient(90deg, #963B6B 0%, #B84A7A 50%, #963B6B 100%)'
        }}
      />
    </div>
  )
)
Progress.displayName = "Progress"

export { Progress }