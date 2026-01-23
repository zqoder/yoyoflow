import * as React from "react"
import { cn } from "@/lib/utils"

const Flex = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex", className)}
    {...props}
  />
))
Flex.displayName = "Flex"

export { Flex }
