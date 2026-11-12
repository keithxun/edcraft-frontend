import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ReadableDefinition } from "../components/ReadableDefinition";

describe("ReadableDefinition", () => {
    afterEach(cleanup);

    it("renders recipe steps and their actual operation fields", () => {
        render(
            <ReadableDefinition
                title="Check recipe"
                value={{
                    recipe: {
                        summary: "Differentiate each term, then combine.",
                        steps: [
                            {
                                id: "split",
                                operation: "split_polynomial_terms",
                                input: "polynomial",
                                output: "terms",
                            },
                            {
                                id: "differentiate",
                                operation: "differentiate_term_v1",
                                input: "term",
                                output: "derivative_term",
                                description: "Multiply by the exponent and reduce it by one.",
                            },
                        ],
                    },
                }}
            />,
        );

        expect(screen.getByRole("heading", { name: "Check recipe" })).toBeInTheDocument();
        expect(
            screen.getByText("Differentiate each term, then combine."),
        ).toBeInTheDocument();
        expect(screen.getByText("split_polynomial_terms")).toBeInTheDocument();
        expect(screen.getByText("differentiate_term_v1")).toBeInTheDocument();
        expect(
            screen.getByText("Multiply by the exponent and reduce it by one."),
        ).toBeInTheDocument();
        expect(screen.getByText("polynomial")).toBeInTheDocument();
        expect(screen.getByText("terms")).toBeInTheDocument();
        expect(screen.getByText("derivative_term")).toBeInTheDocument();
    });

    it("keeps the full structured definition available as JSON", () => {
        render(
            <ReadableDefinition
                title="Check recipe"
                value={{ steps: [{ id: "step-1", operation: "differentiate" }] }}
            />,
        );

        expect(screen.getByText("Raw definition JSON")).toBeInTheDocument();
        expect(screen.getAllByText(/differentiate/).length).toBeGreaterThan(0);
    });

    it("renders bounded domains for a template definition", () => {
        render(
            <ReadableDefinition
                title="Template family"
                value={{
                    degree_max: 3,
                    coefficient_domains: { constant: [-5, 5], leading: [-3, 3] },
                }}
            />,
        );

        expect(screen.getByText("Degree max")).toBeInTheDocument();
        expect(screen.getByText("3")).toBeInTheDocument();
        expect(screen.getByText("Coefficient domains")).toBeInTheDocument();
        expect(screen.getByText("Constant")).toBeInTheDocument();
        expect(screen.getByText("Leading")).toBeInTheDocument();
    });
});
