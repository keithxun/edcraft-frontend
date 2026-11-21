import type { AuthoringCheck } from "./types";

// Only real MCP tool names are mapped. Unrecognised tools fall back to their
// raw identifier rather than inventing a friendly label.
const FRIENDLY_CHECK_LABELS: Record<string, string> = {
    code_require_features: "Required features",
    code_validate_answers_and_distractors: "Answers and wrong choices",
    code_verify_template_structure: "Question template",
    code_verify_authored_h2_trace: "Trace answer and choices",
    assess_template_difficulty: "Difficulty",
    math_verify_item_spec: "Correct answer",
    math_verify_answer_form: "Answer form",
    math_validate_options: "Answer choices",
    math_verify_text_fidelity: "Question wording",
    biology_verify_cross: "Correct answer",
    biology_validate_options: "Answer choices",
    biology_verify_text_fidelity: "Question wording",
    chemistry_verify_authored_task: "Chemical calculation and choices",
    physics_verify_authored_task: "Physical calculation and choices",
    application_material_variants: "Variation in practice questions",
    application_visible_variants: "Variation in practice questions",
    chemistry_verify_balance: "Balanced equation",
    chemistry_verify_options: "Answer choices",
    physics_verify_item: "Correct answer",
    physics_validate_options: "Answer choices",
    physics_verify_text: "Question wording",
    physics_verify_text_fidelity: "Question meaning",
    application_distractor_count: "Number of wrong choices",
    assess_template_relevance: "Relevance",
};

const CHECK_DESCRIPTIONS: Record<string, string> = {
    chemistry_verify_authored_task:
        "Calculates the result from the displayed formulas and quantities and checks the answer choices.",
    physics_verify_authored_task:
        "Applies the stated physical laws in order and checks units, rounding and answer choices.",
    application_material_variants:
        "Compares up to 16 seeds for at least two different problems from the reviewed material.",
    application_visible_variants:
        "Compares up to 16 seeds for at least two different problems, ignoring option order.",
    code_require_features: "Checks that the code uses the Python features you asked for.",
    code_validate_answers_and_distractors:
        "Checks that the answer is right and every wrong choice is different.",
    code_verify_template_structure: "Checks that the question template is complete and renders.",
    code_verify_authored_h2_trace:
        "Simulates the visible queue or merge operations and checks the answer and choices on sampled inputs.",
    assess_template_difficulty:
        "Checks that the estimated difficulty matches the level you chose.",
    math_verify_item_spec: "Checks that the maths engine gets the same answer as the template.",
    math_verify_answer_form:
        "Checks that the answer is written in the form the question asks for, such as factorised or expanded.",
    math_validate_options:
        "Checks that every wrong choice is wrong and that no two choices are equal.",
    math_verify_text_fidelity:
        "Checks that the question wording describes the same problem as the maths.",
    biology_verify_cross:
        "Checks the exact inheritance calculation or the answer in the selected H2 case.",
    biology_validate_options:
        "Checks that every wrong choice is wrong and that no two choices are equal.",
    biology_verify_text_fidelity:
        "Checks the cross wording or that the selected H2 case uses its approved question text.",
    chemistry_verify_balance:
        "Checks that every reaction in the template has exactly one balanced form with the smallest whole-number coefficients.",
    chemistry_verify_options:
        "Checks that every wrong choice is unbalanced, not reduced, uses a wrong species or gives a different coefficient, and that no two choices are equal.",
    physics_verify_item:
        "Checks that the template's answer matches F = m a for every set of values tried.",
    physics_validate_options:
        "Checks that every wrong choice is wrong, different from the others and shown exactly.",
    physics_verify_text_fidelity:
        "Checks that the rendered question describes the intended setup and asks for the intended quantity.",
    physics_verify_text:
        "Checks that every value in the question comes from a checked parameter.",
    application_distractor_count:
        "Checks that there are at least as many wrong choices as you asked for.",
    assess_template_relevance: "A model estimates how closely the question matches your request.",
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
    code_verify_authored_h2_trace: {
        supports: [
            "Circular queue operations, including wraparound and reinserting a dequeued value.",
            "Stable merges, including ties and intermediate checkpoints.",
            "Parameter boundaries and one set of distinct, type-compatible wrong choices.",
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
    biology_verify_cross: {
        supports: [
            "Custom one-gene crosses and curated H2 cases, including dihybrid questions.",
            "Probabilities as exact fractions, whole-number expected counts and labelled ratios.",
            "Templates with few combinations are checked in full. Larger ones are sampled.",
        ],
    },
    biology_validate_options: {
        supports: [
            "Wrong choices come from exact recipes or the approved H2 case.",
            "Choices that are equal in value count as duplicates.",
        ],
    },
    biology_verify_text_fidelity: {
        supports: [
            "The wording must describe the same parents, given offspring and target.",
            "A second model reads custom cross wording. H2 cases use approved text.",
        ],
    },
    chemistry_verify_balance: {
        supports: [
            "Neutral formulas with parentheses and hydrates, such as Ca(OH)2 and CuSO4·5H2O.",
            "Reactions come from a curated catalogue. The model does not invent species.",
            "Charges, state symbols, electrons and isotopes are not supported.",
        ],
    },
    chemistry_verify_options: {
        supports: ["Every reaction the template can use is checked."],
    },
    physics_verify_item: {
        supports: [
            "One object on one horizontal line, with SI units only (kg, N, m/s²).",
            "Answers must be exact at the number of decimal places shown.",
        ],
    },
    physics_validate_options: {
        supports: [
            "A wrong choice may come from a unit slip. It is still shown in the answer's unit.",
        ],
    },
    physics_verify_text_fidelity: {
        supports: [
            "Built-in H2 questions are checked directly against their registered cases.",
            "For free-text questions, a model reads up to three versions without seeing the template.",
        ],
    },
    physics_verify_text: {
        supports: ["Numbers written directly in the wording are rejected."],
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
            "The physics rubric is provisional.",
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
