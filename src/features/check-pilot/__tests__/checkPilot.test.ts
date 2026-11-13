import { describe, expect, it } from "vitest";
import { ApiError } from "@/api/axiosInstance";
import {
    approveBlockReason,
    canApproveTemplate,
    generationBlockReason,
    qualificationSummary,
    rejectBlockReason,
    reuseLabel,
    safeProvenance,
    templateApprovalLabel,
} from "../checkPilot";
import { getCheckPilotErrorMessage } from "../errors";
import type { CheckRecord, Qualification, PilotTemplateRecord } from "../types";

const passed: Qualification = {
    status: "passed",
    checking_mode: "property_based",
    accepted_cases: 40,
    execution_calls: 52,
    seed: 7,
    max_examples: 100,
    max_execution_calls: 200,
    timeout_seconds: 10,
    counterexample: null,
    findings: [],
    versions: { check_engine: "1.2.0" },
};

const check: CheckRecord = {
    check_ref: { check_id: "check-1", version: "1", sha256: "c".repeat(64) },
    title: "Polynomial derivative check",
    description: "Samples bounded polynomials.",
    scope: {},
    definition: {},
    qualification: passed,
    provenance: {},
    created_at: "2026-11-12T00:00:00Z",
};

function template(
    overrides: Partial<PilotTemplateRecord> = {},
): PilotTemplateRecord {
    return {
        template_id: "template-1",
        template_sha256: "a".repeat(64),
        prompt: "Differentiate bounded polynomials.",
        status: "ready",
        approval: "unreviewed",
        reused_check: false,
        check,
        template: { degree_max: 3 },
        qualification: passed,
        findings: [],
        created_at: "2026-11-12T00:00:00Z",
        ...overrides,
    };
}

describe("check pilot status language", () => {
    it("describes a passing sample without claiming proof", () => {
        const summary = qualificationSummary(passed);
        expect(summary.label).toBe("Sampled checks passed");
        expect(summary.explanation).toBe("No counterexample found in sampled cases.");
        expect(summary.explanation).not.toMatch(/proved|fully checked|confidence/i);
    });

    it("keeps failed, inconclusive and error distinct from pass", () => {
        expect(qualificationSummary({ ...passed, status: "failed" }).label).toBe(
            "Sampled checks failed",
        );
        expect(
            qualificationSummary({ ...passed, status: "inconclusive" }).label,
        ).toBe("Inconclusive");
        expect(qualificationSummary({ ...passed, status: "error" }).label).toBe(
            "Check error",
        );
        expect(
            qualificationSummary({ ...passed, status: "failed" }).label,
        ).not.toBe(qualificationSummary(passed).label);
    });

    it("labels compilation rejection before sampling without claiming a counterexample", () => {
        const summary = qualificationSummary({
            ...passed,
            status: "error",
            phase: "compilation",
            accepted_cases: 0,
            execution_calls: 0,
            counterexample: null,
            findings: ["Development needed: poly.integrate"],
        });
        expect(summary.label).toMatch(/before sampling/i);
        expect(summary.explanation).toMatch(/no mathematical verdict/i);
        expect(summary.explanation).not.toMatch(/counterexample/i);
    });

    it("does not claim a counterexample for legacy zero-execution failed evidence", () => {
        const summary = qualificationSummary({
            ...passed,
            status: "failed",
            accepted_cases: 0,
            execution_calls: 0,
            counterexample: null,
        });
        expect(summary.label).toMatch(/before sampling/i);
        expect(summary.explanation).toMatch(/no mathematical verdict/i);
        expect(summary.explanation).not.toMatch(/counterexample/i);
    });

    it("labels reused and newly authored checks distinctly", () => {
        expect(reuseLabel(true)).toBe("Reused saved check");
        expect(reuseLabel(false)).toBe("New check authored");
    });

    it("shows template approval separately from sampled qualification", () => {
        expect(templateApprovalLabel("approved")).toBe("Approved");
        expect(templateApprovalLabel("rejected")).toBe("Rejected");
        expect(templateApprovalLabel("unreviewed")).toBe("Awaiting review");
    });
});

describe("draft provenance", () => {
    it("drops credential-like keys before display", () => {
        expect(
            safeProvenance({
                role: "check-author",
                api_key: "hidden",
                nested: { token: "hidden", model: "configured-model" },
            }),
        ).toEqual({
            role: "check-author",
            nested: { model: "configured-model" },
        });
        expect(safeProvenance(null)).toBeNull();
    });
});

describe("approval and generation gating", () => {
    it("requires ready template and check digests plus both sampled qualifications", () => {
        expect(canApproveTemplate(template())).toBe(true);
        expect(canApproveTemplate(template({ check: null }))).toBe(false);
        expect(canApproveTemplate(template({ template: null }))).toBe(false);
        expect(
            canApproveTemplate(
                template({ check: { ...check, qualification: { ...passed, status: "failed" } } }),
            ),
        ).toBe(false);
        expect(
            canApproveTemplate(
                template({ qualification: { ...passed, status: "inconclusive" } }),
            ),
        ).toBe(false);
        expect(canApproveTemplate(template({ status: "needs_review" }))).toBe(false);
    });

    it("explains approval and rejection gates explicitly", () => {
        expect(approveBlockReason(template())).toBeNull();
        expect(approveBlockReason(template({ check: null }))).toBe(
            "Approve unavailable: no qualified check.",
        );
        expect(approveBlockReason(template({ status: "error" }))).toMatch(
            /authoring error/i,
        );
        expect(rejectBlockReason(template())).toBeNull();
        expect(rejectBlockReason(template({ check: null }))).toBeNull();
        expect(
            rejectBlockReason(template({ template_sha256: "" })),
        ).toMatch(/template digest/i);
    });

    it("blocks generation until the exact ready template is approved", () => {
        expect(generationBlockReason(template({ approval: "approved" }))).toBeNull();
        expect(generationBlockReason(template())).toMatch(/approve/i);
        expect(generationBlockReason(template({ approval: "rejected" }))).toMatch(
            /approve/i,
        );
        expect(generationBlockReason(template({ status: "needs_review" }))).toMatch(
            /ready/i,
        );
        expect(generationBlockReason(template({ check: null }))).toMatch(/check/i);
    });
});

describe("check pilot errors", () => {
    it("uses safe private-library wording for missing artifacts", () => {
        expect(
            getCheckPilotErrorMessage(
                new ApiError(404, "Check template not found"),
                "fallback",
            ),
        ).toBe("This private template or check was not found or is not yours.");
    });

    it("explains stale digests and shows server validation detail", () => {
        expect(
            getCheckPilotErrorMessage(
                new ApiError(409, "template digest does not match"),
                "fallback",
            ),
        ).toMatch(/changed|stale/i);
        expect(
            getCheckPilotErrorMessage(
                new ApiError(422, "prompt must be at most 4000 characters"),
                "fallback",
            ),
        ).toBe("prompt must be at most 4000 characters");
    });

    it("does not leak an object detail into the UI", () => {
        expect(
            getCheckPilotErrorMessage(
                new ApiError(422, JSON.stringify([{ loc: ["body", "prompt"] }]) as never),
                "fallback",
            ),
        ).toBe("The request could not be checked. Review the form and try again.");
    });
});
