// UI-facing aliases for the generated AI authoring API models. The backend
// remains authoritative, and normalization only adds optional defaults where
// the UI needs them. Generated models are never edited by hand.
import type {
    ApprovalRequest,
    AuthoringMaterials,
    AuthoringCapabilitiesResponse,
    AuthoringJudgeSelections,
    AuthoringJobStatusResponse,
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
    ReviewCasePreview as ApiReviewCasePreview,
    ReviewTemplate as ApiReviewTemplate,
    StoredReviewerApproval,
    SubmitAuthoringJobRequest,
    SubmitAuthoringJobRequestDifficulty,
    ValidationLimits as ApiValidationLimits,
} from "@/api/models";

export type AuthoringDifficulty = SubmitAuthoringJobRequestDifficulty;
export type ApprovalDecision = StoredReviewerApproval["decision"];

export type AuthoringCapabilities = Omit<AuthoringCapabilitiesResponse, "enabled_domains"> & {
    enabled_domains: string[];
    syllabus_prompts?: Record<string, Record<string, string>>;
};
export type AuthoringModelProfile = ApiAuthoringModelProfile;
// The generated request makes domain optional, but the authoring form always
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
/**
 * The backend now sends `started_at` with the job. It stays optional so older
 * payloads keep rendering, and the UI falls back to `created_at`.
 */
export type AuthoringJob = AuthoringJobStatusResponse & {
    started_at?: string | null;
};
export type AuthoringJobSummary = ApiAuthoringJobSummary;

/**
 * The richer progress the backend sends. The UI reads `job.progress` through
 * this local view. New fields stay optional so older payloads keep rendering.
 */
export interface AuthoringProgressView {
    phase: "generating" | "checking" | "assessing" | "correcting" | "finalizing";
    attempt: number;
    max_attempts?: number | null;
    checks_total?: number | null;
    checks_done?: number | null;
    current_check?: string | null;
    phase_started_at?: string | null;
}

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
    | PhysicsTemplateCandidate
    | BiologyTemplateCandidate
    | ChemistryTemplateCandidate
    | Record<string, unknown>;

export type ReviewCasePreview = Omit<ApiReviewCasePreview, "stimulus"> & {
    stimulus?: Record<string, unknown> | null;
};
export type ReviewCaseKeyEvidence = NonNullable<ApiReviewCasePreview["key_evidence"]>[number];

