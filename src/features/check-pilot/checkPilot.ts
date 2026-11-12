import type {
    PilotTemplateRecord,
    Qualification,
    QualificationStatus,
} from "./types";

export interface QualificationSummary {
    label: string;
    explanation: string;
}

/**
 * True when a check was rejected before any case ran: either the backend marked
 * a compilation phase, or it is a legacy zero-execution failed record with no
 * preserved counterexample.
 */
export function qualificationRejectedBeforeSampling(
    qualification: Qualification,
): boolean {
    return (
        qualification.phase === "compilation" ||
        (qualification.status === "failed" &&
            qualification.execution_calls === 0 &&
            !qualification.counterexample)
    );
}

export function qualificationSummary(
    qualification: Qualification | null | undefined,
): QualificationSummary {
    if (!qualification) {
        return {
            label: "No sampled evidence",
            explanation: "No qualification evidence has been recorded for this version.",
        };
    }
    if (qualificationRejectedBeforeSampling(qualification)) {
        return {
            label: "Rejected before sampling",
            explanation:
                "The check did not compile into supported operations, so no sampled cases ran. No mathematical verdict was produced.",
        };
    }
    switch (qualification.status) {
        case "passed":
            return {
                label: "Sampled checks passed",
                explanation: "No counterexample found in sampled cases.",
            };
        case "failed":
            if (!qualification.counterexample) {
                return {
                    label: "Sampled checks failed",
                    explanation:
                        "The sampled checks did not confirm the recipe and no counterexample was preserved. This is not a mathematical verdict.",
                };
            }
            return {
                label: "Sampled checks failed",
                explanation: "The sampled cases found a counterexample.",
            };
        case "inconclusive":
            return {
                label: "Inconclusive",
                explanation: "The sampled checks did not establish an outcome.",
            };
        case "error":
            return {
                label: "Check error",
                explanation:
                    "The check could not complete. This is not a passing result.",
            };
    }
}

export type BadgeVariant = "success" | "destructive" | "outline";

export function qualificationBadgeVariant(
    status: QualificationStatus,
): BadgeVariant {
    if (status === "passed") return "success";
    if (status === "failed" || status === "error") return "destructive";
    return "outline";
}

export function templateApprovalBadgeVariant(
    approval: PilotTemplateRecord["approval"],
): BadgeVariant {
    if (approval === "approved") return "success";
    if (approval === "rejected") return "destructive";
    return "outline";
}

export function reuseLabel(reusedCheck: boolean): string {
    return reusedCheck ? "Reused saved check" : "New check authored";
}

const APPROVAL_LABELS: Record<PilotTemplateRecord["approval"], string> = {
    unreviewed: "Awaiting review",
    approved: "Approved",
    rejected: "Rejected",
};

export function templateApprovalLabel(
    approval: PilotTemplateRecord["approval"],
): string {
    return APPROVAL_LABELS[approval];
}

/** The differentiation pilot's authoring model accepts at most five wrong choices. */
export const PILOT_MAX_DISTRACTORS = 5;

const UNSAFE_PROVENANCE_KEY =
    /(api[_-]?key|authorization|credential|password|secret|token)/i;

function scrubProvenance(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(scrubProvenance);
    if (typeof value === "object" && value !== null) {
        return Object.fromEntries(
            Object.entries(value)
                .filter(([key]) => !UNSAFE_PROVENANCE_KEY.test(key))
                .map(([key, entry]) => [key, scrubProvenance(entry)]),
        );
    }
    return value;
}

/** Hide credential-like keys defensively before rendering draft provenance. */
export function safeProvenance(
    provenance: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
    if (!provenance) return null;
    const sanitized = scrubProvenance(provenance);
    if (!sanitized || typeof sanitized !== "object" || Array.isArray(sanitized)) {
        return null;
    }
    return Object.keys(sanitized).length > 0
        ? (sanitized as Record<string, unknown>)
        : null;
}

export function templateStatusLabel(
    status: PilotTemplateRecord["status"],
): string {
    switch (status) {
        case "ready":
            return "Ready to review";
        case "needs_review":
            return "Needs review";
        case "error":
            return "Authoring error";
    }
}

/** Approval binds to the current immutable template and check digests. */
export function canApproveTemplate(record: PilotTemplateRecord): boolean {
    return Boolean(
        record.status === "ready" &&
            record.template_sha256 &&
            record.template &&
            record.check &&
            record.check.check_ref.sha256 &&
            record.check.qualification.status === "passed" &&
            record.qualification?.status === "passed",
    );
}

/**
 * Generation is a separate gate from check qualification: the educator must
 * have approved the exact current template/check version.
 */
export function generationBlockReason(
    record: PilotTemplateRecord,
): string | null {
    if (record.status !== "ready") {
        return "Only a ready template can generate questions. Review the findings first.";
    }
    if (!record.check) {
        return "A qualified saved check is required before generation.";
    }
    if (record.check.qualification.status !== "passed") {
        return "The saved check does not have passing sampled evidence.";
    }
    if (!record.template) {
        return "The template family is unavailable for this version.";
    }
    if (record.qualification?.status !== "passed") {
        return "The template does not have passing sampled evidence.";
    }
    if (record.approval !== "approved") {
        return "Approve this exact template and check version before generation.";
    }
    return null;
}
