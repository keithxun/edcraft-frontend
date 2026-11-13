import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QualificationEvidence } from "../components/QualificationEvidence";
import type { Qualification } from "../types";

const passed: Qualification = {
    status: "passed",
    checking_mode: "property_based",
    accepted_cases: 48,
    execution_calls: 63,
    seed: 11,
    max_examples: 100,
    max_execution_calls: 200,
    timeout_seconds: 10,
    counterexample: null,
    findings: ["Two boundary samples were skipped as outside scope."],
    versions: { check_engine: "1.2.0", polynomial_ir: "0.1" },
};

describe("QualificationEvidence", () => {
    afterEach(cleanup);

    it("states sampled evidence, budgets and versions for a passing result", () => {
        render(
            <QualificationEvidence
                title="Check qualification"
                qualification={passed}
                headingLevel="h3"
            />,
        );

        expect(
            screen.getByRole("heading", { name: "Check qualification" }),
        ).toBeInTheDocument();
        expect(screen.getByText("Sampled checks passed")).toBeInTheDocument();
        expect(screen.getByText("No counterexample found in sampled cases.")).toBeInTheDocument();
        expect(screen.getByText("Accepted cases")).toBeInTheDocument();
        expect(screen.getByText("48")).toBeInTheDocument();
        expect(
            screen.getByText("Generated examples per property run"),
        ).toBeInTheDocument();
        expect(screen.getByText("100")).toBeInTheDocument();
        expect(screen.getByText("Execution calls")).toBeInTheDocument();
        expect(screen.getByText("63 of at most 200")).toBeInTheDocument();
        expect(screen.getByText("Seed")).toBeInTheDocument();
        expect(screen.getByText("11")).toBeInTheDocument();
        expect(screen.getByText("Timeout")).toBeInTheDocument();
        expect(screen.getByText("10 seconds")).toBeInTheDocument();
        expect(screen.getByText("check_engine")).toBeInTheDocument();
        expect(screen.getByText("1.2.0")).toBeInTheDocument();
        expect(screen.getByText("polynomial_ir")).toBeInTheDocument();
        expect(screen.getByText("0.1")).toBeInTheDocument();
        expect(
            screen.getByText("Two boundary samples were skipped as outside scope."),
        ).toBeInTheDocument();
        expect(screen.queryByText(/proved|fully checked|confidence/i)).not.toBeInTheDocument();
    });

    it("shows accepted cases independently from the per-run generated-examples setting", () => {
        render(
            <QualificationEvidence
                title="Check qualification"
                qualification={{
                    ...passed,
                    accepted_cases: 79,
                    max_examples: 50,
                    execution_calls: 80,
                    max_execution_calls: 200,
                }}
            />,
        );

        expect(screen.getByText("Accepted cases")).toBeInTheDocument();
        expect(screen.getByText("79")).toBeInTheDocument();
        expect(screen.queryByText("79 of at most 50")).not.toBeInTheDocument();
        expect(
            screen.getByText("Generated examples per property run"),
        ).toBeInTheDocument();
        expect(screen.getByText("50")).toBeInTheDocument();
        expect(screen.getByText(/explicit boundary/i)).toBeInTheDocument();
        expect(screen.getByText(/additional qualification runs/i)).toBeInTheDocument();
        expect(screen.getByText("80 of at most 200")).toBeInTheDocument();
    });

    it("shows a preserved counterexample for a failed sample", () => {
        render(
            <QualificationEvidence
                title="Template qualification"
                qualification={{
                    ...passed,
                    status: "failed",
                    counterexample: { coefficients: [1, 0, -2], reason: "distinct choice" },
                }}
            />,
        );

        expect(screen.getByText("Sampled checks failed")).toBeInTheDocument();
        expect(screen.getByText("Preserved counterexample")).toBeInTheDocument();
        expect(screen.getByText(/coefficients/)).toBeInTheDocument();
        expect(screen.getByText(/distinct choice/)).toBeInTheDocument();
    });

    it("shows compilation rejection counts and findings without a sampled-counterexample claim", () => {
        render(
            <QualificationEvidence
                title="Draft check qualification"
                qualification={{
                    ...passed,
                    status: "error",
                    phase: "compilation",
                    accepted_cases: 0,
                    execution_calls: 0,
                    counterexample: null,
                    findings: ["Development needed: poly.integrate"],
                }}
            />,
        );

        expect(screen.getByText("Rejected before sampling")).toBeInTheDocument();
        expect(screen.getByText(/no mathematical verdict/i)).toBeInTheDocument();
        expect(
            screen.getByText("No sampled cases ran for this version."),
        ).toBeInTheDocument();
        expect(screen.queryByText(/sampled cases found a counterexample/i)).not.toBeInTheDocument();
        expect(screen.getByText("0 of at most 200")).toBeInTheDocument();
        expect(
            screen.getByText("Development needed: poly.integrate"),
        ).toBeInTheDocument();
    });

    it("does not present inconclusive or error evidence as passing", () => {
        const { rerender } = render(
            <QualificationEvidence
                title="Check qualification"
                qualification={{ ...passed, status: "inconclusive" }}
            />,
        );
        expect(screen.getByText("Inconclusive")).toBeInTheDocument();
        expect(
            screen.getByText("The sampled checks did not establish an outcome."),
        ).toBeInTheDocument();

        rerender(
            <QualificationEvidence
                title="Check qualification"
                qualification={{ ...passed, status: "error" }}
            />,
        );
        expect(screen.getByText("Check error")).toBeInTheDocument();
        expect(
            screen.getByText("The check could not complete. This is not a passing result."),
        ).toBeInTheDocument();
    });
});
