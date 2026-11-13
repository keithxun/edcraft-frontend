import { QuestionContent } from "@/features/questions/components/QuestionContent";
import type { AuthoringQuestionPayload } from "../types";
import { buildQuestionFields } from "./questionPayload";
import { ReadableValue } from "./ReadableValue";

interface GenericQuestionViewProps {
    payload: AuthoringQuestionPayload;
    review: boolean;
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
export function GenericQuestionView({ payload, review }: GenericQuestionViewProps) {
    const fields = buildQuestionFields(payload);

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
            renderValue={fields.flat ? renderFlatValue : renderReadableValue}
        />
    );
}
