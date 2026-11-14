import type { AuthoringCheck } from "./types";

// Only real MCP tool names are mapped. Unrecognised tools fall back to their
// raw identifier rather than inventing a friendly label.
const FRIENDLY_CHECK_LABELS: Record<string, string> = {
    code_require_features: "Required features",
    code_validate_answers_and_distractors: "Answers and wrong choices",
    code_verify_template_structure: "Question template",
    math_verify_template_structure: "Question template",
    math_validate_answers_and_distractors: "Answers and wrong choices",
    math_assess_template_difficulty: "Difficulty",
    math_verify_item_spec: "Math item",
    math_validate_options: "Answer choices",
    math_verify_text_fidelity: "Question wording",
    assess_template_relevance: "Relevance",
};

const CHECK_DESCRIPTIONS: Record<string, string> = {
    code_require_features: "The requested Python features are present.",
    code_validate_answers_and_distractors:
        "The answer and every wrong choice evaluate correctly and are distinct.",
    code_verify_template_structure: "The template is structurally valid and renders.",
    math_verify_template_structure:
        "The equation and question template are structurally valid and render.",
    math_validate_answers_and_distractors:
        "The answer and every wrong choice evaluate correctly and are distinct.",
    math_assess_template_difficulty: "The estimated difficulty matches the request.",
    math_verify_item_spec:
        "The typed math item compiles, solves, and its declared answer agrees.",
    math_validate_options:
        "Every wrong choice is demonstrably wrong and no two choices are equivalent.",
    math_verify_text_fidelity:
        "A blind parse of the wording reconstructs the same problem.",
    assess_template_relevance: "The template is relevant to the request.",
};

export function friendlyCheckLabel(tool: string): string {
    return FRIENDLY_CHECK_LABELS[tool] ?? tool.replaceAll("_", " ");
}

export interface CheckSupport {
    supports: string[];
}

const CHECK_SUPPORT: Record<string, CheckSupport> = {
    code_require_features: {
        supports: [
            "Control flow: conditional (if/else), early_return (return inside an if), nested_conditional (if inside an if), sequential_conditionals (two or more sibling ifs).",
            "Loops: loop (for), nested_loop (loop inside a loop), sequential_loops (two or more sibling loops).",
            "Functions: helper_function (separate helper called from the entry function), nested_helper (a helper calling another helper).",
            "Lists: list_index (indexing), list_aggregate (sum, min, max, all, any), list_sort (sorted).",
            "Expressions: arithmetic (a binary numeric operation).",
        ],
    },
    code_verify_template_structure: {
        supports: [
            "Placeholders, template rendering, and the structure of the answer expression.",
        ],
    },
    code_validate_answers_and_distractors: {
        supports: [
            "The correct answer and every wrong choice are executed on a deterministic sample of inputs.",
            "Answers must be correct and the wrong choices distinct.",
        ],
    },
    math_verify_template_structure: {
        supports: [
            "Equation rendering, parameter substitution, and template structure.",
        ],
    },
    math_validate_answers_and_distractors: {
        supports: [
            "Evaluation of the answer and every wrong choice.",
            "Distinctness across sampled parameter combinations.",
        ],
    },
    math_verify_item_spec: {
        supports: [
            "Exact integer and rational arithmetic, expressions, equations, and inequalities.",
            "One-unknown solves and ordered-tuple linear systems.",
            "Derivatives, antiderivatives, definite integrals, matrices, and determinants.",
        ],
    },
    math_validate_options: {
        supports: [
            "One to ten wrong choices, each graded by the deterministic engine.",
            "Equivalent-option detection and wrong-answer verification.",
        ],
    },
    math_verify_text_fidelity: {
        supports: [
            "Symbolic templates are rendered and checked without a model call.",
            "Prose templates add anchor checks and a blind parse-back reconstruction.",
        ],
    },
    assess_template_relevance: {
        supports: ["Compares the authored template with the original request."],
    },
};

export function checkLabel(check: AuthoringCheck): string {
    return friendlyCheckLabel(check.tool);
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
