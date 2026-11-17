import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { CodeTemplateCandidate } from "../types";
import { TemplateQuestionPreview } from "../components/TemplateQuestionPreview";
import {
    approvedReview,
    mathIrReview,
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
});
