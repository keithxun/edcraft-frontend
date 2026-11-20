import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import type { CodeTemplateCandidate } from "../types";
import { TemplateQuestionPreview } from "../components/TemplateQuestionPreview";
import {
    approvedReview,
    biologyReview,
    mathIrReview,
    physicsReview,
    stubReview,
} from "./fixtures";

vi.mock("../components/ReadOnlyCode", () => ({
    ReadOnlyCode: ({ code, label }: { code: string; label: string }) => (
        <pre aria-label={label}>{code}</pre>
    ),
}));

describe("TemplateQuestionPreview", () => {
    afterEach(cleanup);

    it("keeps the code template view for the code domain", () => {
        const candidate = approvedReview.template!.candidate as CodeTemplateCandidate;
        render(
            <TemplateQuestionPreview
                template={approvedReview.template!}
                domain="code"
            />,
        );

        expect(screen.getByLabelText("Template code").textContent).toBe(candidate.code);
        expect(screen.getByText(/What does list_sum/)).toBeInTheDocument();
    });

    it("renders stub-domain candidate fields without a code block", () => {
        render(
            <TemplateQuestionPreview template={stubReview.template!} domain="stub" />,
        );

        expect(
            screen.getByRole("heading", { name: "Which of these numbers is even?" }),
        ).toBeInTheDocument();
        expect(screen.getByText("Template fields")).toBeInTheDocument();
        expect(screen.queryByLabelText("Template code")).not.toBeInTheDocument();
        expect(screen.getByText("Question template")).toBeInTheDocument();
        expect(screen.getByText("Answer expression")).toBeInTheDocument();
    });

    it("renders a generic IR candidate as a sample instance", () => {
        render(
            <TemplateQuestionPreview template={mathIrReview.template!} domain="math" />,
        );

        // The authored text already contains the rendered equation, so it is
        // shown once and the redundant equation heading is skipped.
        expect(
            screen.getByRole("heading", {
                name: "Solve x^2 + 5*x - 14 = 0.",
            }),
        ).toBeInTheDocument();
        expect(screen.getByText("school.quadratic")).toBeInTheDocument();
        expect(screen.getByText("Parameters")).toBeInTheDocument();
        expect(screen.getByText("Goal")).toBeInTheDocument();
        expect(screen.getByText("solve")).toBeInTheDocument();
        expect(
            screen.getByText("Correct answer (authored recipe)"),
        ).toBeInTheDocument();
        const answerSection = screen.getByLabelText("Correct answer");
        expect(answerSection.querySelector(".katex")).not.toBeNull();
        expect(answerSection.querySelector("math")).not.toBeNull();
        expect(answerSection.querySelector("annotation")?.textContent).toBe(
            "\\left\\{2, -7\\right\\}",
        );
        expect(screen.getByText("Wrong choices")).toBeInTheDocument();
        const distractorSection = screen.getByLabelText("Distractors");
        expect(distractorSection.querySelectorAll(".katex")).toHaveLength(2);
        expect(
            Array.from(distractorSection.querySelectorAll("annotation")).map(
                (annotation) => annotation.textContent,
            ),
        ).toEqual(["-2", "-5"]);
        expect(
            screen.getByText("Reports the sum of the roots as a root"),
        ).toBeInTheDocument();
        expect(screen.queryByText("Answer expression")).not.toBeInTheDocument();
        expect(screen.queryByLabelText("Template code")).not.toBeInTheDocument();
    });

    it("renders a biology candidate with marked placeholders and its example answer", () => {
        render(
            <TemplateQuestionPreview template={biologyReview.template!} domain="biology" />,
        );

        const heading = screen.getByRole("heading", { level: 3 });
        expect(heading).toHaveTextContent(
            "In {organism}, {dominant_phenotype} {trait} is completely dominant",
        );
        const placeholders = Array.from(heading.querySelectorAll(".font-mono")).map(
            (placeholder) => placeholder.textContent,
        );
        expect(placeholders).toContain("{organism}");
        expect(placeholders).toContain("{target}");

        const answer = screen.getByLabelText("Claimed example answer");
        expect(within(answer).getByText("60")).toBeInTheDocument();
        expect(
            within(answer).getByText(
                "parent1 = Pp, parent2 = Pp, target = Pp, n = 90",
            ),
        ).toBeInTheDocument();

        expect(screen.queryByText("Template fields")).not.toBeInTheDocument();
        expect(screen.queryByLabelText("Template code")).not.toBeInTheDocument();
    });

    it("keeps the generic fallback when the domain does not match a biology candidate", () => {
        render(
            <TemplateQuestionPreview template={biologyReview.template!} domain="math" />,
        );

        expect(screen.getByText("Template fields")).toBeInTheDocument();
        expect(screen.queryByText("Claimed example answer")).not.toBeInTheDocument();
        expect(screen.queryByText(/Punnett square/)).not.toBeInTheDocument();
    });

    it("renders a physics candidate as a sample stem", () => {
        render(
            <TemplateQuestionPreview template={physicsReview.template!} domain="physics" />,
        );

        expect(
            screen.getByRole("heading", {
                name: "A cart of mass 2 kg is pushed with a force of 30 N to the right. A friction force of 4 N to the left also acts on it.",
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByText("newton2.acceleration_from_forces"),
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                "Sample uses the first value of each parameter. EdCraft adds the direction convention, the assumptions and the question sentence.",
            ),
        ).toBeInTheDocument();
        expect(screen.getByText("Parameters")).toBeInTheDocument();
        expect(screen.getByText('["2", "4"]')).toBeInTheDocument();

        const answerSection = screen.getByLabelText("Correct answer");
        expect(answerSection.querySelector("annotation")?.textContent).toBe(
            "\\frac{F_{1} - F_{2}}{m}",
        );

        const distractorSection = screen.getByLabelText("Distractors");
        expect(distractorSection.querySelectorAll(".katex")).toHaveLength(2);
        expect(
            Array.from(distractorSection.querySelectorAll("annotation")).map(
                (annotation) => annotation.textContent,
            ),
        ).toEqual(["\\frac{F_{1} + F_{2}}{m}", "\\frac{F_{1}}{m}"]);
        expect(screen.getByText("Added opposing forces")).toBeInTheDocument();
        expect(screen.getByText("Ignored the opposing force")).toBeInTheDocument();
        expect(screen.queryByLabelText("Template code")).not.toBeInTheDocument();
    });

    it("keeps the generic view for a physics candidate outside the physics domain", () => {
        render(
            <TemplateQuestionPreview template={physicsReview.template!} domain="math" />,
        );

        expect(screen.getByText("Template fields")).toBeInTheDocument();
        expect(screen.queryByText("Correct answer (authored recipe)")).not.toBeInTheDocument();
    });
});
