import { describe, expect, it } from "vitest";
import { checkDescription, findingText, friendlyCheckLabel } from "../checkMetadata";

describe("math check labels", () => {
    it("maps the math validation tools to friendly wording", () => {
        expect(friendlyCheckLabel("math_verify_template_structure")).toBe(
            "Question template",
        );
        expect(friendlyCheckLabel("math_validate_answers_and_distractors")).toBe(
            "Answers and wrong choices",
        );
        expect(friendlyCheckLabel("math_assess_template_difficulty")).toBe("Difficulty");
        expect(friendlyCheckLabel("assess_template_relevance")).toBe("Relevance");
        expect(friendlyCheckLabel("math_verify_item_spec")).toBe("Math item");
        expect(friendlyCheckLabel("math_validate_options")).toBe("Answer choices");
        expect(
            checkDescription({
                tool: "math_validate_answers_and_distractors",
            } as Parameters<typeof checkDescription>[0]),
        ).toContain("distinct");
    });

    it("keeps the raw identifier for unknown tools", () => {
        expect(friendlyCheckLabel("math_unknown_tool")).toBe("math unknown tool");
        expect(
            checkDescription({
                tool: "math_unknown_tool",
            } as Parameters<typeof checkDescription>[0]),
        ).toBeNull();
    });
});

describe("findingText", () => {
    it("drops a long echoed expression and keeps the actionable sentence", () => {
        const expression = `('A' if x else 'B') if ${"x < 0 and ".repeat(40)}y else 'C'`;
        const detail =
            "template expression exceeds 500 characters. Expressions use bare parameter names, " +
            "for example a + b. Placeholder braces belong only in text templates.";

        expect(
            findingText({
                field: "answer_expression",
                message: `answer_expression "${expression}": ${detail}`,
            }),
        ).toBe(detail);
    });

    it("drops shorter quoted values and bracketed field names", () => {
        expect(
            findingText({
                field: "distractors[0].expression",
                message:
                    "distractors[0].expression 'a +': invalid template expression 'a +': " +
                    "invalid syntax",
            }),
        ).toBe("invalid template expression 'a +': invalid syntax");
    });

    it("keeps messages that do not echo a field value", () => {
        expect(
            findingText({
                field: "code",
                message: "A sampled example failed to execute.",
            }),
        ).toBe("A sampled example failed to execute.");
    });

    it("keeps plain messages and messages without a separator", () => {
        expect(findingText({ message: "No field here." })).toBe("No field here.");
        expect(
            findingText({ field: "code", message: "code without an explanation" }),
        ).toBe("code without an explanation");
    });
});
