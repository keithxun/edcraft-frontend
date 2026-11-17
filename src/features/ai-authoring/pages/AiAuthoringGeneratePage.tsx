import { Link, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/router/paths";
import { GeneratePanel } from "../components/GeneratePanel";
import { FlowSteps } from "../components/FlowSteps";
import { PageShell } from "../components/PageShell";
import {
    JobLoadError,
    LoadingCard,
    NoJobSelected,
    ReviewLoadError,
    StaleArtifactNotice,
} from "../components/PageState";
import { getAuthoringErrorMessage } from "../errors";
import { getReviewHeaderStatus } from "../status";
import {
    useAuthoringCapabilities,
    useAuthoringJob,
    useAuthoringReview,
} from "../hooks/useAiAuthoring";
import { useStaleArtifact } from "../hooks/useStaleArtifact";

export default function AiAuthoringGeneratePage() {
    const { jobId } = useParams<{ jobId: string }>();
    const { showStaleArtifact, markStale, dismissStale } = useStaleArtifact(jobId);

    const jobQuery = useAuthoringJob(jobId);
    const reviewTerminal =
        jobQuery.data?.state === "completed" || jobQuery.data?.state === "failed";
    const reviewQuery = useAuthoringReview(jobId, reviewTerminal);
    const capabilitiesQuery = useAuthoringCapabilities();

    if (!jobId) {
        return (
            <PageShell>
                <NoJobSelected />
            </PageShell>
        );
    }

    const job = jobQuery.data;
    const review = reviewQuery.data;
    const headerStatus =
        job && review ? getReviewHeaderStatus(review, job.result ?? null) : null;

    return (
        <PageShell>
            <FlowSteps current={3} />
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                    <Link
                        to={ROUTES.AI_AUTHORING_JOB(jobId)}
                        className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-2 hover:underline"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to review
                    </Link>
                    <h1 className="text-2xl font-semibold">Create question set</h1>
                    <p className="text-sm text-muted-foreground">
                        Every question uses the same approved version.
                    </p>
                </div>
                {headerStatus && (
                    <Badge variant={headerStatus.variant}>{headerStatus.label}</Badge>
                )}
            </div>

            {jobQuery.isPending && <LoadingCard>Loading your question…</LoadingCard>}

            {jobQuery.isError && (
                <JobLoadError
                    error={jobQuery.error}
                    onRetry={() => void jobQuery.refetch()}
                />
            )}

            <StaleArtifactNotice visible={showStaleArtifact} onDismiss={dismissStale} />

            {job && job.state !== "completed" && (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>This question is not ready to reuse</AlertTitle>
                    <AlertDescription className="space-y-2">
                        <p>Only completed questions can be reused.</p>
                        <Link
                            className="underline underline-offset-2"
                            to={ROUTES.AI_AUTHORING_JOB(jobId)}
                        >
                            Return to the review
                        </Link>
                    </AlertDescription>
                </Alert>
            )}

            {job && job.state === "completed" && reviewQuery.isPending && (
                <LoadingCard>Loading the review…</LoadingCard>
            )}

            {job && job.state === "completed" && reviewQuery.isError && (
                <ReviewLoadError
                    error={reviewQuery.error}
                    onRetry={() => void reviewQuery.refetch()}
                />
            )}

            {job && review && capabilitiesQuery.isPending && (
                <LoadingCard>Loading question settings…</LoadingCard>
            )}

            {job && review && capabilitiesQuery.isError && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Question settings unavailable</AlertTitle>
                    <AlertDescription>
                        {getAuthoringErrorMessage(
                            capabilitiesQuery.error,
                            "The question settings could not be loaded.",
                        )}
                    </AlertDescription>
                </Alert>
            )}

            {job && review && capabilitiesQuery.data && !reviewQuery.isError && (
                <GeneratePanel
                    key={`generate-${jobId}`}
                    jobId={jobId}
                    review={review}
                    maxQuantity={capabilitiesQuery.data.max_quantity}
                    onStaleArtifact={markStale}
                />
            )}
        </PageShell>
    );
}
