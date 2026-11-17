import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MathTemplateDetails } from "../components/MathTemplateDetails";
import type { IrMathTemplateCandidate, MathIrGoal } from "../types";
import { mathIrTemplateCandidate } from "./fixtures";

function withBody(
    body: Partial<IrMathTemplateCandidate["item"]["body"]>,
): IrMathTemplateCandidate {
    return {
        ...mathIrTemplateCandidate,
        item: {
            ...mathIrTemplateCandidate.item,
            body: {
                ...mathIrTemplateCandidate.item.body,
                ...body,
            },
        },
    };
}

function annotations(section: HTMLElement): string[] {
    return Array.from(section.querySelectorAll("annotation")).map(
        (annotation) => annotation.textContent ?? "",
    );
}

describe("MathTemplateDetails", () => {
    afterEach(cleanup);

    it("shows parameter names in givens, goal, answer and wrong choices", () => {
        render(<MathTemplateDetails candidate={mathIrTemplateCandidate} />);

        expect(screen.getByText("school.quadratic · Easy")).toBeInTheDocument();
        expect(screen.getByText("Solve {equation}.")).toBeInTheDocument();

        const parameters = screen.getByLabelText("Parameters");
        expect(within(parameters).getByText("p")).toBeInTheDocument();
        expect(within(parameters).getByText("2, 3")).toBeInTheDocument();
        expect(within(parameters).getByText("q")).toBeInTheDocument();
        expect(within(parameters).getByText("-7, -5")).toBeInTheDocument();

        const goal = screen.getByLabelText("Goal");
        expect(within(goal).getByText("Solve for x")).toBeInTheDocument();
        expect(goal.querySelector(".katex")).not.toBeNull();
        const goalAnnotation = goal.querySelector("annotation")?.textContent ?? "";
        expect(goalAnnotation).toContain("p");
        expect(goalAnnotation).toContain("q");
        expect(goalAnnotation).not.toContain("5x");
        expect(goalAnnotation).not.toContain("14");

        const answer = screen.getByLabelText("Answer");
        expect(annotations(answer)).toEqual(["\\left\\{p, q\\right\\}"]);

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
        const choiceAnnotations = annotations(choices);
        expect(choiceAnnotations).toContain("0 - p");
        expect(choiceAnnotations).toContain("p + q");
        expect(choiceAnnotations.join(" ")).not.toContain("-2");
        expect(choiceAnnotations.join(" ")).not.toContain("-5");

        expect(screen.queryByText("Op")).not.toBeInTheDocument();
        expect(screen.queryByText("Args")).not.toBeInTheDocument();
        expect(screen.queryByText("Num")).not.toBeInTheDocument();
    });

    it("shows parameter names in givens", () => {
        const candidate = withBody({
            goal: { kind: "simplify", expr: { sym: "x" } },
        });
        render(<MathTemplateDetails candidate={candidate} />);

        const givens = screen.getByLabelText("Givens");
        const givenTex = annotations(givens)[0] ?? "";
        expect(givenTex).toContain("p + q");
        expect(givenTex).toContain("pq");
        expect(givenTex).not.toContain("5x");
        expect(givenTex).not.toContain("14");
    });

    it("shows relation givens once, under the goal", () => {
        render(<MathTemplateDetails candidate={mathIrTemplateCandidate} />);

        expect(screen.queryByLabelText("Givens")).not.toBeInTheDocument();
        const goal = screen.getByLabelText("Goal");
        const goalTex = annotations(goal)[0] ?? "";
        expect(goalTex).toContain("p + q");
        expect(goalTex).toContain("pq");
        expect(goalTex).toContain("= 0");
        expect(goalTex).not.toContain("5x");
    });

    it("keeps goal, givens, answer and wrong choices flat", () => {
        const candidate = withBody({
            goal: { kind: "simplify", expr: { sym: "x" } },
        });
        render(<MathTemplateDetails candidate={candidate} />);

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

    it("hides an empty wrong-choice reason", () => {
        const candidate = withBody({
            distractors: [
                {
                    value: { op: "sub", args: [{ num: "0" }, { param: "p" }] },
                    misconception: "SIGN_ERROR",
                    reason: "   ",
                },
                {
                    value: { op: "add", args: [{ param: "p" }, { param: "q" }] },
                    misconception: "SUM_AS_ROOT",
                    reason: "",
                },
            ],
        });
        render(<MathTemplateDetails candidate={candidate} />);

        const choices = screen.getByLabelText("Wrong choices");
        expect(within(choices).getByText("Misconception: Sign error")).toBeInTheDocument();
        expect(within(choices).getByText("Misconception: Sum as root")).toBeInTheDocument();
        expect(within(choices).queryByText(/^Reason:/)).not.toBeInTheDocument();
    });

    it("labels the closed goal kinds", () => {
        const goals: Array<[MathIrGoal, string]> = [
            [{ kind: "evaluate", expr: { sym: "x" } }, "Evaluate"],
            [{ kind: "solve", symbols: ["x", "y"] }, "Solve for x, y"],
            [{ kind: "simplify", expr: { sym: "x" } }, "Simplify"],
            [{ kind: "factor", expr: { sym: "x" } }, "Factorise"],
            [{ kind: "expand", expr: { sym: "x" } }, "Expand"],
            [{ kind: "derivative", order: 1, expr: { sym: "x" } }, "Differentiate"],
            [
                { kind: "derivative", order: 2, expr: { sym: "x" } },
                "Find the second derivative of",
            ],
            [
                { kind: "derivative", order: 3, expr: { sym: "x" } },
                "Find the 3rd derivative of",
            ],
            [
                {
                    kind: "derivative",
                    order: 11,
                    expr: { sym: "x" },
                },
                "Find the 11th derivative of",
            ],
            [
                { kind: "integral", expr: { sym: "x" } },
                "Integrate",
            ],
            [
                { kind: "limit", expr: { sym: "x" }, point: { num: "0" } },
                "Find the limit of",
            ],
            [
                { kind: "determinant", matrix: [[{ sym: "x" }]] },
                "Find the determinant of",
            ],
            [
                { kind: "eigenvalues", matrix: [[{ sym: "x" }]] },
                "Find the eigenvalues of",
            ],
        ];

        for (const [goal, label] of goals) {
            render(<MathTemplateDetails candidate={withBody({ goal })} />);
            expect(within(screen.getByLabelText("Goal")).getByText(label)).toBeInTheDocument();
            cleanup();
        }
    });

    it("uses the goal kind as a sentence for an unknown kind", () => {
        const candidate = withBody({
            givens: [],
            goal: { kind: "classify" },
            answer_recipe: null,
            distractors: [],
        });

        render(<MathTemplateDetails candidate={candidate} />);

        expect(within(screen.getByLabelText("Goal")).getByText("Classify")).toBeInTheDocument();
        expect(screen.getByText("No answer recipe declared.")).toBeInTheDocument();
        expect(
            within(screen.getByLabelText("Wrong choices")).getByText("None"),
        ).toBeInTheDocument();
    });

    it("shows a domain given in symbols", () => {
        const candidate = withBody({
            givens: [
                {
                    id: "domain-x",
                    kind: "domain",
                    symbol: "x",
                    domain: "real",
                },
            ],
        });

        render(<MathTemplateDetails candidate={candidate} />);

        const givens = screen.getByLabelText("Givens");
        expect(givens.querySelector("annotation")?.textContent).toBe(
            "x \\in \\mathbb{R}",
        );
    });

    it("renders a partial payload without throwing", () => {
        const candidate = {
            template_id: "partial",
            difficulty: "easy",
            question_type: "mcq",
            item: {
                topic: "school.quadratic",
                parameters: [{ name: "p" }],
                body: {},
            },
        } as unknown as IrMathTemplateCandidate;

        expect(() =>
            render(<MathTemplateDetails candidate={candidate} />),
        ).not.toThrow();

        expect(screen.getByLabelText("Goal")).toBeInTheDocument();
        expect(screen.getByText("No answer recipe declared.")).toBeInTheDocument();
        expect(
            within(screen.getByLabelText("Wrong choices")).getByText("None"),
        ).toBeInTheDocument();
    });
});
