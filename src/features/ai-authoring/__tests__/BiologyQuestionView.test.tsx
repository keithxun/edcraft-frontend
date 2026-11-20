import { genotypeLabel } from "../components/genotypeLabel";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BiologyQuestionView } from "../components/BiologyQuestionView";
import type { BiologyQuestionInstance } from "../types";
import { biologyQuestionInstance } from "./fixtures";

function renderView(instance: BiologyQuestionInstance, review = false) {
    return render(
        <BiologyQuestionView
            instance={instance}
            review={review}
            headingLevel="h2"
            inputsHeadingLevel="h3"
        />,
    );
}

describe("BiologyQuestionView", () => {
    afterEach(cleanup);

    it("renders the prompt, the choices and the correct choice", () => {
        renderView(biologyQuestionInstance);

        expect(
            screen.getByRole("heading", {
                level: 2,
                name: biologyQuestionInstance.question,
            }),
        ).toBeInTheDocument();

        for (const [index, choice] of biologyQuestionInstance.choices.entries()) {
            const label = screen.getByText(`${String.fromCharCode(65 + index)}.`, {
                exact: true,
            });
            expect(label.parentElement?.querySelector("div")?.textContent).toBe(choice);
        }

        expect(screen.getByText("✓")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Show Answer" })).not.toBeInTheDocument();
    });

    it("shows how the answer is worked out with the Punnett square and distributions", () => {
        renderView(biologyQuestionInstance);

        const working = screen.getByLabelText("How the answer is worked out");
        expect(within(working).getByText("Parents")).toBeInTheDocument();
        expect(within(working).getAllByLabelText(genotypeLabel("Pp")).length).toBeGreaterThan(0);

        expect(
            within(working).getByRole("table", {
                name: "Punnett square for a cross between Pp and Pp.",
            }),
        ).toBeInTheDocument();
        expect(within(working).getAllByLabelText(genotypeLabel("PP")).length).toBeGreaterThan(0);
        expect(within(working).getAllByLabelText(genotypeLabel("pp")).length).toBeGreaterThan(0);

        const genotypes = within(working).getByText("Genotypes").parentElement!;
        expect(within(genotypes).getByLabelText(genotypeLabel("PP"))).toBeInTheDocument();
        expect(within(genotypes).getAllByText("1/4")).toHaveLength(2);

        const phenotypes = within(working).getByText("Phenotypes").parentElement!;
        expect(within(phenotypes).getByText("purple")).toBeInTheDocument();
        expect(within(phenotypes).getByText("3/4")).toBeInTheDocument();
        expect(within(phenotypes).getByText("white")).toBeInTheDocument();
    });

    it("binds the parameters and seed as inputs", () => {
        renderView(biologyQuestionInstance);

        const inputs = screen.getByLabelText("Question inputs");
        expect(within(inputs).getByText("parent1")).toBeInTheDocument();
        expect(within(inputs).getByText("target")).toBeInTheDocument();
        expect(within(inputs).getByText("seed")).toBeInTheDocument();
        expect(within(inputs).getByText("7")).toBeInTheDocument();
    });

    it("keeps review neutral and hides the worked answer until it is revealed", async () => {
        const user = userEvent.setup();
        renderView(biologyQuestionInstance, true);

        expect(
            screen.getByRole("heading", {
                level: 2,
                name: biologyQuestionInstance.question,
            }),
        ).toBeInTheDocument();
        expect(screen.queryByText("✓")).not.toBeInTheDocument();
        // Reviewers can open the working, but it starts collapsed.
        const working = screen.getByLabelText("How the answer is worked out");
        expect(working.closest("details")).not.toHaveAttribute("open");
        expect(screen.queryByLabelText("Question inputs")).not.toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Show Answer" }));

        expect(screen.getByText("✓")).toBeInTheDocument();
    });

    it("nests the section headings one level below the question heading", () => {
        const { rerender } = render(
            <BiologyQuestionView
                instance={biologyQuestionInstance}
                review={false}
                headingLevel="h3"
                inputsHeadingLevel="h4"
            />,
        );

        expect(
            screen.getByRole("heading", {
                level: 3,
                name: biologyQuestionInstance.question,
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("heading", { level: 4, name: "Inputs" }),
        ).toBeInTheDocument();

        rerender(
            <BiologyQuestionView
                instance={biologyQuestionInstance}
                review={false}
                headingLevel="h2"
                inputsHeadingLevel="h3"
            />,
        );
        expect(
            screen.getByRole("heading", { level: 3, name: "Inputs" }),
        ).toBeInTheDocument();
    });

    it("renders an instance without optional distributions", () => {
        const instance: BiologyQuestionInstance = {
            template_id: "biology.easy.minimal",
            seed: 1,
            parameters: { parent1: "PP" },
            question: "What is the genotype of every offspring?",
            choices: ["PP", "Pp", "pp"],
            correct_index: 0,
            answer: "PP",
            cross: { parent1: "PP", parent2: "PP" },
            punnett: [
                ["PP", "PP"],
                ["PP", "PP"],
            ],
        };

        expect(() => renderView(instance)).not.toThrow();
        expect(
            screen.getByLabelText("How the answer is worked out"),
        ).toBeInTheDocument();
        expect(screen.queryByText("Genotypes")).not.toBeInTheDocument();
        expect(screen.queryByText("Phenotypes")).not.toBeInTheDocument();
    });
});
