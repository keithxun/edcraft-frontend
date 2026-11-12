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
 * Mathematics view: the equation leads, then the prompt and choices through the
 * shared question renderer. Review stays neutral until the reviewer reveals the
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
    // IR questions often restate the rendered equation in the prompt. Showing
    // both would repeat the same text, so the prompt carries the visible
    // heading and the equation stays available to assistive technology.
    const normalizedQuestion = instance.question.replace(/\s+/g, " ").trim();
    const normalizedEquation = instance.equation.replace(/\s+/g, " ").trim();
    const equationIsInQuestion = normalizedQuestion.includes(normalizedEquation);

    return (
        <>
            <Heading
                className={
                    equationIsInQuestion
                        ? "sr-only"
                        : "min-w-0 break-words text-lg font-semibold"
                }
            >
                {instance.equation}
            </Heading>

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
