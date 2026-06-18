"use client";

import { cn } from "@/lib/utils";

interface BeamsBackgroundProps {
    className?: string;
    children?: React.ReactNode;
    intensity?: "subtle" | "medium" | "strong";
}

// Lightweight CSS-only beams background
export function BeamsBackground({
    className,
    children,
    intensity = "medium",
}: BeamsBackgroundProps) {
    const opacityMap = {
        subtle: "opacity-20",
        medium: "opacity-30",
        strong: "opacity-40",
    };

    return (
        <div
            className={cn(
                "relative min-h-screen w-full overflow-hidden bg-neutral-950",
                className
            )}
        >
            {/* Static gradient beams - CSS only, no canvas */}
            <div 
                className={cn(
                    "absolute inset-0 overflow-hidden pointer-events-none",
                    opacityMap[intensity]
                )}
                style={{
                    background: `
                        radial-gradient(ellipse 80% 50% at 20% 40%, rgba(56, 189, 248, 0.15), transparent 50%),
                        radial-gradient(ellipse 60% 40% at 80% 60%, rgba(168, 85, 247, 0.12), transparent 50%),
                        radial-gradient(ellipse 50% 30% at 50% 80%, rgba(59, 130, 246, 0.1), transparent 50%)
                    `,
                }}
            />
            
            {/* Subtle animated overlay */}
            <div 
                className="absolute inset-0 bg-gradient-to-b from-neutral-950/50 via-transparent to-neutral-950/50 pointer-events-none"
            />
            
            <div className="relative z-10 w-full h-full">
                {children}
            </div>
        </div>
    );
}
