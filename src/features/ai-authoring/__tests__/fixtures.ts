import type { ProviderConnectionResponse, UserResponse } from "@/api/models";
import type {
    AuthoringBatch,
    AuthoringCapabilities,
    AuthoringCheck,
    AuthoringJob,
    AuthoringPreview,
    AuthoringQuestionPayload,
    AuthoringReview,
    BiologyQuestionInstance,
    BiologyTemplateCandidate,
    ChemistryBalanceRow,
    ChemistryOptionRow,
    ChemistryQuestionInstance,
    ChemistryTemplateCandidate,
    CodeQuestionInstance,
    CodeTemplateCandidate,
    IrMathTemplateCandidate,
    MathQuestionInstance,
    PhysicsTemplateCandidate,
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
    domain: "code",
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
    domain: "stub",
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

/**
 * A failed job whose latest attempt kept a draft. The review carries no
 * candidate at the top level, so the page has to read the attempts.
 */
export const failedWithDraftReview: AuthoringReview = {
    ...failedReview,
    state: "failed",
    attempts: [
        {
            number: 1,
            candidate: {
                ...(needsReviewReview.candidate as CodeTemplateCandidate),
                code: "def older_draft(values):\n    return len(values)",
                question_template: "What does older_draft({values}) return?",
            },
            pending: [],
            complete: true,
            passed: false,
            checks: [failedTechnicalCheck, failedAdvisoryCheck],
        },
        {
            number: 2,
            candidate: {
                ...(needsReviewReview.candidate as CodeTemplateCandidate),
                code: "def latest_draft(values):\n    return max(values)",
                question_template: "What does latest_draft({values}) return?",
            },
            pending: [],
            complete: true,
            passed: false,
            checks: [
                failedTechnicalCheck,
                {
                    tool: "code_verify_template_structure",
                    status: "failed",
                    advisory: false,
                    findings: [
                        {
                            code: "PLACEHOLDER_MISSING",
                            message: "The question template has no placeholder.",
                            field: "question_template",
                        },
                    ],
                    error: null,
                },
                failedAdvisoryCheck,
            ],
        },
    ],
    checks: [],
    candidate: null,
    error: {
        code: "GENERATION_ERROR",
        message: "The model could not produce a valid response. Try again or select another model.",
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

export const mathIrTemplateCandidate: IrMathTemplateCandidate = {
    template_id: "ir-quadratic",
    difficulty: "easy",
    question_type: "mcq",
    item: {
        schema_version: "math-ir/0.1",
        topic: "school.quadratic",
        parameters: [
            { name: "p", values: ["2", "3"] },
            { name: "q", values: ["-7", "-5"] },
        ],
        body: {
            topic: "school.quadratic",
            symbols: [{ name: "x", domain: "real" }],
            givens: [
                {
                    id: "equation",
                    kind: "relation",
                    relation: {
                        kind: "eq",
                        lhs: {
                            op: "add",
                            args: [
                                {
                                    op: "pow",
                                    args: [{ sym: "x" }, { num: "2" }],
                                },
                                {
                                    op: "mul",
                                    args: [
                                        {
                                            op: "sub",
                                            args: [
                                                { num: "0" },
                                                {
                                                    op: "add",
                                                    args: [
                                                        { param: "p" },
                                                        { param: "q" },
                                                    ],
                                                },
                                            ],
                                        },
                                        { sym: "x" },
                                    ],
                                },
                                { op: "mul", args: [{ param: "p" }, { param: "q" }] },
                            ],
                        },
                        rhs: { num: "0" },
                    },
                },
            ],
            text: { mode: "symbolic", template: "Solve {equation}." },
            goal: { kind: "solve", symbol: "x" },
            answer_recipe: {
                kind: "set",
                items: [{ param: "p" }, { param: "q" }],
            },
            distractors: [
                {
                    value: {
                        op: "sub",
                        args: [{ num: "0" }, { param: "p" }],
                    },
                    misconception: "SIGN_ERROR",
                    reason: "Flips the sign of one root",
                },
                {
                    value: { op: "add", args: [{ param: "p" }, { param: "q" }] },
                    misconception: "SUM_AS_ROOT",
                    reason: "Reports the sum of the roots as a root",
                },
            ],
        },
    },
};

export const mathIrReview: AuthoringReview = {
    ...approvedReview,
    domain: "math",
    artifact_id: "artifact-math-ir",
    request: {
        ...approvedReview.request,
        domain: "math",
        prompt: "Write a quadratic equation question.",
    },
    template: {
        template_id: "ir-quadratic",
        candidate: mathIrTemplateCandidate,
    },
    candidate: null,
};

export const mathBatch: AuthoringBatch = {
    ...batch,
    domain: "math",
    artifact_id: "artifact-math",
    questions: [mathQuestionInstance, { ...mathQuestionInstance, seed: 5 }],
};

/** A biology question is a flat envelope distinguished by its cross. */
export const biologyQuestionInstance: BiologyQuestionInstance = {
    template_id: "biology.hard.0123456789ab",
    artifact_id: "artifact-biology",
    seed: 7,
    parameters: { parent1: "Pp", parent2: "Pp", target: "Pp", n: "90" },
    question:
        "In a hypothetical flowering plant called the glimmerwort, purple petal colour is completely dominant over white. A Pp plant is crossed with a Pp plant. Of 90 offspring with purple petals, how many are expected to have genotype Pp?",
    choices: ["45", "60", "30", "90"],
    correct_index: 1,
    answer: "60",
    topic: "genetics.monohybrid.conditional_count",
    requires_manual_review: true,
    cross: { parent1: "Pp", parent2: "Pp" },
    gametes: { parent1: ["P", "p"], parent2: ["P", "p"] },
    punnett: [
        ["PP", "Pp"],
        ["Pp", "pp"],
    ],
    genotype_distribution: { PP: "1/4", Pp: "1/2", pp: "1/4" },
    phenotype_distribution: { purple: "3/4", white: "1/4" },
};

export const biologyPreview: AuthoringPreview = {
    ...preview,
    domain: "biology",
    artifact_id: "artifact-biology",
    seed: 7,
    question: biologyQuestionInstance,
};

export const biologyTemplateCandidate: BiologyTemplateCandidate = {
    template_id: "biology.hard.0123456789ab",
    difficulty: "hard",
    question_type: "mcq",
    item: {
        schema_version: "bio-mono/0.1",
        topic: "genetics.monohybrid.conditional_count",
        organism: "a hypothetical flowering plant called the glimmerwort",
        trait: "petal colour",
        gene: {
            symbol: "P",
            dominant_phenotype: "purple",
            recessive_phenotype: "white",
        },
        assumptions: {
            inheritance: "autosomal",
            dominance: "complete",
            segregation: "mendelian",
            allele_count: 2,
        },
        parameters: [
            { name: "parent1", kind: "genotype", values: ["Pp"] },
            { name: "parent2", kind: "genotype", values: ["Pp"] },
            { name: "target", kind: "genotype", values: ["Pp"] },
            { name: "n", kind: "count", values: ["30", "60", "90", "120"] },
        ],
        cross: { parent1: "parent1", parent2: "parent2" },
        question: {
            quantity: "expected_count",
            target: { kind: "genotype", param: "target" },
            given: { phenotype: "dominant" },
            offspring_count: "n",
            ratio_kind: null,
        },
        text: {
            template:
                "In {organism}, {dominant_phenotype} {trait} is completely dominant over {recessive_phenotype}. A {parent1} plant is crossed with a {parent2} plant. Of {n} offspring with {given_phenotype} petals, how many are expected to have genotype {target}?",
        },
        answer_recipe: {
            rule: "exact",
            claimed_examples: [
                {
                    parameters: {
                        parent1: "Pp",
                        parent2: "Pp",
                        target: "Pp",
                        n: "90",
                    },
                    answer: "60",
                },
            ],
        },
        distractors: [
            {
                rule: "unconditioned",
                misconception:
                    "unconditioned instead of conditioned probability",
                reason: "uses 1/2 of all offspring",
                value: null,
            },
            {
                rule: "complement",
                misconception: "counts homozygous dominant instead",
                reason: "1/3 of N",
                value: null,
            },
            {
                rule: "fixed_value",
                misconception: "every offspring",
                reason: "",
                value: "90",
            },
        ],
    },
};

export const biologyReview: AuthoringReview = {
    ...approvedReview,
    domain: "biology",
    artifact_id: "artifact-biology",
    request: {
        ...approvedReview.request,
        domain: "biology",
        prompt:
            "Write a genetics question about a cross of two heterozygous parents.",
    },
    template: {
        template_id: "biology.hard.0123456789ab",
        candidate: biologyTemplateCandidate,
    },
    candidate: null,
};

export const biologyBatch: AuthoringBatch = {
    ...batch,
    domain: "biology",
    artifact_id: "artifact-biology",
    questions: [biologyQuestionInstance, { ...biologyQuestionInstance, seed: 8 }],
};

/**
 * The genuine chemistry payloads. The values are copied exactly from
 * `__tests__/payloads/chemistry-equation.json` and
 * `__tests__/payloads/chemistry-coefficient.json`, which remain the source of
 * truth. JSON imports are not enabled for tsconfig.app.json, so the values are
 * typed here instead of imported.
 */

/** The check evidence shape ChemistryTemplateDetails reads: tool plus rows. */
export interface ChemistryEvidenceCheck {
    tool: string;
    details: { rows: Array<ChemistryBalanceRow | ChemistryOptionRow> };
}

export const chemistryEquationBalanceRows: ChemistryBalanceRow[] = [
    {
        reaction_id: "comb.methane",
        elements: ["C", "H", "O"],
        matrix: [
            [1, 0, -1, 0],
            [4, 0, 0, -2],
            [0, 2, -2, -1],
        ],
        nullity: 1,
        coefficients: [1, 2, 1, 2],
        equation: "CH4 + 2 O2 → CO2 + 2 H2O",
    },
    {
        reaction_id: "comb.propane",
        elements: ["C", "H", "O"],
        matrix: [
            [3, 0, -1, 0],
            [8, 0, 0, -2],
            [0, 2, -2, -1],
        ],
        nullity: 1,
        coefficients: [1, 5, 3, 4],
        equation: "C3H8 + 5 O2 → 3 CO2 + 4 H2O",
    },
];

export const chemistryEquationOptionRows: ChemistryOptionRow[] = [
    {
        reaction_id: "comb.methane",
        asked_slot: null,
        option: 0,
        recipe: { kind: "normalised_coefficients" },
        misconception: null,
        rendered: "CH4 + 2 O2 → CO2 + 2 H2O",
        verdict: "key",
        reason: {},
    },
    {
        reaction_id: "comb.methane",
        asked_slot: null,
        option: 1,
        recipe: {
            reason: null,
            kind: "perturb_coefficient",
            slot: "product:2",
            delta: 1,
            misconception: "unbalanced_element",
        },
        misconception: "unbalanced_element",
        rendered: "CH4 + 2 O2 → CO2 + 3 H2O",
        verdict: "wrong",
        reason: {
            code: "ELEMENT_UNBALANCED",
            element: "H",
            left: 4,
            right: 6,
        },
    },
    {
        reaction_id: "comb.methane",
        asked_slot: null,
        option: 2,
        recipe: {
            reason: null,
            kind: "scale_balanced",
            factor: 2,
            misconception: "non_reduced_coefficients",
        },
        misconception: "non_reduced_coefficients",
        rendered: "2 CH4 + 4 O2 → 2 CO2 + 4 H2O",
        verdict: "wrong",
        reason: {
            code: "NOT_REDUCED",
            divisor: 2,
        },
    },
    {
        reaction_id: "comb.methane",
        asked_slot: null,
        option: 3,
        recipe: {
            reason: null,
            kind: "swap_species",
            variant: "O2_as_O",
            misconception: "wrong_species",
        },
        misconception: "wrong_species",
        rendered: "CH4 + 4 O → CO2 + 2 H2O",
        verdict: "wrong",
        reason: {
            code: "SPECIES_CHANGED",
            slot: "reactant:2",
            expected: "O2",
            actual: "O",
        },
    },
    {
        reaction_id: "comb.propane",
        asked_slot: null,
        option: 0,
        recipe: { kind: "normalised_coefficients" },
        misconception: null,
        rendered: "C3H8 + 5 O2 → 3 CO2 + 4 H2O",
        verdict: "key",
        reason: {},
    },
    {
        reaction_id: "comb.propane",
        asked_slot: null,
        option: 1,
        recipe: {
            reason: null,
            kind: "perturb_coefficient",
            slot: "product:2",
            delta: 1,
            misconception: "unbalanced_element",
        },
        misconception: "unbalanced_element",
        rendered: "C3H8 + 5 O2 → 3 CO2 + 5 H2O",
        verdict: "wrong",
        reason: {
            code: "ELEMENT_UNBALANCED",
            element: "H",
            left: 8,
            right: 10,
        },
    },
    {
        reaction_id: "comb.propane",
        asked_slot: null,
        option: 2,
        recipe: {
            reason: null,
            kind: "scale_balanced",
            factor: 2,
            misconception: "non_reduced_coefficients",
        },
        misconception: "non_reduced_coefficients",
        rendered: "2 C3H8 + 10 O2 → 6 CO2 + 8 H2O",
        verdict: "wrong",
        reason: {
            code: "NOT_REDUCED",
            divisor: 2,
        },
    },
    {
        reaction_id: "comb.propane",
        asked_slot: null,
        option: 3,
        recipe: {
            reason: null,
            kind: "swap_species",
            variant: "O2_as_O",
            misconception: "wrong_species",
        },
        misconception: "wrong_species",
        rendered: "C3H8 + 10 O → 3 CO2 + 4 H2O",
        verdict: "wrong",
        reason: {
            code: "SPECIES_CHANGED",
            slot: "reactant:2",
            expected: "O2",
            actual: "O",
        },
    },
];

export const chemistryCoefficientBalanceRows: ChemistryBalanceRow[] = [
    {
        reaction_id: "hydrate.copper_sulfate",
        elements: ["Cu", "H", "O", "S"],
        matrix: [
            [1, -1, 0],
            [10, 0, -2],
            [9, -4, -1],
            [1, -1, 0],
        ],
        nullity: 1,
        coefficients: [1, 1, 5],
        equation: "CuSO4·5H2O → CuSO4 + 5 H2O",
    },
    {
        reaction_id: "hydrate.magnesium_sulfate",
        elements: ["H", "Mg", "O", "S"],
        matrix: [
            [14, 0, -2],
            [1, -1, 0],
            [11, -4, -1],
            [1, -1, 0],
        ],
        nullity: 1,
        coefficients: [1, 1, 7],
        equation: "MgSO4·7H2O → MgSO4 + 7 H2O",
    },
];

export const chemistryCoefficientOptionRows: ChemistryOptionRow[] = [
    {
        reaction_id: "hydrate.copper_sulfate",
        asked_slot: "product:2",
        option: 0,
        recipe: { kind: "normalised_coefficients" },
        misconception: null,
        rendered: "5",
        verdict: "key",
        reason: {},
    },
    {
        reaction_id: "hydrate.copper_sulfate",
        asked_slot: "product:2",
        option: 1,
        recipe: {
            reason: null,
            kind: "perturb_coefficient",
            slot: "asked",
            delta: 1,
            misconception: "unbalanced_element",
        },
        misconception: "unbalanced_element",
        rendered: "6",
        verdict: "wrong",
        reason: {
            code: "COEFFICIENT_DIFFERS",
            expected: 5,
            actual: 6,
        },
    },
    {
        reaction_id: "hydrate.copper_sulfate",
        asked_slot: "product:2",
        option: 2,
        recipe: {
            reason: null,
            kind: "scale_balanced",
            factor: 2,
            misconception: "non_reduced_coefficients",
        },
        misconception: "non_reduced_coefficients",
        rendered: "10",
        verdict: "wrong",
        reason: {
            code: "COEFFICIENT_DIFFERS",
            expected: 5,
            actual: 10,
        },
    },
    {
        reaction_id: "hydrate.magnesium_sulfate",
        asked_slot: "product:2",
        option: 0,
        recipe: { kind: "normalised_coefficients" },
        misconception: null,
        rendered: "7",
        verdict: "key",
        reason: {},
    },
    {
        reaction_id: "hydrate.magnesium_sulfate",
        asked_slot: "product:2",
        option: 1,
        recipe: {
            reason: null,
            kind: "perturb_coefficient",
            slot: "asked",
            delta: 1,
            misconception: "unbalanced_element",
        },
        misconception: "unbalanced_element",
        rendered: "8",
        verdict: "wrong",
        reason: {
            code: "COEFFICIENT_DIFFERS",
            expected: 7,
            actual: 8,
        },
    },
    {
        reaction_id: "hydrate.magnesium_sulfate",
        asked_slot: "product:2",
        option: 2,
        recipe: {
            reason: null,
            kind: "scale_balanced",
            factor: 2,
            misconception: "non_reduced_coefficients",
        },
        misconception: "non_reduced_coefficients",
        rendered: "14",
        verdict: "wrong",
        reason: {
            code: "COEFFICIENT_DIFFERS",
            expected: 7,
            actual: 14,
        },
    },
];

export const chemistryEquationChecks: ChemistryEvidenceCheck[] = [
    {
        tool: "chemistry_verify_balance",
        details: { rows: chemistryEquationBalanceRows },
    },
    {
        tool: "chemistry_verify_options",
        details: { rows: chemistryEquationOptionRows },
    },
];

export const chemistryCoefficientChecks: ChemistryEvidenceCheck[] = [
    {
        tool: "chemistry_verify_balance",
        details: { rows: chemistryCoefficientBalanceRows },
    },
    {
        tool: "chemistry_verify_options",
        details: { rows: chemistryCoefficientOptionRows },
    },
];

/** The two genuine equation questions; the first is the common fixture. */
export const chemistryEquationQuestionInstances: ChemistryQuestionInstance[] = [
    {
        template_id: "chemistry.medium.equation",
        artifact_id: null,
        seed: 0,
        parameters: {
            reaction: "comb.methane",
        },
        reaction_id: "comb.methane",
        question:
            "An alkane burns completely in oxygen to give carbon dioxide and water. Balance the equation CH4 + O2 → CO2 + H2O. Use the smallest whole-number coefficients.",
        choices: [
            "CH4 + 2 O2 → CO2 + 3 H2O",
            "2 CH4 + 4 O2 → 2 CO2 + 4 H2O",
            "CH4 + 2 O2 → CO2 + 2 H2O",
            "CH4 + 4 O → CO2 + 2 H2O",
        ],
        correct_index: 2,
        answer: "CH4 + 2 O2 → CO2 + 2 H2O",
        requires_manual_review: true,
        choices_structured: [
            {
                reactants: [
                    { coefficient: 1, formula: "CH4" },
                    { coefficient: 2, formula: "O2" },
                ],
                products: [
                    { coefficient: 1, formula: "CO2" },
                    { coefficient: 3, formula: "H2O" },
                ],
            },
            {
                reactants: [
                    { coefficient: 2, formula: "CH4" },
                    { coefficient: 4, formula: "O2" },
                ],
                products: [
                    { coefficient: 2, formula: "CO2" },
                    { coefficient: 4, formula: "H2O" },
                ],
            },
            {
                reactants: [
                    { coefficient: 1, formula: "CH4" },
                    { coefficient: 2, formula: "O2" },
                ],
                products: [
                    { coefficient: 1, formula: "CO2" },
                    { coefficient: 2, formula: "H2O" },
                ],
            },
            {
                reactants: [
                    { coefficient: 1, formula: "CH4" },
                    { coefficient: 4, formula: "O" },
                ],
                products: [
                    { coefficient: 1, formula: "CO2" },
                    { coefficient: 2, formula: "H2O" },
                ],
            },
        ],
    },
    {
        template_id: "chemistry.medium.equation",
        artifact_id: null,
        seed: 3,
        parameters: {
            reaction: "comb.propane",
        },
        reaction_id: "comb.propane",
        question:
            "An alkane burns completely in oxygen to give carbon dioxide and water. Balance the equation C3H8 + O2 → CO2 + H2O. Use the smallest whole-number coefficients.",
        choices: [
            "C3H8 + 5 O2 → 3 CO2 + 5 H2O",
            "2 C3H8 + 10 O2 → 6 CO2 + 8 H2O",
            "C3H8 + 10 O → 3 CO2 + 4 H2O",
            "C3H8 + 5 O2 → 3 CO2 + 4 H2O",
        ],
        correct_index: 3,
        answer: "C3H8 + 5 O2 → 3 CO2 + 4 H2O",
        requires_manual_review: true,
        choices_structured: [
            {
                reactants: [
                    { coefficient: 1, formula: "C3H8" },
                    { coefficient: 5, formula: "O2" },
                ],
                products: [
                    { coefficient: 3, formula: "CO2" },
                    { coefficient: 5, formula: "H2O" },
                ],
            },
            {
                reactants: [
                    { coefficient: 2, formula: "C3H8" },
                    { coefficient: 10, formula: "O2" },
                ],
                products: [
                    { coefficient: 6, formula: "CO2" },
                    { coefficient: 8, formula: "H2O" },
                ],
            },
            {
                reactants: [
                    { coefficient: 1, formula: "C3H8" },
                    { coefficient: 10, formula: "O" },
                ],
                products: [
                    { coefficient: 3, formula: "CO2" },
                    { coefficient: 4, formula: "H2O" },
                ],
            },
            {
                reactants: [
                    { coefficient: 1, formula: "C3H8" },
                    { coefficient: 5, formula: "O2" },
                ],
                products: [
                    { coefficient: 3, formula: "CO2" },
                    { coefficient: 4, formula: "H2O" },
                ],
            },
        ],
    },
];

/** The two genuine coefficient questions; the first is the common fixture. */
export const chemistryCoefficientQuestionInstances: ChemistryQuestionInstance[] = [
    {
        template_id: "chemistry.medium.coefficient",
        artifact_id: null,
        seed: 0,
        parameters: {
            reaction: "hydrate.copper_sulfate",
            species: "product:2",
        },
        reaction_id: "hydrate.copper_sulfate",
        question:
            "A hydrated salt loses its water of crystallisation on heating. When the equation CuSO4·5H2O → CuSO4 + H2O is balanced using the smallest whole-number coefficients, what is the coefficient of H2O?",
        choices: ["6", "5", "10"],
        correct_index: 1,
        answer: "5",
        requires_manual_review: true,
        choices_structured: null,
    },
    {
        template_id: "chemistry.medium.coefficient",
        artifact_id: null,
        seed: 3,
        parameters: {
            reaction: "hydrate.copper_sulfate",
            species: "product:2",
        },
        reaction_id: "hydrate.copper_sulfate",
        question:
            "A hydrated salt loses its water of crystallisation on heating. When the equation CuSO4·5H2O → CuSO4 + H2O is balanced using the smallest whole-number coefficients, what is the coefficient of H2O?",
        choices: ["5", "6", "10"],
        correct_index: 0,
        answer: "5",
        requires_manual_review: true,
        choices_structured: null,
    },
];

export const chemistryQuestionInstance = chemistryEquationQuestionInstances[0];

export const chemistryCoefficientQuestionInstance =
    chemistryCoefficientQuestionInstances[0];

export const chemistryPreview: AuthoringPreview = {
    ...preview,
    domain: "chemistry",
    artifact_id: "artifact-chem",
    question: chemistryQuestionInstance,
};

export const chemistryTemplateCandidate: ChemistryTemplateCandidate = {
    item: {
        schema_version: "chem-balance/0.1",
        family: "alkane_combustion",
        parameters: [
            {
                name: "reaction",
                values: ["comb.methane", "comb.propane"],
            },
        ],
        target: {
            kind: "balanced_equation",
        },
        answer_recipe: {
            kind: "normalised_coefficients",
        },
        distractors: [
            {
                reason: null,
                kind: "perturb_coefficient",
                slot: "product:2",
                delta: 1,
                misconception: "unbalanced_element",
            },
            {
                reason: null,
                kind: "scale_balanced",
                factor: 2,
                misconception: "non_reduced_coefficients",
            },
            {
                reason: null,
                kind: "swap_species",
                variant: "O2_as_O",
                misconception: "wrong_species",
            },
        ],
    },
    template_id: "chemistry.medium.equation",
    difficulty: "medium",
    question_type: "mcq",
    catalogue: {
        catalogue_version: "chem-catalogue-2026.11-pilot.2",
        catalogue_sha256:
            "0eac49458b6485005f95dff6e1e34fa51066e75a9a99561cbcc94225a23ba5f4",
        family: {
            id: "alkane_combustion",
            title: "Complete combustion of alkanes",
            description:
                "An alkane burns completely in oxygen to give carbon dioxide and water.",
        },
        reactions: [
            {
                id: "comb.methane",
                family: "alkane_combustion",
                name: "methane combustion",
                reactants: ["CH4", "O2"],
                products: ["CO2", "H2O"],
                source: "Standard school-chemistry reaction; citation pending owner review",
                variants: {
                    O2_as_O: {
                        slot: "reactant:2",
                        formula: "O",
                    },
                },
            },
            {
                id: "comb.propane",
                family: "alkane_combustion",
                name: "propane combustion",
                reactants: ["C3H8", "O2"],
                products: ["CO2", "H2O"],
                source: "Standard school-chemistry reaction; citation pending owner review",
                variants: {
                    O2_as_O: {
                        slot: "reactant:2",
                        formula: "O",
                    },
                },
            },
        ],
    },
};

export const chemistryCoefficientTemplateCandidate: ChemistryTemplateCandidate = {
    item: {
        schema_version: "chem-balance/0.1",
        family: "hydrate_dehydration",
        parameters: [
            {
                name: "reaction",
                values: ["hydrate.copper_sulfate", "hydrate.magnesium_sulfate"],
            },
            {
                name: "species",
                values: ["product:2"],
            },
        ],
        target: {
            kind: "coefficient",
        },
        answer_recipe: {
            kind: "normalised_coefficients",
        },
        distractors: [
            {
                reason: null,
                kind: "perturb_coefficient",
                slot: "asked",
                delta: 1,
                misconception: "unbalanced_element",
            },
            {
                reason: null,
                kind: "scale_balanced",
                factor: 2,
                misconception: "non_reduced_coefficients",
            },
        ],
    },
    template_id: "chemistry.medium.coefficient",
    difficulty: "medium",
    question_type: "mcq",
    catalogue: {
        catalogue_version: "chem-catalogue-2026.11-pilot.2",
        catalogue_sha256:
            "0eac49458b6485005f95dff6e1e34fa51066e75a9a99561cbcc94225a23ba5f4",
        family: {
            id: "hydrate_dehydration",
            title: "Dehydration of hydrated salts",
            description:
                "A hydrated salt loses its water of crystallisation on heating.",
        },
        reactions: [
            {
                id: "hydrate.copper_sulfate",
                family: "hydrate_dehydration",
                name: "copper(II) sulfate dehydration",
                reactants: ["CuSO4·5H2O"],
                products: ["CuSO4", "H2O"],
                source: "Standard school-chemistry reaction; citation pending owner review",
                variants: {},
            },
            {
                id: "hydrate.magnesium_sulfate",
                family: "hydrate_dehydration",
                name: "magnesium sulfate dehydration",
                reactants: ["MgSO4·7H2O"],
                products: ["MgSO4", "H2O"],
                source: "Standard school-chemistry reaction; citation pending owner review",
                variants: {},
            },
        ],
    },
};

const chemistryBalanceCheck: AuthoringCheck = {
    tool: "chemistry_verify_balance",
    status: "passed",
    advisory: false,
    findings: [],
    error: null,
};

const chemistryOptionsCheck: AuthoringCheck = {
    tool: "chemistry_verify_options",
    status: "passed",
    advisory: false,
    findings: [],
    error: null,
};

export const chemistryReview: AuthoringReview = {
    ...approvedReview,
    domain: "chemistry",
    artifact_id: "artifact-chem",
    request: {
        ...approvedReview.request,
        domain: "chemistry",
        prompt: "Balance combustion equations for simple alkanes.",
    },
    template: {
        template_id: "chemistry.medium.equation",
        candidate: chemistryTemplateCandidate,
    },
    checks: [chemistryBalanceCheck, chemistryOptionsCheck],
    candidate: null,
};

export const physicsTemplateCandidate: PhysicsTemplateCandidate = {
    template_id: "physics.medium.abc123",
    difficulty: "medium",
    question_type: "mcq",
    item: {
        schema_version: "physics-1d/0.1",
        topic: "newton2.acceleration_from_forces",
        axis: { orientation: "horizontal", positive: "right" },
        parameters: [
            { name: "m", quantity: "mass", unit: "kg", values: ["2", "4"] },
            { name: "F1", quantity: "force", unit: "N", values: ["30", "50"] },
            { name: "F2", quantity: "force", unit: "N", values: ["4", "10"] },
        ],
        body: {
            target: "acceleration",
            mass: "m",
            net_force: null,
            forces: [
                { param: "F1", direction: "positive", label: "push" },
                { param: "F2", direction: "negative", label: "friction" },
            ],
            acceleration: null,
            unknown_force: null,
            text: "A cart of mass {m} is pushed with a force of {F1}. A friction force of {F2} also acts on it.",
            answer_form: "magnitude_and_direction",
            display: { decimals: 2 },
            answer_recipe: {
                op: "div",
                args: [
                    {
                        op: "sub",
                        args: [{ param: "F1" }, { param: "F2" }],
                    },
                    { param: "m" },
                ],
            },
            distractors: [
                {
                    recipe: {
                        op: "div",
                        args: [
                            {
                                op: "add",
                                args: [{ param: "F1" }, { param: "F2" }],
                            },
                            { param: "m" },
                        ],
                    },
                    misconception: "added_opposing_forces",
                    explanation: "Adds the friction force instead of subtracting it.",
                },
                {
                    recipe: {
                        op: "div",
                        args: [{ param: "F1" }, { param: "m" }],
                    },
                    misconception: "ignored_opposing_force",
                    explanation: "Leaves out the friction force.",
                },
            ],
        },
    },
};

export const physicsReview: AuthoringReview = {
    ...approvedReview,
    domain: "physics",
    artifact_id: "artifact-physics",
    request: {
        ...approvedReview.request,
        domain: "physics",
        prompt: "Write a question about acceleration from two opposing forces.",
    },
    template: {
        template_id: "physics.medium.abc123",
        candidate: physicsTemplateCandidate,
    },
    candidate: null,
    validation_limits: {
        validator_version: "mcp-physics-template-v1",
        checking_mode: "property_based",
        examples_checked: 8,
        execution_calls: 16,
        max_examples: 25,
        max_execution_calls: 40,
        timeout_seconds: 10,
        seed: 11,
        whole_domain: true,
        declared_domain_size: 8,
    },
};
