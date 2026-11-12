import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_SEED, seedRangeError } from "@/features/ai-authoring/validation";
import { generationBlockReason } from "../checkPilot";
import { getCheckPilotErrorMessage } from "../errors";
import { useGeneratePilotBatch } from "../hooks/useCheckPilot";
import type { PilotBatch, PilotQuestion, PilotTemplateRecord } from "../types";

interface PilotGenerationProps {
    record: PilotTemplateRecord;
    maxQuantity: number;
}

function choiceLetter(index: number): string {
    return index < 26 ? String.fromCharCode(65 + index) : String(index + 1);
}

function QuestionCard({ question, index }: { question: PilotQuestion; index: number }) {
    const correctIndex =
        Number.isInteger(question.correct_index) &&
        question.correct_index >= 0 &&
        question.correct_index < question.choices.length
            ? question.correct_index
            : null;
    const parameters = Object.entries(question.parameters);

    return (
        <article className="space-y-4 rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-medium">Question {index + 1}</h3>
                <span className="text-xs text-muted-foreground">
                    Check {question.check_ref.check_id} · version{" "}
                    {question.check_ref.version}
                </span>
            </div>

            <p className="break-words text-lg font-semibold">{question.expression}</p>
            <p className="text-sm">{question.question}</p>

            <ol className="space-y-2" aria-label={`Options for question ${index + 1}`}>
                {question.choices.map((choice, choiceIndex) => {
                    const correct = choiceIndex === correctIndex;
                    return (
                        <li
                            key={choiceIndex}
                            data-correct={correct ? "true" : undefined}
                            className={
                                correct
                                    ? "flex items-start gap-2 rounded-md border border-success/40 bg-success/10 p-2"
                                    : "flex items-start gap-2 rounded-md border p-2"
                            }
                        >
                            <span className="font-mono text-xs text-muted-foreground">
                                {choiceLetter(choiceIndex)}.
                            </span>
                            <span className="min-w-0 flex-1 break-words text-sm">
                                {choice}
                            </span>
                            {correct && <Badge variant="success">Correct</Badge>}
                        </li>
                    );
                })}
            </ol>

            <div className="rounded-md border bg-muted/30 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Answer key
                </p>
                <p className="mt-1 break-words text-sm font-medium">
                    {correctIndex === null
                        ? "The server did not return a valid correct index."
                        : `${choiceLetter(correctIndex)}. ${question.answer}`}
                </p>
            </div>

            <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Parameters
                </p>
                {parameters.length === 0 ? (
                    <p className="text-sm text-muted-foreground">None</p>
                ) : (
                    <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[minmax(6rem,auto)_1fr]">
                        {parameters.map(([name, value]) => (
                            <div key={name} className="contents">
                                <dt className="font-mono text-xs text-muted-foreground">
                                    {name}
                                </dt>
                                <dd className="break-words">{String(value)}</dd>
                            </div>
                        ))}
                    </dl>
                )}
            </div>
        </article>
    );
}

