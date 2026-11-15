import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { MathQuestionInstance } from "../types";
import { MathQuestionView } from "../components/MathQuestionView";

const baseInstance: MathQuestionInstance = {
    template_id: "segments",
    seed: 2,
    parameters: { a: 1 },
    equation: "x^2 = 4",
    question: "Solve x^2 = 4.",
    choices: ["2", "-2"],
    correct_index: 0,
    answer: "2",
};

function renderView(instance: MathQuestionInstance) {
    return render(
        <MathQuestionView
            instance={instance}
            review={false}
            headingLevel="h2"
            inputsHeadingLevel="h3"
        />,
    );
}

describe("MathQuestionView", () => {
    afterEach(cleanup);

    it("renders prompt segments as text and typeset maths", () => {
        const { container } = renderView({
            ...baseInstance,
            question_segments: [
                { kind: "text", value: "Solve " },
                { kind: "math", value: "x^2 = 4" },
                { kind: "text", value: "." },
            ],
        });

        const heading = screen.getByRole("heading", { level: 2 });
        expect(heading).toHaveTextContent(/^Solve/);
        expect(heading.querySelector(".katex")).not.toBeNull();
        expect(heading.querySelector("math")).not.toBeNull();
        // The prompt already contains the equation, so it is not repeated.
        expect(container.querySelector("p.font-mono")).toBeNull();
    });

    it("falls back to the plain prompt and equation without LaTeX", () => {
        const { container } = renderView({
            ...baseInstance,
            question: "What is the value?",
        });

        const heading = screen.getByRole("heading", { level: 2 });
        expect(heading).toHaveTextContent("What is the value?");
        expect(heading.querySelector(".katex")).toBeNull();

        const equation = container.querySelector("p.font-mono");
        expect(equation).not.toBeNull();
        expect(equation?.textContent).toBe("x^2 = 4");
    });

    it("typesets a standalone equation from equation_latex", () => {
        const { container } = renderView({
            ...baseInstance,
            equation: "2/3",
            equation_latex: "\\frac{2}{3}",
            question: "What is the value?",
        });

        expect(container.querySelector(".katex-display")).not.toBeNull();
        expect(container.querySelector("p.font-mono")).toBeNull();
    });

    it("renders choices from choices_latex when present", () => {
        renderView({
            ...baseInstance,
            choices: ["2/3", "1/2"],
            choices_latex: ["\\frac{2}{3}", "\\frac{1}{2}"],
            correct_index: 0,
            answer: "2/3",
            answer_latex: "\\frac{2}{3}",
        });

        const optionA = screen.getByText("A.").parentElement;
        const optionB = screen.getByText("B.").parentElement;
        expect(optionA?.querySelector(".katex")).not.toBeNull();
        expect(optionA?.querySelector("mfrac")).not.toBeNull();
        expect(optionB?.querySelector(".katex")).not.toBeNull();
        expect(screen.queryByText("2/3")).not.toBeInTheDocument();
        expect(screen.queryByText("1/2")).not.toBeInTheDocument();
        expect(screen.getByText("✓")).toBeInTheDocument();
    });
});
