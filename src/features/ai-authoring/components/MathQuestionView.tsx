import { QuestionContent } from "@/features/questions/components/QuestionContent";
import type { MathQuestionInstance } from "../types";
import { QuestionInputs } from "./QuestionInputs";
import { ReadableValue } from "./ReadableValue";

interface MathQuestionViewProps {
    instance: MathQuestionInstance;
    review: boolean;
    headingLevel: "h2" | "h3";
    inputsHeadingLevel: "h3" | "h4";
}

function renderReadableValue(value: unknown) {
    return <ReadableValue value={value} />;
}

/**
 * Mathematics view: the equation leads, followed by the prompt and choices.
 * Review stays neutral until the reviewer reveals the answer; generated
 * previews show the canonical correct choice from the backend.
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

    return (
        <>
            <div className="space-y-2">
                <Heading className="min-w-0 break-words text-lg font-semibold">
                    {instance.equation}
                </Heading>
                <p className="text-base">{instance.question}</p>
            </div>

            <QuestionContent
                questionType="mcq"
                options={instance.choices}
                correctIndices={[instance.correct_index]}
                answer={instance.answer}
                hideAnswerButton={!review}
                showAnswerByDefault={!review}
                hideAnswerSummary
                renderValue={renderReadableValue}
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
