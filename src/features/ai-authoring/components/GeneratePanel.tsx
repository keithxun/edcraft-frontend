import { useEffect, useRef, useState } from "react";
import { AlertCircle, Download, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { downloadAuthoringBatch } from "../download";
import {
    getAuthoringErrorMessage,
    isApprovalConflictError,
    isStaleArtifactError,
} from "../errors";
import { isApproved } from "../getApprovalBlockers";
import { useGenerateAuthoringBatch } from "../hooks/useAiAuthoring";
import type { AuthoringBatch, AuthoringReview } from "../types";
import { MAX_SEED, seedRangeError } from "../validation";
import { filterMismatchWarnings } from "../warnings";
import { PreviewQuestion } from "./PreviewQuestion";
import { WarningsPanel } from "./WarningsPanel";

interface GeneratePanelProps {
    jobId: string;
    review: AuthoringReview;
    maxQuantity: number;
    onStaleArtifact: () => void;
}

export function GeneratePanel({
    jobId,
    review,
    maxQuantity,
    onStaleArtifact,
}: GeneratePanelProps) {
    const approved = isApproved(review);
    const [quantityInput, setQuantityInput] = useState(String(Math.min(5, maxQuantity)));
    const [seedInput, setSeedInput] = useState("0");
    const [inputError, setInputError] = useState<string | null>(null);
    const [batchState, setBatchState] = useState<{
        approvalKey: string;
        batch: AuthoringBatch;
    } | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const generation = useGenerateAuthoringBatch();

    const artifactDigest = review.artifact_sha256;
    // A rejection can keep the same digest, so bind displayed output to the
    // job, decision and decision timestamp as well as the artifact digest. This
    // component owns approval changes; the page key handles navigation and
    // global stale notifications.
    const approvalKey = [
        jobId,
        artifactDigest ?? "",
        review.approval?.artifact_sha256 ?? "",
        review.approval?.decision ?? "unreviewed",
        review.approval?.decided_at ?? "",
    ].join(":");
    const approvalKeyRef = useRef(approvalKey);
    approvalKeyRef.current = approvalKey;
    const batch = approved && batchState?.approvalKey === approvalKey ? batchState.batch : null;

    useEffect(() => {
        setBatchState(null);
        setActionError(null);
    }, [approvalKey]);

    const generate = () => {
        if (generation.isPending) return;
        if (!artifactDigest || !approved) {
            setInputError("Approve this question before creating new questions.");
            return;
        }

        const quantity = Number(quantityInput);
        const seed = Number(seedInput);
        if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > maxQuantity) {
            setInputError(`Choose a whole number of questions from 1 to ${maxQuantity}.`);
            return;
        }
        if (!seedInput.trim()) {
            setInputError(`Enter a seed from 0 to ${MAX_SEED}.`);
            return;
        }
        const invalidSeedRange = seedRangeError(seed, quantity);
        if (invalidSeedRange) {
            setInputError(invalidSeedRange);
            return;
        }

        const requestApprovalKey = approvalKey;
        setInputError(null);
        setActionError(null);
        generation.mutate(
            {
                jobId,
                input: {
                    artifact_sha256: artifactDigest,
                    seed,
                    quantity,
                },
            },
            {
                onSuccess: (result) => {
                    if (approvalKeyRef.current !== requestApprovalKey) return;
                    setBatchState({ approvalKey: requestApprovalKey, batch: result });
                },
                onError: (error) => {
                    if (isStaleArtifactError(error) || isApprovalConflictError(error)) {
                        setBatchState(null);
                        onStaleArtifact();
                    }
                    setActionError(
                        getAuthoringErrorMessage(
                            error,
                            "The questions could not be created.",
                        ),
                    );
                },
            },
        );
    };

    const seed = Number(seedInput);
    const quantity = Number(quantityInput);
    const canPreviewSeeds =
        Number.isInteger(quantity) &&
        quantity >= 1 &&
        quantity <= maxQuantity &&
        seedRangeError(seed, quantity) === null;

    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="space-y-4">
                    {!approved && (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Approval needed</AlertTitle>
                            <AlertDescription>
                                Approve this question before creating more versions of it.
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="flex flex-wrap items-start gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="generation-quantity">How many questions?</Label>
                            <Input
                                id="generation-quantity"
                                type="number"
                                min={1}
                                max={maxQuantity}
                                step={1}
                                value={quantityInput}
                                onChange={(event) => setQuantityInput(event.target.value)}
                                disabled={!approved || generation.isPending}
                                className="w-28"
                            />
                            <p className="text-xs text-muted-foreground">1–{maxQuantity}</p>
                        </div>

                        {approved && (
                            <div className="space-y-2">
                                <Label htmlFor="generation-seed">Starting seed</Label>
                                <Input
                                    id="generation-seed"
                                    type="number"
                                    step={1}
                                    value={seedInput}
                                    onChange={(event) => setSeedInput(event.target.value)}
                                    disabled={generation.isPending}
                                    className="w-40"
                                />
                                <p className="text-xs text-muted-foreground">
                                    {canPreviewSeeds
                                        ? `Seeds ${seed}–${seed + quantity - 1}`
                                        : `0–${MAX_SEED}`}
                                </p>
                            </div>
                        )}

                        {/* Reserve the label row so the button lines up with the
                            inputs rather than the helper text underneath them. */}
                        <div className="space-y-2">
                            <div
                                aria-hidden="true"
                                className="text-sm font-medium leading-none invisible"
                            >
                                Create
                            </div>
                            <Button
                                type="button"
                                onClick={generate}
                                disabled={!approved || generation.isPending}
                            >
                                {generation.isPending && (
                                    <Loader2
                                        className="h-4 w-4 animate-spin"
                                        aria-hidden="true"
                                    />
                                )}
                                {batch ? "Create another set" : "Create questions"}
                            </Button>
                        </div>
                    </div>

                    {inputError && (
                        <p role="alert" className="text-sm text-destructive">
                            {inputError}
                        </p>
                    )}

                    {actionError && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Questions could not be created</AlertTitle>
                            <AlertDescription>{actionError}</AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {batch && (
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <CardTitle as="h2">Generated questions</CardTitle>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => downloadAuthoringBatch(batch)}
                            >
                                <Download className="h-4 w-4" />
                                Download JSON
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <WarningsPanel
                            warnings={filterMismatchWarnings(batch.warnings)}
                            headingLevel="h3"
                        />

                        {batch.questions.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No questions were created. Try a different starting seed.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {batch.questions.map((instance, index) => {
                                    const key =
                                        typeof instance.template_id === "string"
                                            ? `${instance.template_id}-${String(instance.seed)}`
                                            : `question-${index}`;
                                    return (
                                        <details key={key} className="rounded-md border p-3">
                                            <summary className="cursor-pointer text-sm font-medium">
                                                Question {index + 1}
                                            </summary>
                                            <div className="pt-3">
                                                <PreviewQuestion
                                                    instance={instance}
                                                    domain={batch.domain}
                                                    headingLevel="h3"
                                                    variant="review"
                                                />
                                            </div>
                                        </details>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
