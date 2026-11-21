import { describe, expect, it } from "vitest";
import {
    checkDescription,
    checkSupport,
    findingText,
    friendlyCheckLabel,
} from "../checkMetadata";
import type { AuthoringCheck } from "../types";

function check(tool: string): AuthoringCheck {
    return {
        tool,
        status: "passed",
        advisory: false,
        findings: [],
        error: null,
    };
}

describe("check labels and descriptions", () => {
    it("maps the math validation tools to friendly wording", () => {
        expect(friendlyCheckLabel("assess_template_difficulty")).toBe("Difficulty");
        expect(friendlyCheckLabel("assess_template_relevance")).toBe("Relevance");
        expect(friendlyCheckLabel("math_verify_item_spec")).toBe("Correct answer");
        expect(friendlyCheckLabel("math_validate_options")).toBe("Answer choices");
        expect(friendlyCheckLabel("math_verify_answer_form")).toBe("Answer form");
        expect(friendlyCheckLabel("math_verify_text_fidelity")).toBe("Question wording");
        expect(friendlyCheckLabel("chemistry_verify_balance")).toBe(
            "Balanced equation",
        );
        expect(friendlyCheckLabel("chemistry_verify_options")).toBe("Answer choices");
        expect(friendlyCheckLabel("physics_verify_item")).toBe("Correct answer");
        expect(friendlyCheckLabel("physics_validate_options")).toBe("Answer choices");
        expect(friendlyCheckLabel("physics_verify_text")).toBe("Question wording");
        expect(friendlyCheckLabel("physics_verify_text_fidelity")).toBe("Question meaning");
        expect(friendlyCheckLabel("application_distractor_count")).toBe(
            "Number of wrong choices",
        );
        expect(friendlyCheckLabel("code_verify_template_structure")).toBe(
            "Question template",
        );
        expect(friendlyCheckLabel("code_require_features")).toBe("Required features");
        expect(friendlyCheckLabel("code_validate_answers_and_distractors")).toBe(
            "Answers and wrong choices",
        );
        expect(friendlyCheckLabel("biology_verify_cross")).toBe("Correct answer");
        expect(friendlyCheckLabel("biology_validate_options")).toBe("Answer choices");
        expect(friendlyCheckLabel("biology_verify_text_fidelity")).toBe(
            "Question wording",
        );
    });

    it("drops labels for tools that no longer exist", () => {
        expect(friendlyCheckLabel("math_verify_template_structure")).toBe(
            "math verify template structure",
        );
        expect(friendlyCheckLabel("math_validate_answers_and_distractors")).toBe(
            "math validate answers and distractors",
        );
        expect(checkDescription(check("math_verify_template_structure"))).toBeNull();
        expect(checkDescription(check("math_validate_answers_and_distractors"))).toBeNull();
    });

    it("describes what each check does in plain language", () => {
        expect(checkDescription(check("math_verify_item_spec"))).toBe(
            "Checks that the maths engine gets the same answer as the template.",
        );
        expect(checkDescription(check("math_validate_options"))).toBe(
            "Checks that every wrong choice is wrong and that no two choices are equal.",
        );
        expect(checkDescription(check("math_verify_answer_form"))).toBe(
            "Checks that the answer is written in the form the question asks for, such as factorised or expanded.",
        );
        expect(checkDescription(check("math_verify_text_fidelity"))).toBe(
            "Checks that the question wording describes the same problem as the maths.",
        );
        expect(checkDescription(check("chemistry_verify_balance"))).toBe(
            "Checks that every reaction in the template has exactly one balanced form with the smallest whole-number coefficients.",
        );
        expect(checkDescription(check("chemistry_verify_options"))).toBe(
            "Checks that every wrong choice is unbalanced, not reduced, uses a wrong species or gives a different coefficient, and that no two choices are equal.",
        );
        expect(checkDescription(check("physics_verify_item"))).toBe(
            "Checks that the template's answer matches F = m a for every set of values tried.",
        );
        expect(checkDescription(check("physics_validate_options"))).toBe(
            "Checks that every wrong choice is wrong, different from the others and shown exactly.",
        );
        expect(checkDescription(check("physics_verify_text_fidelity"))).toBe(
            "Checks that the rendered question describes the intended setup and asks for the intended quantity.",
        );
        expect(checkDescription(check("physics_verify_text"))).toBe(
            "Checks that every value in the question comes from a checked parameter.",
        );
        expect(checkDescription(check("assess_template_relevance"))).toBe(
            "A model estimates how closely the question matches your request.",
        );
        expect(checkDescription(check("assess_template_difficulty"))).toBe(
            "Checks that the estimated difficulty matches the level you chose.",
        );
        expect(checkDescription(check("code_require_features"))).toBe(
            "Checks that the code uses the Python features you asked for.",
        );
        expect(checkDescription(check("code_validate_answers_and_distractors"))).toBe(
            "Checks that the answer is right and every wrong choice is different.",
        );
        expect(checkDescription(check("code_verify_template_structure"))).toBe(
            "Checks that the question template is complete and renders.",
        );
        expect(checkDescription(check("application_distractor_count"))).toBe(
            "Checks that there are at least as many wrong choices as you asked for.",
        );
        expect(checkDescription(check("biology_verify_cross"))).toBe(
            "Checks the exact inheritance calculation or the answer in the selected H2 case.",
        );
        expect(checkDescription(check("biology_validate_options"))).toBe(
            "Checks that every wrong choice is wrong and that no two choices are equal.",
        );
        expect(checkDescription(check("biology_verify_text_fidelity"))).toBe(
            "Checks the cross wording or that the selected H2 case uses its approved question text.",
        );
    });

    it("lists what each check supports", () => {
        expect(checkSupport(check("math_verify_item_spec"))?.supports).toEqual([
            "Supports exact arithmetic with whole numbers and fractions, expressions, equations and inequalities.",
            "It also covers equations in one unknown, pairs of linear equations, derivatives, integrals, matrices and determinants.",
        ]);
        expect(checkSupport(check("math_validate_options"))?.supports).toEqual([
            "The maths engine grades each wrong choice, for one to ten wrong choices.",
            "Choices that are equal in value count as duplicates.",
        ]);
        expect(checkSupport(check("math_verify_answer_form"))?.supports).toEqual([
            "Runs only for factorising and expanding questions, where the form is part of the answer.",
            "It checks the form for every set of values tried.",
        ]);
        expect(checkSupport(check("math_verify_text_fidelity"))?.supports).toEqual([
            "Questions written as plain maths are checked directly.",
            "For worded questions, a second model reads the wording alone and must recover the same problem.",
        ]);
        expect(checkSupport(check("chemistry_verify_balance"))?.supports).toEqual([
            "Neutral formulas with parentheses and hydrates, such as Ca(OH)2 and CuSO4·5H2O.",
            "Reactions come from a curated catalogue. The model does not invent species.",
            "Charges, state symbols, electrons and isotopes are not supported.",
        ]);
        expect(checkSupport(check("chemistry_verify_options"))?.supports).toEqual([
            "Every reaction the template can use is checked.",
        ]);
        expect(checkSupport(check("physics_verify_item"))?.supports).toEqual([
            "One object on one horizontal line, with SI units only (kg, N, m/s²).",
            "Answers must be exact at the number of decimal places shown.",
        ]);
        expect(checkSupport(check("physics_validate_options"))?.supports).toEqual([
            "A wrong choice may come from a unit slip. It is still shown in the answer's unit.",
        ]);
        expect(checkSupport(check("physics_verify_text_fidelity"))?.supports).toEqual([
            "Built-in H2 questions are checked directly against their registered cases.",
            "For free-text questions, a model reads up to three versions without seeing the template.",
        ]);
        expect(checkSupport(check("physics_verify_text"))?.supports).toEqual([
            "Numbers written directly in the wording are rejected.",
        ]);
        expect(checkSupport(check("application_distractor_count"))?.supports).toEqual([
            "EdCraft runs this on every question.",
            "If there are too few wrong choices, the model is asked to revise.",
        ]);
        expect(checkSupport(check("assess_template_difficulty"))?.supports).toEqual([
            "A second model rates the difficulty against a written rubric.",
            "A mismatch is shown for your judgement and never blocks approval.",
            "The maths rubric is provisional.",
            "The physics rubric is provisional.",
        ]);
        expect(checkSupport(check("assess_template_relevance"))?.supports).toEqual([
            "A second model compares the question with your request.",
            "A mismatch is shown for your judgement and never blocks approval.",
        ]);
        expect(checkSupport(check("code_require_features"))?.supports).toEqual([
            "Branches: if and else, an early return, and nested or consecutive ifs.",
            "Loops: single, nested or consecutive.",
            "Helper functions, including a helper that calls another.",
            "Lists: indexing, sum, min, max, all, any and sorting.",
            "Arithmetic.",
        ]);
        expect(checkSupport(check("code_validate_answers_and_distractors"))?.supports).toEqual(
            [
                "Runs the code on a fixed sample of inputs.",
                "The answer must be right and every wrong choice different.",
            ],
        );
        expect(checkSupport(check("code_verify_template_structure"))?.supports).toEqual([
            "Placeholders, the rendered question and the answer expression.",
        ]);
        expect(checkSupport(check("biology_verify_cross"))?.supports).toEqual([
            "Custom one-gene crosses and curated H2 cases, including dihybrid questions.",
            "Probabilities as exact fractions, whole-number expected counts and labelled ratios.",
            "Templates with few combinations are checked in full. Larger ones are sampled.",
        ]);
        expect(checkSupport(check("biology_validate_options"))?.supports).toEqual([
            "Wrong choices come from exact recipes or the approved H2 case.",
            "Choices that are equal in value count as duplicates.",
        ]);
        expect(checkSupport(check("biology_verify_text_fidelity"))?.supports).toEqual([
            "The wording must describe the same parents, given offspring and target.",
            "A second model reads custom cross wording. H2 cases use approved text.",
        ]);
    });

    it("keeps the raw identifier for unknown tools", () => {
        expect(friendlyCheckLabel("math_unknown_tool")).toBe("math unknown tool");
        expect(checkDescription(check("math_unknown_tool"))).toBeNull();
        expect(friendlyCheckLabel("biology_unknown_tool")).toBe("biology unknown tool");
        expect(checkDescription(check("biology_unknown_tool"))).toBeNull();
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
