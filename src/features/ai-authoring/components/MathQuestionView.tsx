import type { MathQuestionInstance } from "../types";
import { GenericQuestionView } from "./GenericQuestionView";
import { QuestionInputs } from "./QuestionInputs";

interface MathQuestionViewProps {
    instance: MathQuestionInstance;
    review: boolean;
    headingLevel: "h2" | "h3";
    inputsHeadingLevel: "h3" | "h4";
}

/**
 * Mathematics view: the prompt leads, then the equation when the prompt does not
 * already show it, then the choices through the shared question renderer. Review stays neutral until the reviewer reveals the
 * answer; generated previews show the canonical correct choice.
 */
export function MathQuestionView({
    instance,
    review,
    headingLevel,
    inputsHeadingLevel,
}: MathQuestionViewProps) {
    const Heading = headingLevel;
    const InputsHeading = inputsHeadingLevel;
    const inputs = { ...instance.parameters, seed: instance.seed };
    // The prompt is the question students read, so it always leads. IR prompts
    // often restate the rendered equation, so the equation only appears on its
    // own when the prompt does not already contain it.
    const normalizedQuestion = instance.question.replace(/\s+/g, " ").trim();
    const normalizedEquation = instance.equation.replace(/\s+/g, " ").trim();
    const equationIsInQuestion = normalizedQuestion.includes(normalizedEquation);

    return (
        <>
            <Heading className="min-w-0 break-words text-lg font-semibold">
                {instance.question}
            </Heading>
            {!equationIsInQuestion && (
                <p className="min-w-0 break-words font-mono text-base">{instance.equation}</p>
            )}

            <GenericQuestionView payload={instance} review={review} />

            {!review && (
                <section aria-label="Question inputs" className="space-y-1">
                    <InputsHeading className="text-sm font-medium">Inputs</InputsHeading>
                    <QuestionInputs inputs={inputs} />
                </section>
            )}
        </>
    );
}
