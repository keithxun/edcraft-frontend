import { QuestionContent } from "@/features/questions/components/QuestionContent";
import type {
    AuthoringTemplateCandidate,
    CodeTemplateCandidate,
    IrMathTemplateCandidate,
    ReviewTemplate,
} from "../types";
import { showsDomainView } from "../domains";
import { EvidenceDetails } from "./EvidenceDetails";
import {
    firstParameterValues,
    renderIrAnswerRecipe,
    renderIrAnswerRecipeTex,
    renderIrDistractor,
    renderIrDistractorTex,
    renderIrSample,
    renderIrSampleEquationTex,
} from "./mathIrRender";
import { MathTex } from "./MathTex";
import { isIrMathTemplateCandidate, isRecord } from "./questionPayload";
import { QuestionInputs } from "./QuestionInputs";
import { ReadOnlyCode } from "./ReadOnlyCode";

interface TemplateQuestionPreviewProps {
    template: ReviewTemplate;
    /** Authoring domain from the review request. */
    domain: string;
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

/**
 * Generic IR template rendered as one representative instance. The answer is
 * the authored recipe the deterministic engine grades, so this view can show
 * it without deriving anything from the problem statement.
 */
function IrMathTemplateView({
    candidate,
}: {
    candidate: IrMathTemplateCandidate;
}) {
    const template = candidate.item;
    const values = firstParameterValues(template);
    const sample = renderIrSample(template);
    const equationTex = renderIrSampleEquationTex(template);
    const answer = renderIrAnswerRecipe(template.body.answer_recipe, values);
    const answerTex = renderIrAnswerRecipeTex(template.body.answer_recipe, values);
    const parameters = Object.fromEntries(
        template.parameters.map((parameter) => [parameter.name, parameter.values]),
    );
    const showEquation =
        sample.equation !== sample.text && !sample.text.includes(sample.equation);

    return (
        <article className="space-y-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {template.topic}
            </p>

            <h3 className="min-w-0 text-base font-medium">{sample.text}</h3>

            {showEquation && (
                <p className="break-words text-center text-xl font-medium">
                    {equationTex !== null ? (
                        <MathTex latex={equationTex} />
                    ) : (
                        sample.equation
                    )}
                </p>
            )}

            <p className="text-xs text-muted-foreground">
                Sample instance uses the first value of each parameter. The
                deterministic engine grades the authored answer recipe for
                every combination.
            </p>

            <section aria-label="Template parameters" className="space-y-1">
                <h4 className="text-sm font-medium">Parameters</h4>
                <QuestionInputs inputs={parameters} />
            </section>

            <section aria-label="Goal" className="space-y-1">
                <h4 className="text-sm font-medium">Goal</h4>
                <p className="font-mono text-sm">{template.body.goal.kind}</p>
            </section>

            <section aria-label="Correct answer" className="space-y-1">
                <h4 className="text-sm font-medium">
                    Correct answer (authored recipe)
                </h4>
                {answer !== null ? (
                    <p className="break-words font-mono text-sm">
                        {answerTex !== null ? <MathTex latex={answerTex} /> : answer}
                    </p>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        No answer recipe declared.
                    </p>
                )}
            </section>

            <section aria-label="Distractors" className="space-y-2">
                <h4 className="text-sm font-medium">Wrong choices</h4>
                <ul className="space-y-2">
                    {template.body.distractors.map((distractor, index) => {
                        const rendered = renderIrDistractor(distractor, values);
                        const renderedTex = renderIrDistractorTex(distractor, values);
                        return (
                            <li
                                key={index}
                                className="rounded border bg-background/60 p-2"
                            >
                                {rendered !== null && (
                                    <p className="break-words font-mono text-sm">
                                        {renderedTex !== null ? (
                                            <MathTex latex={renderedTex} />
                                        ) : (
                                            rendered
                                        )}
                                    </p>
                                )}
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {distractor.reason || distractor.misconception}
                                </p>
                            </li>
                        );
                    })}
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
    // Each specialised view assumes its candidate shape; other domains take
    // the field-based fallback.
    const showMath =
        showsDomainView(domain, "math") && isIrMathTemplateCandidate(candidate);
    const showCode =
        showsDomainView(domain, "code") && isCodeCandidate(candidate);

    if (showMath) {
        return <IrMathTemplateView candidate={candidate} />;
    }
    return showCode ? (
        <CodeTemplateView candidate={candidate} />
    ) : (
        <GenericTemplateView candidate={candidate} />
    );
}
