import type { AuthoringCheck } from "./types";

// Only real MCP tool names are mapped. Unrecognised tools fall back to their
// raw identifier rather than inventing a friendly label.
const FRIENDLY_CHECK_LABELS: Record<string, string> = {
    code_require_features: "Required features",
    code_validate_answers_and_distractors: "Answers and wrong choices",
    code_verify_template_structure: "Question template",
    assess_template_difficulty: "Difficulty",
    math_verify_item_spec: "Correct answer",
    math_verify_answer_form: "Answer form",
    math_validate_options: "Answer choices",
    math_verify_text_fidelity: "Question wording",
    application_distractor_count: "Number of wrong choices",
    assess_template_relevance: "Relevance",
};

const CHECK_DESCRIPTIONS: Record<string, string> = {
    code_require_features: "Checks that the code uses the Python features you asked for.",
    code_validate_answers_and_distractors:
        "Checks that the answer is right and every wrong choice is different.",
    code_verify_template_structure: "Checks that the question template is complete and renders.",
    assess_template_difficulty:
        "Checks that the estimated difficulty matches the level you chose.",
    math_verify_item_spec: "Checks that the maths engine gets the same answer as the template.",
    math_verify_answer_form:
        "Checks that the answer is written in the form the question asks for, such as factorised or expanded.",
    math_validate_options:
        "Checks that every wrong choice is wrong and that no two choices are equal.",
    math_verify_text_fidelity:
        "Checks that the question wording describes the same problem as the maths.",
    application_distractor_count:
        "Checks that there are at least as many wrong choices as you asked for.",
    assess_template_relevance: "Checks that the question matches what you asked for.",
};

export function friendlyCheckLabel(tool: string): string {
    return FRIENDLY_CHECK_LABELS[tool] ?? tool.replaceAll("_", " ");
}

function humanizeCheckName(tool: string): string {
    return tool
        .replaceAll("_", " ")
        .trim()
        .replace(/\b\w/g, (character) => character.toUpperCase());
}

/** Friendly check name with a title-cased identifier as the fallback. */
export function checkName(tool: string): string {
    return FRIENDLY_CHECK_LABELS[tool] ?? humanizeCheckName(tool);
}

export interface CheckSupport {
    supports: string[];
}

const CHECK_SUPPORT: Record<string, CheckSupport> = {
    code_require_features: {
        supports: [
            "Branches: if and else, an early return, and nested or consecutive ifs.",
            "Loops: single, nested or consecutive.",
            "Helper functions, including a helper that calls another.",
            "Lists: indexing, sum, min, max, all, any and sorting.",
            "Arithmetic.",
        ],
    },
    code_verify_template_structure: {
        supports: ["Placeholders, the rendered question and the answer expression."],
    },
    code_validate_answers_and_distractors: {
        supports: [
            "Runs the code on a fixed sample of inputs.",
            "The answer must be right and every wrong choice different.",
        ],
    },
    math_verify_item_spec: {
        supports: [
            "Supports exact arithmetic with whole numbers and fractions, expressions, equations and inequalities.",
            "It also covers equations in one unknown, pairs of linear equations, derivatives, integrals, matrices and determinants.",
        ],
    },
    math_validate_options: {
        supports: [
            "The maths engine grades each wrong choice, for one to ten wrong choices.",
            "Choices that are equal in value count as duplicates.",
        ],
    },
    math_verify_text_fidelity: {
        supports: [
            "Questions written as plain maths are checked directly.",
            "For worded questions, a second model reads the wording alone and must recover the same problem.",
        ],
    },
    math_verify_answer_form: {
        supports: [
            "Runs only for factorising and expanding questions, where the form is part of the answer.",
            "It checks the form for every set of values tried.",
        ],
    },
    application_distractor_count: {
        supports: [
            "EdCraft runs this on every question.",
            "If there are too few wrong choices, the model is asked to revise.",
        ],
    },
    assess_template_difficulty: {
        supports: [
            "A second model rates the difficulty against a written rubric.",
            "A mismatch is shown for your judgement and never blocks approval.",
            "The maths rubric is provisional.",
        ],
    },
    assess_template_relevance: {
        supports: [
            "A second model compares the question with your request.",
            "A mismatch is shown for your judgement and never blocks approval.",
        ],
    },
};

export function checkLabel(check: AuthoringCheck): string {
    return checkName(check.tool);
}

export function checkDescription(check: AuthoringCheck): string | null {
    return CHECK_DESCRIPTIONS[check.tool] ?? null;
}

export function checkSupport(check: AuthoringCheck): CheckSupport | null {
    return CHECK_SUPPORT[check.tool] ?? null;
}

interface FindingLike {
    message: string;
    field?: string | null;
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Validator findings prefix the explanation with the offending field and its
 * value, for example `answer_expression "a + b": ...`. The full template is
 * already shown above, so repeating a long value only hides the actionable
 * sentence. Keep the explanation and drop the echoed value.
 */
export function findingText({ message, field }: FindingLike): string {
    if (!field) return message;
    const prefix = new RegExp(
        `^${escapeRegExp(field)}(?:\\s+(?:'[^']*'|"[^"]*"))?\\s*:\\s*`,
    );
    const detail = message.replace(prefix, "").trim();
    return detail || message;
}

export function statusLabel(status: AuthoringCheck["status"]): string {
    switch (status) {
        case "passed":
            return "Passed";
        case "failed":
            return "Needs attention";
        case "skipped":
            return "Not run";
        case "error":
            return "Could not run";
    }
}
