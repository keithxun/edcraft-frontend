import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MathTemplateDetails } from "../components/MathTemplateDetails";
import type { IrMathTemplateCandidate } from "../types";
import { mathIrTemplateCandidate } from "./fixtures";

describe("MathTemplateDetails", () => {
    afterEach(cleanup);

    it("shows the template as symbols instead of the generic IR tree", () => {
        render(<MathTemplateDetails candidate={mathIrTemplateCandidate} />);

        expect(screen.getByText("school.quadratic · Easy")).toBeInTheDocument();
        expect(screen.getByText("Solve {equation}.")).toBeInTheDocument();

        const parameters = screen.getByLabelText("Parameters");
        expect(within(parameters).getByText("p")).toBeInTheDocument();
        expect(within(parameters).getByText("2, 3")).toBeInTheDocument();
        expect(within(parameters).getByText("q")).toBeInTheDocument();
        expect(within(parameters).getByText("-7, -5")).toBeInTheDocument();

        const givens = screen.getByLabelText("Givens");
        expect(givens.querySelector(".katex")).not.toBeNull();
        expect(givens.querySelector("annotation")?.textContent).toBe(
            "x^{2} + 5x - 14 = 0",
        );

        const goal = screen.getByLabelText("Goal");
        expect(within(goal).getByText("Solve for x")).toBeInTheDocument();
        expect(goal.querySelector(".katex")).not.toBeNull();
        const goalAnnotation = goal.querySelector("annotation")?.textContent ?? "";
        expect(goalAnnotation).toContain("p + q");
        expect(goalAnnotation).not.toContain("5x");

        const answer = screen.getByLabelText("Answer");
        expect(answer.querySelector("annotation")?.textContent).toBe(
            "\\left\\{2, -7\\right\\}",
        );

        const choices = screen.getByLabelText("Wrong choices");
        expect(
            within(choices).getByText("Misconception: Sign error"),
        ).toBeInTheDocument();
        expect(
            within(choices).getByText("Misconception: Sum as root"),
        ).toBeInTheDocument();
        expect(
            within(choices).getByText("Reason: Flips the sign of one root"),
        ).toBeInTheDocument();
        expect(
            Array.from(choices.querySelectorAll("annotation")).map(
                (annotation) => annotation.textContent,
            ),
        ).toEqual(["-2", "-5"]);

        expect(screen.queryByText("Op")).not.toBeInTheDocument();
        expect(screen.queryByText("Args")).not.toBeInTheDocument();
        expect(screen.queryByText("Num")).not.toBeInTheDocument();
    });

    it("keeps goal, givens, answer and wrong choices flat", () => {
        render(<MathTemplateDetails candidate={mathIrTemplateCandidate} />);

        for (const label of ["Goal", "Givens", "Answer", "Wrong choices"]) {
            const section = screen.getByLabelText(label);
            expect(section.querySelector("details")).toBeNull();
            expect(section.querySelector("table")).toBeNull();
            expect(section.querySelector('[class*="border"]')).toBeNull();
            expect(section.querySelector('[class*="rounded"]')).toBeNull();
        }

        const givens = screen.getByLabelText("Givens");
        expect(givens.querySelectorAll("li")).toHaveLength(1);
        expect(givens.querySelector("ul ul")).toBeNull();
        expect(givens.querySelector(".katex")).not.toBeNull();

        const goal = screen.getByLabelText("Goal");
        expect(goal.querySelectorAll("p")).toHaveLength(1);
        expect(goal.querySelector(".katex")).not.toBeNull();
    });

    it("uses the goal kind as a sentence for an unknown kind", () => {
        const candidate: IrMathTemplateCandidate = {
            ...mathIrTemplateCandidate,
            item: {
                ...mathIrTemplateCandidate.item,
                body: {
                    ...mathIrTemplateCandidate.item.body,
                    givens: [],
                    goal: { kind: "classify" },
                    answer_recipe: null,
                    distractors: [],
                },
            },
        };

        render(<MathTemplateDetails candidate={candidate} />);

        expect(within(screen.getByLabelText("Goal")).getByText("Classify")).toBeInTheDocument();
        expect(screen.getByText("No answer recipe declared.")).toBeInTheDocument();
        expect(
            within(screen.getByLabelText("Wrong choices")).getByText("None"),
        ).toBeInTheDocument();
    });

    it("shows a domain given in symbols", () => {
        const candidate: IrMathTemplateCandidate = {
            ...mathIrTemplateCandidate,
            item: {
                ...mathIrTemplateCandidate.item,
                body: {
                    ...mathIrTemplateCandidate.item.body,
                    givens: [
                        {
                            id: "domain-x",
                            kind: "domain",
                            symbol: "x",
                            domain: "real",
                        },
                    ],
                },
            },
        };

        render(<MathTemplateDetails candidate={candidate} />);

        const givens = screen.getByLabelText("Givens");
        expect(givens.querySelector("annotation")?.textContent).toBe(
            "x \\in \\mathbb{R}",
        );
    });
});
