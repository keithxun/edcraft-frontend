import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { CodeTemplateCandidate } from "@/api/models";
import { TemplateQuestionPreview } from "../components/TemplateQuestionPreview";
import {
    approvedReview,
    mathIrReview,
    mathReview,
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

    it("renders a math candidate without code assumptions", () => {
        const candidate = mathReview.template!.candidate as {
            equation_template: string;
            answer_expression: string;
        };
        render(
            <TemplateQuestionPreview template={mathReview.template!} domain="math" />,
        );

        expect(
            screen.getByRole("heading", { name: "Solve for x." }),
        ).toBeInTheDocument();
        expect(screen.getByText(candidate.equation_template)).toBeInTheDocument();
        expect(screen.getByText(candidate.answer_expression)).toBeInTheDocument();
        expect(screen.getByText("Parameters")).toBeInTheDocument();
        expect(screen.getByText("Wrong choices")).toBeInTheDocument();
        expect(
            screen.getByText("Forgets to divide by the coefficient of x."),
        ).toBeInTheDocument();
        expect(screen.queryByLabelText("Template code")).not.toBeInTheDocument();
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
        expect(screen.getByText("{2, -7}")).toBeInTheDocument();
        expect(screen.getByText("Wrong choices")).toBeInTheDocument();
        expect(screen.getByText("-2")).toBeInTheDocument();
        expect(screen.getByText("-5")).toBeInTheDocument();
        expect(
            screen.getByText("Reports the sum of the roots as a root"),
        ).toBeInTheDocument();
        expect(screen.queryByText("Answer expression")).not.toBeInTheDocument();
        expect(screen.queryByLabelText("Template code")).not.toBeInTheDocument();
    });
});
