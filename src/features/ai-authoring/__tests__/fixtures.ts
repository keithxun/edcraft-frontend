import type { ProviderConnectionResponse, UserResponse } from "@/api/models";
import type {
    AuthoringBatch,
    AuthoringCapabilities,
    AuthoringCheck,
    AuthoringJob,
    AuthoringPreview,
    AuthoringQuestionPayload,
    AuthoringReview,
    CodeQuestionInstance,
    MathQuestionInstance,
    MathTemplateCandidate,
} from "../types";

const digest = "a".repeat(64);

export function makeUser(id: string, name = "Test User"): UserResponse {
    return {
        id,
        name,
        email: `${id}@example.com`,
        created_at: "2026-11-03T00:00:00Z",
        updated_at: "2026-11-03T00:00:00Z",
    };
}

const passedTechnicalCheck: AuthoringCheck = {
    tool: "code_require_features",
    status: "passed",
    advisory: false,
    findings: [],
    error: null,
};

const failedAdvisoryCheck: AuthoringCheck = {
    tool: "difficulty_assessment",
    status: "failed",
    advisory: true,
    findings: [
        {
            code: "DIFFICULTY_MISMATCH",
            message: "Estimated difficulty is harder than requested.",
            field: "difficulty",
        },
    ],
    error: null,
};

const failedTechnicalCheck: AuthoringCheck = {
    tool: "code_validate_answers_and_distractors",
    status: "failed",
    advisory: false,
    findings: [
        {
            code: "SAMPLE_EXECUTION_FAILED",
            message: "A sampled example failed to execute.",
            field: "code",
        },
    ],
    error: null,
};

export const capabilities: AuthoringCapabilities = {
    enabled_domains: ["code"],
    difficulty_labels: ["easy", "medium", "hard"],
    model_profiles: [
        {
            id: "default",
            label: "Default authoring model",
            provider: "openai",
            model: "configured-model",
        },
    ],
    judge: {
        label: "Default judge",
        provider: "openai",
        model: "configured-judge",
    },
    max_quantity: 50,
    min_distractors: 1,
    max_distractors: 10,
    default_distractors: 3,
};

export const connection: ProviderConnectionResponse = {
    id: "connection-1",
    name: "My OpenAI",
    kind: "openai",
    base_url: "https://api.example.com/v1",
    default_model: "gpt-test",
    models: ["gpt-test", "gpt-other"],
    enabled: true,
    key_last4: "1234",
    has_api_key: true,
    verified_at: "2026-11-03T00:00:00Z",
    created_at: "2026-11-03T00:00:00Z",
    updated_at: "2026-11-03T00:00:00Z",
};

export const connectionCapabilities: AuthoringCapabilities = {
    ...capabilities,
    model_profiles: [],
    connections: [connection],
};

export const previewInstance: CodeQuestionInstance = {
    template_id: "list-sum",
    artifact_id: "artifact-1",
    seed: 0,
    parameters: { values: [1, 2, 3] },
    question: {
        code: "def total(values):\n    return sum(values)",
        entry_function: "total",
        inputs: { values: [1, 2, 3] },
        question: "What does total([1, 2, 3]) return?",
        proposed_answer: 6,
        distractors: [5, 7],
        distractor_reasons: ["Adds only the first two values.", "Counts one extra value."],
        answer_target: "return_value",
        question_type: "mcq",
    },
    requires_manual_review: true,
};

export const preview: AuthoringPreview = {
    job_id: "job-1",
    domain: "code",
    artifact_id: "artifact-1",
    artifact_sha256: digest,
    seed: 0,
    question: previewInstance,
};

/**
 * A non-code payload used to exercise the generic renderer seam. It only uses
 * the shared question/choice envelope; no code block or inputs.
 */
export const stubQuestionInstance: AuthoringQuestionPayload = {
    template_id: "stub-evens",
    artifact_id: "artifact-stub",
    seed: 2,
    question: {
        question: "Which of these numbers is even?",
        question_type: "mcq",
        proposed_answer: 4,
        distractors: [3, 5],
        distractor_reasons: ["Three is odd.", "Five is odd."],
    },
};

export const stubPreview: AuthoringPreview = {
    ...preview,
    domain: "stub",
    question: stubQuestionInstance,
};

