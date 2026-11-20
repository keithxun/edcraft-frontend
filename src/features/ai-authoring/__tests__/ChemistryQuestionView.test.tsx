import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChemistryQuestionView } from "../components/ChemistryQuestionView";
import type { ChemistryQuestionInstance } from "../types";
import {
    chemistryCoefficientQuestionInstance,
    chemistryCoefficientQuestionInstances,
    chemistryEquationQuestionInstances,
    chemistryQuestionInstance,
} from "./fixtures";

function renderView(instance: ChemistryQuestionInstance, review = false) {
    return render(
        <ChemistryQuestionView
            instance={instance}
            review={review}
            headingLevel="h2"
            inputsHeadingLevel="h3"
        />,
    );
}

describe("ChemistryQuestionView", () => {
    afterEach(cleanup);

    it("renders each structured equation choice with subscripts", () => {
        const { container } = renderView(chemistryQuestionInstance);

        expect(
            screen.getByRole("heading", { name: chemistryQuestionInstance.question }),
        ).toBeInTheDocument();

        const firstOption = screen.getByText("A.").parentElement;
        expect(firstOption?.querySelectorAll("sub").length).toBeGreaterThan(0);
        expect(firstOption?.textContent).toContain("CH4 + 2 O2");
        expect(container.textContent).toContain(
            chemistryQuestionInstance.choices[0],
        );
        expect(screen.getByText("✓")).toBeInTheDocument();
    });

    it("keeps the plain choice as the accessible name of every structured option", () => {
        for (const instance of chemistryEquationQuestionInstances) {
            renderView(instance);

            for (const choice of instance.choices) {
                const rendered = screen.getByLabelText(choice);
                // A coefficient of one is omitted, as in the plain choice string.
                expect(rendered.textContent).toBe(choice);
                expect(rendered.querySelectorAll("sub").length).toBeGreaterThan(0);
            }

            cleanup();
        }
    });

    it("shows the genuine reaction id, species slot and seed as inputs", () => {
        renderView(chemistryCoefficientQuestionInstance);

        const inputs = screen.getByLabelText("Question inputs");
        expect(within(inputs).getByText("reaction_id")).toBeInTheDocument();
        expect(inputs.textContent).toContain("hydrate.copper_sulfate");
        expect(within(inputs).getByText("species")).toBeInTheDocument();
        expect(inputs.textContent).toContain("product:2");
        expect(within(inputs).getByText("seed")).toBeInTheDocument();
        expect(within(inputs).getByText("0")).toBeInTheDocument();
    });

    it("renders coefficient choices as plain numbers", () => {
        for (const instance of chemistryCoefficientQuestionInstances) {
            const { container } = renderView(instance);

            expect(
                screen.getByRole("heading", { name: instance.question }),
            ).toBeInTheDocument();
            // The stem's formulas gain subscripts; the numeric choices do not.
            expect(container.querySelector("h3 sub, h2 sub")).not.toBeNull();
            for (const [index, choice] of instance.choices.entries()) {
                const label = screen.getByText(
                    `${String.fromCharCode(65 + index)}.`,
                );
                expect(label.parentElement?.textContent).toContain(choice);
                expect(label.parentElement?.querySelector("sub")).toBeNull();
            }

            cleanup();
        }
    });

    it("keeps isotope notation and quantities in concept stems as plain text", () => {
        const question = "How many neutrons are in an aluminium-27 atom?";
        const { container } = renderView({
            ...chemistryCoefficientQuestionInstance,
            parameters: { context: "atomic-aluminium" },
            question,
            choices: ["14", "13", "27", "40"],
            answer: "14",
            correct_index: 0,
        });
        expect(screen.getByRole("heading", { name: question })).toBeInTheDocument();
        expect(container.querySelector("h2 sub")).toBeNull();
        expect(screen.getByText("context")).toBeInTheDocument();
        expect(screen.queryByText("reaction_id")).not.toBeInTheDocument();
    });

    it("keeps review neutral until the answer is revealed", async () => {
        const user = userEvent.setup();
        renderView(chemistryQuestionInstance, true);

        expect(
            screen.getByRole("heading", { name: chemistryQuestionInstance.question }),
        ).toBeInTheDocument();
        expect(screen.getByText("A.")).toBeInTheDocument();
        expect(screen.queryByText("✓")).not.toBeInTheDocument();
        expect(screen.queryByText("Answer:")).not.toBeInTheDocument();
        expect(screen.queryByLabelText("Question inputs")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Show Answer" })).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Show Answer" }));

        expect(screen.getByText("✓")).toBeInTheDocument();
    });
});
