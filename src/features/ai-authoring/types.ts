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
// The generated request makes domain optional; the authoring form always
// supplies one, so keep it required for callers.
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

/** What a code template's answer is measured against. */
export type CodeTemplateCandidateAnswerTarget =
    | "return_value"
    | "loop_iterations"
    | "loop_executions"
    | "branch_executions"
    | "function_calls";

export type CodeTemplateCandidateDifficulty = "easy" | "medium" | "hard";

/** A deterministic misconception applied to concrete parameter values. */
export interface DistractorRecipe {
    expression: string;
    reason_template: string;
}

export type FiniteParameterKind = "integer" | "boolean" | "string" | "integer_list";

/** A limited set of allowed values sampled during property-based checking. */
export interface FiniteParameter {
    kind: FiniteParameterKind;
    name: string;
    values: Array<number | boolean | string | number[]>;
}

/**
 * The code-domain template contract. The backend now sends candidates as open
 * objects, so the frontend owns this shape and the type guards narrow to it.
 */
export interface CodeTemplateCandidate {
    answer_expression: string;
    answer_target: CodeTemplateCandidateAnswerTarget;
    code: string;
    difficulty: CodeTemplateCandidateDifficulty;
    distractors: DistractorRecipe[];
    entry_function: string;
    parameters: FiniteParameter[];
    question_template: string;
    question_type: "mcq";
    template_id: string;
    topic?: "arithmetic" | "conditionals" | "loops" | "functions" | "lists" | null;
}

export type CodeQuestionInstanceParameters = {
    [key: string]: number | boolean | string | number[];
};

/** A deterministic question expanded from a validated code template. */
export interface GeneratedQuestion {
    answer_target?: CodeTemplateCandidateAnswerTarget;
    code: string;
    distractor_reasons?: string[];
    distractors: unknown[];
    entry_function: string;
    inputs: Record<string, unknown>;
    proposed_answer: unknown;
    question: string;
    question_type?: "mcq";
}

/** A reproducible code question expanded from a validated template. */
export interface CodeQuestionInstance {
    artifact_id?: string | null;
    parameters: CodeQuestionInstanceParameters;
    question: GeneratedQuestion;
    requires_manual_review?: true;
    seed: number;
    template_id: string;
}

/** A code template or an opaque candidate from another domain. */
export type AuthoringTemplateCandidate =
    | CodeTemplateCandidate
    | IrMathTemplateCandidate
    | Record<string, unknown>;
export type ReviewTemplate = Omit<ApiReviewTemplate, "candidate"> & {
    candidate: AuthoringTemplateCandidate;
};
export type ValidationLimits = ApiValidationLimits;
export type AuthoringRequest = AuthoringReviewResponse["request"];
export type AuthoringReview = Omit<
    AuthoringReviewResponse,
    "request" | "candidate" | "attempts" | "template"
> & {
    request: AuthoringRequest;
    candidate?: AuthoringTemplateCandidate | null;
    attempts?: ReviewAttempt[];
    template?: ReviewTemplate | null;
};

/**
 * A flattened math question from the mathematics domain. The backend sends
 * this as a flat object rather than the code question envelope.
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

/** A generic-IR math template candidate. */
export type IrMathTemplateCandidate = {
    template_id: string;
    difficulty: string;
    question_type: "mcq";
    item: MathIrTemplate;
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