export const approvedReview: AuthoringReview = {
    job_id: "job-1",
    state: "completed",
    artifact_id: "artifact-1",
    artifact_sha256: digest,
    library_revision: "db74f1700d78bd13b3f5f10e9d89bc2f85ad2591",
    request: {
        prompt: "Write a question about summing a list.",
        difficulty: "easy",
        num_distractors: 3,
        domain: "code",
        model_profile: "default",
    },
    template: {
        template_id: "list-sum",
        language: "python",
        candidate: {
            template_id: "list-sum",
            difficulty: "easy",
            code: "def list_sum(values):\n    return sum(values)",
            entry_function: "list_sum",
            parameters: [
                {
                    name: "values",
                    kind: "integer_list",
                    values: [[1, 2], [3, 4]],
                },
            ],
            question_template: "What does list_sum({values}) return?",
            answer_target: "return_value",
            answer_expression: "sum(values)",
            distractors: [
                {
                    expression: "len(values)",
                    reason_template: "Confuses the list length with its sum.",
                },
                {
                    expression: "max(values)",
                    reason_template: "Returns the largest value instead of the sum.",
                },
            ],
            question_type: "mcq",
        },
    },
    checks: [passedTechnicalCheck, failedAdvisoryCheck],
    attempts: [
        {
            number: 1,
            candidate: null,
            pending: [],
            complete: true,
            passed: true,
            checks: [passedTechnicalCheck, failedAdvisoryCheck],
        },
    ],
    fixed_plan: ["Generate a template", "Run sampled checks"],
    validation_limits: {
        validator_version: "mcp-code-template-v2",
        checking_mode: "property_based",
        examples_checked: 12,
        execution_calls: 20,
        max_examples: 25,
        max_execution_calls: 40,
        timeout_seconds: 10,
        seed: 99,
    },
    candidate: null,
    difficulty: {
        advisory: true,
        assessment_path: "decision",
        requested_difficulty: "easy",
        estimated_difficulty: "hard",
        confidence: null,
        confidence_source: null,
        decision: "advisory_mismatch",
        status: "failed",
        reason: "Estimated difficulty is harder than requested.",
        error_code: null,
    },
    relevance: {
        advisory: true,
        status: "unavailable",
        unavailable: true,
        score: null,
        threshold: null,
        relevant: null,
        reason: "Judge unavailable.",
        error_code: "ASSESSMENT_UNAVAILABLE",
    },
    warnings: ["DIFFICULTY_MISMATCH", "ADVISORY_ASSESSMENT_UNAVAILABLE"],
    approval: {
        decision: "approved",
        artifact_sha256: digest,
        reviewer: "teacher@example.com",
        note: null,
        decided_at: "2026-11-03T00:00:00Z",
    },
    error: null,
};

/**
 * Stub-domain review with a generic template candidate. The payload
 * deliberately contains a `code` key to prove the generic view does not treat
 * arbitrary fields as code.
 */
export const stubReview: AuthoringReview = {
    ...approvedReview,
    artifact_id: null,
    artifact_sha256: null,
    request: {
        ...approvedReview.request,
        domain: "stub",
        prompt: "Write a question about even numbers.",
    },
    template: {
        template_id: "stub-evens",
        candidate: {
            template_id: "stub-evens",
            question_template: "Which of these numbers is even?",
            answer_expression: "4",
            code: "even(4)",
            distractors: [
                {
                    expression: "3",
                    reason_template: "Three is odd.",
                },
            ],
        } as Record<string, unknown>,
    },
    candidate: null,
    approval: null,
};

export const technicalFailureReview: AuthoringReview = {
    ...approvedReview,
    checks: [failedTechnicalCheck, failedAdvisoryCheck],
    attempts: [
        {
            number: 1,
            candidate: null,
            pending: [],
            complete: true,
            passed: false,
            checks: [failedTechnicalCheck, failedAdvisoryCheck],
        },
    ],
    approval: null,
    difficulty: null,
    relevance: null,
};

export const unapprovedReview: AuthoringReview = {
    ...approvedReview,
    approval: null,
};

export const completedJob: AuthoringJob = {
    job_id: "job-1",
    state: "completed",
    progress: { phase: "finalizing", attempt: 1 },
    result: {
        status: "checked",
        domain: "code",
        provider: "openai",
        model: "configured-model",
        artifact_id: "artifact-1",
        approval: "unreviewed",
        difficulty: approvedReview.difficulty,
        relevance: approvedReview.relevance,
        checks: (approvedReview.checks ?? []).map((check) => ({
            tool: check.tool,
            status: check.status,
            advisory: check.advisory,
            findings: (check.findings ?? []).map((finding) => finding.message),
        })),
        warnings: approvedReview.warnings ?? [],
        error: null,
    },
    created_at: "2026-11-03T00:00:00Z",
    approval: approvedReview.approval ?? null,
    error: null,
};

