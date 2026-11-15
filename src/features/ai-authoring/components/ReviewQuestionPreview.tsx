import { useState } from "react";
import { AlertCircle, Loader2, RefreshCw, Shuffle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthoringErrorMessage, isStaleArtifactError } from "../errors";
import { useAuthoringPreview } from "../hooks/useAiAuthoring";
import type { ReviewTemplate } from "../types";
import { MAX_SEED } from "../validation";
import { PreviewQuestion } from "./PreviewQuestion";
import { TemplateQuestionPreview } from "./TemplateQuestionPreview";

interface ReviewQuestionPreviewProps {
    jobId: string;
    /** Authoring domain from the review request; preview and template use it. */
    domain: string;
    artifactSha256: string | null | undefined;
    draftTemplate?: ReviewTemplate | null;
    showingDraft?: boolean;
    onStaleArtifact: () => void;
}

export function ReviewQuestionPreview({
    jobId,
    domain,
    artifactSha256,
    draftTemplate,
    showingDraft = false,
    onStaleArtifact,
}: ReviewQuestionPreviewProps) {
    const [previewSeed, setPreviewSeed] = useState(0);
    const previewQuery = useAuthoringPreview(jobId, artifactSha256, previewSeed);

    const randomize = () => {
        setPreviewSeed((current) => {
            if (MAX_SEED <= 0) return current;
            const next = Math.floor(Math.random() * (MAX_SEED + 1));
            return next === current ? (next + 1) % (MAX_SEED + 1) : next;
        });
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle>Example question</CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                        {showingDraft && draftTemplate && (
                            <Badge variant="destructive">Draft · checks failed</Badge>
                        )}
                        {artifactSha256 && (
                            <span className="text-xs text-muted-foreground">
                                Seed {previewSeed}
                            </span>
                        )}
                        {artifactSha256 && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={randomize}
                                disabled={previewQuery.isFetching}
                            >
                                <Shuffle className="h-4 w-4" aria-hidden="true" />
                                Randomize
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {!artifactSha256 && !draftTemplate && (
                    <p className="text-sm text-muted-foreground">
                        A sample is available after the question has been checked.
                    </p>
                )}

                {!artifactSha256 && draftTemplate && (
                    <>
                        {showingDraft && (
                            <p className="text-sm text-muted-foreground">
                                This draft did not pass technical checks. Inspect it, then retry
                                with a revised request or another model.
                            </p>
                        )}
                        <TemplateQuestionPreview template={draftTemplate} domain={domain} />
                    </>
                )}

                {artifactSha256 && previewQuery.isPending && (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        Loading sample…
                    </p>
                )}

                {artifactSha256 && previewQuery.isError && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Sample could not be loaded</AlertTitle>
                        <AlertDescription className="space-y-2">
                            <p>
                                {getAuthoringErrorMessage(
                                    previewQuery.error,
                                    "The sample question could not be loaded.",
                                )}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {isStaleArtifactError(previewQuery.error) ? (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={onStaleArtifact}
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                        Refresh evidence
                                    </Button>
                                ) : (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => void previewQuery.refetch()}
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                        Retry sample
                                    </Button>
                                )}
                            </div>
                        </AlertDescription>
                    </Alert>
                )}

                {artifactSha256 && previewQuery.data && !previewQuery.isError && (
                    <PreviewQuestion
                        instance={previewQuery.data.question}
                        domain={domain}
                        headingLevel="h3"
                        variant="review"
                    />
                )}
            </CardContent>
        </Card>
    );
}
