// Exact wire contract for the private reusable-maths-check pilot.
// These names and field spellings are frozen by SPEC.md and must not be
// renamed. The backend/AI models are authoritative; this file is a local typed
// client shape rather than a hand-edited generated API module.

export type QualificationStatus = "passed" | "failed" | "inconclusive" | "error";
export type QualificationPhase = "compilation" | "sampling";

export interface CheckRef {
    check_id: string;
    version: string;
    sha256: string;
}

export interface Qualification {
    status: QualificationStatus;
    // Older backend records omit the phase; they are sampled qualifications.
    phase?: QualificationPhase;
    checking_mode: "property_based";
    accepted_cases: number;
    execution_calls: number;
    seed: number;
    max_examples: number;
    max_execution_calls: number;
    timeout_seconds: number;
    counterexample: Record<string, unknown> | null;
    findings: string[];
    versions: Record<string, string>;
}

export interface CheckRecord {
    check_ref: CheckRef;
    title: string;
    description: string;
    scope: Record<string, unknown>;
    definition: Record<string, unknown>;
    qualification: Qualification;
    provenance: Record<string, unknown>;
    created_at: string;
}

export type PilotTemplateStatus = "ready" | "needs_review" | "error";
export type PilotApprovalDecision = "unreviewed" | "approved" | "rejected";
export type PilotSelectionSource = "saved" | "authored";

/**
 * Structured model planning metadata. The application validates the contract
 * and reference; the UI only displays the decision for human review. Older
 * records predate this additive field and may omit it or store null.
 */
export interface PilotSelection {
    contract_id: string;
    reason: string;
    source: PilotSelectionSource;
    check_ref: CheckRef | null;
}

export interface PilotTemplateRecord {
    template_id: string;
    template_sha256: string;
    prompt: string;
    status: PilotTemplateStatus;
    approval: PilotApprovalDecision;
    reused_check: boolean;
    // Additive planning metadata. Legacy records omit it; failed drafts may
    // store null because no contract was accepted.
    selection?: PilotSelection | null;
    check: CheckRecord | null;
    template: Record<string, unknown> | null;
    qualification: Qualification | null;
    findings: string[];
    created_at: string;
    // Additive diagnostics added by the validator for draft inspection. A failed
    // draft has check/template/qualification as null but retains these fields.
    scope?: Record<string, unknown> | null;
    provenance?: Record<string, unknown> | null;
    check_qualification?: Qualification | null;
}

export interface PilotQuestion {
    question: string;
    expression: string;
    choices: string[];
    correct_index: number;
    answer: string;
    parameters: Record<string, number | string>;
    check_ref: CheckRef;
}

export interface PilotBatch {
    template_id: string;
    seed: number;
    questions: PilotQuestion[];
    requested_quantity: number;
    shortfall: number;
    findings: string[];
}

export interface CreatePilotTemplateInput {
    prompt: string;
    model_profile?: string;
    connection_id?: string;
    model?: string;
    num_distractors?: number;
}

export interface PilotApprovalInput {
    template_sha256: string;
    check_sha256: string;
    decision: "approved" | "rejected";
}

export interface PilotGenerateInput {
    seed: number;
    quantity: number;
}
