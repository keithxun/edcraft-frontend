import { describe, expect, it } from "vitest";
import type { MathIrExpression } from "../types";
import {
    firstParameterValues,
    renderIrAnswerRecipe,
    renderIrAnswerRecipeTex,
    renderIrDistractor,
    renderIrDistractorTex,
    renderIrExpression,
    renderIrSample,
    renderIrSampleEquationTex,
    renderIrTex,
    renderIrText,
} from "../components/mathIrRender";
import { mathIrTemplateCandidate } from "./fixtures";

const values = { p: "2", q: "-7" };

describe("math IR rendering", () => {
    it("uses the first declared value for a representative instance", () => {
        expect(firstParameterValues(mathIrTemplateCandidate.item)).toEqual(values);
    });

    it("folds parameter-only subtrees into exact constants", () => {
        const expression: MathIrExpression = {
            op: "sub",
            args: [
                { num: "0" },
                {
                    op: "add",
                    args: [{ param: "p" }, { param: "q" }],
                },
            ],
        };

        expect(renderIrExpression(expression, values)).toBe("5");
    });

    it("renders sums with negative constants instead of plus-minus", () => {
        const expression: MathIrExpression = {
            op: "add",
            args: [
                { op: "pow", args: [{ sym: "x" }, { num: "2" }] },
                {
                    op: "mul",
                    args: [
                        {
                            op: "sub",
                            args: [
                                { num: "0" },
                                {
                                    op: "add",
                                    args: [{ param: "p" }, { param: "q" }],
                                },
                            ],
                        },
                        { sym: "x" },
                    ],
                },
                { op: "mul", args: [{ param: "p" }, { param: "q" }] },
            ],
        };

        expect(renderIrExpression(expression, values)).toBe(
            "x^2 + 5*x - 14",
        );
    });

    it("parenthesises lower-precedence children", () => {
        const expression: MathIrExpression = {
            op: "mul",
            args: [
                { op: "add", args: [{ sym: "x" }, { num: "2" }] },
                { sym: "y" },
            ],
        };

        expect(renderIrExpression(expression, values)).toBe("(x + 2)*y");
    });

    it("uses SymPy-style names for absolute value", () => {
        expect(
            renderIrExpression(
                { op: "abs", args: [{ op: "sub", args: [{ sym: "x" }, { num: "2" }] }] },
                values,
            ),
        ).toBe("Abs(x - 2)");
    });

    it("fills reserved placeholders and keeps doubled braces literal", () => {
        const text = renderIrText(
            {
                ...mathIrTemplateCandidate.item.body,
                text: { mode: "symbolic", template: "Set {{a}} then solve {equation}." },
            },
            values,
        );

        expect(text).toBe("Set {a} then solve x^2 + 5*x - 14 = 0.");
    });

    it("renders the template sample from the fixture", () => {
        expect(renderIrSample(mathIrTemplateCandidate.item)).toEqual({
            text: "Solve x^2 + 5*x - 14 = 0.",
            equation: "x^2 + 5*x - 14 = 0",
        });
    });

    it("keeps the authored structure for the {expr} placeholder", () => {
        const text = renderIrText(
            {
                ...mathIrTemplateCandidate.item.body,
                text: { mode: "symbolic", template: "What is {expr}?" },
                goal: {
                    kind: "evaluate",
                    expr: { op: "add", args: [{ param: "p" }, { param: "q" }] },
                },
            },
            values,
        );

        expect(text).toBe("What is 2 - 7?");
    });

    it("renders the authored answer recipe", () => {
        expect(
            renderIrAnswerRecipe(
                {
                    kind: "set",
                    items: [{ param: "p" }, { param: "q" }],
                },
                values,
            ),
        ).toBe("{2, -7}");
        expect(
            renderIrAnswerRecipe(
                {
                    kind: "tuple",
                    items: [{ param: "p" }, { param: "q" }],
                },
                values,
            ),
        ).toBe("(2, -7)");
        expect(
            renderIrAnswerRecipe(
                {
                    kind: "interval",
                    interval: {
                        lower: { num: "0" },
                        upper: { num: "1" },
                        lower_open: false,
                        upper_open: true,
                    },
                },
                values,
            ),
        ).toBe("[0, 1)");
    });

    it("renders a tuple distractor componentwise", () => {
        expect(
            renderIrDistractor(
                {
                    components: [{ param: "p" }, { param: "q" }],
                    misconception: "SWAPPED",
                },
                values,
            ),
        ).toBe("(2, -7)");
    });
});

