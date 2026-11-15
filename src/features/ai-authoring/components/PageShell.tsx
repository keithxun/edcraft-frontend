import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageShellProps {
    children: ReactNode;
    className?: string;
}

/**
 * Shared width and spacing for the AI authoring pages. Keeping one container
 * avoids the review and generation pages drifting to different widths.
 */
export function PageShell({ children, className }: PageShellProps) {
    return (
        <div
            className={cn(
                "mx-auto w-full max-w-[1440px] @container/page space-y-6 p-4 md:p-6",
                className,
            )}
        >
            {children}
        </div>
    );
}
