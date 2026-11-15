import { friendlyCheckLabel } from "./checkMetadata";
import type {
    AuthoringJob,
    AuthoringJobSummary,
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

export type StatusKey =
    | "queued"
    | "running"
    | "ready"
    | "needs_review"
    | "failed"
    | "approved"
    | "rejected";

/**
 * The single vocabulary for a job or review status. Every surface that shows a
 * status reads its label, colour and short summary from this table.
 */
const STATUS_LABELS: Record<StatusKey, StatusView> = {
    queued: {
        label: "Queued",
        variant: "default",
        summary: "Waiting for a free authoring slot",
    },
    running: {
        label: "Creating",
        variant: "default",
        summary: "Creating the question",
    },
    ready: {
        label: "Ready for review",
        variant: "success",
        summary: "The technical checks passed, so you can review this question.",
    },
    needs_review: {
        label: "Needs review",
        variant: "default",
        summary: "The technical checks need attention before this question can be approved.",
    },
    failed: {
        label: "Failed",
        variant: "destructive",
        summary: "Question creation stopped",
    },
    approved: {
        label: "Approved",
        variant: "success",
        summary: "You approved this version.",
    },
    rejected: {
        label: "Rejected",
        variant: "destructive",
        summary: "You rejected this version.",
    },
};

export function statusView(key: StatusKey): StatusView {
    return STATUS_LABELS[key];
}

function technicalChecks(review: AuthoringReview) {
    return (review.checks ?? []).filter((check) => !check.advisory);
}

export function getReviewStatus(
    review: AuthoringReview,
    result: AuthoringResult | null,
): StatusView {
    const checks = technicalChecks(review);
    if (review.state === "failed" || result?.status === "error") {
        return statusView("failed");
    }
    const checksPassed =
        checks.length > 0 && checks.every((check) => check.status === "passed");
    if (result?.status === "needs_review" || !review.artifact_sha256 || !checksPassed) {
        return statusView("needs_review");
    }
    return statusView("ready");
}

/** The review header shows a decision when there is one, and the check state otherwise. */
export function getReviewHeaderStatus(
    review: AuthoringReview,
    result: AuthoringResult | null,
): StatusView {
    if (review.approval?.decision === "approved") {
        return statusView("approved");
    }
    if (review.approval?.decision === "rejected") {
        return statusView("rejected");
    }
    return getReviewStatus(review, result);
}

/** The live badge for a job that is still queued or running. */
export function getJobStatus(state: "queued" | "running"): StatusView {
    return state === "queued" ? statusView("queued") : statusView("running");
}

/** The status of a job in the recent jobs table. */
export function getSummaryStatus(job: AuthoringJobSummary): StatusView {
    if (job.state === "queued") {
        return statusView("queued");
    }
    if (job.state === "running") {
        return statusView("running");
    }
    if (job.state === "failed" || job.result_status === "error") {
        return statusView("failed");
    }
    if (job.result_status === "checked") {
        return statusView("ready");
    }
    return statusView("needs_review");
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
