import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChecksPanel } from "../components/ChecksPanel";
import type { AuthoringCheck } from "../types";

const checks: AuthoringCheck[] = [
    {
        tool: "code_verify_template_structure",
        status: "passed",
        advisory: false,
        findings: [],
        error: null,
    },
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
        error: "The check could not evaluate a sample.",
    },
    {
        tool: "difficulty_assessment",
        status: "failed",
        advisory: true,
        findings: [
            {
                code: "DIFFICULTY_MISMATCH",
                field: "difficulty",
                message: "Estimated difficulty is harder than requested.",
            },
        ],
        error: null,
    },
];

describe("ChecksPanel", () => {
    afterEach(cleanup);

    it("lists every technical check with labels, screen-reader statuses and descriptions", () => {
        render(<ChecksPanel checks={checks} />);

        expect(
            screen.getByText("1 of 3 technical checks need attention."),
        ).toBeInTheDocument();

        expect(screen.getByText("Question template")).toBeInTheDocument();
        expect(screen.getByText("Required features")).toBeInTheDocument();
        expect(screen.getByText("Answers and wrong choices")).toBeInTheDocument();
        const passedStatuses = screen.getAllByText(/Passed:/);
        expect(passedStatuses).toHaveLength(2);
        for (const status of passedStatuses) expect(status).toHaveClass("sr-only");
        expect(screen.getByText(/Needs attention:/)).toHaveClass("sr-only");

        expect(
            screen.getByText("The template is structurally valid and renders."),
        ).toBeInTheDocument();
        expect(
            screen.getByText("The requested Python features are present."),
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                "The answer and every wrong choice evaluate correctly and are distinct.",
            ),
        ).toBeInTheDocument();
    });

    it("explains what a technical check supports", async () => {
        render(<ChecksPanel checks={checks} />);

        await userEvent
            .setup()
            .click(
                screen.getByRole("button", {
                    name: "What Question template checks",
                }),
            );

        expect(await screen.findByText("Supported")).toBeInTheDocument();
        expect(
            screen.getByText(
                "Placeholders, template rendering, and the structure of the answer expression.",
            ),
        ).toBeInTheDocument();
        expect(screen.getByText("Limits")).toBeInTheDocument();
        expect(
            screen.getByText(
                "Structure and rendering only; code execution happens in the answers check.",
            ),
        ).toBeInTheDocument();
    });

    it("shows the error and findings under a failing technical check", () => {
        render(<ChecksPanel checks={checks} />);

        expect(
            screen.getByText("The check could not evaluate a sample."),
        ).toBeInTheDocument();
        expect(
            screen.getByText("A sampled example failed to execute."),
        ).toBeInTheDocument();
    });

    it("shows a shared preflight failure once and references it from later checks", () => {
        const shared = {
            code: "TEMPLATE_INVALID",
            field: "answer_expression",
            message:
                'answer_expression "a + b": template expression exceeds 500 characters. ' +
                "Expressions use bare parameter names.",
        };
        const explanation =
            "template expression exceeds 500 characters. Expressions use bare parameter names.";

        render(
            <ChecksPanel
                checks={[
                    {
                        tool: "code_verify_template_structure",
                        status: "failed",
                        advisory: false,
                        findings: [shared],
                        error: null,
                    },
                    {
                        tool: "code_validate_answers_and_distractors",
                        status: "failed",
                        advisory: false,
                        findings: [shared],
                        error: null,
                    },
                ]}
            />,
        );

        expect(screen.getAllByText(explanation)).toHaveLength(1);
        expect(
            screen.getByText("Same underlying issue as Question template."),
        ).toBeInTheDocument();
        expect(
            screen.getByText("2 of 2 technical checks need attention."),
        ).toBeInTheDocument();
    });

    it("does not list advisory checks or the old correctness disclaimer", () => {
        render(<ChecksPanel checks={checks} />);

        expect(screen.queryByText("difficulty assessment")).not.toBeInTheDocument();
        expect(
            screen.queryByText("Estimated difficulty is harder than requested."),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByText(/They cannot prove the question is correct/),
        ).not.toBeInTheDocument();
    });

    const advisories = [
        {
            id: "difficulty",
            title: "Difficulty differs",
            description: "Estimated hard; requested easy.",
            passed: false,
            meter: { label: "Confidence", display: "72%", percent: 72, caption: "Source: Reasoning judge" },
        },
        {
            id: "relevance",
            title: "Relevance looks good",
            description: "Related to the request.",
            passed: true,
            meter: null,
        },
    ];

    it("lists difficulty and relevance in a separate advisory group", () => {
        render(<ChecksPanel checks={checks} advisories={advisories} collapsible />);

        expect(
            screen.getByText(
                "1 of 3 technical checks need attention. 1 of 2 advisories need attention.",
            ),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("heading", { name: /Technical checks/i }),
        ).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: /Advisories/i })).toBeInTheDocument();
        expect(screen.getByText("Difficulty differs")).toBeInTheDocument();
        expect(screen.getByText("Estimated hard; requested easy.")).toBeInTheDocument();
        expect(screen.getByText("72%")).toBeInTheDocument();
        expect(screen.getByText("Source: Reasoning judge")).toBeInTheDocument();
        expect(screen.getByText("Relevance looks good")).toBeInTheDocument();

        // Advisories never gate approval, so a mismatch stays neutral rather
        // than using the amber warning color.
        const advisory = screen.getByText("Difficulty differs").closest("[data-advisory]");
        expect(advisory).toHaveClass("bg-muted/30");
    });

    it("opens by default when a check does not pass", () => {
        render(<ChecksPanel checks={checks} advisories={advisories} collapsible />);

        const details = screen.getByRole("heading", { name: "Checks" }).closest("details");
        expect(details).toHaveAttribute("open");
    });

    it("stays closed by default when every check passes", () => {
        render(
            <ChecksPanel
                checks={checks.filter((check) => check.status === "passed" && !check.advisory)}
                advisories={[advisories[1]]}
                collapsible
            />,
        );

        expect(
            screen.getByText("All 2 technical checks passed. Advisory passed."),
        ).toBeInTheDocument();
        const details = screen.getByRole("heading", { name: "Checks" }).closest("details");
        expect(details).not.toHaveAttribute("open");
    });
});
