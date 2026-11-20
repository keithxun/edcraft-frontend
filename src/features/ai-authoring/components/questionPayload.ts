import type {
    AuthoringQuestionPayload,
    BiologyQuestionInstance,
    BiologyTemplateCandidate,
    ChemistryQuestionInstance,
    ChemistryTemplateCandidate,
    CodeQuestionInstance,
    IrMathTemplateCandidate,
    MathQuestionInstance,
    PhysicsTemplateCandidate,
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

/** Structural equality for the JSON-shaped candidate payloads. */
export function sameCandidate(left: unknown, right: unknown): boolean {
    if (left === right) return true;
    if (Array.isArray(left) && Array.isArray(right)) {
        return (
            left.length === right.length &&
            left.every((item, index) => sameCandidate(item, right[index]))
        );
    }
    if (isRecord(left) && isRecord(right)) {
        const leftKeys = Object.keys(left);
        const rightKeys = Object.keys(right);
        return (
            leftKeys.length === rightKeys.length &&
            leftKeys.every(
                (key) =>
                    Object.prototype.hasOwnProperty.call(right, key) &&
                    sameCandidate(left[key], right[key]),
            )
        );
    }
    return false;
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

/** A generic IR candidate carries one typed item family. */
export function isIrMathTemplateCandidate(
    value: unknown,
): value is IrMathTemplateCandidate {
    if (!isRecord(value) || !isRecord(value.item)) return false;
    const item = value.item;
    const body = item.body;
    if (!isRecord(body) || !isRecord(body.text) || !isRecord(body.goal)) {
        return false;
    }
    return (
        typeof value.template_id === "string" &&
        typeof item.topic === "string" &&
        Array.isArray(item.parameters) &&
        item.parameters.every(
            (parameter) => isRecord(parameter) && Array.isArray(parameter.values),
        ) &&
        Array.isArray(body.distractors) &&
        body.distractors.every((distractor) => isRecord(distractor))
    );
}

/**
 * A biology question uses the same flat envelope as maths, so its cross and
 * Punnett square are required. Maths carries an `equation` instead, keeping the
 * two views apart.
 */
export function isBiologyQuestionPayload(
    value: AuthoringQuestionPayload,
): value is BiologyQuestionInstance {
    if (!isRecord(value)) return false;
    const record: Record<string, unknown> = value;
    const cross = record.cross;
    return (
        typeof record.template_id === "string" &&
        typeof record.seed === "number" &&
        isRecord(record.parameters) &&
        typeof record.question === "string" &&
        Array.isArray(record.choices) &&
        record.choices.every((choice) => typeof choice === "string") &&
        typeof record.correct_index === "number" &&
        typeof record.answer === "string" &&
        isRecord(cross) &&
        typeof cross.parent1 === "string" &&
        typeof cross.parent2 === "string" &&
        Array.isArray(record.punnett)
    );
}

/** A monohybrid genetics candidate carries one `bio-mono/` item. */
export function isBiologyTemplateCandidate(
    value: unknown,
): value is BiologyTemplateCandidate {
    if (!isRecord(value) || !isRecord(value.item)) return false;
    const item = value.item;
    const { gene, question, text } = item;
    return (
        typeof value.template_id === "string" &&
        typeof item.schema_version === "string" &&
        item.schema_version.startsWith("bio-mono/") &&
        isRecord(gene) &&
        isRecord(question) &&
        isRecord(text) &&
        typeof text.template === "string" &&
        Array.isArray(item.parameters) &&
        Array.isArray(item.distractors)
    );
}

/**
 * A chemistry question is also a flat envelope, but it names the curated
 * reaction it was built from. Requiring the reaction identifier keeps math and
 * code payloads from being mistaken for chemistry.
 */
export function isChemistryQuestionPayload(
    value: AuthoringQuestionPayload,
): value is ChemistryQuestionInstance {
    if (!isRecord(value)) return false;
    return (
        "reaction_id" in value &&
        typeof value.reaction_id === "string" &&
        typeof value.template_id === "string" &&
        typeof value.seed === "number" &&
        typeof value.question === "string" &&
        Array.isArray(value.choices) &&
        value.choices.every((choice) => typeof choice === "string") &&
        typeof value.correct_index === "number" &&
        typeof value.answer === "string"
    );
}

/** A chemistry candidate names a supported item and its catalogue snapshot. */
export function isChemistryTemplateCandidate(
    value: unknown,
): value is ChemistryTemplateCandidate {
    if (!isRecord(value) || !isRecord(value.item) || !isRecord(value.catalogue)) {
        return false;
    }
    const schemaVersion = value.item.schema_version;
    if (schemaVersion === "chem-concept/0.1") {
        return Array.isArray(value.catalogue.contexts);
    }
    return typeof schemaVersion === "string" &&
        (schemaVersion.startsWith("chem-balance/") || schemaVersion === "chem-yield/0.1") &&
        Array.isArray(value.catalogue.reactions);
}

/**
 * A physics candidate carries a `physics-1d` item family and an authored
 * answer recipe. Requiring both keeps other domains with a similar envelope
 * from being mistaken for physics.
 */
export function isPhysicsTemplateCandidate(
    value: unknown,
): value is PhysicsTemplateCandidate {
    if (!isRecord(value) || !isRecord(value.item)) return false;
    const item = value.item;
    const body = item.body;
    if (!isRecord(body)) return false;
    return (
        typeof value.template_id === "string" &&
        typeof item.schema_version === "string" &&
        ((item.schema_version.startsWith("physics-1d/") ||
            item.schema_version.startsWith("physics-h2/")) && isRecord(body.answer_recipe) ||
            item.schema_version === "physics-h2-statements/1.0" && typeof body.text === "string")
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
