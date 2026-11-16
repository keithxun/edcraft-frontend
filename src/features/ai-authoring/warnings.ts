const MISMATCH_CODES = [
    "DIFFICULTY_MISMATCH_LOW_CONFIDENCE",
    "DIFFICULTY_MISMATCH",
    "RELEVANCE_MISMATCH",
];

const GENERATION_WARNING_TERMS = ["DUPLICATE", "SEED"];

const WARNING_TEXT: Record<string, string> = {
    ADVISORY_ASSESSMENT_UNAVAILABLE:
        "An advisory assessment was unavailable, so that result is missing.",
    CHECK_TIMEOUT: "A check timed out before it could finish.",
    DIFFICULTY_MISMATCH:
        "The difficulty check found a different level from the one you asked for.",
    DIFFICULTY_MISMATCH_LOW_CONFIDENCE:
        "The difficulty check found a different level from the one you asked for, with low confidence.",
    DIFFICULTY_UNABLE_TO_ASSESS: "The difficulty check could not estimate a level.",
    JUDGE_TRANSPORT: "The advisory judge could not be reached, so that check did not run.",
    RELEVANCE_FAILED: "The relevance check could not complete.",
    RELEVANCE_MISMATCH: "The relevance check flagged this question as possibly off topic.",
};

/** Review warnings arrive as codes; generation warnings are already prose. */
export function warningText(warning: string): string {
    return WARNING_TEXT[warning.trim().toUpperCase()] ?? warning;
}

function isMismatchOnly(normalized: string): boolean {
    return MISMATCH_CODES.some(
        (code) =>
            normalized === code ||
            normalized.startsWith(`${code}:`) ||
            normalized.startsWith(`${code} `),
    );
}

/**
 * Advisory mismatches are shown in the Advisories card, so their duplicate
 * warning codes are noise on the authoring pages. A warning that also mentions
 * a duplicate or a seed describes generation output and must stay visible.
 */
export function filterMismatchWarnings(warnings: string[] | null | undefined): string[] {
    return (warnings ?? []).filter((warning) => {
        const normalized = warning.trim().toUpperCase();
        if (GENERATION_WARNING_TERMS.some((term) => normalized.includes(term))) {
            return true;
        }
        return !isMismatchOnly(normalized);
    });
}
