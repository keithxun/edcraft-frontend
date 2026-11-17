import type {
    AuthoringCheck,
    AuthoringReview,
    AuthoringTemplateCandidate,
    ReviewAttempt,
    ReviewTemplate,
} from "./types";

export interface ReviewDraft {
    /** The attempt the draft came from, or null when only the review carries it. */
    attempt: ReviewAttempt | null;
    candidate: AuthoringTemplateCandidate;
    checks: AuthoringCheck[];
}

/** The most recent attempt that kept a candidate, by attempt number. */
export function latestDraftAttempt(
    attempts: ReviewAttempt[] | null | undefined,
): ReviewAttempt | null {
    let latest: ReviewAttempt | null = null;
    for (const attempt of attempts ?? []) {
        if (!attempt.candidate) continue;
        if (!latest || attempt.number >= latest.number) {
            latest = attempt;
        }
    }
    return latest;
}

/**
 * The draft to show when no checked template exists. Prefer the latest attempt
 * so a failed revision is never hidden behind an older attempt.
 */
export function getReviewDraft(
    review: AuthoringReview | null | undefined,
): ReviewDraft | null {
    if (!review) return null;

    const attempt = latestDraftAttempt(review.attempts);
    const candidate = attempt?.candidate ?? review.candidate ?? null;
    if (!candidate) return null;

    return {
        attempt,
        candidate,
        checks: attempt?.checks ?? review.checks ?? [],
    };
}

export function draftTemplateFor(candidate: AuthoringTemplateCandidate): ReviewTemplate {
    const templateId = candidate.template_id;
    return {
        template_id: typeof templateId === "string" ? templateId : "draft",
        candidate,
    };
}
