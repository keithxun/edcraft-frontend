import { Link } from "react-router-dom";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ROUTES } from "@/router/paths";
import { getAuthoringErrorMessage, isNotFoundError } from "../errors";

/** Shared loading, stale and error states for the job and generate pages. */

const STALE_ARTIFACT_MESSAGE =
    "The checked question changed. The latest review is being loaded and any old preview or generated questions were cleared.";

export function LoadingCard({ children }: { children: string }) {
    return (
        <Card>
            <CardContent className="text-sm text-muted-foreground">{children}</CardContent>
        </Card>
    );
}

export function NoJobSelected() {
    return (
        <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No question selected</AlertTitle>
            <AlertDescription>
                <Link className="underline underline-offset-2" to={ROUTES.AI_AUTHORING}>
                    Create a new question
                </Link>
            </AlertDescription>
        </Alert>
    );
}

export function JobLoadError({
    error,
    onRetry,
}: {
    error: unknown;
    onRetry: () => void;
}) {
    return (
        <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>
                {isNotFoundError(error) ? "Question not found" : "Question could not be loaded"}
            </AlertTitle>
            <AlertDescription className="space-y-2">
                <p>{getAuthoringErrorMessage(error, "The question could not be loaded.")}</p>
                {!isNotFoundError(error) && (
                    <Button type="button" size="sm" variant="outline" onClick={onRetry}>
                        <RefreshCw className="h-4 w-4" />
                        Retry
                    </Button>
                )}
                <p>
                    <Link className="underline underline-offset-2" to={ROUTES.AI_AUTHORING}>
                        Create a new question
                    </Link>
                </p>
            </AlertDescription>
        </Alert>
    );
}

export function ReviewLoadError({
    error,
    onRetry,
}: {
    error: unknown;
    onRetry: () => void;
}) {
    return (
        <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Review could not be loaded</AlertTitle>
            <AlertDescription className="space-y-2">
                <p>{getAuthoringErrorMessage(error, "The review could not be loaded.")}</p>
                <Button type="button" size="sm" variant="outline" onClick={onRetry}>
                    <RefreshCw className="h-4 w-4" />
                    Retry review
                </Button>
            </AlertDescription>
        </Alert>
    );
}

export function StaleArtifactNotice({
    visible,
    onDismiss,
}: {
    visible: boolean;
    onDismiss: () => void;
}) {
    if (!visible) return null;

    return (
        <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>The question changed</AlertTitle>
            <AlertDescription className="space-y-2">
                <p>{STALE_ARTIFACT_MESSAGE}</p>
                <Button type="button" size="sm" variant="outline" onClick={onDismiss}>
                    Dismiss
                </Button>
            </AlertDescription>
        </Alert>
    );
}
