import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getAuthoringErrorMessage, isStaleArtifactError } from "../errors";
import { capitalize, formatDate } from "../format";
import { getApprovalBlockers } from "../getApprovalBlockers";
import { useDecideAuthoringApproval } from "../hooks/useAiAuthoring";
import type { ApprovalDecision, AuthoringReview } from "../types";

const MAX_NOTE_LENGTH = 2000;

const APPROVAL_BLOCKER_ID = "approval-blocker";

interface ApprovalControlsProps {
    jobId: string;
    review: AuthoringReview;
    canApprove: boolean;
    onStaleArtifact: () => void;
}

export function ApprovalControls({
    jobId,
    review,
    canApprove,
    onStaleArtifact,
}: ApprovalControlsProps) {
    const [actionError, setActionError] = useState<string | null>(null);
    const [showReject, setShowReject] = useState(false);
    const [rejectionNote, setRejectionNote] = useState("");
    const approval = review.approval;
    const approvalMutation = useDecideAuthoringApproval();
    const [blocker] = getApprovalBlockers(review);
    const describedBy = !canApprove && blocker ? APPROVAL_BLOCKER_ID : undefined;

    const decide = (decision: ApprovalDecision, note: string | null = null) => {
        if (!review.artifact_sha256 || !canApprove || approvalMutation.isPending) return;
        setActionError(null);
        approvalMutation.mutate(
            {
                jobId,
                input: {
                    artifact_sha256: review.artifact_sha256,
                    decision,
                    note,
                },
            },
            {
                onSuccess: () => {
                    setShowReject(false);
                    setRejectionNote("");
                },
                onError: (error) => {
                    if (isStaleArtifactError(error)) {
                        onStaleArtifact();
                    }
                    setActionError(
                        getAuthoringErrorMessage(
                            error,
                            "The review decision could not be saved.",
                        ),
                    );
                },
            },
        );
    };

    return (
        <section aria-labelledby="approval-heading" className="space-y-3">
            <h2 id="approval-heading" className="font-medium">
                Review decision
            </h2>

            {approval && (
                <div
                    className={cn(
                        "rounded-md border p-3 text-sm",
                        approval.decision === "approved"
                            ? "border-success/40 bg-success/10"
                            : "border-destructive/40 bg-destructive/10",
                    )}
                >
                    <p>
                        {capitalize(approval.decision)} on {formatDate(approval.decided_at)}
                    </p>
                    {approval.note && <p className="mt-1">Note: {approval.note}</p>}
                </div>
            )}

            {approval && review.artifact_sha256 && (
                <p className="text-xs text-muted-foreground">
                    {capitalize(approval.decision)} version{" "}
                    <code
                        className="font-mono"
                        title={review.artifact_sha256}
                    >
                        {review.artifact_sha256.slice(0, 12)}…
                    </code>{" "}
                    ·{" "}
                    <a
                        href="#technical-details"
                        className="underline underline-offset-2"
                    >
                        Technical details
                    </a>
                </p>
            )}

            {!canApprove && blocker && (
                <p id={APPROVAL_BLOCKER_ID} className="text-sm text-muted-foreground">
                    {blocker}
                </p>
            )}

            {actionError && (
                <Alert variant="destructive" role="alert">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Decision not saved</AlertTitle>
                    <AlertDescription>{actionError}</AlertDescription>
                </Alert>
            )}

            {showReject ? (
                <div className="space-y-2 rounded-md border p-3">
                    <Label htmlFor="rejection-note">Reason (optional)</Label>
                    <Textarea
                        id="rejection-note"
                        value={rejectionNote}
                        onChange={(event) => setRejectionNote(event.target.value)}
                        maxLength={MAX_NOTE_LENGTH}
                        rows={3}
                        autoFocus
                        placeholder="Why are you rejecting this version?"
                        disabled={approvalMutation.isPending}
                    />
                    <p className="text-xs text-muted-foreground">
                        Shown with the decision and kept with this version.
                    </p>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="destructive"
                            className="flex-1"
                            onClick={() =>
                                decide("rejected", rejectionNote.trim() || null)
                            }
                            disabled={approvalMutation.isPending}
                        >
                            {approvalMutation.isPending && (
                                <Loader2
                                    className="h-4 w-4 animate-spin"
                                    aria-hidden="true"
                                />
                            )}
                            Confirm rejection
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setShowReject(false);
                                setRejectionNote("");
                            }}
                            disabled={approvalMutation.isPending}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-2">
                    {approval?.decision !== "approved" && (
                        <Button
                            type="button"
                            variant="success"
                            className="w-full"
                            onClick={() => decide("approved")}
                            disabled={!canApprove || approvalMutation.isPending}
                            aria-describedby={describedBy}
                        >
                            {approvalMutation.isPending && (
                                <Loader2
                                    className="h-4 w-4 animate-spin"
                                    aria-hidden="true"
                                />
                            )}
                            Approve question
                        </Button>
                    )}
                    {approval?.decision !== "rejected" && (
                        <Button
                            type="button"
                            variant="destructive"
                            className="w-full"
                            onClick={() => {
                                setActionError(null);
                                setShowReject(true);
                            }}
                            disabled={!canApprove || approvalMutation.isPending}
                        >
                            Reject question
                        </Button>
                    )}
                </div>
            )}
            <p className="text-xs text-muted-foreground">
                Approval applies to this exact version.
            </p>
        </section>
    );
}
