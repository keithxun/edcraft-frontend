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
    // Legacy artifacts created before relevance became a shared capability.
    math_assess_template_relevance: "Relevance",
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
    // Legacy artifacts created before relevance became a shared capability.
    math_assess_template_relevance: "The template is relevant to the request.",
    assess_template_relevance: "The template is relevant to the request.",
};

export function friendlyCheckLabel(tool: string): string {
    return FRIENDLY_CHECK_LABELS[tool] ?? tool.replaceAll("_", " ");
}

export function checkLabel(check: AuthoringCheck): string {
    return friendlyCheckLabel(check.tool);
}

export function checkDescription(check: AuthoringCheck): string | null {
    return CHECK_DESCRIPTIONS[check.tool] ?? null;
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
