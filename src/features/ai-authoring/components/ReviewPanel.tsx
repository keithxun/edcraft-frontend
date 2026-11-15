import { AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ROUTES } from "@/router/paths";
import { filterMismatchWarnings } from "../warnings";
import { draftTemplateFor, getReviewDraft } from "../draft";
import { getApprovalBlockers, isApproved } from "../getApprovalBlockers";
import type {
    AuthoringDifficultyOutcome,
    AuthoringRelevanceOutcome,
    AuthoringResult,
    AuthoringReview,
} from "../types";
import { ApprovalControls } from "./ApprovalControls";
import { RequestSummary } from "./RequestSummary";
import { RetryRequestLink } from "./RetryRequestLink";
import { ChecksPanel, type ChecksAdvisory } from "./ChecksPanel";
import { ReviewQuestionPreview } from "./ReviewQuestionPreview";
import { TechnicalDetails } from "./TechnicalDetails";
import { WarningsPanel } from "./WarningsPanel";

interface ReviewPanelProps {
    jobId: string;
    review: AuthoringReview;
    result: AuthoringResult | null;
    onStaleArtifact: () => void;
}

const ASSESSMENT_PATH_LABELS: Record<string, string> = {
    decision: "Decision screen",
    reasoning: "Reasoning judge",
};

function assessmentPathLabel(path: string | null | undefined): string | null {
    if (!path) return null;
    return ASSESSMENT_PATH_LABELS[path] ?? path;
}

function confidenceMeter(outcome: AuthoringDifficultyOutcome | null | undefined) {
    const confidence = outcome?.confidence ?? null;
    if (confidence === null) return null;
    const assessmentPath = assessmentPathLabel(outcome?.assessment_path);
    return {
        label: "Confidence",
        display: `${Math.round(confidence * 100)}%`,
        percent: confidence * 100,
        caption: assessmentPath ? `Source: ${assessmentPath}` : null,
    };
}

function scoreMeter(outcome: AuthoringRelevanceOutcome | null | undefined) {
    const score = outcome?.score ?? null;
    if (score === null) return null;
    const threshold = outcome?.threshold ?? null;
    return {
        label: "Score",
        display: score.toFixed(2),
        percent: score * 100,
        caption: threshold !== null ? `Threshold ${threshold.toFixed(2)}` : null,
    };
}

function difficultyAdvisory(
    outcome: AuthoringDifficultyOutcome | null | undefined,
): ChecksAdvisory {
    const meter = confidenceMeter(outcome);

    if (
        !outcome ||
        !outcome.estimated_difficulty ||
        outcome.decision === "unavailable" ||
        outcome.status === "error"
    ) {
        return {
            id: "difficulty",
            title: "Difficulty not checked",
            description: "No estimate is available.",
            passed: false,
            meter,
        };
    }

    const estimated = outcome.estimated_difficulty.toLowerCase();
    const requested = outcome.requested_difficulty?.toLowerCase();
    const differs =
        outcome.decision === "advisory_mismatch" ||
        (requested !== undefined && estimated !== requested);

    if (differs) {
        return {
            id: "difficulty",
            title: "Difficulty differs",
            description: requested
                ? `Estimated ${estimated}; requested ${requested}.`
                : `Estimated ${estimated}.`,
            passed: false,
            meter,
        };
    }

    return {
        id: "difficulty",
        title: "Difficulty matches",
        description: `Estimated ${estimated}.`,
        passed: true,
        meter,
    };
}

function relevanceAdvisory(
    outcome: AuthoringRelevanceOutcome | null | undefined,
): ChecksAdvisory {
    const meter = scoreMeter(outcome);

    if (outcome?.relevant === true) {
        return {
            id: "relevance",
            title: "Matches the request",
            description: "The question matches what you asked for.",
            passed: true,
            meter,
        };
    }
    if (outcome?.relevant === false) {
        return {
            id: "relevance",
            title: "May not match the request",
            description: "Read the question against your request before approving.",
            passed: false,
            meter,
        };
    }
    return {
        id: "relevance",
        title: "Relevance not checked",
        description: "No result is available.",
        passed: false,
        meter,
    };
}

export function ReviewPanel({ jobId, review, result, onStaleArtifact }: ReviewPanelProps) {
    const canApprove = getApprovalBlockers(review).length === 0;
    const difficulty = review.difficulty ?? result?.difficulty;
    const relevance = review.relevance ?? result?.relevance;
    const difficultyFeedback = difficultyAdvisory(difficulty);
    const relevanceFeedback = relevanceAdvisory(relevance);
    const draft = getReviewDraft(review);
    const draftTemplate = review.template ?? (draft ? draftTemplateFor(draft.candidate) : null);
    const showingDraft = !review.template && Boolean(draft);
    const checks = review.template ? (review.checks ?? []) : (draft?.checks ?? review.checks ?? []);
    const advisories: ChecksAdvisory[] = [difficultyFeedback, relevanceFeedback];
    const approved = isApproved(review);

    return (
        <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-12">
                <div className="space-y-4 xl:col-span-8">
                    <RequestSummary request={review.request} />
                    <WarningsPanel warnings={filterMismatchWarnings(review.warnings)} />
                    <ReviewQuestionPreview
                        jobId={jobId}
                        domain={review.request.domain}
                        artifactSha256={showingDraft ? null : review.artifact_sha256}
                        draftTemplate={draftTemplate}
                        showingDraft={showingDraft}
                        onStaleArtifact={onStaleArtifact}
                    />
                </div>

                <aside className="space-y-4 xl:col-span-4">
                    <ChecksPanel checks={checks} advisories={advisories} collapsible />

                    {review.state !== "failed" && (
                        <div className="space-y-4 xl:sticky xl:top-6">
                            <Card>
                                <CardContent>
                                    <ApprovalControls
                                        jobId={jobId}
                                        review={review}
                                        canApprove={canApprove}
                                        onStaleArtifact={onStaleArtifact}
                                    />

                                    {review.error && (
                                        <Alert variant="destructive" className="mt-4">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertTitle>Review problem</AlertTitle>
                                            <AlertDescription>
                                                Create a new question if this persists.
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </CardContent>
                            </Card>

                            {review.approval?.decision === "rejected" && (
                                <RetryRequestLink
                                    request={review.request}
                                    title="Start a new question"
                                    description="Your request and settings will be filled in on the create page."
                                    actionLabel="Create a new question"
                                />
                            )}

                            {approved && (
                                <Button asChild className="w-full">
                                    <Link to={ROUTES.AI_AUTHORING_GENERATE(jobId)}>
                                        Create question set
                                    </Link>
                                </Button>
                            )}
                        </div>
                    )}
                </aside>
            </div>

            <TechnicalDetails review={review} result={result} />
        </div>
    );
}