/** Seeded, provider-free generation for one approved immutable template. */
export function PilotGeneration({ record, maxQuantity }: PilotGenerationProps) {
    const [seedInput, setSeedInput] = useState("0");
    const [quantityInput, setQuantityInput] = useState("1");
    const [inputError, setInputError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [batchState, setBatchState] = useState<{
        approvalKey: string;
        batch: PilotBatch;
    } | null>(null);
    const generation = useGeneratePilotBatch();

    const approvalKey = [
        record.template_id,
        record.template_sha256,
        record.check?.check_ref.sha256 ?? "",
        record.approval,
    ].join(":");
    const approvalKeyRef = useRef(approvalKey);
    approvalKeyRef.current = approvalKey;
    const batch = batchState?.approvalKey === approvalKey ? batchState.batch : null;

    useEffect(() => {
        setBatchState(null);
        setActionError(null);
        setInputError(null);
    }, [approvalKey]);

    const blockReason = generationBlockReason(record);

    const generate = () => {
        if (generation.isPending) return;
        if (blockReason) {
            setInputError(blockReason);
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
        const seedError = seedRangeError(seed, quantity);
        if (seedError) {
            setInputError(seedError);
            return;
        }

        setInputError(null);
        setActionError(null);
        const requestApprovalKey = approvalKey;
        generation.mutate(
            { templateId: record.template_id, input: { seed, quantity } },
            {
                onSuccess: (result) => {
                    if (approvalKeyRef.current !== requestApprovalKey) return;
                    setBatchState({ approvalKey: requestApprovalKey, batch: result });
                },
                onError: (error) => {
                    if (approvalKeyRef.current !== requestApprovalKey) return;
                    setBatchState(null);
                    setActionError(
                        getCheckPilotErrorMessage(
                            error,
                            "The seeded questions could not be generated.",
                        ),
                    );
                },
            },
        );
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle>Generate questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {blockReason && (
                    <div className="flex items-start gap-2">
                        <AlertCircle
                            className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                            aria-hidden="true"
                        />
                        <p className="text-sm text-muted-foreground">{blockReason}</p>
                    </div>
                )}

                <div className="flex flex-wrap items-end gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="pilot-generation-quantity">Quantity</Label>
                        <Input
                            id="pilot-generation-quantity"
                            type="number"
                            min={1}
                            max={maxQuantity}
                            step={1}
                            value={quantityInput}
                            onChange={(event) => setQuantityInput(event.target.value)}
                            disabled={Boolean(blockReason) || generation.isPending}
                            className="w-28"
                        />
                        <p className="text-xs text-muted-foreground">1–{maxQuantity}</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="pilot-generation-seed">Seed</Label>
                        <Input
                            id="pilot-generation-seed"
                            type="number"
                            min={0}
                            max={MAX_SEED}
                            step={1}
                            value={seedInput}
                            onChange={(event) => setSeedInput(event.target.value)}
                            disabled={Boolean(blockReason) || generation.isPending}
                            className="w-40"
                        />
                        <p className="text-xs text-muted-foreground">
                            Same seed and template reproduce this set.
                        </p>
                    </div>
                    <Button
                        type="button"
                        onClick={generate}
                        disabled={Boolean(blockReason) || generation.isPending}
                    >
                        {generation.isPending && (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        )}
                        {generation.isPending ? "Generating…" : "Generate questions"}
                    </Button>
                </div>

                {inputError && (
                    <p role="alert" className="text-sm text-destructive">
                        {inputError}
                    </p>
                )}

                {actionError && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Questions could not be generated</AlertTitle>
                        <AlertDescription>{actionError}</AlertDescription>
                    </Alert>
                )}

                {batch && (
                    <section aria-labelledby="pilot-batch-heading" className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
                            <h3 id="pilot-batch-heading" className="text-sm font-medium">
                                Generated questions
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Seed {batch.seed} · requested {batch.requested_quantity} ·{" "}
                                generated {batch.questions.length}
                            </p>
                        </div>

                        {batch.shortfall > 0 && (
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>
                                    Only {batch.questions.length} of{" "}
                                    {batch.requested_quantity} distinct questions
                                </AlertTitle>
                                <AlertDescription>
                                    The bounded draw did not produce more distinct
                                    questions. This report does not claim that no other
                                    questions exist.
                                </AlertDescription>
                            </Alert>
                        )}

                        {batch.findings.length > 0 && (
                            <div className="space-y-1">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Findings
                                </p>
                                <ul className="list-disc space-y-1 pl-4 text-sm">
                                    {batch.findings.map((finding, index) => (
                                        <li key={index} className="break-words">
                                            {finding}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {batch.questions.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No questions were drawn for this seed.
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {batch.questions.map((question, index) => (
                                    <QuestionCard
                                        key={`${index}-${question.expression}`}
                                        question={question}
                                        index={index}
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                )}
            </CardContent>
        </Card>
    );
}
