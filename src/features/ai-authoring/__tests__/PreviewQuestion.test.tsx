import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PreviewQuestion } from "../components/PreviewQuestion";
import { ReadableValue } from "../components/ReadableValue";
import type { CodeQuestionInstance } from "../types";
import {
    biologyQuestionInstance,
    mathQuestionInstance,
    previewInstance,
    stubQuestionInstance,
} from "./fixtures";

vi.mock("../components/ReadOnlyCode", () => ({
    ReadOnlyCode: ({ code, label }: { code: string; label: string }) => (
        <pre aria-label={label}>{code}</pre>
    ),
}));

const structuredInstance: CodeQuestionInstance = {
    ...previewInstance,
    parameters: {
        values: [1, 2, 3],
        count: 3,
    },
    question: {
        ...previewInstance.question,
        inputs: {
            matrix: [
                [1, 2],
                [3, 4],
            ],
            labels: ["first", "second"],
        },
        proposed_answer: {
            values: [
                [1, 2],
                [3, 4],
            ],
        },
        distractors: [[1, 2, 3, 4], { choice: "none" }],
        distractor_reasons: ["Flattens the two rows.", "Does not add anything."],
    },
};

describe("PreviewQuestion", () => {
    afterEach(cleanup);

    it("renders the supplied circuit symbol as a shape next to the Physics statements", () => {
        const instance = {
            ...mathQuestionInstance,
            target: "h2_statement_set",
            topic: "h2.syllabus_9478.skill_16a",
            question: "Read the symbol.\n\nA. It shows a cell.\n\nWhich listed statements are correct?",
            choices: ["A only", "None of the statements"],
            answer: "A only",
            correct_index: 0,
            stimulus: {
                kind: "diagram",
                nodes: [["P", 0, 0], ["Q", 4, 0]],
                edges: [["P", "Q", "X", false]],
                components: { 0: "cell" },
            },
        };
        render(<PreviewQuestion instance={instance} domain="physics" variant="review" />);
        const svg = screen.getByRole("img", { name: "Labelled Physics schematic" });
        expect(svg.querySelector('path[d*="M-3 -11V11"]')).not.toBeNull();
        expect(screen.getByText(/one long and one short perpendicular line/)).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: /A\. It shows a cell/ })).toBeInTheDocument();
        expect(screen.queryByText("✓")).not.toBeInTheDocument();
    });

    it.each(["h2_statement_set", "h2_task"])(
        "renders graph and observation labels for Physics %s questions",
        (target) => {
            const instance = {
                ...mathQuestionInstance,
                target,
                topic: "h2.syllabus_9478.skill_3c",
                stimulus: {
                    kind: "graph",
                    x: "Time / s",
                    y: "Velocity / m/s",
                    series: [{ label: "Cart", points: [[0, 0], [2, 4]] }],
                },
            };
            const { rerender } = render(
                <PreviewQuestion instance={instance} domain="physics" variant="review" />,
            );
            expect(screen.getByRole("img", { name: "Velocity / m/s against Time / s" })).toBeInTheDocument();
            expect(screen.getByText("Graph coordinates")).toBeInTheDocument();
            const recorded = {
                ...instance,
                stimulus: {
                    kind: "table",
                    headers: ["Exposure / s", "Counts"],
                    rows: [["60", "90"], ["20", "120"]],
                },
            };
            rerender(<PreviewQuestion instance={recorded} domain="physics" variant="review" />);
            expect(screen.getByRole("columnheader", { name: "Exposure / s" })).toBeInTheDocument();
            expect(screen.getByRole("cell", { name: "120" })).toBeInTheDocument();
        },
    );

    it("distinguishes Python values from strings and missing data", () => {
        render(<ReadableValue value={[null, "None", true, "True", 1, "1", "", undefined]} />);

        for (const value of ["None", '"None"', "True", '"True"', "1", '"1"', '""', "Not provided"]) {
            expect(screen.getByText(value, { exact: true })).toBeInTheDocument();
        }
    });

    it("shows readable choices, the correct answer and rationales instead of quoted JSON", () => {
        const { container } = render(<PreviewQuestion instance={structuredInstance} domain="code" />);

        expect(
            screen.getByRole("heading", { name: structuredInstance.question.question }),
        ).toBeInTheDocument();
        expect(screen.getByLabelText("Question code").textContent).toBe(
            structuredInstance.question.code,
        );
        expect(screen.getAllByText("Flattens the two rows.").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Does not add anything.").length).toBeGreaterThan(0);
        expect(
            screen.queryByText("Why the other choices are wrong"),
        ).not.toBeInTheDocument();
        const explanation = screen
            .getAllByText("Flattens the two rows.")
            .find((element) => element.parentElement?.classList.contains("p-3"));
        expect(explanation).toBeDefined();
        expect(container).not.toHaveTextContent('{"values":[[1,2],[3,4]]}');
        expect(container).not.toHaveTextContent('"[[1,2],[3,4]]"');

        expect(screen.queryByRole("button", { name: "Show Answer" })).not.toBeInTheDocument();
        expect(screen.queryByText("Answer:")).not.toBeInTheDocument();
        expect(screen.queryByText(/Correct option/)).not.toBeInTheDocument();
        const correctOption = screen.getByText("✓").closest("div.rounded-md");
        expect(correctOption).toHaveClass("bg-green-50");
    });

    it("preserves nested array boundaries in readable values", () => {
        render(<PreviewQuestion instance={structuredInstance} domain="code" />);

        const inputs = screen.getByLabelText("Question inputs");
        const matrixRow = within(inputs).getByText("matrix").closest("tr");
        expect(matrixRow).not.toBeNull();
        const matrixLists = (matrixRow as HTMLElement).querySelectorAll("ul");

        // matrix -> outer list -> two inner row lists, not one flat list.
        expect(matrixLists).toHaveLength(3);
        expect(matrixLists[0].querySelectorAll(":scope > li")).toHaveLength(2);
        expect(inputs).not.toHaveTextContent("1, 2, 3, 4");
    });

    it("nests the Inputs heading one level below the question heading", () => {
        const { rerender } = render(
            <PreviewQuestion instance={structuredInstance} domain="code" />,
        );

        expect(
            screen.getByRole("heading", {
                name: structuredInstance.question.question,
                level: 2,
            }),
        ).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Inputs", level: 3 })).toBeInTheDocument();

        rerender(
            <PreviewQuestion instance={structuredInstance} domain="code" headingLevel="h3" />,
        );

        expect(
            screen.getByRole("heading", {
                name: structuredInstance.question.question,
                level: 3,
            }),
        ).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Inputs", level: 4 })).toBeInTheDocument();
    });

    it("shows a flat record as an input and value table", () => {
        const flatInstance: CodeQuestionInstance = {
            ...structuredInstance,
            question: {
                ...structuredInstance.question,
                inputs: { start: 2, end: 5 },
            },
        };

        render(<PreviewQuestion instance={flatInstance} domain="code" />);

        const inputs = screen.getByLabelText("Question inputs");
        expect(within(inputs).getByRole("columnheader", { name: "Input" })).toBeInTheDocument();
        expect(within(inputs).getByRole("columnheader", { name: "Value" })).toBeInTheDocument();
        expect(within(inputs).getByText("start")).toBeInTheDocument();
        expect(within(inputs).getByText("end")).toBeInTheDocument();
        expect(within(inputs).getByText("2")).toBeInTheDocument();
        expect(within(inputs).getByText("5")).toBeInTheDocument();
    });

    it("shows one collapsed raw question data disclosure", () => {
        render(<PreviewQuestion instance={structuredInstance} domain="code" />);

        const summaries = screen.getAllByText("Raw question data");
        expect(summaries).toHaveLength(1);
        const details = summaries[0].closest("details");
        expect(details).not.toBeNull();
        expect(details).not.toHaveAttribute("open");
        expect(details).toHaveTextContent(structuredInstance.template_id);
        expect(screen.queryByText("Technical details")).not.toBeInTheDocument();
    });

    it("keeps review choices neutral until the answer is revealed", async () => {
        const user = userEvent.setup();
        render(
            <PreviewQuestion
                instance={structuredInstance}
                domain="code"
                headingLevel="h3"
                variant="review"
            />,
        );

        expect(
            screen.queryByText(/The correct choice is highlighted below/),
        ).not.toBeInTheDocument();
        expect(screen.queryByText("✓")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Show Answer" })).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Show Answer" }));

        expect(screen.getByText("✓")).toBeInTheDocument();
        expect(screen.queryByText("Answer:")).not.toBeInTheDocument();
        expect(screen.queryByText(/Correct option/)).not.toBeInTheDocument();
    });

    it("shows review code inline without inputs or raw data", () => {
        render(
            <PreviewQuestion instance={structuredInstance} domain="code" variant="review" />,
        );

        expect(screen.getByLabelText("Question code")).toBeInTheDocument();
        expect(screen.queryByText("View code")).not.toBeInTheDocument();
        expect(screen.queryByText("Inputs and raw data")).not.toBeInTheDocument();
        expect(screen.queryByLabelText("Question inputs")).not.toBeInTheDocument();
        expect(screen.queryByText("Raw question data")).not.toBeInTheDocument();
    });

    it("renders a math question with the equation, choices and bound inputs", () => {
        render(<PreviewQuestion instance={mathQuestionInstance} domain="math" />);

        expect(
            screen.getByRole("heading", { name: mathQuestionInstance.question }),
        ).toBeInTheDocument();
        // The generated view also lists the equation in its raw question data.
        expect(screen.getAllByText(mathQuestionInstance.equation).length).toBeGreaterThan(0);
        expect(
            screen.getAllByText(mathQuestionInstance.question).length,
        ).toBeGreaterThan(0);
        // Check the rendered option values, not the raw-data disclosure: flat
        // choices are display strings and must not keep JSON quotes.
        for (const [index, choice] of mathQuestionInstance.choices.entries()) {
            const label = screen.getByText(`${String.fromCharCode(65 + index)}.`, {
                exact: true,
            });
            const value = label.parentElement?.querySelector("div");
            expect(value).not.toBeNull();
            expect(value?.textContent).toBe(choice);
        }
        expect(screen.getByText("✓")).toBeInTheDocument();
        const inputs = screen.getByLabelText("Question inputs");
        expect(within(inputs).getByText("a")).toBeInTheDocument();
        expect(within(inputs).getByText("seed")).toBeInTheDocument();
        expect(screen.queryByLabelText("Question code")).not.toBeInTheDocument();
        expect(screen.queryByText(/\.py$/)).not.toBeInTheDocument();
    });

    it("does not use answer_latex for choices when choices_latex is missing", () => {
        const instance = {
            ...mathQuestionInstance,
            answer_latex: "\\frac{1}{2}",
        };
        const { container } = render(
            <PreviewQuestion instance={instance} domain="math" />,
        );

        for (const [index, choice] of instance.choices.entries()) {
            const label = screen.getByText(`${String.fromCharCode(65 + index)}.`, {
                exact: true,
            });
            const value = label.parentElement?.querySelector("div");
            expect(value?.textContent).toBe(choice);
        }
        expect(container.querySelector(".katex")).toBeNull();
    });

    it("shows the math prompt once when it already contains the equation", () => {
        const instance = {
            ...mathQuestionInstance,
            equation: "(x - 3)*(x + 4)",
            question: "Expand the product (x - 3)*(x + 4).",
        };
        render(<PreviewQuestion instance={instance} domain="math" variant="review" />);

        expect(
            screen.getByRole("heading", { name: instance.question }),
        ).toBeInTheDocument();
        expect(screen.queryByText(instance.equation)).not.toBeInTheDocument();
    });

    it("keeps math review neutral until the answer is revealed", async () => {
        const user = userEvent.setup();
        render(
            <PreviewQuestion
                instance={mathQuestionInstance}
                domain="math"
                variant="review"
            />,
        );

        expect(
            screen.getByRole("heading", { name: mathQuestionInstance.question }),
        ).toBeInTheDocument();
        expect(screen.getByText(mathQuestionInstance.equation)).toBeInTheDocument();
        expect(screen.queryByText("✓")).not.toBeInTheDocument();
        expect(screen.queryByText(/The correct choice is highlighted below/)).not.toBeInTheDocument();
        expect(screen.queryByLabelText("Question inputs")).not.toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Show Answer" }));

        expect(screen.getByText("✓")).toBeInTheDocument();
    });

    it("renders a stub-domain payload through the generic fallback", () => {
        render(<PreviewQuestion instance={stubQuestionInstance} domain="stub" />);

        expect(
            screen.getByRole("heading", {
                name: "Which of these numbers is even?",
            }),
        ).toBeInTheDocument();
        expect(screen.getAllByText("4").length).toBeGreaterThan(0);
        expect(screen.getAllByText("3").length).toBeGreaterThan(0);
        expect(screen.getAllByText("5").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Three is odd.").length).toBeGreaterThan(0);
        expect(screen.queryByLabelText("Question code")).not.toBeInTheDocument();
        expect(screen.queryByLabelText("Question inputs")).not.toBeInTheDocument();
        expect(screen.queryByText("Inputs")).not.toBeInTheDocument();
        expect(screen.queryByText(/\.py$/)).not.toBeInTheDocument();
    });

    it("renders a biology question with the worked-out Punnett square", () => {
        render(
            <PreviewQuestion instance={biologyQuestionInstance} domain="biology" />,
        );

        expect(
            screen.getByRole("heading", { name: biologyQuestionInstance.question }),
        ).toBeInTheDocument();

        for (const [index, choice] of biologyQuestionInstance.choices.entries()) {
            const label = screen.getByText(`${String.fromCharCode(65 + index)}.`, {
                exact: true,
            });
            const value = label.parentElement?.querySelector("div");
            expect(value).not.toBeNull();
            expect(value?.textContent).toBe(choice);
        }

        expect(screen.getByText("✓")).toBeInTheDocument();
        expect(
            screen.getByLabelText("How the answer is worked out"),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("table", {
                name: "Punnett square for a cross between Pp and Pp.",
            }),
        ).toBeInTheDocument();
        expect(screen.getByLabelText("Question inputs")).toBeInTheDocument();
        expect(screen.queryByLabelText("Question code")).not.toBeInTheDocument();
    });

    it("keeps biology review neutral until the answer is revealed", async () => {
        const user = userEvent.setup();
        render(
            <PreviewQuestion
                instance={biologyQuestionInstance}
                domain="biology"
                variant="review"
            />,
        );

        expect(
            screen.getByRole("heading", { name: biologyQuestionInstance.question }),
        ).toBeInTheDocument();
        expect(screen.queryByText("✓")).not.toBeInTheDocument();
        // The working reveals the answer, so review keeps it collapsed.
        expect(
            screen.getByLabelText("How the answer is worked out").closest("details"),
        ).not.toHaveAttribute("open");
        expect(screen.queryByLabelText("Question inputs")).not.toBeInTheDocument();
        expect(screen.queryByText(/The correct choice is highlighted below/)).not.toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Show Answer" }));

        expect(screen.getByText("✓")).toBeInTheDocument();
    });

    it("shows a curated H2 biology explanation only when its working is expanded", () => {
        const instance = {
            template_id: "biology.medium.h2-case",
            case_id: "dihybrid.self",
            question: "What fraction of the offspring has both dominant phenotypes?",
            choices: ["9/16", "3/4", "1/16", "1/2"],
            answer: "9/16",
            correct_index: 0,
            explanation: "The independent probabilities are each 3/4.",
            seed: 0,
        };
        render(<PreviewQuestion instance={instance} domain="biology" variant="review" />);
        expect(screen.getByRole("heading", { name: instance.question })).toBeInTheDocument();
        const working = screen.getByText("How the answer is worked out").closest("details");
        expect(working).not.toHaveAttribute("open");
        expect(working).toHaveTextContent(instance.explanation);
    });

    it("renders a packaged H2 Biology figure with an accessible description", () => {
        const figure = {
            data_url: "data:image/png;base64,iVBORw0KGgo=",
            alt: "Two branches join at the nearest split.",
            credit: "Original EdCraft classroom schematic",
        };
        const instance = {
            template_id: "biology.medium.h2-case",
            case_id: "skill.visual.tree",
            question: "Which pair shares the most recent common ancestor?",
            choices: ["P and Q", "Q and R"],
            answer: "P and Q",
            correct_index: 0,
            figure,
            seed: 0,
        };
        render(<PreviewQuestion instance={instance} domain="biology" variant="review" />);
        expect(screen.getByRole("img", { name: figure.alt })).toHaveAttribute("src", figure.data_url);
        expect(screen.getByText(figure.credit)).toBeInTheDocument();
    });

    it("does not treat a maths payload as biology", () => {
        render(
            <PreviewQuestion instance={mathQuestionInstance} domain="biology" />,
        );

        expect(
            screen.getByRole("heading", { name: mathQuestionInstance.question }),
        ).toBeInTheDocument();
        expect(
            screen.queryByLabelText("How the answer is worked out"),
        ).not.toBeInTheDocument();
        expect(screen.queryByText(/Punnett square/)).not.toBeInTheDocument();
    });

    it("does not treat a biology payload as maths", () => {
        render(
            <PreviewQuestion instance={biologyQuestionInstance} domain="math" />,
        );

        expect(
            screen.getByRole("heading", { name: biologyQuestionInstance.question }),
        ).toBeInTheDocument();
        expect(
            screen.queryByLabelText("How the answer is worked out"),
        ).not.toBeInTheDocument();
        expect(screen.queryByText(/Punnett square/)).not.toBeInTheDocument();
    });
});
