import type { MathQuestionInstance } from "../types";
import { GenericQuestionView } from "./GenericQuestionView";
import { MathTex } from "./MathTex";
import { QuestionInputs } from "./QuestionInputs";

interface MathQuestionViewProps {
    instance: MathQuestionInstance;
    review: boolean;
    headingLevel: "h2" | "h3";
    inputsHeadingLevel: "h3" | "h4";
}

function normalize(text: string): string {
    return text.replace(/\s+/g, " ").trim();
}

/** True when a prompt already shows the equation, so it is not repeated. */
function containsEquation(prompt: string, equation: string): boolean {
    const normalizedEquation = normalize(equation);
    return normalizedEquation.length > 0 && normalize(prompt).includes(normalizedEquation);
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
    const segments = instance.question_segments ?? [];
    const hasSegments = segments.length > 0;
    const promptText = hasSegments
        ? segments.map((segment) => segment.value).join("")
        : instance.question;
    const equationLatex = instance.equation_latex;
    // The prompt is the question students read, so it always leads. IR prompts
    // often restate the rendered equation, so the equation only appears on its
    // own when the prompt does not already contain it.
    const equationIsInQuestion =
        containsEquation(promptText, equationLatex ?? instance.equation) ||
        containsEquation(instance.question, instance.equation);

    return (
        <>
            <Heading className="min-w-0 break-words text-lg font-semibold">
                {hasSegments
                    ? segments.map((segment, index) =>
                          segment.kind === "math" ? (
                              <MathTex key={index} latex={segment.value} />
                          ) : (
                              <span key={index}>{segment.value}</span>
                          ),
                      )
                    : instance.question}
            </Heading>
            {!equationIsInQuestion &&
                (typeof equationLatex === "string" && equationLatex.length > 0 ? (
                    <MathTex
                        displayMode
                        className="min-w-0 break-words text-base"
                        latex={equationLatex}
                    />
                ) : (
                    <p className="min-w-0 break-words font-mono text-base">
                        {instance.equation}
                    </p>
                ))}

            <GenericQuestionView
                payload={instance}
                review={review}
                choicesLatex={instance.choices_latex}
                answerLatex={instance.answer_latex}
            />

            {!review && (
                <section aria-label="Question inputs" className="space-y-1">
                    <InputsHeading className="text-sm font-medium">Inputs</InputsHeading>
                    <QuestionInputs inputs={inputs} />
                </section>
            )}
        </>
    );
}
