import { friendlyCheckLabel } from "./checkMetadata";
import type {
    AuthoringJob,
    AuthoringProgressView,
    AuthoringResult,
    AuthoringReview,
} from "./types";

export type StatusVariant =
    | "default"
    | "secondary"
    | "destructive"
    | "success"
    | "outline";

export interface StatusView {
    label: string;
    variant: StatusVariant;
    summary: string;
}

function technicalChecks(review: AuthoringReview) {
    return (review.checks ?? []).filter((check) => !check.advisory);
}

export function getReviewStatus(
    review: AuthoringReview,
    result: AuthoringResult | null,
): StatusView {
    const checks = technicalChecks(review);
    const passed = checks.filter((check) => check.status === "passed").length;
    const summary =
        checks.length > 0
            ? `${passed}/${checks.length} technical checks passed`
            : "No technical checks recorded";

    if (review.state === "failed" || result?.status === "error") {
        return { label: "Failed", variant: "destructive", summary };
    }
    if (
        result?.status === "needs_review" ||
        !review.artifact_sha256 ||
        checks.length === 0 ||
        checks.some((check) => check.status !== "passed")
    ) {
        return { label: "Needs review", variant: "default", summary };
    }
    if (review.state === "completed") {
        return { label: "Ready for review", variant: "success", summary };
    }
    return { label: "Checking", variant: "default", summary };
}

export function getJobStatus(job: AuthoringJob): StatusView {
    if (job.state === "failed") {
        return { label: "Failed", variant: "destructive", summary: "Question creation stopped" };
    }
    if (job.state === "queued") {
        return { label: "Waiting", variant: "default", summary: "Waiting for a free authoring slot" };
    }
    if (job.state === "running") {
        switch (getJobProgress(job)?.phase) {
            case "generating":
                return { label: "Writing", variant: "default", summary: "Writing the question" };
            case "checking":
                return { label: "Checking", variant: "default", summary: "Running technical checks" };
            case "assessing":
                return {
                    label: "Assessing",
                    variant: "default",
                    summary: "Assessing difficulty and relevance",
                };
            case "correcting":
                return { label: "Revising", variant: "default", summary: "Revising the question" };
            case "finalizing":
                return { label: "Finishing", variant: "default", summary: "Finishing the question" };
            default:
                return { label: "Creating", variant: "default", summary: "Creating the question" };
        }
    }
    if (job.result?.status === "needs_review") {
        return { label: "Needs review", variant: "default", summary: "Technical checks need attention" };
    }
    if (job.result?.status === "error") {
        return { label: "Failed", variant: "destructive", summary: "Question creation stopped" };
    }
    if (job.result?.status === "checked") {
        return { label: "Checked", variant: "success", summary: "Ready for evidence review" };
    }
    return { label: "Completed", variant: "success", summary: "Question creation finished" };
}

export type AuthoringStageId = "generating" | "checking" | "revising" | "assessing" | "finalizing";

export type AuthoringStageState = "done" | "active" | "pending";

export interface AuthoringStageView {
    id: AuthoringStageId;
    label: string;
    detail: string | null;
    state: AuthoringStageState;
}

const STAGE_LABELS: Record<AuthoringStageId, string> = {
    generating: "Writing the question",
    checking: "Checking",
    revising: "Revising",
    assessing: "Assessing difficulty and relevance",
    finalizing: "Finishing",
};

/**
 * Read `job.progress` through the richer local view. The generated client still
 * only knows `phase` and `attempt`; the extra fields pass through untouched.
 */
export function getJobProgress(job: AuthoringJob): AuthoringProgressView | null {
    return (job.progress as AuthoringProgressView | null | undefined) ?? null;
}

function checksDetail(progress: AuthoringProgressView): string | null {
    const parts: string[] = [];
    if (progress.checks_done != null && progress.checks_total != null) {
        parts.push(`${progress.checks_done} of ${progress.checks_total} checks`);
    }
    if (progress.current_check) {
        parts.push(friendlyCheckLabel(progress.current_check));
    }
    return parts.length > 0 ? parts.join(" · ") : null;
}

function revisionDetail(progress: AuthoringProgressView): string | null {
    if (progress.attempt <= 0) return null;
    return progress.max_attempts != null
        ? `attempt ${progress.attempt} of ${progress.max_attempts}`
        : `attempt ${progress.attempt}`;
}

function stageForPhase(phase: AuthoringProgressView["phase"]): AuthoringStageId {
    switch (phase) {
        case "generating":
            return "generating";
        case "checking":
            return "checking";
        case "correcting":
            return "revising";
        case "assessing":
            return "assessing";
        case "finalizing":
            return "finalizing";
    }
}

function stageDetail(id: AuthoringStageId, progress: AuthoringProgressView | null) {
    if (!progress) return null;
    if (id === "checking" || id === "assessing") return checksDetail(progress);
    if (id === "revising") return revisionDetail(progress);
    return null;
}

/**
 * The ordered stages shown while a job is queued or running. "Revising" only
 * appears once a revision is part of this job: while correcting, or after a
 * first attempt has failed. A queued job has no current stage yet.
 */
export function getJobStages(job: AuthoringJob): AuthoringStageView[] {
    const progress = getJobProgress(job);
    const includesRevision = progress?.phase === "correcting" || (progress?.attempt ?? 0) > 1;
    const ids: AuthoringStageId[] = [
        "generating",
        "checking",
        ...(includesRevision ? (["revising"] as const) : []),
        "assessing",
        "finalizing",
    ];
    const current =
        job.state === "running" ? (progress ? stageForPhase(progress.phase) : "generating") : null;
    const currentIndex = current ? ids.indexOf(current) : -1;

    return ids.map((id, index) => {
        const state: AuthoringStageState =
            currentIndex < 0
                ? "pending"
                : index < currentIndex
                  ? "done"
                  : index === currentIndex
                    ? "active"
                    : "pending";
        return {
            id,
            label: STAGE_LABELS[id],
            detail: state === "active" ? stageDetail(id, progress) : null,
            state,
        };
    });
}
