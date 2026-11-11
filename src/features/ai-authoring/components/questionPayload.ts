import type {
    AuthoringQuestionPayload,
    CodeQuestionInstance,
    MathQuestionInstance,
    MathTemplateCandidate,
} from "../types";

export interface PreviewChoice {
    value: unknown;
    reason?: string;
    correct: boolean;
}

export interface PreviewQuestionFields {
    text: string;
    questionType: string;
    answer: unknown;
    choices: PreviewChoice[];
    correctIndex: number;
    seed: number;
    /**
     * A flat envelope's choices are display strings, not Python values, so they
     * render unquoted. Nested code payloads keep the type-distinguishing quotes.
     */
    flat: boolean;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A payload is only treated as code when it has the code question envelope. */
export function isCodeQuestionPayload(
    value: AuthoringQuestionPayload,
): value is CodeQuestionInstance {
    if (!isRecord(value)) return false;
    const question = value.question;
    return (
        isRecord(question) &&
        typeof question.code === "string" &&
        typeof question.question === "string"
    );
}

/**
 * A math question is a flat envelope: the equation and choices sit at the top
 * level instead of inside a nested `question` object. Requiring every field
 * keeps other flat domains from being mistaken for math.
 */
export function isMathQuestionPayload(
    value: AuthoringQuestionPayload,
): value is MathQuestionInstance {
    if (!isRecord(value)) return false;
    return (
        typeof value.template_id === "string" &&
        typeof value.seed === "number" &&
        isRecord(value.parameters) &&
        typeof value.equation === "string" &&
        typeof value.question === "string" &&
        Array.isArray(value.choices) &&
        value.choices.every((choice) => typeof choice === "string") &&
        typeof value.correct_index === "number" &&
        typeof value.answer === "string"
    );
}

/** A math template candidate is identified by the equation field. */
export function isMathTemplateCandidate(value: unknown): value is MathTemplateCandidate {
    if (!isRecord(value)) return false;
    return (
        typeof value.template_id === "string" &&
        typeof value.equation_template === "string" &&
        typeof value.question_template === "string" &&
        Array.isArray(value.parameters) &&
        typeof value.answer_expression === "string" &&
        Array.isArray(value.distractors)
    );
}

/**
 * Normalizes the question text, choices and answer for the shared
 * QuestionContent renderer. Unknown domains only need this small envelope;
 * their domain-specific fields stay in the raw data disclosure.
 */
export function buildQuestionFields(payload: AuthoringQuestionPayload): PreviewQuestionFields {
    const record = isRecord(payload) ? payload : {};
    // Domain-neutral flat envelope: a question string, a choice list, and the
    // canonical answer index. This keeps unknown domains readable without a
    // new shared branch for every one of them.
    const choiceValues = record.choices;
    if (Array.isArray(choiceValues)) {
        const flatChoices = choiceValues.filter((value) => typeof value === "string");
        if (
            flatChoices.length > 0 &&
            flatChoices.length === choiceValues.length &&
            typeof record.question === "string" &&
            typeof record.answer === "string"
        ) {
            const correctIndex =
                typeof record.correct_index === "number" &&
                record.correct_index >= 0 &&
                record.correct_index < flatChoices.length
                    ? record.correct_index
                    : flatChoices.indexOf(record.answer);
            return {
                text: record.question,
                questionType: "mcq",
                answer: record.answer,
                choices: flatChoices.map((value, index) => ({
                    value,
                    correct: index === correctIndex,
                })),
                correctIndex,
                seed: typeof record.seed === "number" ? record.seed : 0,
                flat: true,
            };
        }
    }

    const question = isRecord(record.question) ? record.question : {};
    const distractors = Array.isArray(question.distractors) ? question.distractors : [];
    const distractorReasons = Array.isArray(question.distractor_reasons)
        ? question.distractor_reasons
        : [];
    const seed = typeof record.seed === "number" ? record.seed : 0;
    // Keep the correct choice deterministic but not always first. This is
    // presentation only; the exported instance keeps the canonical answer.
    const correctIndex = distractors.length > 0 ? seed % (distractors.length + 1) : 0;
    const choices: PreviewChoice[] = distractors.map((value, index) => ({
        value,
        reason:
            typeof distractorReasons[index] === "string"
                ? distractorReasons[index]
                : undefined,
        correct: false,
    }));
    choices.splice(correctIndex, 0, {
        value: question.proposed_answer,
        correct: true,
    });

    return {
        text: typeof question.question === "string" ? question.question : "Question",
        questionType:
            typeof question.question_type === "string" ? question.question_type : "mcq",
        answer: question.proposed_answer,
        choices,
        correctIndex,
        seed,
        flat: false,
    };
}
