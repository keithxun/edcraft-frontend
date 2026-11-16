import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { TechnicalDetails } from "../components/TechnicalDetails";
import {
    DifficultyDetails,
    RelevanceDetails,
    ValidationLimitsDetails,
    WarningsDetails,
} from "../components/TechnicalDetailsSections";
import type {
    AuthoringDifficultyOutcome,
    AuthoringRelevanceOutcome,
    AuthoringReview,
    ValidationLimits,
} from "../types";
import { approvedReview, mathIrReview } from "./fixtures";

const limits: ValidationLimits = {
    validator_version: "mcp-math-template-v1",
    checking_mode: "property_based",
    examples_checked: 60,
    execution_calls: 120,
    max_examples: 100,
    max_execution_calls: 400,
    timeout_seconds: 15,
    seed: 1234,
    whole_domain: true,
    declared_domain_size: 60,
};

describe("readable technical sections", () => {
    afterEach(cleanup);

    it("shows difficulty in plain words with the decision path", () => {
        const outcome: AuthoringDifficultyOutcome = {
            advisory: true,
            assessment_path: "decision",
            requested_difficulty: "easy",
            estimated_difficulty: "hard",
            confidence: 0.969080124525974,
            confidence_source: "first_token_label_mass",
            decision: "advisory_mismatch",
            status: "failed",
            reason: "Forced decision from first-token label probabilities.",
        };

        render(<DifficultyDetails outcome={outcome} />);

        expect(screen.getByText("Requested difficulty")).toBeInTheDocument();
        expect(screen.getByText("Easy")).toBeInTheDocument();
        expect(screen.getByText("Estimated difficulty")).toBeInTheDocument();
        expect(screen.getByText("Hard")).toBeInTheDocument();
        expect(screen.getByText("Does not match")).toBeInTheDocument();
        expect(screen.getByText("97%")).toBeInTheDocument();
        expect(screen.getByText("Source: decision model")).toBeInTheDocument();
        expect(
            screen.getByText(
                "The decision model picked a level directly, with 97% confidence from its answer probabilities.",
            ),
        ).toBeInTheDocument();
        expect(
            screen.queryByText("Forced decision from first-token label probabilities."),
        ).not.toBeInTheDocument();
    });

    it("shows the reasoning path and keeps a non-stock reason", () => {
        render(
            <DifficultyDetails
                outcome={{
                    advisory: true,
                    assessment_path: "reasoning",
                    requested_difficulty: "medium",
                    estimated_difficulty: "medium",
                    confidence: 0.72,
                    confidence_source: "self_reported",
                    decision: "matches",
                    status: "passed",
                    reason: "The rubric put this at the lower end of medium.",
                }}
            />,
        );

        expect(screen.getByText("Matches")).toBeInTheDocument();
        expect(screen.getByText("72%")).toBeInTheDocument();
        expect(screen.getByText("Source: reasoning assessment")).toBeInTheDocument();
        expect(
            screen.getByText("The judge model reasoned through the rubric before deciding."),
        ).toBeInTheDocument();
        expect(
            screen.getByText("The rubric put this at the lower end of medium."),
        ).toBeInTheDocument();
    });

    it("shows the relevance score, threshold and stock reason removal", () => {
        const outcome: AuthoringRelevanceOutcome = {
            advisory: true,
            status: "assessed",
            unavailable: false,
            score: 0.9947992543931108,
            threshold: 0.9223792980579683,
            relevant: true,
            reason: "Advisory relevance assessment completed.",
        };

        render(<RelevanceDetails outcome={outcome} />);

        expect(
            screen.getByText("Relevance score 0.995 (threshold 0.922)"),
        ).toBeInTheDocument();
        expect(screen.getByText("Result: Relevant")).toBeInTheDocument();
        expect(
            screen.queryByText("Advisory relevance assessment completed."),
        ).not.toBeInTheDocument();
    });

    it("shows an unavailable relevance result as not assessed", () => {
        render(
            <RelevanceDetails
                outcome={{
                    advisory: true,
                    status: "unavailable",
                    unavailable: true,
                    score: null,
                    threshold: null,
                    relevant: null,
                    reason: "Judge unavailable.",
                }}
            />,
        );

        expect(screen.getByText("Result: Not assessed")).toBeInTheDocument();
        expect(screen.getByText("Judge unavailable.")).toBeInTheDocument();
    });

    it("summarises a whole-domain check and hides internals", () => {
        render(<ValidationLimitsDetails limits={limits} />);

        expect(
            screen.getByText("Examples checked: 60 of 60 combinations (every combination)"),
        ).toBeInTheDocument();
        expect(
            screen.getByText("Limits: 100 combinations, 400 calls, 15 s"),
        ).toBeInTheDocument();
        expect(screen.queryByText(/mcp-math-template-v1/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Property Based/)).not.toBeInTheDocument();
        expect(screen.queryByText(/1234/)).not.toBeInTheDocument();
    });

    it("summarises a sampled check with its declared size", () => {
        render(
            <ValidationLimitsDetails
                limits={{ ...limits, whole_domain: false, examples_checked: 13, declared_domain_size: 500 }}
            />,
        );

        expect(
            screen.getByText("Examples checked: 13 of 500 combinations"),
        ).toBeInTheDocument();
    });

    it("does not claim every combination when some were skipped", () => {
        render(
            <ValidationLimitsDetails
                limits={{
                    ...limits,
                    whole_domain: true,
                    examples_checked: 13,
                    declared_domain_size: 26,
                }}
            />,
        );

        expect(
            screen.getByText("Examples checked: 13 of 26 combinations"),
        ).toBeInTheDocument();
        expect(screen.queryByText(/every combination/)).not.toBeInTheDocument();
    });

    it("summarises a sampled check without a declared size", () => {
        render(
            <ValidationLimitsDetails
                limits={{
                    ...limits,
                    whole_domain: false,
                    examples_checked: 13,
                    declared_domain_size: null,
                }}
            />,
        );

        expect(screen.getByText("Examples checked: 13")).toBeInTheDocument();
    });

    it("turns known warnings into sentences and leaves unknown codes alone", () => {
        render(<WarningsDetails warnings={["RELEVANCE_MISMATCH", "SOMETHING_NEW"]} />);

        expect(
            screen.getByText(
                "The relevance check flagged this question as possibly off topic.",
            ),
        ).toBeInTheDocument();
        expect(screen.getByText("SOMETHING_NEW")).toBeInTheDocument();
    });
});

