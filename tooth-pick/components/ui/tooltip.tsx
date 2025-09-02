import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  side?: "top" | "right" | "bottom" | "left"
  className?: string
}

const TooltipProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
}

const Tooltip = ({ children, content, side = "top", className }: TooltipProps) => {
  const [isVisible, setIsVisible] = React.useState(false)

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && (
        <div
          className={cn(
            "absolute z-50 px-3 py-1.5 text-sm text-white bg-gray-900 rounded-md shadow-lg",
            "animate-in fade-in-0 zoom-in-95",
            {
              "bottom-full left-1/2 transform -translate-x-1/2 mb-2": side === "top",
              "top-full left-1/2 transform -translate-x-1/2 mt-2": side === "bottom",
              "left-full top-1/2 transform -translate-y-1/2 ml-2": side === "right",
              "right-full top-1/2 transform -translate-y-1/2 mr-2": side === "left",
            },
            className
          )}
        >
          {content}
          <div
            className={cn(
              "absolute w-2 h-2 bg-gray-900 transform rotate-45",
              {
                "top-full left-1/2 transform -translate-x-1/2": side === "top",
                "bottom-full left-1/2 transform -translate-x-1/2": side === "bottom",
                "right-full top-1/2 transform -translate-y-1/2": side === "left",
                "left-full top-1/2 transform -translate-y-1/2": side === "right",
              }
            )}
          />
        </div>
      )}
    </div>
  )
}

const TooltipTrigger = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
}

const TooltipContent = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent }
