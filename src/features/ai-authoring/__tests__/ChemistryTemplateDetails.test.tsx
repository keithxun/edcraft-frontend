import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { ChemistryTemplateDetails } from "../components/ChemistryTemplateDetails";
import type {
    ChemistryOptionRow,
    ChemistryTemplateCandidate,
} from "../types";
import {
    chemistryCoefficientChecks,
    chemistryCoefficientTemplateCandidate,
    chemistryEquationBalanceRows,
    chemistryEquationChecks,
    chemistryEquationOptionRows,
    chemistryTemplateCandidate,
} from "./fixtures";

function renderDetails(
    candidate: ChemistryTemplateCandidate,
    checks?: Parameters<typeof ChemistryTemplateDetails>[0]["checks"],
) {
    return render(
        <ChemistryTemplateDetails candidate={candidate} checks={checks} />,
    );
}

describe("ChemistryTemplateDetails", () => {
    afterEach(cleanup);

    it("shows the family, target, catalogue context sentence and reaction table", () => {
        renderDetails(chemistryTemplateCandidate);

        expect(
            screen.getByText("Complete combustion of alkanes · Medium"),
        ).toBeInTheDocument();
        expect(
            within(screen.getByLabelText("Target")).getByText("Balanced equation"),
        ).toBeInTheDocument();

        const context = screen.getByLabelText("Family and context sentence (from the catalogue)");
        expect(
            within(context).getByText("Complete combustion of alkanes"),
        ).toBeInTheDocument();
        expect(
            within(context).getByText(
                "An alkane burns completely in oxygen to give carbon dioxide and water.",
            ),
        ).toBeInTheDocument();

        const reactions = screen.getByLabelText("Reactions");
        expect(within(reactions).getByText("methane combustion")).toBeInTheDocument();
        expect(within(reactions).getByText("propane combustion")).toBeInTheDocument();
        expect(reactions.textContent).toContain("CH4 + O2 → CO2 + H2O");
        expect(reactions.querySelectorAll("sub").length).toBeGreaterThan(0);
        expect(
            within(reactions).getAllByText(
                "Standard school-chemistry reaction; citation pending owner review",
            ).length,
        ).toBe(2);

        expect(
            screen.getByText("Catalogue version: chem-catalogue-2026.11-pilot.2"),
        ).toBeInTheDocument();
    });

    it("names species slots as positions, without formula subscripts", () => {
        renderDetails(chemistryCoefficientTemplateCandidate);

        expect(
            within(screen.getByLabelText("Target")).getByText("One coefficient"),
        ).toBeInTheDocument();
        const species = screen.getByLabelText("Species slots");
        expect(species.textContent).toContain("Product 2");
        expect(species.textContent).not.toContain("product:2");
        expect(species.querySelector("sub")).toBeNull();
    });

    it("describes every real distractor recipe and misconception", () => {
        renderDetails(chemistryTemplateCandidate);

        const choices = screen.getByLabelText("Wrong choices");
        expect(
            within(choices).getByText("Add 1 to the coefficient of product 2"),
        ).toBeInTheDocument();
        expect(
            within(choices).getByText("Multiply every coefficient by 2"),
        ).toBeInTheDocument();
        expect(within(choices).getByText("Use the O2_as_O variant")).toBeInTheDocument();
        expect(
            within(choices).getByText("An element is left unbalanced"),
        ).toBeInTheDocument();
        expect(
            within(choices).getByText(
                "Coefficients are not in the smallest whole-number ratio",
            ),
        ).toBeInTheDocument();
        expect(
            within(choices).getByText("A species is replaced by a wrong formula"),
        ).toBeInTheDocument();
    });

    it("describes the asked-slot distractor of the coefficient template", () => {
        renderDetails(chemistryCoefficientTemplateCandidate);

        const choices = screen.getByLabelText("Wrong choices");
        expect(
            within(choices).getByText(
                "Add 1 to the coefficient of the asked species",
            ),
        ).toBeInTheDocument();
        expect(
            within(choices).getByText("Multiply every coefficient by 2"),
        ).toBeInTheDocument();
    });

    it("shows every genuine equation option row without raw objects", () => {
        const { container } = renderDetails(
            chemistryTemplateCandidate,
            chemistryEquationChecks,
        );

        const options = screen.getByLabelText("Option evidence");
        expect(options.textContent).not.toContain("[object Object]");
        expect(container.textContent).not.toContain("[object Object]");

        // The equation template asks for a whole equation, so no Asked column.
        expect(within(options).queryByText("Asked")).not.toBeInTheDocument();

        expect(within(options).getAllByText("Key")).toHaveLength(2);
        expect(within(options).getAllByText("Distractor 1")).toHaveLength(2);
        expect(within(options).getAllByText("Distractor 2")).toHaveLength(2);
        expect(within(options).getAllByText("Distractor 3")).toHaveLength(2);

        expect(
            within(options).getAllByText("Use the balanced coefficients"),
        ).toHaveLength(2);
        expect(
            within(options).getAllByText("Add 1 to the coefficient of product 2"),
        ).toHaveLength(2);
        expect(
            within(options).getAllByText("Multiply every coefficient by 2"),
        ).toHaveLength(2);
        expect(
            within(options).getAllByText("Use the O2_as_O variant"),
        ).toHaveLength(2);

        expect(
            within(options).getByText("H is unbalanced: 4 on the left, 6 on the right"),
        ).toBeInTheDocument();
        expect(
            within(options).getByText("H is unbalanced: 8 on the left, 10 on the right"),
        ).toBeInTheDocument();
        expect(
            within(options).getAllByText(
                "Not in the smallest ratio (every coefficient divides by 2)",
            ),
        ).toHaveLength(2);
        expect(
            within(options).getAllByText("Reactant 2 uses O instead of O2"),
        ).toHaveLength(2);
        expect(within(options).getAllByText("—")).toHaveLength(2);

        expect(within(options).getAllByText("key")).toHaveLength(2);
        expect(within(options).getAllByText("wrong")).toHaveLength(6);

        for (const row of chemistryEquationOptionRows) {
            const rendered = within(options).getByLabelText(row.rendered);
            expect(rendered.textContent).toBe(row.rendered);
            expect(rendered.querySelectorAll("sub").length).toBeGreaterThan(0);
        }
    });

    it("shows every genuine coefficient option row as plain numbers", () => {
        const { container } = renderDetails(
            chemistryCoefficientTemplateCandidate,
            chemistryCoefficientChecks,
        );

        const options = screen.getByLabelText("Option evidence");
        expect(options.textContent).not.toContain("[object Object]");
        expect(container.textContent).not.toContain("[object Object]");
        expect(options.querySelector("sub")).toBeNull();

        expect(within(options).getByText("Asked")).toBeInTheDocument();
        expect(within(options).getAllByText("Product 2")).toHaveLength(6);
        expect(within(options).getAllByText("Key")).toHaveLength(2);
        expect(within(options).getAllByText("Distractor 1")).toHaveLength(2);
        expect(within(options).getAllByText("Distractor 2")).toHaveLength(2);

        for (const rendered of ["5", "6", "10", "7", "8", "14"]) {
            expect(within(options).getByText(rendered)).toBeInTheDocument();
        }

        expect(
            within(options).getAllByText("Use the balanced coefficients"),
        ).toHaveLength(2);
        expect(
            within(options).getAllByText(
                "Add 1 to the coefficient of the asked species",
            ),
        ).toHaveLength(2);
        expect(
            within(options).getAllByText("Multiply every coefficient by 2"),
        ).toHaveLength(2);

        for (const reason of [
            "Gives 6, the balanced coefficient is 5",
            "Gives 10, the balanced coefficient is 5",
            "Gives 8, the balanced coefficient is 7",
            "Gives 14, the balanced coefficient is 7",
        ]) {
            expect(within(options).getByText(reason)).toBeInTheDocument();
        }
    });

    it("shows checked coefficients when balance evidence is supplied", () => {
        renderDetails(chemistryTemplateCandidate, chemistryEquationChecks);

        const balance = screen.getByLabelText("Balance evidence");
        expect(within(balance).getByText("1, 2, 1, 2")).toBeInTheDocument();
        expect(within(balance).getByText("1, 5, 3, 4")).toBeInTheDocument();
        for (const row of chemistryEquationBalanceRows) {
            expect(within(balance).getByLabelText(row.equation)).toBeInTheDocument();
        }
    });

    it("never renders an object-typed option value as [object Object]", () => {
        const row: ChemistryOptionRow = {
            reaction_id: "comb.methane",
            asked_slot: null,
            option: 1,
            recipe: { kind: "unknown", nested: { a: 1 } },
            misconception: null,
            rendered: "CH4 + O2 → CO2 + H2O",
            verdict: "wrong",
            reason: {},
        };
        const { container } = renderDetails(chemistryTemplateCandidate, [
            { tool: "chemistry_verify_options", details: { rows: [row] } },
        ]);

        expect(screen.getByLabelText("Option evidence").textContent).not.toContain(
            "[object Object]",
        );
        expect(container.textContent).not.toContain("[object Object]");
    });

    it("skips evidence tables when no checks are supplied", () => {
        renderDetails(chemistryTemplateCandidate);

        expect(screen.queryByLabelText("Balance evidence")).not.toBeInTheDocument();
        expect(screen.queryByLabelText("Option evidence")).not.toBeInTheDocument();
    });

    it("renders a partial payload without throwing", () => {
        const candidate = {
            template_id: "partial",
            difficulty: "easy",
            question_type: "mcq",
            item: {
                schema_version: "chem-balance/0.1",
                parameters: [{ name: "reaction" }],
            },
            catalogue: { reactions: [] },
        } as unknown as ChemistryTemplateCandidate;

        expect(() => renderDetails(candidate)).not.toThrow();

        expect(
            within(screen.getByLabelText("Target")).getByText("Not specified"),
        ).toBeInTheDocument();
        expect(
            within(screen.getByLabelText("Reactions")).getByText("None"),
        ).toBeInTheDocument();
    });
});
