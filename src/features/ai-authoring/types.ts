// UI-facing aliases for the generated AI authoring API models. The backend
// remains authoritative; normalization only adds optional defaults where the UI
// needs them. Generated models are never edited by hand.
import type {
    ApprovalRequest,
    AuthoringCapabilitiesResponse,
    AuthoringJudgeSelections,
    AuthoringJobStatusResponse,
    AuthoringJobStatusResponseState,
    AuthoringJobSummary as ApiAuthoringJobSummary,
    AuthoringJobSubmittedResponse,
    AuthoringModelProfile as ApiAuthoringModelProfile,
    AuthoringReviewResponse,
    AuthoringSummary,
    CodeQuestionInstance as ApiCodeQuestionInstance,
    CodeTemplateCandidate,
    DifficultyOutcome,
    GenerateRequest,
    GeneratedQuestionsBatch,
    GenerationMetadata as ApiGenerationMetadata,
    PreviewResponse,
    RelevanceOutcome,
    ReviewAttempt as ApiReviewAttempt,
    ReviewCheck,
    ReviewTemplate as ApiReviewTemplate,
    StoredReviewerApproval,
    SubmitAuthoringJobRequest,
    SubmitAuthoringJobRequestDifficulty,
    ValidationLimits as ApiValidationLimits,
} from "@/api/models";

export type AuthoringDifficulty = SubmitAuthoringJobRequestDifficulty;
export type AuthoringJobState = AuthoringJobStatusResponseState;
export type ApprovalDecision = StoredReviewerApproval["decision"];

export type AuthoringCapabilities = Omit<AuthoringCapabilitiesResponse, "enabled_domains"> & {
    enabled_domains: string[];
};
export type AuthoringModelProfile = ApiAuthoringModelProfile;
export type CreateAuthoringJobRequest = Omit<SubmitAuthoringJobRequest, "domain"> & {
    domain: string;
};
export type CreatedAuthoringJob = AuthoringJobSubmittedResponse;
export type AuthoringApproval = StoredReviewerApproval;
export type AuthoringCheck = ReviewCheck;
export type AuthoringDifficultyOutcome = DifficultyOutcome;
export type AuthoringRelevanceOutcome = RelevanceOutcome;
export type AuthoringResult = AuthoringSummary;
export type AuthoringJob = AuthoringJobStatusResponse;
export type AuthoringJobSummary = ApiAuthoringJobSummary;
export type ReviewAttempt = Omit<ApiReviewAttempt, "candidate"> & {
    candidate?: AuthoringTemplateCandidate | null;
};
/** A code template or an opaque candidate from another domain. */
export type AuthoringTemplateCandidate =
    | CodeTemplateCandidate
    | MathTemplateCandidate
    | Record<string, unknown>;
export type ReviewTemplate = Omit<ApiReviewTemplate, "candidate"> & {
    candidate: AuthoringTemplateCandidate;
};
export type ValidationLimits = ApiValidationLimits;
export type AuthoringRequest = Omit<AuthoringReviewResponse["request"], "domain"> & {
    domain: string;
};
export type AuthoringReview = Omit<
    AuthoringReviewResponse,
    "request" | "candidate" | "attempts" | "template"
> & {
    request: AuthoringRequest;
    candidate?: AuthoringTemplateCandidate | null;
    attempts?: ReviewAttempt[];
    template?: ReviewTemplate | null;
};
export type CodeQuestionInstance = ApiCodeQuestionInstance;

/**
 * A bounded linear-equation question from the mathematics domain. The backend
 * sends this as a flat object rather than the code question envelope.
 */
export type MathQuestionInstance = {
    template_id: string;
    artifact_id?: string | null;
    seed: number;
    parameters: Record<string, number>;
    equation: string;
    question: string;
    choices: string[];
    correct_index: number;
    answer: string;
    requires_manual_review?: true;
};

export type MathParameter = {
    name: string;
    values: number[];
};

export type MathDistractor = {
    expression: string;
    reason_template: string;
};

/** A mathematics template candidate (the equation analogue of code). */
export type MathTemplateCandidate = {
    template_id: string;
    difficulty: string;
    question_type: "mcq";
    equation_template: string;
    question_template: string;
    parameters: MathParameter[];
    answer_expression: string;
    distractors: MathDistractor[];
};

/** A deterministic question from any domain; code and math are two shapes. */
export type AuthoringQuestionPayload =
    | CodeQuestionInstance
    | MathQuestionInstance
    | Record<string, unknown>;
export type AuthoringPreview = Omit<PreviewResponse, "question"> & {
    domain: string;
    question: AuthoringQuestionPayload;
};
export type AuthoringBatch = Omit<GeneratedQuestionsBatch, "questions"> & {
    domain: string;
    questions: AuthoringQuestionPayload[];
};
export type ApprovalInput = ApprovalRequest;
export type GenerateInput = GenerateRequest;
export type GenerationMetadata = ApiGenerationMetadata;

/** Values carried from a failed job into the start-page form. */
export interface AuthoringRetryPrefill {
    prompt: string;
    difficulty: AuthoringDifficulty;
    num_distractors: number;
    model_profile?: string | null;
    connection_id?: string | null;
    model?: string | null;
    judges?: AuthoringJudgeSelections | null;
}
