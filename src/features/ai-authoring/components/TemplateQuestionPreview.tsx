import type { CodeTemplateCandidate } from "@/api/models";
import { QuestionContent } from "@/features/questions/components/QuestionContent";
import type {
    AuthoringTemplateCandidate,
    MathTemplateCandidate,
    ReviewTemplate,
} from "../types";
import { EvidenceDetails } from "./EvidenceDetails";
import { isMathTemplateCandidate, isRecord } from "./questionPayload";
import { QuestionInputs } from "./QuestionInputs";
import { ReadOnlyCode } from "./ReadOnlyCode";

interface TemplateQuestionPreviewProps {
    template: ReviewTemplate;
    /** Authoring domain from the review request. */
    domain?: string;
}

function renderExpression(value: unknown) {
    return <span className="break-words font-mono text-sm">{String(value)}</span>;
}

function isCodeCandidate(
    candidate: AuthoringTemplateCandidate,
): candidate is CodeTemplateCandidate {
    if (!isRecord(candidate)) return false;
    const record: Record<string, unknown> = candidate;
    return (
        typeof record.code === "string" &&
        typeof record.question_template === "string" &&
        Array.isArray(record.distractors)
    );
}

/** Code-domain template rendered the way a student would see it. */
function CodeTemplateView({ candidate }: { candidate: CodeTemplateCandidate }) {
    const choices = [
        { value: candidate.answer_expression, correct: true, reason: undefined },
        ...candidate.distractors.map((distractor) => ({
            value: distractor.expression,
            correct: false,
            reason: distractor.reason_template,
        })),
    ];
    return (
        <article className="space-y-4">
            <h3 className="min-w-0 text-base font-medium">{candidate.question_template}</h3>

            <ReadOnlyCode code={candidate.code} label="Template code" />

            <QuestionContent
                questionType={candidate.question_type ?? "mcq"}
                options={choices.map((choice) => choice.value)}
                optionExplanations={choices.map((choice) =>
                    choice.correct ? undefined : choice.reason,
                )}
                correctIndices={[0]}
                answer={candidate.answer_expression}
                hideAnswerButton
                showAnswerByDefault
                hideAnswerSummary
                renderValue={renderExpression}
            />
        </article>
    );
}

/** Mathematics template rendered without assuming a programming language. */
function MathTemplateView({ candidate }: { candidate: MathTemplateCandidate }) {
    const parameters = Object.fromEntries(
        candidate.parameters.map((parameter) => [parameter.name, parameter.values]),
    );

    return (
        <article className="space-y-4">
            <h3 className="min-w-0 text-base font-medium">
                {candidate.question_template}
            </h3>

            <p className="break-words text-center text-xl font-medium">
                {candidate.equation_template}
            </p>

            <section aria-label="Template parameters" className="space-y-1">
                <h4 className="text-sm font-medium">Parameters</h4>
                <QuestionInputs inputs={parameters} />
            </section>

            <section aria-label="Answer expression" className="space-y-1">
                <h4 className="text-sm font-medium">Answer</h4>
                <p className="break-words font-mono text-sm">
                    {candidate.answer_expression}
                </p>
            </section>

            <section aria-label="Distractors" className="space-y-2">
                <h4 className="text-sm font-medium">Wrong choices</h4>
                <ul className="space-y-2">
                    {candidate.distractors.map((distractor, index) => (
                        <li
                            key={index}
                            className="rounded border bg-background/60 p-2"
                        >
                            <p className="break-words font-mono text-sm">
                                {distractor.expression}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {distractor.reason_template}
                            </p>
                        </li>
                    ))}
                </ul>
            </section>
        </article>
    );
}

/** Domain-neutral fallback: show the candidate fields without code assumptions. */
function GenericTemplateView({ candidate }: { candidate: AuthoringTemplateCandidate }) {
    const record: Record<string, unknown> = isRecord(candidate) ? candidate : {};
    const heading =
        typeof record.question_template === "string"
            ? record.question_template
            : typeof record.question === "string"
              ? record.question
              : "Question template";

    return (
        <article className="space-y-4">
            <h3 className="min-w-0 text-base font-medium">{heading}</h3>
            <EvidenceDetails
                summary="Template fields"
                value={candidate}
                variant="structured"
            />
        </article>
    );
}

/**
 * The reusable template shown the way a student would see the generated
 * question. Template metadata stays in Technical details so reviewers can
 * focus on the question itself.
 */
export function TemplateQuestionPreview({
    template,
    domain,
}: TemplateQuestionPreviewProps) {
    const { candidate } = template;
    // Only the code view assumes the code candidate shape. Unknown domains
    // always take the field-based fallback.
    const showMath =
        (domain === undefined || domain === "math") && isMathTemplateCandidate(candidate);
    const showCode =
        (domain === undefined || domain === "code") && isCodeCandidate(candidate);

    if (showMath) return <MathTemplateView candidate={candidate} />;
    return showCode ? (
        <CodeTemplateView candidate={candidate} />
    ) : (
        <GenericTemplateView candidate={candidate} />
    );
}
