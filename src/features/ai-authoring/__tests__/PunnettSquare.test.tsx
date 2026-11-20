import { genotypeLabel } from "../components/genotypeLabel";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { PunnettSquare } from "../components/PunnettSquare";

const cross = [
    ["PP", "Pp"],
    ["Pp", "pp"],
];

describe("PunnettSquare", () => {
    afterEach(cleanup);

    it("names the cross in its caption", () => {
        render(<PunnettSquare punnett={cross} parent1="Pp" parent2="Pp" />);

        expect(
            screen.getByRole("table", {
                name: "Punnett square for a cross between Pp and Pp.",
            }),
        ).toBeInTheDocument();
    });

    it("labels columns with parent 2 gametes and rows with parent 1 gametes", () => {
        render(<PunnettSquare punnett={cross} parent1="Pp" parent2="Pp" />);

        const columnHeaders = screen.getAllByRole("columnheader");
        // The first column header is the empty gamete corner.
        expect(columnHeaders.slice(1).map((header) => header.textContent)).toEqual([
            "P",
            "p",
        ]);
        expect(
            screen.getAllByRole("rowheader").map((header) => header.textContent),
        ).toEqual(["P", "p"]);
    });

    it("renders each cell as an italic genotype", () => {
        const { container } = render(
            <PunnettSquare punnett={cross} parent1="Pp" parent2="Pp" />,
        );

        const cells = Array.from(container.querySelectorAll("tbody td"));
        expect(cells).toHaveLength(4);
        expect(
            within(cells[0] as HTMLElement).getByLabelText(genotypeLabel("PP")),
        ).toBeInTheDocument();
        expect(
            within(cells[3] as HTMLElement).getByLabelText(genotypeLabel("pp")),
        ).toBeInTheDocument();
        expect(
            within(cells[1] as HTMLElement).getByLabelText(genotypeLabel("Pp")),
        ).toBeInTheDocument();
        expect(
            within(cells[2] as HTMLElement).getByLabelText(genotypeLabel("Pp")),
        ).toBeInTheDocument();

        const alleles = Array.from(cells[0]!.querySelectorAll("i")).map(
            (allele) => allele.textContent,
        );
        expect(alleles).toEqual(["P", "P"]);
    });

    it("combines row i with column j for an unlike cross", () => {
        const { container } = render(
            <PunnettSquare
                punnett={[
                    ["Pp", "pp"],
                    ["Pp", "pp"],
                ]}
                parent1="Pp"
                parent2="pp"
            />,
        );

        expect(
            screen.getAllByRole("rowheader").map((header) => header.textContent),
        ).toEqual(["P", "p"]);
        expect(
            screen.getAllByRole("columnheader").slice(1).map((header) => header.textContent),
        ).toEqual(["p", "p"]);

        const cells = Array.from(container.querySelectorAll("tbody td"));
        expect(
            within(cells[0] as HTMLElement).getByLabelText(genotypeLabel("Pp")),
        ).toBeInTheDocument();
        expect(
            within(cells[1] as HTMLElement).getByLabelText(genotypeLabel("pp")),
        ).toBeInTheDocument();
    });
});
