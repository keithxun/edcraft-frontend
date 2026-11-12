import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    approveBlockReason,
    rejectBlockReason,
    templateApprovalBadgeVariant,
    templateApprovalLabel,
} from "../checkPilot";
import { getCheckPilotErrorMessage } from "../errors";
import { useDecidePilotTemplate } from "../hooks/useCheckPilot";
import type { PilotApprovalInput, PilotTemplateRecord } from "../types";

interface TemplateApprovalProps {
    record: PilotTemplateRecord;
}

function shortDigest(digest: string): string {
    return `${digest.slice(0, 12)}…`;
}

/**
 * Immutable-version approval. Both current digests are visible; the check digest
 * is sent only when a saved check exists. Approval never publishes the template.
 */
export function TemplateApproval({ record }: TemplateApprovalProps) {
    const [actionError, setActionError] = useState<string | null>(null);
    const [showReject, setShowReject] = useState(false);
    const decision = useDecidePilotTemplate();
    const checkSha = record.check?.check_ref.sha256 ?? null;
    const approveReason = approveBlockReason(record);
    // Rejection only needs the exact template version being rejected, not
    // passing sampled evidence or a saved check.
    const rejectReason = rejectBlockReason(record);
    const approvable = approveReason === null;
    const rejectable = rejectReason === null;

    const decide = (next: "approved" | "rejected") => {
        if (decision.isPending) return;
        if (next === "approved" && !approvable) return;
        if (next === "rejected" && !rejectable) return;
        setActionError(null);
        const input: PilotApprovalInput = {
            template_sha256: record.template_sha256,
            decision: next,
        };
        if (checkSha) input.check_sha256 = checkSha;
        decision.mutate(
            {
                templateId: record.template_id,
                input,
            },
            {
                onSuccess: () => setShowReject(false),
                onError: (error) =>
                    setActionError(
                        getCheckPilotErrorMessage(
                            error,
                            "The approval decision could not be saved.",
                        ),
                    ),
            },
        );
    };

    return (
        <section aria-labelledby="template-approval-heading" className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <h2 id="template-approval-heading" className="text-sm font-medium">
                    Template approval
                </h2>
                <Badge variant={templateApprovalBadgeVariant(record.approval)}>
                    {templateApprovalLabel(record.approval)}
                </Badge>
            </div>

            <p className="text-sm">Approval applies to these exact versions.</p>
            <dl className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-[minmax(9rem,auto)_1fr]">
                <dt className="font-medium text-muted-foreground">Template SHA-256</dt>
                <dd>
                    <code className="font-mono" title={record.template_sha256}>
                        {shortDigest(record.template_sha256)}
                    </code>
                </dd>
                <dt className="font-medium text-muted-foreground">Check SHA-256</dt>
                <dd>
                    {checkSha ? (
                        <code className="font-mono" title={checkSha}>
                            {shortDigest(checkSha)}
                        </code>
                    ) : (
                        <span className="text-muted-foreground">No saved check</span>
                    )}
                </dd>
            </dl>

            {approveReason && (
                <p className="text-sm text-muted-foreground">{approveReason}</p>
            )}

            {rejectReason && (
                <p className="text-sm text-muted-foreground">{rejectReason}</p>
            )}

            {record.approval === "rejected" && (
                <p className="text-sm">
                    This template version is rejected. Its findings and saved evidence
                    remain visible for review.
                </p>
            )}

            {actionError && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Decision not saved</AlertTitle>
                    <AlertDescription>{actionError}</AlertDescription>
                </Alert>
            )}

            {showReject ? (
                <div className="space-y-2 rounded-md border p-3">
                    <p className="text-sm">
                        Rejection binds to the current template version and needs no
                        qualified check. Any saved check stays available for another
                        template.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => decide("rejected")}
                            disabled={!rejectable || decision.isPending}
                        >
                            {decision.isPending && (
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            )}
                            Confirm rejection
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowReject(false)}
                            disabled={decision.isPending}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-wrap gap-2">
                    <Button
                        type="button"
                        variant="success"
                        onClick={() => decide("approved")}
                        disabled={!approvable || decision.isPending}
                    >
                        {decision.isPending && (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        )}
                        Approve template
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={() => {
                            setActionError(null);
                            setShowReject(true);
                        }}
                        disabled={!rejectable || decision.isPending}
                    >
                        Reject template
                    </Button>
                </div>
            )}

            <p className="text-xs text-muted-foreground">
                This is a private decision. It does not publish or share the template.
            </p>
        </section>
    );
}
