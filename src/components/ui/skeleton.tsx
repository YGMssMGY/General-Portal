import * as React from "react"
import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[5px] bg-[var(--color-bg-secondary)]",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
export default Skeleton
