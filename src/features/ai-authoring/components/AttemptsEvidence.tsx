import { EvidenceDetails } from "./EvidenceDetails";
import { MathTemplateDetails } from "./MathTemplateDetails";
import { isIrMathTemplateCandidate, sameCandidate } from "./questionPayload";
import { ChecksDetails } from "./TechnicalDetailsSections";
import type { ReviewAttempt } from "../types";

interface AttemptsEvidenceProps {
    attempts: ReviewAttempt[];
    /** The checked template, when there is one, used to avoid repeating it. */
    checkedCandidate?: unknown;
}

function checkSummary(attempt: ReviewAttempt): string {
    const checks = attempt.checks ?? [];
    if (checks.length === 0) return "No checks recorded";
    const passed = checks.filter((check) => check.status === "passed").length;
    return `${passed}/${checks.length} checks passed`;
}

/**
 * Authoring attempts carry a full candidate each, so they are collapsed one at a
 * time. Within an attempt, the candidate keeps its own disclosure so large code
 * templates, parameter tables and distractor tables stay scannable.
 */
export function AttemptsEvidence({ attempts, checkedCandidate = null }: AttemptsEvidenceProps) {
    if (attempts.length === 0) return null;
    const latestNumber = attempts.reduce(
        (latest, attempt) => Math.max(latest, attempt.number),
        Number.NEGATIVE_INFINITY,
    );

    return (
        <details className="rounded-md border bg-muted/30 p-3 text-sm">
            <summary className="cursor-pointer font-medium">
                Authoring attempts ({attempts.length})
            </summary>
            <ol className="mt-3 space-y-2">
                {attempts.map((attempt) => {
                    const checks = attempt.checks ?? [];
                    const pending = attempt.pending ?? [];
                    const sameAsChecked =
                        attempt.number === latestNumber &&
                        checkedCandidate !== null &&
                        sameCandidate(attempt.candidate, checkedCandidate);
                    return (
                        <li key={attempt.number}>
                            <details className="rounded border bg-background/60 p-2">
                                <summary className="cursor-pointer text-xs font-medium">
                                    Attempt {attempt.number} ·{" "}
                                    {attempt.passed ? "Passed" : "Failed"} ·{" "}
                                    {checkSummary(attempt)}
                                </summary>
                                <div className="mt-2 space-y-2">
                                    <p className="text-xs text-muted-foreground">
                                        {attempt.complete ? "Complete" : "Incomplete"}
                                        {pending.length > 0
                                            ? ` · Pending: ${pending.join(", ")}`
                                            : ""}
                                    </p>
                                    <EvidenceDetails
                                        summary={`Checks (${checks.length})`}
                                        value={checks}
                                        variant="structured"
                                        readable={<ChecksDetails checks={checks} />}
                                    />
                                    {sameAsChecked ? (
                                        <p className="text-xs text-muted-foreground">
                                            Same as the checked template below
                                        </p>
                                    ) : (
                                        <EvidenceDetails
                                            summary="Candidate"
                                            value={attempt.candidate}
                                            variant="structured"
                                            readable={
                                                isIrMathTemplateCandidate(attempt.candidate) ? (
                                                    <MathTemplateDetails
                                                        candidate={attempt.candidate}
                                                    />
                                                ) : undefined
                                            }
                                        />
                                    )}
                                </div>
                            </details>
                        </li>
                    );
                })}
            </ol>
        </details>
    );
}
