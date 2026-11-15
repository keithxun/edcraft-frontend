import { QuestionContent } from "@/features/questions/components/QuestionContent";
import type { AuthoringQuestionPayload } from "../types";
import { MathTex } from "./MathTex";
import { buildQuestionFields } from "./questionPayload";
import { ReadableValue } from "./ReadableValue";

interface GenericQuestionViewProps {
    payload: AuthoringQuestionPayload;
    review: boolean;
    /** LaTeX for maths choices, in the same order as the payload choices. */
    choicesLatex?: string[];
    answerLatex?: string;
}

function renderReadableValue(value: unknown) {
    return <ReadableValue value={value} />;
}

/**
 * Flat-envelope choices are already display strings, so quoting them would make
 * a fraction read ``"3/2"``. Code payloads keep ReadableValue's Python-style
 * type distinction.
 */
function renderFlatValue(value: unknown) {
    if (typeof value === "string") {
        return <span className="whitespace-pre-wrap break-words text-sm">{value}</span>;
    }
    return <ReadableValue value={value} />;
}

/**
 * Domain-neutral fallback for the question body. It only relies on the small
 * shared envelope (question text, choices, answer) and never assumes code.
 */
export function GenericQuestionView({
    payload,
    review,
    choicesLatex,
    answerLatex,
}: GenericQuestionViewProps) {
    const fields = buildQuestionFields(payload);
    const renderBaseValue = fields.flat ? renderFlatValue : renderReadableValue;
    const hasAnswerLatex = typeof answerLatex === "string" && answerLatex.length > 0;
    const hasChoiceLatex =
        choicesLatex !== undefined && choicesLatex.some((latex) => latex.length > 0);

    const renderValue = (value: unknown) =>
        hasAnswerLatex ? (
            <MathTex className="break-words text-sm" latex={answerLatex} />
        ) : (
            renderBaseValue(value)
        );

    const renderOption = (value: unknown, index: number) => {
        const latex = choicesLatex?.[index];
        return typeof latex === "string" && latex.length > 0 ? (
            <MathTex className="break-words text-sm" latex={latex} />
        ) : (
            renderBaseValue(value)
        );
    };

    return (
        <QuestionContent
            questionType={fields.questionType}
            options={fields.choices.map((choice) => choice.value)}
            optionExplanations={fields.choices.map((choice) =>
                choice.correct ? undefined : choice.reason,
            )}
            correctIndices={[fields.correctIndex]}
            answer={fields.answer}
            hideAnswerButton={!review}
            showAnswerByDefault={!review}
            hideAnswerSummary
            renderValue={renderValue}
            renderOption={hasChoiceLatex ? renderOption : undefined}
        />
    );
}
