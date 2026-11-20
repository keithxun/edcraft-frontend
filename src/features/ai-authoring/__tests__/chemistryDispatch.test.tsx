import type { ChemistryTemplateCandidate } from "../types";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { AttemptsEvidence } from "../components/AttemptsEvidence";
import { CasePreviews } from "../components/CasePreviews";
import { PreviewQuestion } from "../components/PreviewQuestion";
import { TechnicalDetails } from "../components/TechnicalDetails";
import { TemplateQuestionPreview } from "../components/TemplateQuestionPreview";
import {
    isChemistryQuestionPayload,
    isChemistryTemplateCandidate,
    isIrMathTemplateCandidate,
    isMathQuestionPayload,
} from "../components/questionPayload";
import type { AuthoringTemplateCandidate, ReviewAttempt } from "../types";
import {
    approvedReview,
    chemistryCoefficientQuestionInstances,
    chemistryCoefficientTemplateCandidate,
    chemistryEquationQuestionInstances,
    chemistryQuestionInstance,
    chemistryReview,
    chemistryTemplateCandidate,
    mathIrTemplateCandidate,
    mathQuestionInstance,
    previewInstance,
} from "./fixtures";

const codeCandidate = approvedReview.template?.candidate as AuthoringTemplateCandidate;

describe("chemistry payload guards", () => {
    it("accepts both genuine chemistry questions and rejects maths and code", () => {
        for (const instance of [
            ...chemistryEquationQuestionInstances,
            ...chemistryCoefficientQuestionInstances,
        ]) {
            expect(isChemistryQuestionPayload(instance)).toBe(true);
        }
        expect(isChemistryQuestionPayload(mathQuestionInstance)).toBe(false);
        expect(isChemistryQuestionPayload(previewInstance)).toBe(false);
    });

    it("keeps the maths guard from accepting chemistry", () => {
        expect(isMathQuestionPayload(mathQuestionInstance)).toBe(true);
        expect(isMathQuestionPayload(chemistryQuestionInstance)).toBe(false);
    });

    it("accepts both genuine chemistry candidates and rejects maths and code", () => {
        expect(isChemistryTemplateCandidate(chemistryTemplateCandidate)).toBe(true);
        expect(isChemistryTemplateCandidate(chemistryCoefficientTemplateCandidate)).toBe(
            true,
        );
        expect(isChemistryTemplateCandidate(mathIrTemplateCandidate)).toBe(false);
        expect(isChemistryTemplateCandidate(codeCandidate)).toBe(false);
        expect(isIrMathTemplateCandidate(mathIrTemplateCandidate)).toBe(true);
        expect(isIrMathTemplateCandidate(chemistryTemplateCandidate)).toBe(false);
    });

    it("requires the chem-balance schema version", () => {
        const wrongSchema = {
            ...chemistryTemplateCandidate,
            item: {
                ...chemistryTemplateCandidate.item,
                schema_version: "chem-template/0.1",
            },
        };

        expect(isChemistryTemplateCandidate(wrongSchema)).toBe(false);
        expect(
            isChemistryTemplateCandidate({
                ...chemistryTemplateCandidate,
                item: {
                    ...chemistryTemplateCandidate.item,
                    schema_version: "chem-balance/0.2",
                },
            }),
        ).toBe(true);
    });
});

