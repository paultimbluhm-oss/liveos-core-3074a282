import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const progressVariants = cva("relative h-4 w-full overflow-hidden rounded-full bg-secondary", {
  variants: {
    variant: {
      default: "",
      xp: "",
      accent: "",
      success: "",
    },
  },
  defaultVariants: { variant: "default" },
});

const indicatorVariants = cva("h-full w-full flex-1 transition-all duration-500", {
  variants: {
    variant: {
      default: "bg-primary",
      xp: "bg-gradient-to-r from-purple-500 to-pink-500",
      accent: "bg-accent",
      success: "bg-green-500",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
    VariantProps<typeof progressVariants> {}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, variant, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(progressVariants({ variant }), className)}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn(indicatorVariants({ variant }))}
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
