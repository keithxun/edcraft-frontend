import { useCallback, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/router/paths";
import { FlowSteps } from "../components/FlowSteps";
import { PageShell } from "../components/PageShell";
import {
    JobLoadError,
    LoadingCard,
    NoJobSelected,
    ReviewLoadError,
    StaleArtifactNotice,
} from "../components/PageState";
import { ProgressPanel } from "../components/ProgressPanel";
import { RetryRequestLink } from "../components/RetryRequestLink";
import { ReviewPanel } from "../components/ReviewPanel";
import { TechnicalDetails } from "../components/TechnicalDetails";
import { getReviewDraft } from "../draft";
import { getReviewHeaderStatus } from "../status";
import { useAuthoringJob, useAuthoringReview } from "../hooks/useAiAuthoring";
import { useStaleArtifact } from "../hooks/useStaleArtifact";
import type { AuthoringJob, AuthoringReview } from "../types";

const NO_DRAFT_FAILURE_MESSAGE =
    "The model did not write a question for this request. It may be outside what EdCraft supports. Try rephrasing it or choose another model.";
const DRAFT_CHECKS_SUFFIX =
    "The last draft and the checks it failed are shown below.";
const DRAFT_FAILURE_MESSAGE =
    `The model's revision could not be read. ${DRAFT_CHECKS_SUFFIX}`;
const GENERIC_FAILURE_CODE = "AUTHORING_FAILED";

/**
 * Prefer the error that names the actual failure over the generic job error.
 * The draft case reads the generation error kept with the review.
 */
function failureError(
    job: AuthoringJob,
    review: AuthoringReview | null,
): { code: string; message: string } | null {
    const errors = [job.error, job.result?.error, review?.error].filter(
        (error): error is { code: string; message: string } =>
            error !== null && error !== undefined,
    );
    return (
        errors.find((error) => error.code !== GENERIC_FAILURE_CODE) ??
        errors[0] ??
        null
    );
}

function failureMessageFor(
    job: AuthoringJob,
    review: AuthoringReview | null,
    hasDraft: boolean,
): string {
    const error = failureError(job, review);
    if (hasDraft) {
        if (error?.code === "GENERATION_ERROR") return DRAFT_FAILURE_MESSAGE;
        return error
            ? `${error.message} ${DRAFT_CHECKS_SUFFIX}`
            : DRAFT_FAILURE_MESSAGE;
    }
    if (
        error &&
        error.code !== "GENERATION_ERROR" &&
        error.code !== GENERIC_FAILURE_CODE
    ) {
        return error.message;
    }
    return NO_DRAFT_FAILURE_MESSAGE;
}

export default function AiAuthoringJobPage() {
    const { jobId } = useParams<{ jobId: string }>();
    const [reviewEpoch, setReviewEpoch] = useState(0);
    const { showStaleArtifact, markStale, dismissStale } = useStaleArtifact(jobId);

    const jobQuery = useAuthoringJob(jobId);
    const reviewTerminal =
        jobQuery.data?.state === "completed" || jobQuery.data?.state === "failed";
    const reviewQuery = useAuthoringReview(jobId, reviewTerminal);

    const handleStaleArtifact = useCallback(() => {
        setReviewEpoch((epoch) => epoch + 1);
        markStale();
    }, [markStale]);

    if (!jobId) {
        return (
            <PageShell>
                <NoJobSelected />
            </PageShell>
        );
    }

    const job = jobQuery.data;
    const review = reviewQuery.data;
    const terminal = reviewTerminal;
    const needsReview =
        job?.state === "completed" &&
        job.result?.status === "needs_review" &&
        !review?.artifact_sha256;
    const recoverable = job?.state === "failed" || needsReview;
    const draft = getReviewDraft(review);
    const hasDraft = Boolean(draft);
    const failureMessage = job ? failureMessageFor(job, review ?? null, hasDraft) : null;
    const headerStatus =
        job && review ? getReviewHeaderStatus(review, job.result ?? null) : null;

    return (
        <PageShell>
            <FlowSteps current={2} />
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                    <Link
                        to={ROUTES.AI_AUTHORING}
                        className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-2 hover:underline"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        New request
                    </Link>
                    <h1 className="text-2xl font-semibold">Review question</h1>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {headerStatus && (
                        <Badge variant={headerStatus.variant}>{headerStatus.label}</Badge>
                    )}
                </div>
            </div>

            {jobQuery.isPending && <LoadingCard>Loading your question…</LoadingCard>}

            {jobQuery.isError && (
                <JobLoadError
                    error={jobQuery.error}
                    onRetry={() => void jobQuery.refetch()}
                />
            )}

            {job && (
                <>
                    <ProgressPanel job={job} />

                    <StaleArtifactNotice
                        visible={showStaleArtifact}
                        onDismiss={dismissStale}
                    />

                    {recoverable && (
                        <>
                            {job.state === "failed" && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Question creation failed</AlertTitle>
                                    <AlertDescription>{failureMessage}</AlertDescription>
                                </Alert>
                            )}

                            {review?.request && <RetryRequestLink request={review.request} />}

                            {job.state === "failed" &&
                                review &&
                                !hasDraft &&
                                !reviewQuery.isError && (
                                    <TechnicalDetails
                                        review={review}
                                        result={job.result ?? null}
                                    />
                                )}
                        </>
                    )}

                    {terminal && reviewQuery.isPending && (
                        <LoadingCard>Loading the review…</LoadingCard>
                    )}

                    {terminal && reviewQuery.isError && (
                        <ReviewLoadError
                            error={reviewQuery.error}
                            onRetry={() => void reviewQuery.refetch()}
                        />
                    )}

                    {terminal &&
                        review &&
                        !reviewQuery.isError &&
                        (job.state === "completed" ||
                            (job.state === "failed" && hasDraft)) && (
                            <div className="@container/review">
                                <ReviewPanel
                                    key={`review-${jobId}-${reviewEpoch}`}
                                    jobId={jobId}
                                    review={review}
                                    result={job.result ?? null}
                                    onStaleArtifact={handleStaleArtifact}
                                />
                            </div>
                        )}
                </>
            )}
        </PageShell>
    );
}