describe("chemistry dispatch", () => {
    afterEach(cleanup);

    it("shows the chemistry question view in a chemistry preview", () => {
        const { container } = render(
            <PreviewQuestion instance={chemistryQuestionInstance} domain="chemistry" />,
        );

        expect(
            screen.getByRole("heading", { name: chemistryQuestionInstance.question }),
        ).toBeInTheDocument();
        expect(container.querySelectorAll("sub").length).toBeGreaterThan(0);
        expect(screen.getByLabelText("Question inputs")).toBeInTheDocument();
    });

    it("renders the tabulated reduction data in the generated and checked previews", () => {
        const question = [
            "Use the standard reduction data below.",
            "",
            "| Standard reduction half-equation | E° / V |",
            "| --- | --- |",
            "| X³⁺ + e⁻ → X²⁺ | +0.80 |",
            "| X³⁺ + 3e⁻ → X(s) | +0.20 |",
            "",
            "Find E° for X²⁺ + 2e⁻ → X(s).",
        ].join("\n");
        const id = "calc-reduction-table-medium-step";
        render(
            <>
                <PreviewQuestion
                    domain="chemistry"
                    variant="review"
                    instance={{
                        ...chemistryQuestionInstance,
                        parameters: { context: id },
                        question,
                        choices_structured: null,
                    }}
                />
                <CasePreviews
                    domain="chemistry"
                    cases={[{ case_id: id, outcome: null, question, answer: "−0.10 V" }]}
                />
            </>,
        );
        const tables = screen.getAllByRole("table", { name: "Standard reduction potentials" });
        expect(tables).toHaveLength(2);
        for (const table of tables) {
            expect(within(table).getByRole("columnheader", { name: "E° / V" })).toBeVisible();
            expect(within(table).getByRole("cell", { name: "+0.80" })).toBeVisible();
        }
        expect(screen.getAllByText("Find E° for X²⁺ + 2e⁻ → X(s).")).toHaveLength(2);
    });

    it("keeps the generic view for a chemistry payload in another domain", () => {
        const { container } = render(
            <PreviewQuestion instance={chemistryQuestionInstance} domain="math" />,
        );

        expect(
            screen.getByRole("heading", { name: chemistryQuestionInstance.question }),
        ).toBeInTheDocument();
        expect(container.querySelector("sub")).toBeNull();
        expect(screen.queryByLabelText("Question inputs")).not.toBeInTheDocument();
    });

    it("shows the chemistry template preview with a reaction count", () => {
        const { container } = render(
            <TemplateQuestionPreview template={chemistryReview.template!} domain="chemistry" />,
        );

        expect(
            screen.getByText("Complete combustion of alkanes"),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("heading", {
                name: "An alkane burns completely in oxygen to give carbon dioxide and water.",
                level: 3,
            }),
        ).toBeInTheDocument();
        expect(screen.getByText("Balanced equation")).toBeInTheDocument();
        expect(
            screen.getByText("Each generated question uses one of 2 reactions."),
        ).toBeInTheDocument();
        expect(container.querySelectorAll("sub").length).toBeGreaterThan(0);
    });

    it("says plainly when every generated question uses the same reaction", () => {
        const template = chemistryReview.template!;
        const candidate = template.candidate as ChemistryTemplateCandidate;
        const single: ChemistryTemplateCandidate = {
            ...candidate,
            catalogue: {
                ...candidate.catalogue,
                reactions: candidate.catalogue.reactions?.slice(0, 1),
            },
        };
        render(
            <TemplateQuestionPreview
                template={{ ...template, candidate: single }}
                domain="chemistry"
            />,
        );

        expect(
            screen.getByText(
                "Every generated question uses the same reaction, so seeds do not vary the question.",
            ),
        ).toBeInTheDocument();
    });

    it("shows chemistry template details in technical details", () => {
        render(<TechnicalDetails review={chemistryReview} result={null} />);

        expect(screen.getByText("Template details")).toBeInTheDocument();
        expect(screen.getByText("methane combustion")).toBeInTheDocument();
        expect(
            screen.getByText("Catalogue version: chem-catalogue-2026.11-pilot.2"),
        ).toBeInTheDocument();
        expect(screen.getAllByText("Balanced equation").length).toBeGreaterThan(0);
    });

    it("shows chemistry template details in an authoring attempt", () => {
        const attempt: ReviewAttempt = {
            number: 1,
            passed: true,
            complete: true,
            pending: [],
            checks: [
                {
                    tool: "chemistry_verify_balance",
                    status: "passed",
                    advisory: false,
                    findings: [],
                    error: null,
                },
            ],
            candidate: chemistryTemplateCandidate,
        };

        render(<AttemptsEvidence attempts={[attempt]} />);

        expect(screen.getByText("methane combustion")).toBeInTheDocument();
        expect(
            screen.getByText("Catalogue version: chem-catalogue-2026.11-pilot.2"),
        ).toBeInTheDocument();
    });

    it("shows the catalogue family title and description without lead-in text", () => {
        const details = render(<TechnicalDetails review={chemistryReview} result={null} />);
        const context = screen.getByLabelText(
            "Family and context sentence (from the catalogue)",
        );
        expect(
            within(context).getByText("Complete combustion of alkanes"),
        ).toBeInTheDocument();
        expect(
            within(context).getByText(
                "An alkane burns completely in oxygen to give carbon dioxide and water.",
            ),
        ).toBeInTheDocument();
        expect(details.container.textContent).not.toMatch(/lead_in/i);
        expect(details.container.textContent).not.toMatch(/lead-in/i);

        cleanup();

        const preview = render(
            <TemplateQuestionPreview
                template={chemistryReview.template!}
                domain="chemistry"
            />,
        );
        expect(
            screen.getByText("Complete combustion of alkanes"),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("heading", {
                name: "An alkane burns completely in oxygen to give carbon dioxide and water.",
                level: 3,
            }),
        ).toBeInTheDocument();
        expect(preview.container.textContent).not.toMatch(/lead_in/i);
        expect(preview.container.textContent).not.toMatch(/lead-in/i);
    });
});