export type ReviewTemplate = Omit<ApiReviewTemplate, "candidate" | "case_previews"> & {
    candidate: AuthoringTemplateCandidate;
    case_previews?: ReviewCasePreview[] | null;
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

/** One piece of a maths prompt, where `math` values are LaTeX and `text` is plain. */
export type MathQuestionSegment = {
    kind: "text" | "math";
    value: string;
};

/**
 * A flattened math question from the mathematics domain. The backend sends
 * this as a flat object rather than the code question envelope. The LaTeX
 * fields are optional so older payloads keep rendering as plain text.
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
    equation_latex?: string;
    choices_latex?: string[];
    answer_latex?: string;
    question_segments?: MathQuestionSegment[];
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

/** The gene a monohybrid genetics template is built around. */
export interface BiologyGene {
    symbol: string;
    dominant_phenotype: string;
    recessive_phenotype: string;
}

/** One allowed value set for a biology template parameter. */
export interface BiologyParameter {
    name: string;
    kind: string;
    values: string[];
}

/** What a biology question asks for, phrased as template parameter names. */
export interface BiologyQuestionSpec {
    quantity: string;
    target: { kind: string; param: string } | null;
    given: { phenotype: string } | null;
    offspring_count: string | null;
    ratio_kind: string | null;
}

/** One authored answer the engine should reproduce. */
export interface BiologyClaimedExample {
    parameters: Record<string, string>;
    answer: string;
}

/** A deterministic wrong choice with the misconception it captures. */
export interface BiologyDistractorRule {
    rule: string;
    misconception: string;
    reason?: string;
    value?: string | null;
}

interface BiologyItem {
    schema_version: string;
    topic: string;
    organism: string;
    trait: string;
    gene: BiologyGene;
    assumptions: Record<string, string | number>;
    parameters: BiologyParameter[];
    cross: { parent1: string; parent2: string };
    question: BiologyQuestionSpec;
    text: { template: string };
    answer_recipe: {
        rule: string;
        claimed_examples?: BiologyClaimedExample[];
    };
    distractors: BiologyDistractorRule[];
}

/** A monohybrid genetics template candidate from the biology domain. */
export interface BiologyTemplateCandidate {
    template_id: string;
    difficulty?: string;
    question_type: "mcq";
    item: BiologyItem;
}

/**
 * A generated monohybrid genetics question. Like maths, it is a flat envelope.
 * the cross and Punnett square make it distinct from a maths payload.
 */
export interface BiologyQuestionInstance {
    template_id: string;
    artifact_id?: string | null;
    seed: number;
    parameters: Record<string, string>;
    question: string;
    choices: string[];
    correct_index: number;
    answer: string;
    topic?: string | null;
    requires_manual_review?: true;
    cross: { parent1: string; parent2: string };
    gametes?: { parent1: string[]; parent2: string[] };
    punnett: string[][];
    genotype_distribution?: Record<string, string>;
    phenotype_distribution?: Record<string, string>;
}

/**
 * One node of a physics answer recipe. The backend sends a small arithmetic
 * tree over parameter names, matching the JSON contract rather than an
 * expression string.
 */
export interface PhysicsRecipeNode {
    param?: string | null;
    const?: string | null;
    op?: "add" | "sub" | "mul" | "div" | "neg" | null;
    args?: PhysicsRecipeNode[] | null;
}

export type PhysicsQuantity = "mass" | "force" | "acceleration";
export type PhysicsDirection = "positive" | "negative";
export type PhysicsAnswerForm = "signed_component" | "magnitude_and_direction" | "magnitude";
export type PhysicsTarget = "acceleration" | "net_force" | "mass" | "missing_force";

/** One finite parameter of a physics template, with its physical quantity. */
export interface PhysicsParameter {
    name: string;
    quantity: PhysicsQuantity | string;
    unit: string;
    values: string[];
}

/** A parameter that acts along the axis, with its signed-role direction. */
export interface PhysicsDirectedParameter {
    param: string;
    direction: PhysicsDirection;
    label?: string | null;
}

export interface PhysicsDistractor {
    recipe: PhysicsRecipeNode;
    misconception: string;
    explanation?: string | null;
}

export interface PhysicsTemplateItem {
    schema_version: string;
    topic: string;
    family_id?: string;
    rule?: string;
    axis?: {
        orientation?: string | null;
        positive: "right" | "left" | string;
    };
    parameters: PhysicsParameter[];
    body: {
        target: PhysicsTarget | string;
        mass?: string | null;
        net_force?: PhysicsDirectedParameter | null;
        forces?: PhysicsDirectedParameter[] | null;
        acceleration?: PhysicsDirectedParameter | null;
        unknown_force?: {
            direction: PhysicsDirection;
            label?: string | null;
        } | null;
        text: string;
        answer_form?: PhysicsAnswerForm | string | null;
        display?: { decimals?: number | null } | null;
        answer_recipe?: PhysicsRecipeNode | null;
        distractors?: PhysicsDistractor[] | null;
    };
}

/** A physics-1d template candidate authored by the backend. */
export type PhysicsTemplateCandidate = {
    template_id: string;
    difficulty: string;
    question_type: "mcq";
    item: PhysicsTemplateItem;
};
/** One coefficient and formula pair in a balanced chemistry equation. */
export interface ChemistryEquationTerm {
    coefficient: number;
    formula: string;
}

/** A balanced equation split into its reactant and product terms. */
export interface ChemistryStructuredEquation {
    reactants: ChemistryEquationTerm[];
    products: ChemistryEquationTerm[];
}

/** A deterministic multiple-choice question from the chemistry domain. */
export interface ChemistryQuestionInstance {
    template_id: string;
    artifact_id?: string | null;
    seed: number;
    parameters: Record<string, string>;
    reaction_id: string;
    question: string;
    choices: string[];
    correct_index: number;
    answer: string;
    requires_manual_review: true;
    choices_structured?: ChemistryStructuredEquation[] | null;
}

/** One reaction in the curated chemistry catalogue. */
export interface ChemistryReactionSnapshot {
    id: string;
    family: string;
    name: string;
    reactants: string[];
    products: string[];
    source: string;
    variants: Record<string, { slot: string; formula: string }>;
}

/**
 * One authored distractor recipe. Each kind is a deterministic recipe the
 * validator expands into an option, and the fields are the ones the validator
 * actually sends: a coefficient slot, a delta, a scale factor, two swapped
 * slots, or a named species variant.
 */
export type ChemistryDistractor =
    | {
          kind: "perturb_coefficient";
          slot: string;
          delta: number;
          misconception: string;
          reason?: string | null;
      }
    | {
          kind: "scale_balanced";
          factor: number;
          misconception: string;
          reason?: string | null;
      }
    | {
          kind: "skeleton_coefficients";
          misconception: string;
          reason?: string | null;
      }
    | {
          kind: "swap_coefficients";
          slot_a: string;
          slot_b: string;
          misconception: string;
          reason?: string | null;
      }
    | {
          kind: "swap_species";
          variant: string;
          misconception: string;
          reason?: string | null;
      }
    | {
          kind: "concept_alternative";
          index: number;
          misconception?: undefined;
          reason?: undefined;
      }
    | {
          kind: "yield_alternative";
          method: string;
          misconception?: undefined;
          reason?: string | null;
      };

/** One row of the options check, the evidence behind the rendered choices. */
export interface ChemistryOptionRow {
    reaction_id: string;
    asked_slot: string | null;
    option: number;
    recipe: Record<string, unknown>;
    misconception: string | null;
    rendered: string;
    verdict: "key" | "wrong" | "correct" | "unusable" | "duplicate";
    reason: Record<string, unknown>;
}

/** One row of the balance check, the checked coefficients for a reaction. */
export interface ChemistryBalanceRow {
    reaction_id: string;
    elements: string[];
    matrix: number[][];
    nullity: number;
    coefficients: number[];
    equation: string;
}

/** The authored chemistry template and the catalogue it draws reactions from. */
export interface ChemistryTemplateCandidate {
    template_id: string;
    difficulty: string;
    question_type: "mcq";
    item: {
        schema_version: string;
        family: string;
        parameters: (
            | { name: "reaction"; values: string[] }
            | { name: "species"; values: string[] }
            | { name: "context"; values: string[] }
            | { name: "reactant_1_mmol" | "reactant_2_mmol"; values: number[] }
        )[];
        target:
            | { kind: "balanced_equation" | "coefficient" | "concept" }
            | { kind: "theoretical_yield"; product: string };
        answer_recipe: { kind: "normalised_coefficients" | "concept_key" | "limiting_extent" };
        distractors: ChemistryDistractor[];
    };
    catalogue: {
        catalogue_version: string;
        catalogue_sha256: string;
        family: { id: string; title: string; description: string };
        reactions?: ChemistryReactionSnapshot[];
        contexts?: { id: string; question: string; topic: string }[];
    };
}

/** A deterministic question from any domain, where code, maths and sciences differ. */
export type AuthoringQuestionPayload =
    | CodeQuestionInstance
    | MathQuestionInstance
    | BiologyQuestionInstance
    | ChemistryQuestionInstance
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
    domain?: string;
    materials?: AuthoringMaterials | null;
    prompt: string;
    difficulty: AuthoringDifficulty;
    num_distractors: number;
    model_profile?: string | null;
    connection_id?: string | null;
    model?: string | null;
    judges?: AuthoringJudgeSelections | null;
}
