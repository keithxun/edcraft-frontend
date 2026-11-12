import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { TemplateSelection } from "../components/TemplateSelection";
import type { PilotSelection } from "../types";
import { checkRecord } from "./fixtures";

const savedSelection: PilotSelection = {
    contract_id: "univariate-polynomial-differentiation",
    reason: "The request asks for derivatives of bounded polynomials in x.",
    source: "saved",
    check_ref: checkRecord.check_ref,
};

const authoredSelection: PilotSelection = {
    contract_id: "real-polynomial-equation-solution-set",
    reason: "The request asks for the complete real solution set of a quadratic equation.",
    source: "authored",
    check_ref: {
        check_id: "polynomial-equation-solution-v1",
        version: "1",
        sha256: "e".repeat(64),
    },
};

describe("TemplateSelection", () => {
    afterEach(cleanup);

    it("shows the selected contract, model reason, saved source and pinned reference", () => {
        render(<TemplateSelection selection={savedSelection} />);

        expect(screen.getByText("Model selection")).toBeInTheDocument();
        expect(screen.getByText("Selected contract")).toBeInTheDocument();
        expect(screen.getByText("Reason")).toBeInTheDocument();
        expect(screen.getByText("Source")).toBeInTheDocument();
        expect(screen.getByText("Pinned reference")).toBeInTheDocument();
        expect(
            screen.getByText("univariate-polynomial-differentiation"),
        ).toBeInTheDocument();
        expect(
            screen.getByText(/derivatives of bounded polynomials/i),
        ).toBeInTheDocument();
        expect(screen.getByText("Saved check")).toBeInTheDocument();
        expect(screen.getByText(/polynomial-derivative-v1/)).toBeInTheDocument();
        expect(screen.getByText(/version 1/)).toBeInTheDocument();
        expect(screen.getByTitle(checkRecord.check_ref.sha256)).toBeInTheDocument();
    });

    it("distinguishes a newly authored check from a reused saved check", () => {
        render(<TemplateSelection selection={authoredSelection} />);

        expect(screen.getByText("Authored check")).toBeInTheDocument();
        expect(
            screen.getByText("real-polynomial-equation-solution-set"),
        ).toBeInTheDocument();
        expect(screen.getByText(/polynomial-equation-solution-v1/)).toBeInTheDocument();
        expect(screen.queryByText("Saved check")).not.toBeInTheDocument();
    });

    it("handles a selection with no pinned reference without inventing one", () => {
        render(
            <TemplateSelection
                selection={{ ...savedSelection, check_ref: null }}
            />,
        );

        expect(screen.getByText("No check reference pinned")).toBeInTheDocument();
        expect(
            screen.queryByText(/the application validated the selected contract/i),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByText(/polynomial-derivative-v1/),
        ).not.toBeInTheDocument();
    });

    it("handles legacy templates with no selection metadata cleanly", () => {
        const { rerender } = render(<TemplateSelection selection={null} />);
        expect(
            screen.getByText(/no model selection metadata was recorded/i),
        ).toBeInTheDocument();
        expect(
            screen.getByText(/older templates remain readable/i),
        ).toBeInTheDocument();

        rerender(<TemplateSelection selection={undefined} />);
        expect(
            screen.getByText(/no model selection metadata was recorded/i),
        ).toBeInTheDocument();
    });
});
