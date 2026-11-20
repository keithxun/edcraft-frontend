import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { BiologyTemplateDetails } from "../components/BiologyTemplateDetails";
import type { BiologyTemplateCandidate } from "../types";
import { biologyTemplateCandidate } from "./fixtures";

describe("BiologyTemplateDetails", () => {
    afterEach(cleanup);

    it("shows the topic, organism, trait and gene in plain words", () => {
        render(<BiologyTemplateDetails candidate={biologyTemplateCandidate} />);

        expect(
            screen.getByText("genetics.monohybrid.conditional_count · Hard"),
        ).toBeInTheDocument();

        const organism = screen.getByLabelText("Organism and trait");
        expect(within(organism).getByText("Organism")).toBeInTheDocument();
        expect(
            within(organism).getByText(
                "a hypothetical flowering plant called the glimmerwort",
            ),
        ).toBeInTheDocument();
        expect(within(organism).getByText("Trait")).toBeInTheDocument();
        expect(within(organism).getByText("petal colour")).toBeInTheDocument();

        const gene = screen.getByLabelText("Gene");
        expect(within(gene).getByText("Symbol")).toBeInTheDocument();
        expect(within(gene).getByText("P", { exact: true })).toBeInTheDocument();
        expect(
            within(gene).getByText("Dominant phenotype"),
        ).toBeInTheDocument();
        expect(within(gene).getByText("purple")).toBeInTheDocument();
        expect(
            within(gene).getByText("Recessive phenotype"),
        ).toBeInTheDocument();
        expect(within(gene).getByText("white")).toBeInTheDocument();
    });

    it("spells out the assumptions and the cross", () => {
        render(<BiologyTemplateDetails candidate={biologyTemplateCandidate} />);

        const assumptions = screen.getByLabelText("Assumptions");
        expect(within(assumptions).getByText("Autosomal")).toBeInTheDocument();
        expect(within(assumptions).getByText("Complete")).toBeInTheDocument();
        expect(within(assumptions).getByText("Mendelian")).toBeInTheDocument();
        expect(within(assumptions).getByText("2 alleles")).toBeInTheDocument();

        const cross = screen.getByLabelText("Cross");
        expect(within(cross).getByText("parent1 (Pp)")).toBeInTheDocument();
        expect(within(cross).getByText("parent2 (Pp)")).toBeInTheDocument();
    });

    it("describes the question the template asks", () => {
        render(<BiologyTemplateDetails candidate={biologyTemplateCandidate} />);

        const question = screen.getByLabelText("Question");
        expect(within(question).getByText("Expected count")).toBeInTheDocument();
        expect(within(question).getByText("Genotype target")).toBeInTheDocument();
        expect(within(question).getByText("Dominant phenotype")).toBeInTheDocument();
        expect(within(question).getByText("n")).toBeInTheDocument();
        expect(within(question).getByText("Not applicable")).toBeInTheDocument();
    });

    it("lists parameter domains with their kinds and values", () => {
        render(<BiologyTemplateDetails candidate={biologyTemplateCandidate} />);

        const parameters = screen.getByLabelText("Parameters");
        expect(within(parameters).getByText("parent1")).toBeInTheDocument();
        expect(within(parameters).getAllByText("Genotype: Pp")).toHaveLength(3);
        expect(within(parameters).getByText("n")).toBeInTheDocument();
        expect(
            within(parameters).getByText("Count: 30, 60, 90, 120"),
        ).toBeInTheDocument();
    });

    it("shows the answer recipe and its claimed example", () => {
        render(<BiologyTemplateDetails candidate={biologyTemplateCandidate} />);

        const answer = screen.getByLabelText("Answer recipe");
        expect(within(answer).getByText("Rule: Exact")).toBeInTheDocument();
        expect(within(answer).getByText("60")).toBeInTheDocument();
        expect(
            within(answer).getByText("parent1 = Pp, parent2 = Pp, target = Pp, n = 90"),
        ).toBeInTheDocument();
    });

    it("shows each wrong choice with its misconception and reason", () => {
        render(<BiologyTemplateDetails candidate={biologyTemplateCandidate} />);

        const choices = screen.getByLabelText("Wrong choices");
        expect(within(choices).getByText("Ignores the condition")).toBeInTheDocument();
        expect(
            within(choices).getByText(
                "Misconception: unconditioned instead of conditioned probability",
            ),
        ).toBeInTheDocument();
        expect(
            within(choices).getByText("Reason: uses 1/2 of all offspring"),
        ).toBeInTheDocument();
        expect(within(choices).getByText("Complement")).toBeInTheDocument();
        expect(
            within(choices).getByText("Misconception: counts homozygous dominant instead"),
        ).toBeInTheDocument();

        // A fixed value shows the value it uses, and an empty reason is hidden.
        const fixed = within(choices).getByText("Fixed value").closest("li")!;
        expect(within(fixed).getByText("Value: 90")).toBeInTheDocument();
        expect(within(fixed).queryByText(/^Reason:/)).not.toBeInTheDocument();
    });

    it("labels ratio questions without a target or given", () => {
        const candidate: BiologyTemplateCandidate = {
            ...biologyTemplateCandidate,
            item: {
                ...biologyTemplateCandidate.item,
                question: {
                    quantity: "ratio",
                    target: null,
                    given: null,
                    offspring_count: null,
                    ratio_kind: "phenotype",
                },
            },
        };

        render(<BiologyTemplateDetails candidate={candidate} />);

        const question = screen.getByLabelText("Question");
        expect(within(question).getByText("Phenotype")).toBeInTheDocument();
        expect(within(question).getByText("Not restricted")).toBeInTheDocument();
        expect(within(question).getAllByText("Not set")).toHaveLength(2);
    });

    it("renders a partial payload without throwing", () => {
        const candidate = {
            template_id: "partial",
            question_type: "mcq",
            item: {},
        } as unknown as BiologyTemplateCandidate;

        expect(() =>
            render(<BiologyTemplateDetails candidate={candidate} />),
        ).not.toThrow();

        expect(screen.getByLabelText("Gene")).toBeInTheDocument();
        expect(screen.getByLabelText("Answer recipe")).toBeInTheDocument();
        expect(screen.getByText("No answer recipe declared.")).toBeInTheDocument();
        expect(
            within(screen.getByLabelText("Wrong choices")).getByText("None"),
        ).toBeInTheDocument();
    });
});
