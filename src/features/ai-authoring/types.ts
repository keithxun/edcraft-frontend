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
    // Backend may omit this until the combined check-pilot bound is deployed.
    check_pilot_timeout_seconds?: number | null;
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
    parameters: Record<string, number | string>;
    equation: string;
    question: string;
    choices: string[];
    correct_index: number;
    answer: string;
    topic?: string | null;
    requires_manual_review?: true;
};

export type MathParameter = {
    name: string;
    values: Array<number | string>;
};

export type MathDistractor = {
    expression: string;
    reason_template: string;
};

/** One node of the generic IR expression tree. */
export type MathIrExpression = {
    num?: string;
    sym?: string;
    param?: string;
    op?: string;
    args?: MathIrExpression[];
};

export type MathIrDistractor = {
    value?: MathIrExpression | null;
    components?: MathIrExpression[];
    items?: MathIrExpression[];
    misconception: string;
    reason?: string;
};

export type MathIrRelation = {
    kind?: string;
    lhs: MathIrExpression;
    rhs: MathIrExpression;
};

export type MathIrGiven = {
    id: string;
    kind?: string;
    relation?: MathIrRelation | null;
    symbol?: string | null;
    domain?: string | null;
    values?: string[];
};

export type MathIrGoal = {
    kind: string;
    symbol?: string | null;
    symbols?: string[];
    expr?: MathIrExpression | null;
    point?: MathIrExpression | null;
    order?: number;
    matrix?: MathIrExpression[][] | null;
};

export type MathIrRecipeInterval = {
    lower?: MathIrExpression | null;
    upper?: MathIrExpression | null;
    lower_open?: boolean;
    upper_open?: boolean;
};

/** The authored answer, graded by the engine rather than derived by a solver. */
export type MathIrAnswerRecipe = {
    kind: "numeric" | "expression" | "set" | "tuple" | "interval" | "matrix" | "boolean";
    items?: MathIrExpression[];
    interval?: MathIrRecipeInterval | null;
    matrix?: MathIrExpression[][] | null;
    boolean?: boolean | null;
    display?: string;
};

/** A reusable generic IR item family authored by the model. */
export type MathIrTemplate = {
    schema_version: string;
    topic: string;
    parameters: Array<{ name: string; values: string[] }>;
    body: {
        schema_version?: string;
        topic: string;
        symbols?: Array<{ name: string; domain?: string }>;
        givens?: MathIrGiven[];
        text: { mode: string; template: string };
        goal: MathIrGoal;
        answer_recipe?: MathIrAnswerRecipe | null;
        distractors: MathIrDistractor[];
    };
};

/** A legacy linear-equation template candidate. */
export type LegacyMathTemplateCandidate = {
    template_id: string;
    difficulty: string;
    question_type: "mcq";
    equation_template: string;
    question_template: string;
    parameters: MathParameter[];
    answer_expression: string;
    distractors: MathDistractor[];
};

/** A generic-IR template candidate. */
export type IrMathTemplateCandidate = {
    template_id: string;
    difficulty: string;
    question_type: "mcq";
    item: MathIrTemplate;
};

/** A mathematics template candidate in either authoring mode. */
export type MathTemplateCandidate =
    | LegacyMathTemplateCandidate
    | IrMathTemplateCandidate;

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