describe("LaTeX IR rendering", () => {
    it("renders fractions with \\frac", () => {
        expect(
            renderIrTex({ op: "div", args: [{ sym: "x" }, { num: "2" }] }),
        ).toBe("\\frac{x}{2}");
    });

    it("renders powers with a braced exponent", () => {
        expect(
            renderIrTex({ op: "pow", args: [{ sym: "x" }, { num: "2" }] }),
        ).toBe("x^{2}");
    });

    it("renders roots with \\sqrt", () => {
        expect(renderIrTex({ op: "sqrt", args: [{ sym: "x" }] })).toBe(
            "\\sqrt{x}",
        );
    });

    it("uses \\cdot only between numbers", () => {
        expect(
            renderIrTex(
                { op: "mul", args: [{ num: "2" }, { num: "3" }] },
                {},
                0,
                false,
            ),
        ).toBe("2 \\cdot 3");
        expect(
            renderIrTex({ op: "mul", args: [{ num: "2" }, { sym: "x" }] }),
        ).toBe("2x");
        expect(
            renderIrTex({ op: "mul", args: [{ sym: "x" }, { sym: "y" }] }),
        ).toBe("xy");
    });

    it("uses LaTeX function names", () => {
        expect(renderIrTex({ op: "sin", args: [{ sym: "x" }] })).toBe(
            "\\sin\\left(x\\right)",
        );
        expect(renderIrTex({ op: "log", args: [{ sym: "x" }] })).toBe(
            "\\log\\left(x\\right)",
        );
    });

    it("renders recipes and distractors as LaTeX", () => {
        expect(
            renderIrAnswerRecipeTex(
                {
                    kind: "set",
                    items: [{ param: "p" }, { param: "q" }],
                },
                values,
            ),
        ).toBe("\\left\\{2, -7\\right\\}");
        expect(
            renderIrDistractorTex(
                {
                    components: [{ param: "p" }, { param: "q" }],
                    misconception: "SWAPPED",
                },
                values,
            ),
        ).toBe("(2, -7)");
    });

    it("returns null instead of raw LaTeX for an unsafe symbol", () => {
        expect(renderIrTex({ sym: "x}{\\frac{1}{2}" })).toBeNull();
    });

    it("returns null instead of raw LaTeX for a non-literal number", () => {
        expect(renderIrTex({ num: "\\frac{1}{2}" })).toBeNull();
        expect(renderIrTex({ num: "2e3" })).toBeNull();
    });

    it("returns null for an unknown operation", () => {
        expect(renderIrTex({ op: "evil", args: [{ sym: "x" }] })).toBeNull();
        expect(
            renderIrTex({
                op: "add",
                args: [{ sym: "x" }, { op: "evil", args: [{ sym: "y" }] }],
            }),
        ).toBeNull();
    });

    it("returns null for an unknown parameter and resolves a known one", () => {
        expect(renderIrTex({ param: "missing" }, values)).toBeNull();
        expect(renderIrTex({ param: "p" }, values)).toBe("2");
        expect(renderIrTex({ param: "p" }, { p: "\\frac{1}{2}" })).toBeNull();
    });

    it("renders the sample equation as LaTeX, and not prose", () => {
        expect(renderIrSampleEquationTex(mathIrTemplateCandidate.item)).toBe(
            "x^{2} + 5x - 14 = 0",
        );
        const prose = {
            ...mathIrTemplateCandidate.item,
            body: {
                ...mathIrTemplateCandidate.item.body,
                givens: [],
                goal: { kind: "evaluate" },
            },
        };
        expect(renderIrSampleEquationTex(prose)).toBeNull();
    });
});
