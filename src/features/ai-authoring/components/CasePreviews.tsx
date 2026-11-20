import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReviewCaseKeyEvidence, ReviewCasePreview } from "../types";
import { ChemistryStem } from "./ChemistryStem";
import { PhysicsStimulus } from "./PhysicsStimulus";
import { QuestionFigure } from "./QuestionFigure";

const EVIDENCE_LABELS: Record<ReviewCaseKeyEvidence, string> = {
    separate_reference: "Separate reference solution",
    external_blind: "Independent blinded answer check",
    author_second_pass: "Author's second-pass answer check",
};

function caseTitle(caseId: string): string {
    return caseId.replace(/^skill\./, "").replace(/[._]/g, " ");
}

/** The checked physics examples use a stimulus and statement-set swap. */
function PhysicsCasePreviews({ cases }: { cases: ReviewCasePreview[] }) {
    function ChoiceList({ choices, answer }: { choices?: string[] | null; answer: string }) {
        if (!choices?.length) {
            return <p><span className="font-medium">Correct answer</span> {answer}</p>;
        }
        return (
            <ul aria-label="Example answer choices" className="space-y-1">
                {choices.map((choice) => (
                    <li
                        key={choice}
                        className="flex flex-wrap justify-between gap-2 rounded-md border px-3 py-2"
                    >
                        <span>{choice}</span>
                        {choice === answer && <span className="font-medium">Correct answer</span>}
                    </li>
                ))}
            </ul>
        );
    }

    return (
        <Card role="region" aria-labelledby="checked-scenarios-heading">
            <CardHeader>
                <CardTitle id="checked-scenarios-heading">Checked scenarios</CardTitle>
                {cases.some(({ incorrect_statements_example }) => incorrect_statements_example) && (
                    <p className="text-sm text-muted-foreground">
                        These examples use the retained distractors. Statement order, which
                        statements students are asked to select, and the displayed choices can
                        change with the seed.
                    </p>
                )}
            </CardHeader>
            <CardContent>
                <ul className="space-y-4">
                    {cases.map(({ case_id, outcome, question, answer, choices, stimulus, incorrect_statements_example: alternate }) => (
                        <li key={case_id} className="space-y-3 rounded-md border p-3 text-sm">
                            {outcome && <p className="text-muted-foreground">{outcome}</p>}
                            {stimulus && <PhysicsStimulus value={stimulus} />}
                            {alternate && <h3 className="font-semibold">Correct-statement example</h3>}
                            <p className="whitespace-pre-wrap break-words">{question}</p>
                            <ChoiceList choices={choices} answer={answer} />
                            {alternate && (
                                <div className="space-y-3 border-t pt-3">
                                    <h3 className="font-semibold">Incorrect-statement example</h3>
                                    <p className="whitespace-pre-wrap break-words">{alternate.question}</p>
                                    <ChoiceList choices={alternate.choices} answer={alternate.answer} />
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}

/** The checked chemistry examples name their catalogue key evidence. */
function ChemistryCasePreviews({ cases }: { cases: ReviewCasePreview[] }) {
    return (
        <Card aria-labelledby="checked-cases-heading">
            <CardHeader>
                <CardTitle id="checked-cases-heading">Checked cases</CardTitle>
                {cases.some((item) => item.key_source === "catalogue") && (
                    <p className="text-sm text-muted-foreground">
                        Answers come from the checked chemistry catalogue. Separate solution
                        checks cover only a subset of the catalogue. Generation may change the
                        option order.
                    </p>
                )}
            </CardHeader>
            <CardContent>
                <ul className="space-y-4">
                    {cases.map(({ case_id, outcome, question, answer, figure, choices, key_source, key_evidence }) => (
                        <li key={case_id} className="space-y-2 rounded-md border p-3 text-sm">
                            {outcome && <p className="text-muted-foreground">{outcome}</p>}
                            <ChemistryStem question={question} />
                            <QuestionFigure figure={figure} />
                            {!!choices?.length && (
                                <ol className="list-[upper-alpha] space-y-1 pl-6">
                                    {choices.map((choice, index) => (
                                        <li key={index}>{choice}</li>
                                    ))}
                                </ol>
                            )}
                            <p>
                                <span className="font-medium">Answer</span> {answer}
                            </p>
                            {key_source === "catalogue" && (
                                <p className="text-xs text-muted-foreground">
                                    {key_evidence?.length
                                        ? key_evidence.map((source) => EVIDENCE_LABELS[source]).join(" · ")
                                        : "Catalogue key only"}
                                </p>
                            )}
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}

/** The checked biology cases carry figures and superseded-case guidance. */
function BiologyCasePreviews({ cases }: { cases: ReviewCasePreview[] }) {
    return (
        <section aria-labelledby="selected-question-cases">
            <Card>
                <CardHeader>
                    <CardTitle as="h2" id="selected-question-cases">Selected questions</CardTitle>
                    {cases.length > 1 && (
                        <p className="text-sm text-muted-foreground">
                            Approval covers all {cases.length} questions in this selection.
                        </p>
                    )}
                </CardHeader>
                <CardContent>
                    <ul className="divide-y">
                        {cases.map((item) => (
                            <li className="space-y-2 py-4 first:pt-0 last:pb-0" key={item.case_id}>
                                <h3 className="text-sm font-medium first-letter:uppercase">
                                    {caseTitle(item.case_id)}
                                </h3>
                                {item.outcome && (
                                    <p className="text-xs text-muted-foreground">
                                        Learning outcome {item.outcome}
                                    </p>
                                )}
                                {item.superseded_by && (
                                    <Alert>
                                        <AlertTitle>Superseded question</AlertTitle>
                                        <AlertDescription>
                                            <p>
                                                Author the corrected Biology case <code>{item.superseded_by}</code>
                                                {" "}before using this question with learners.
                                            </p>
                                        </AlertDescription>
                                    </Alert>
                                )}
                                <p className="whitespace-pre-line break-words text-sm">{item.question}</p>
                                <QuestionFigure figure={item.figure} />
                                {item.choices?.length ? (
                                    <ul aria-label="Answer choices" className="space-y-2 text-sm">
                                        {item.choices.map((choice) => (
                                            <li key={choice} className="flex flex-wrap items-start gap-2 rounded-md border p-2">
                                                <span className="min-w-0 break-words">{choice}</span>
                                                {choice === item.answer && <Badge variant="outline">Correct answer</Badge>}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <dl className="space-y-1 text-sm">
                                        <dt className="font-medium">Correct answer</dt>
                                        <dd className="break-words">{item.answer}</dd>
                                    </dl>
                                )}
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
        </section>
    );
}

/** Math, code and unknown domains keep the reusable checked-case list. */
function GenericCasePreviews({ cases }: { cases: ReviewCasePreview[] }) {
    const previewTitle = cases.some((item) => item.seed != null)
        ? "Sampled question variants"
        : "Questions eligible for approval";

    return (
        <section aria-label={previewTitle}>
            <Card>
                <CardHeader>
                    <CardTitle as="h2">{previewTitle}</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-4">
                        {cases.map((item) => (
                            <li key={item.case_id} className="space-y-2">
                                <h3 className="text-sm font-medium first-letter:uppercase">
                                    {item.seed == null ? caseTitle(item.case_id) : `Seed ${item.seed}`}
                                </h3>
                                {item.outcome && (
                                    <p className="text-xs text-muted-foreground">
                                        Learning outcome {item.outcome}
                                    </p>
                                )}
                                <p className="whitespace-pre-wrap break-words text-sm">{item.question}</p>
                                {item.choices?.length ? (
                                    <ul aria-label="Answer choices" className="mt-1 list-disc space-y-1 pl-5 text-sm">
                                        {item.choices.map((choice) => (
                                            <li key={choice} className="whitespace-pre-wrap">
                                                {choice}
                                                {choice === item.answer && <strong> (correct answer)</strong>}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="mt-1 text-sm">
                                        <strong>Correct answer</strong> {item.answer}
                                    </p>
                                )}
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
        </section>
    );
}

export function CasePreviews({
    cases,
    domain,
}: {
    cases?: ReviewCasePreview[] | null;
    domain: string;
}) {
    if (!cases?.length) return null;

    if (domain === "physics") {
        return <PhysicsCasePreviews cases={cases} />;
    }
    if (domain === "chemistry") {
        return <ChemistryCasePreviews cases={cases} />;
    }
    if (domain === "biology") {
        return <BiologyCasePreviews cases={cases} />;
    }
    return <GenericCasePreviews cases={cases} />;
}
