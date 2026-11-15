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
const DRAFT_FAILURE_MESSAGE =
    "The model's revision could not be read. The last draft and the checks it failed are shown below.";
const SPECIFIC_FAILURE =
    /timeout|timed out|time out|busy|rate.?limit|server restarted/i;

/** Timeouts and busy servers already have useful backend wording. */
function specificFailureMessage(
    job: AuthoringJob,
    review: AuthoringReview | null,
): string | null {
    const errors = [job.error, job.result?.error, review?.error];
    for (const error of errors) {
        if (!error) continue;
        if (SPECIFIC_FAILURE.test(`${error.code} ${error.message}`)) {
            return error.message;
        }
    }
    return null;
}

function failureMessageFor(
    job: AuthoringJob,
    review: AuthoringReview | null,
    hasDraft: boolean,
): string {
    const specific = specificFailureMessage(job, review);
    if (specific) return specific;
    if (!review) {
        return (
            job.error?.message ??
            job.result?.error?.message ??
            "The question could not be created."
        );
    }
    return hasDraft ? DRAFT_FAILURE_MESSAGE : NO_DRAFT_FAILURE_MESSAGE;
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
                            <ReviewPanel
                                key={`review-${jobId}-${reviewEpoch}`}
                                jobId={jobId}
                                review={review}
                                result={job.result ?? null}
                                onStaleArtifact={handleStaleArtifact}
                            />
                        )}
                </>
            )}
        </PageShell>
    );
}
