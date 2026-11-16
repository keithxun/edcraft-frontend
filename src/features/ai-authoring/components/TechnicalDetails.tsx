import { useEffect, useRef } from "react";
import type { AuthoringResult, AuthoringReview } from "../types";
import { modelLabel } from "../format";
import { AttemptsEvidence } from "./AttemptsEvidence";
import { EvidenceDetails } from "./EvidenceDetails";
import { MathTemplateDetails } from "./MathTemplateDetails";
import { isIrMathTemplateCandidate } from "./questionPayload";
import {
    ChecksDetails,
    DifficultyDetails,
    FixedPlanDetails,
    RelevanceDetails,
    RequestDetails,
    ValidationLimitsDetails,
    WarningsDetails,
} from "./TechnicalDetailsSections";

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
    const difficulty = review.difficulty ?? result?.difficulty ?? null;
    const relevance = review.relevance ?? result?.relevance ?? null;
    const warnings = review.warnings ?? [];
    const fixedPlan = review.fixed_plan ?? [];
    const template = review.template
        ? {
              ...review.template.candidate,
              template_id: review.template.template_id,
              language: review.template.language,
          }
        : null;

    return (
        <details
            id="technical-details"
            ref={detailsRef}
            className="scroll-mt-6 rounded-lg border bg-muted/30 p-4 text-sm"
        >
            <summary className="cursor-pointer font-medium">Technical details</summary>
            <div className="mt-4 space-y-3">
                <dl className="grid gap-2 text-xs @sm:grid-cols-2">
                    {metadata.map(([label, value]) => (
                        <div key={label}>
                            <dt className="font-medium text-muted-foreground">{label}</dt>
                            <dd
                                className="break-all font-mono"
                                title={
                                    label === "Library revision" ? value : undefined
                                }
                            >
                                {label === "Library revision"
                                    ? value.slice(0, 7)
                                    : value}
                            </dd>
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
                    readable={<RequestDetails request={review.request} />}
                />
                <EvidenceDetails
                    summary={`Automated checks (${checks.length})`}
                    value={checks}
                    variant="structured"
                    readable={<ChecksDetails checks={checks} />}
                />
                <AttemptsEvidence
                    attempts={attempts}
                    checkedCandidate={review.template?.candidate ?? null}
                />
                <EvidenceDetails
                    summary="Fixed plan"
                    value={fixedPlan}
                    variant="structured"
                    readable={<FixedPlanDetails steps={fixedPlan} />}
                />
                <EvidenceDetails
                    summary="Difficulty advisory"
                    value={difficulty}
                    variant="structured"
                    readable={
                        difficulty ? <DifficultyDetails outcome={difficulty} /> : undefined
                    }
                />
                <EvidenceDetails
                    summary="Relevance advisory"
                    value={relevance}
                    variant="structured"
                    readable={
                        relevance ? <RelevanceDetails outcome={relevance} /> : undefined
                    }
                />
                <EvidenceDetails
                    summary="Sampled-check limits"
                    value={review.validation_limits ?? null}
                    variant="structured"
                    readable={
                        review.validation_limits ? (
                            <ValidationLimitsDetails limits={review.validation_limits} />
                        ) : undefined
                    }
                />
                <EvidenceDetails
                    summary="Raw warnings"
                    value={warnings}
                    variant="structured"
                    readable={<WarningsDetails warnings={warnings} />}
                />
                <EvidenceDetails
                    summary="Approval record"
                    value={review.approval}
                    variant="structured"
                />
                <EvidenceDetails summary="Review error" value={review.error} variant="structured" />
                <EvidenceDetails
                    summary="Template details"
                    value={template}
                    variant="structured"
                    readable={
                        isIrMathTemplateCandidate(template) ? (
                            <MathTemplateDetails candidate={template} />
                        ) : undefined
                    }
                />
            </div>
        </details>
    );
}
