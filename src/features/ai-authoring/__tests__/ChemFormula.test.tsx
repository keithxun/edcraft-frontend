import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import {
    ChemEquation,
    ChemFormula,
    ChemStructuredEquation,
} from "../components/ChemFormula";
import { chemistryQuestionInstance } from "./fixtures";

describe("ChemFormula", () => {
    afterEach(cleanup);

    it("renders subscript counts with the plain formula as its label", () => {
        const { container } = render(<ChemFormula formula="Ca(OH)2" />);

        expect(screen.getByLabelText("Ca(OH)2")).toBeInTheDocument();
        const subscripts = container.querySelectorAll("sub");
        expect(subscripts).toHaveLength(1);
        expect(subscripts[0].textContent).toBe("2");
        expect(container.textContent).toBe("Ca(OH)2");
    });

    it("renders hydrate multipliers and dots", () => {
        const { container } = render(<ChemFormula formula="CuSO4·5H2O" />);

        expect(screen.getByLabelText("CuSO4·5H2O")).toBeInTheDocument();
        expect(
            Array.from(container.querySelectorAll("sub")).map((element) => element.textContent),
        ).toEqual(["4", "2"]);
        expect(container.textContent).toBe("CuSO4·5H2O");
    });

    it("does not inject HTML from a formula", () => {
        const { container } = render(<ChemFormula formula="<b>x</b>" />);

        expect(container.querySelector("b")).toBeNull();
        expect(container.textContent).toBe("<b>x</b>");
        expect(screen.getByLabelText("<b>x</b>")).toBeInTheDocument();
    });
});

describe("ChemEquation", () => {
    afterEach(cleanup);

    it("renders formulas with subscripts while coefficients stay plain", () => {
        const equation = "CH4 + 2 O2 → CO2 + 2 H2O";
        const { container } = render(<ChemEquation equation={equation} />);

        expect(screen.getByLabelText(equation)).toBeInTheDocument();
        expect(
            Array.from(container.querySelectorAll("sub")).map((element) => element.textContent),
        ).toEqual(["4", "2", "2", "2"]);
        expect(container.textContent).toBe(equation);
        expect(container.querySelector("b")).toBeNull();
    });

    it("renders an equation with a coefficient attached to its formula", () => {
        const { container } = render(<ChemEquation equation="2H2 + O2 -> 2H2O" />);

        expect(container.textContent).toBe("2H2 + O2 -> 2H2O");
        expect(container.querySelectorAll("sub")).toHaveLength(3);
    });
});

describe("ChemStructuredEquation", () => {
    afterEach(cleanup);

    it("omits a coefficient of one and keeps the plain choice as its label", () => {
        const equation = chemistryQuestionInstance.choices_structured![0];
        const label = chemistryQuestionInstance.choices[0];
        const { container } = render(
            <ChemStructuredEquation equation={equation} label={label} />,
        );

        expect(screen.getByLabelText(label)).toBeInTheDocument();
        expect(container.textContent).toBe(label);
        expect(container.textContent).not.toContain("1 CH4");
        expect(container.querySelectorAll("sub").length).toBeGreaterThan(0);
    });

    it("renders the genuine key choice with its subscripts", () => {
        const index = chemistryQuestionInstance.correct_index;
        const equation = chemistryQuestionInstance.choices_structured![index];
        const label = chemistryQuestionInstance.choices[index];
        const { container } = render(
            <ChemStructuredEquation equation={equation} label={label} />,
        );

        expect(screen.getByLabelText(label)).toBeInTheDocument();
        expect(container.textContent).toBe("CH4 + 2 O2 → CO2 + 2 H2O");
        expect(
            Array.from(container.querySelectorAll("sub")).map(
                (element) => element.textContent,
            ),
        ).toEqual(["4", "2", "2", "2"]);
    });
});
