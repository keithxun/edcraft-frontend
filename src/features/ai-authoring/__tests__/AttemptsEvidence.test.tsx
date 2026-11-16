import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AttemptsEvidence } from "../components/AttemptsEvidence";
import type { ReviewAttempt } from "../types";

const attempt: ReviewAttempt = {
    number: 1,
    passed: false,
    complete: true,
    pending: [],
    checks: [
        {
            tool: "code_require_features",
            status: "passed",
            advisory: false,
            findings: [],
            error: null,
        },
        {
            tool: "code_validate_answers_and_distractors",
            status: "failed",
            advisory: false,
            findings: [
                {
                    code: "SAMPLE_EXECUTION_FAILED",
                    field: "code",
                    message: "A sampled example failed to execute.",
                },
            ],
            error: null,
        },
    ],
    candidate: {
        template_id: "code.hard.abc123",
        question_type: "mcq",
        topic: "loops",
        difficulty: "hard",
        code: "def count(n):\n    return n",
        entry_function: "count",
        parameters: [{ name: "n", kind: "integer", values: [1, 2, 3] }],
        answer_target: "return_value",
        answer_expression: "n",
        question_template: "What does count({n}) return?",
        distractors: [
            {
                expression: "n + 1",
                reason_template: "Off by one.",
            },
            {
                expression: "n * 2",
                reason_template: "Doubles the value.",
            },
        ],
    },
};

describe("AttemptsEvidence", () => {
    afterEach(cleanup);

    it("keeps each attempt collapsed with a status line", () => {
        render(<AttemptsEvidence attempts={[attempt]} />);

        expect(screen.getByText("Authoring attempts (1)")).toBeInTheDocument();
        const attemptDetails = screen
            .getByText(/Attempt 1 · Failed · 1\/2 checks passed/)
            .closest("details");
        expect(attemptDetails).not.toBeNull();
        expect(attemptDetails).not.toHaveAttribute("open");
    });

    it("opens one attempt without expanding the candidate", async () => {
        const user = userEvent.setup();
        render(<AttemptsEvidence attempts={[attempt]} />);

        const attemptDetails = screen.getByText(/Attempt 1 ·/).closest("details");
        if (!attemptDetails) throw new Error("Attempt disclosure was not rendered.");

        await user.click(screen.getByText(/Attempt 1 ·/));
        expect(attemptDetails).toHaveAttribute("open");
        expect(screen.getByText("Complete")).toBeInTheDocument();

        const candidate = within(attemptDetails).getByText("Candidate").closest("details");
        expect(candidate).not.toBeNull();
        expect(candidate).not.toHaveAttribute("open");
    });

    it("shows pending checks with their human labels", async () => {
        const user = userEvent.setup();
        render(
            <AttemptsEvidence
                attempts={[
                    {
                        ...attempt,
                        complete: false,
                        pending: ["assess_template_difficulty", "assess_template_relevance"],
                    },
                ]}
            />,
        );

        const attemptDetails = screen.getByText(/Attempt 1 ·/).closest("details");
        if (!attemptDetails) throw new Error("Attempt disclosure was not rendered.");
        await user.click(screen.getByText(/Attempt 1 ·/));

        expect(
            screen.getByText("Incomplete · Pending: Difficulty, Relevance"),
        ).toBeInTheDocument();
    });

    it("falls back to the humanised name for an unmapped pending check", async () => {
        const user = userEvent.setup();
        render(
            <AttemptsEvidence
                attempts={[
                    {
                        ...attempt,
                        complete: false,
                        pending: ["some_new_check"],
                    },
                ]}
            />,
        );

        const attemptDetails = screen.getByText(/Attempt 1 ·/).closest("details");
        if (!attemptDetails) throw new Error("Attempt disclosure was not rendered.");
        await user.click(screen.getByText(/Attempt 1 ·/));

        expect(
            screen.getByText("Incomplete · Pending: Some New Check"),
        ).toBeInTheDocument();
    });

    it("renders candidate parameters and distractors as tables when expanded", async () => {
        const user = userEvent.setup();
        render(<AttemptsEvidence attempts={[attempt]} />);

        const attemptDetails = screen.getByText(/Attempt 1 ·/).closest("details");
        if (!attemptDetails) throw new Error("Attempt disclosure was not rendered.");

        await user.click(within(attemptDetails).getByText("Candidate"));

        expect(screen.getByRole("columnheader", { name: "Expression" })).toBeInTheDocument();
        expect(screen.getByRole("columnheader", { name: "Reason" })).toBeInTheDocument();
        expect(screen.getByText("Off by one.")).toBeInTheDocument();
        expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
        expect(screen.getByText("1, 2, 3")).toBeInTheDocument();
    });
});
