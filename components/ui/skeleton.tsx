import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gradient-to-r from-sky-100 via-sky-50 to-teal-50",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }

