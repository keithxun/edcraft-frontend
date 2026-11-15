import { useEffect, useRef } from "react";
import type { AuthoringResult, AuthoringReview } from "../types";
import { modelLabel } from "../format";
import { AttemptsEvidence } from "./AttemptsEvidence";
import { EvidenceDetails } from "./EvidenceDetails";

interface TechnicalDetailsProps {
    review: AuthoringReview;
    result: AuthoringResult | null;
}

function present(value: string | number | null | undefined): string | null {
    if (value === null || value === undefined || value === "") return null;
    return String(value);
}

/**
 * Optional developer/research evidence. The default review keeps this closed so
 * educators can approve from the question and concise checks alone. Each payload
 * is parsed into readable fields with the exact JSON one level deeper.
 */
export function TechnicalDetails({ review, result }: TechnicalDetailsProps) {
    const detailsRef = useRef<HTMLDetailsElement>(null);

    useEffect(() => {
        const openIfTargeted = () => {
            if (window.location.hash === "#technical-details" && detailsRef.current) {
                detailsRef.current.open = true;
            }
        };
        openIfTargeted();
        window.addEventListener("hashchange", openIfTargeted);
        return () => window.removeEventListener("hashchange", openIfTargeted);
    }, []);

    const metadata = [
        ["Artifact ID", review.artifact_id],
        ["Artifact digest (SHA-256)", review.artifact_sha256],
        ["Library revision", review.library_revision],
        ["Model", modelLabel(review.request)],
        [
            "Model source",
            review.request.connection_id
                ? "Connection"
                : review.request.model_profile
                  ? "Server profile"
                  : null,
        ],
        ["Author provider", result?.provider],
        ["Author model", result?.model],
        [
            "Difficulty check model",
            review.request.judges?.difficulty
                ? modelLabel(review.request.judges.difficulty)
                : "Same as question model",
        ],
        [
            "Relevance check model",
            review.request.judges?.relevance
                ? modelLabel(review.request.judges.relevance)
                : "Same as question model",
        ],
        ["Review state", review.state],
    ]
        .map(([label, value]) => [label, present(value)] as const)
        .filter((entry): entry is readonly [string, string] => Boolean(entry[1]));

    const checks = review.checks ?? [];
    const attempts = review.attempts ?? [];

    return (
        <details
            id="technical-details"
            ref={detailsRef}
            className="scroll-mt-6 rounded-lg border bg-muted/30 p-4 text-sm"
        >
            <summary className="cursor-pointer font-medium">Technical details</summary>
            <div className="mt-4 space-y-3">
                <dl className="grid gap-2 text-xs sm:grid-cols-2">
                    {metadata.map(([label, value]) => (
                        <div key={label}>
                            <dt className="font-medium text-muted-foreground">{label}</dt>
                            <dd className="break-all font-mono">{value}</dd>
                        </div>
                    ))}
                </dl>

                {review.candidate_is_historical_attempt && (
                    <p className="text-xs text-muted-foreground">
                        {review.artifact_sha256
                            ? "Earlier drafts are kept for reference. The checked version and its example question are what you are approving."
                            : "Earlier drafts are kept for reference. The latest draft is shown above. No draft passed the technical checks."}
                    </p>
                )}

                <EvidenceDetails
                    summary="Request"
                    value={review.request}
                    variant="structured"
                />
                <EvidenceDetails
                    summary={`Automated checks (${checks.length})`}
                    value={checks}
                    variant="structured"
                />
                <AttemptsEvidence attempts={attempts} />
                <EvidenceDetails
                    summary="Fixed plan"
                    value={review.fixed_plan ?? []}
                    variant="structured"
                />
                <EvidenceDetails
                    summary="Difficulty advisory"
                    value={review.difficulty ?? result?.difficulty}
                    variant="structured"
                />
                <EvidenceDetails
                    summary="Relevance advisory"
                    value={review.relevance ?? result?.relevance}
                    variant="structured"
                />
                <EvidenceDetails
                    summary="Sampled-check limits"
                    value={review.validation_limits ?? null}
                    variant="structured"
                />
                <EvidenceDetails
                    summary="Raw warnings"
                    value={review.warnings ?? []}
                    variant="structured"
                />
                <EvidenceDetails
                    summary="Approval record"
                    value={review.approval}
                    variant="structured"
                />
                <EvidenceDetails summary="Review error" value={review.error} variant="structured" />
                <EvidenceDetails
                    summary="Template details"
                    value={
                        review.template
                            ? {
                                  ...review.template.candidate,
                                  template_id: review.template.template_id,
                                  language: review.template.language,
                              }
                            : null
                    }
                    variant="structured"
                />
            </div>
        </details>
    );
}
