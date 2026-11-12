import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatValue } from "@/features/ai-authoring/format";
import {
    qualificationBadgeVariant,
    qualificationSummary,
} from "../checkPilot";
import type { Qualification } from "../types";

interface QualificationEvidenceProps {
    title: string;
    qualification: Qualification | null | undefined;
    headingLevel?: "h2" | "h3" | "h4" | "h5" | "h6";
    className?: string;
}

function formatTimeout(seconds: number): string {
    return `${seconds} ${seconds === 1 ? "second" : "seconds"}`;
}

/**
 * Shows sampled qualification evidence. Passing text is deliberately limited to
 * what the sample supports; this component never claims proof or confidence.
 */
export function QualificationEvidence({
    title,
    qualification,
    headingLevel = "h3",
    className,
}: QualificationEvidenceProps) {
    const Heading = headingLevel;
    if (!qualification) {
        return (
            <section className={cn("space-y-2", className)} aria-label={title}>
                <Heading className="text-sm font-medium">{title}</Heading>
                <p className="text-sm text-muted-foreground">
                    No qualification evidence was recorded for this version.
                </p>
            </section>
        );
    }

    const summary = qualificationSummary(qualification);
    const findings = qualification.findings.filter((finding) => finding.trim().length > 0);
    const versions = Object.entries(qualification.versions);

    return (
        <section className={cn("space-y-3", className)} aria-label={title}>
            <div className="flex flex-wrap items-center gap-2">
                <Heading className="text-sm font-medium">{title}</Heading>
                <Badge variant={qualificationBadgeVariant(qualification.status)}>
                    {summary.label}
                </Badge>
            </div>
            <p className="text-sm">{summary.explanation}</p>
            <p className="text-xs text-muted-foreground">
                Based on the sampled cases below. This is not an exhaustive verification.
            </p>

            <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[minmax(9rem,auto)_1fr]">
                <dt className="font-medium text-muted-foreground">Accepted cases</dt>
                <dd>
                    {qualification.accepted_cases} of at most {qualification.max_examples}
                </dd>
                <dt className="font-medium text-muted-foreground">Execution calls</dt>
                <dd>
                    {qualification.execution_calls} of at most{" "}
                    {qualification.max_execution_calls}
                </dd>
                <dt className="font-medium text-muted-foreground">Seed</dt>
                <dd>{qualification.seed}</dd>
                <dt className="font-medium text-muted-foreground">Timeout</dt>
                <dd>{formatTimeout(qualification.timeout_seconds)}</dd>
                <dt className="font-medium text-muted-foreground">Checking mode</dt>
                <dd>Property-based sampling</dd>
            </dl>

            {versions.length > 0 && (
                <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Versions
                    </p>
                    <dl className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-[minmax(9rem,auto)_1fr]">
                        {versions.map(([name, version]) => (
                            <div key={name} className="contents">
                                <dt className="font-mono text-muted-foreground">{name}</dt>
                                <dd className="break-words font-mono">{version}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            )}

            {findings.length > 0 && (
                <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Findings
                    </p>
                    <ul className="list-disc space-y-1 pl-4 text-sm">
                        {findings.map((finding, index) => (
                            <li key={index} className="break-words">
                                {finding}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {qualification.counterexample && (
                <div className="space-y-1 rounded-md border border-destructive/40 bg-destructive/5 p-3">
                    <p className="text-sm font-medium">Preserved counterexample</p>
                    <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-words text-xs">
                        {formatValue(qualification.counterexample)}
                    </pre>
                </div>
            )}
        </section>
    );
}
