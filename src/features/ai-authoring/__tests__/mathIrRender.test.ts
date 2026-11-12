import { describe, expect, it } from "vitest";
import type { MathIrExpression } from "../types";
import {
    firstParameterValues,
    renderIrDistractor,
    renderIrExpression,
    renderIrSample,
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
