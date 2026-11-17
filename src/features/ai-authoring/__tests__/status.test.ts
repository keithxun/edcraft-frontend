import { describe, expect, it } from "vitest";
import {
    getJobStatus,
    getReviewHeaderStatus,
    getReviewStatus,
    getSummaryStatus,
    statusView,
} from "../status";
import type { AuthoringJobSummary } from "../types";
import {
    approvedReview,
    completedJob,
    technicalFailureReview,
    unapprovedReview,
} from "./fixtures";

function jobSummary(
    overrides: Partial<AuthoringJobSummary> = {},
): AuthoringJobSummary {
    return {
        job_id: "job-1",
        domain: "code",
        state: "completed",
        created_at: "2026-11-03T00:00:00Z",
        prompt_preview: "Write a question about summing a list.",
        difficulty: "easy",
        approval: null,
        ...overrides,
    };
}

describe("authoring status vocabulary", () => {
    it("keeps the agreed label and summary in one table", () => {
        expect(statusView("queued")).toMatchObject({
            label: "Queued",
            variant: "default",
            summary: "Waiting for a free authoring slot",
        });
        expect(statusView("running")).toMatchObject({
            label: "Creating",
            variant: "default",
            summary: "Creating the question",
        });
        expect(statusView("ready")).toMatchObject({
            label: "Ready for review",
            variant: "success",
        });
        expect(statusView("needs_review")).toMatchObject({
            label: "Needs review",
            variant: "default",
        });
        expect(statusView("failed")).toMatchObject({
            label: "Failed",
            variant: "destructive",
        });
        expect(statusView("approved")).toMatchObject({
            label: "Approved",
            variant: "success",
        });
        expect(statusView("rejected")).toMatchObject({
            label: "Rejected",
            variant: "destructive",
        });
    });

    it("labels a queued job as Queued and every running phase as Creating", () => {
        expect(getJobStatus("queued")).toMatchObject({ label: "Queued" });
        expect(getJobStatus("running")).toMatchObject({ label: "Creating" });
    });

    it("labels a completed review with passing technical checks as Ready for review", () => {
        expect(getReviewStatus(approvedReview, null)).toMatchObject({
            label: "Ready for review",
            variant: "success",
        });
    });

    it("labels a failed technical check as Needs review in a neutral color", () => {
        expect(getReviewStatus(technicalFailureReview, null)).toMatchObject({
            label: "Needs review",
            variant: "default",
        });
    });

    it("labels a review without a checked artefact or technical checks as Needs review", () => {
        expect(
            getReviewStatus({ ...unapprovedReview, artifact_sha256: null }, null).label,
        ).toBe("Needs review");
        expect(getReviewStatus({ ...unapprovedReview, checks: [] }, null).label).toBe(
            "Needs review",
        );
    });

    it("labels a needs_review result as Needs review", () => {
        const result = completedJob.result
            ? { ...completedJob.result, status: "needs_review" as const }
            : null;
        expect(getReviewStatus(unapprovedReview, result).label).toBe("Needs review");
    });

    it("labels a failed review as Failed in red", () => {
        expect(getReviewStatus({ ...approvedReview, state: "failed" }, null)).toMatchObject({
            label: "Failed",
            variant: "destructive",
        });
        expect(
            getReviewStatus(unapprovedReview, {
                ...completedJob.result!,
                status: "error",
            }),
        ).toMatchObject({ label: "Failed", variant: "destructive" });
    });

    it("shows the review decision in the header when there is one", () => {
        expect(getReviewHeaderStatus(approvedReview, null).label).toBe("Approved");
        expect(
            getReviewHeaderStatus(
                {
                    ...approvedReview,
                    approval: { ...approvedReview.approval!, decision: "rejected" },
                },
                null,
            ).label,
        ).toBe("Rejected");
        expect(getReviewHeaderStatus(unapprovedReview, null)).toMatchObject({
            label: "Ready for review",
            variant: "success",
        });
        expect(getReviewHeaderStatus(technicalFailureReview, null).label).toBe(
            "Needs review",
        );
    });

    it("maps every recent job summary to the agreed label", () => {
        expect(getSummaryStatus(jobSummary({ state: "queued" })).label).toBe("Queued");
        expect(getSummaryStatus(jobSummary({ state: "running" })).label).toBe("Creating");
        expect(
            getSummaryStatus(jobSummary({ result_status: "checked" })).label,
        ).toBe("Ready for review");
        expect(
            getSummaryStatus(jobSummary({ result_status: "needs_review" })).label,
        ).toBe("Needs review");
        expect(getSummaryStatus(jobSummary({ result_status: null })).label).toBe(
            "Needs review",
        );
        expect(getSummaryStatus(jobSummary({ state: "failed" })).label).toBe("Failed");
        expect(
            getSummaryStatus(jobSummary({ result_status: "error" })).label,
        ).toBe("Failed");
    });
});