export const failedJob: AuthoringJob = {
    ...completedJob,
    state: "failed",
    progress: null,
    result: null,
    approval: null,
    error: {
        code: "AUTHORING_FAILED",
        message: "The authoring model did not respond.",
    },
};

export const failedReview: AuthoringReview = {
    ...approvedReview,
    state: "failed",
    artifact_id: null,
    artifact_sha256: null,
    template: null,
    checks: [],
    attempts: [],
    fixed_plan: [],
    validation_limits: null,
    candidate: null,
    difficulty: null,
    relevance: null,
    warnings: [],
    approval: null,
    error: {
        code: "AUTHORING_FAILED",
        message: "The authoring model did not respond.",
    },
};

export const needsReviewJob: AuthoringJob = {
    ...completedJob,
    result: completedJob.result
        ? {
              ...completedJob.result,
              status: "needs_review",
              artifact_id: null,
              error: {
                  code: "TEMPLATE_CHECKS_FAILED",
                  message: "The generated template failed technical checks.",
              },
          }
        : null,
};

export const needsReviewReview: AuthoringReview = {
    ...failedReview,
    state: "completed",
    checks: [failedTechnicalCheck, failedAdvisoryCheck],
    attempts: [
        {
            number: 1,
            candidate: approvedReview.template?.candidate ?? null,
            pending: [],
            complete: true,
            passed: false,
            checks: [failedTechnicalCheck, failedAdvisoryCheck],
        },
    ],
    candidate: approvedReview.template?.candidate ?? null,
    candidate_is_historical_attempt: true,
    error: {
        code: "TEMPLATE_CHECKS_FAILED",
        message: "The generated template failed technical checks.",
    },
};

export const batch: AuthoringBatch = {
    format_version: "1",
    job_id: "job-1",
    domain: "code",
    artifact_id: "artifact-1",
    artifact_sha256: digest,
    base_seed: 7,
    requested_quantity: 3,
    actual_quantity: 3,
    distinct_count: 2,
    duplicates: 1,
    questions: [
        previewInstance,
        { ...previewInstance, seed: 8 },
        { ...previewInstance, seed: 9 },
    ],
    warnings: ["Finite parameter domain produced 1 duplicate."],
};

export const stubBatch: AuthoringBatch = {
    ...batch,
    domain: "stub",
    questions: [
        stubQuestionInstance,
        { ...stubQuestionInstance, seed: 3 } as AuthoringQuestionPayload,
    ],
};

/** A math question uses a flat envelope instead of the code question object. */
export const mathQuestionInstance: MathQuestionInstance = {
    template_id: "linear-one-step",
    artifact_id: "artifact-math",
    seed: 4,
    parameters: { a: 2, b: 1, c: 5 },
    equation: "2x + 1 = 5",
    question: "Solve for x.",
    choices: ["2", "3", "-2"],
    correct_index: 0,
    answer: "2",
    requires_manual_review: true,
};

export const mathPreview: AuthoringPreview = {
    ...preview,
    domain: "math",
    artifact_id: "artifact-math",
    question: mathQuestionInstance,
};

export const mathTemplateCandidate: MathTemplateCandidate = {
    template_id: "linear-one-step",
    difficulty: "easy",
    question_type: "mcq",
    equation_template: "{a}x + {b} = {c}",
    question_template: "Solve for x.",
    parameters: [
        { name: "a", values: [2, 3] },
        { name: "b", values: [1, 4] },
        { name: "c", values: [5, 7] },
    ],
    answer_expression: "(c - b) / a",
    distractors: [
        {
            expression: "c - b",
            reason_template: "Forgets to divide by the coefficient of x.",
        },
        {
            expression: "c + b",
            reason_template: "Adds the constant instead of subtracting it.",
        },
    ],
};

export const mathReview: AuthoringReview = {
    ...approvedReview,
    artifact_id: "artifact-math",
    request: {
        ...approvedReview.request,
        domain: "math",
        prompt: "Write a one-step linear equation question.",
    },
    template: {
        template_id: "linear-one-step",
        candidate: mathTemplateCandidate,
    },
    candidate: null,
};

export const mathBatch: AuthoringBatch = {
    ...batch,
    domain: "math",
    artifact_id: "artifact-math",
    questions: [mathQuestionInstance, { ...mathQuestionInstance, seed: 5 }],
};