describe("TechnicalDetails readable labels", () => {
    afterEach(cleanup);

    it("uses friendly check and request labels and shortens the library revision", () => {
        const review: AuthoringReview = {
            ...approvedReview,
            fixed_plan: ["math_verify_item_spec", "Generate a template"],
        };

        render(<TechnicalDetails review={review} result={null} />);

        expect(screen.getByText("Subject")).toBeInTheDocument();
        expect(screen.getAllByText("Programming").length).toBeGreaterThan(0);
        expect(screen.getByText("Wrong choices")).toBeInTheDocument();
        expect(screen.getByText("Model profile")).toBeInTheDocument();
        expect(screen.getAllByText("Correct answer").length).toBeGreaterThan(0);
        expect(screen.getByText("Generate a template")).toBeInTheDocument();
        expect(screen.queryByText("Math Verify Item Spec")).not.toBeInTheDocument();

        const revision = screen.getByText("db74f17");
        expect(revision.closest("dd")).toHaveAttribute(
            "title",
            approvedReview.library_revision,
        );
    });

    it("does not repeat a checked template under the latest attempt", () => {
        const candidate = mathIrReview.template!.candidate;
        const review: AuthoringReview = {
            ...mathIrReview,
            checks: [],
            fixed_plan: [],
            validation_limits: null,
            difficulty: null,
            relevance: null,
            warnings: [],
            approval: null,
            error: null,
            attempts: [
                {
                    number: 1,
                    candidate,
                    pending: [],
                    complete: true,
                    passed: true,
                    checks: [
                        {
                            tool: "math_verify_item_spec",
                            status: "passed",
                            advisory: false,
                            findings: [],
                            error: null,
                        },
                    ],
                },
            ],
        };

        render(<TechnicalDetails review={review} result={null} />);

        expect(screen.getByText("Same as the checked template below")).toBeInTheDocument();
        expect(screen.queryByText("Candidate")).not.toBeInTheDocument();
        expect(screen.getAllByText("Correct answer").length).toBeGreaterThan(0);
        expect(screen.getByText("Template details")).toBeInTheDocument();
        expect(screen.getAllByLabelText("Goal")).toHaveLength(1);
    });

    it("falls back to the generic view for a partial maths payload", () => {
        const review: AuthoringReview = {
            ...approvedReview,
            template: {
                ...approvedReview.template!,
                template_id: "partial",
                candidate: {
                    template_id: "partial",
                    item: {
                        topic: "school.quadratic",
                        parameters: [{ name: "p" }],
                        body: { topic: "school.quadratic" },
                    },
                },
            },
        };

        expect(() => render(<TechnicalDetails review={review} result={null} />)).not.toThrow();

        expect(screen.getByText("Template details")).toBeInTheDocument();
        expect(screen.queryByLabelText("Goal")).not.toBeInTheDocument();
    });
});
