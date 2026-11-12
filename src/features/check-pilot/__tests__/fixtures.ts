import type {
    CheckRecord,
    PilotBatch,
    PilotQuestion,
    PilotTemplateRecord,
    Qualification,
} from "../types";

export const passedQualification: Qualification = {
    status: "passed",
    checking_mode: "property_based",
    accepted_cases: 48,
    execution_calls: 63,
    seed: 11,
    max_examples: 100,
    max_execution_calls: 200,
    timeout_seconds: 10,
    counterexample: null,
    findings: [],
    versions: { check_engine: "1.2.0", polynomial_ir: "0.1" },
};

export const checkRecord: CheckRecord = {
    check_ref: {
        check_id: "polynomial-derivative-v1",
        version: "1",
        sha256: "c".repeat(64),
    },
    title: "Bounded polynomial derivative check",
    description:
        "Samples bounded univariate polynomials and compares independent coefficient arithmetic.",
    scope: {
        subject: "polynomial_differentiation",
        variable: "x",
        degree_max: 5,
        coefficient_min: -9,
        coefficient_max: 9,
    },
    definition: {
        recipe: {
            summary: "Differentiate each term, then combine like terms.",
            steps: [
                {
                    id: "split",
                    operation: "split_polynomial_terms",
                    input: "polynomial",
                    output: "terms",
                },
                {
                    id: "differentiate",
                    operation: "differentiate_term_v1",
                    input: "term",
                    output: "derivative_term",
                    description: "Multiply by the exponent and reduce it by one.",
                },
            ],
        },
    },
    qualification: passedQualification,
    provenance: {
        author_role: "check_author",
        model: "configured-model",
        prompt_sha256: "d".repeat(64),
    },
    created_at: "2026-11-12T09:00:00Z",
};

export function templateRecord(
    overrides: Partial<PilotTemplateRecord> = {},
): PilotTemplateRecord {
    return {
        template_id: "template-1",
        template_sha256: "a".repeat(64),
        prompt: "Differentiate bounded cubic polynomials with integer coefficients.",
        status: "ready",
        approval: "unreviewed",
        reused_check: false,
        check: checkRecord,
        template: {
            degree_max: 3,
            coefficient_domains: { constant: [-5, 5], leading: [-3, 3] },
            num_distractors: 3,
        },
        qualification: passedQualification,
        findings: [],
        created_at: "2026-11-12T09:05:00Z",
        ...overrides,
    };
}

export const questions: PilotQuestion[] = [
    {
        question: "Differentiate the polynomial.",
        expression: "3x^2 + 2x + 1",
        choices: ["6x + 2", "6x", "3x^2"],
        correct_index: 0,
        answer: "6x + 2",
        parameters: { a: 3, b: 2, c: 1 },
        check_ref: checkRecord.check_ref,
    },
    {
        question: "Differentiate the polynomial.",
        expression: "x^3 - 4x",
        choices: ["3x^2 - 4", "3x^2", "x^2 - 4"],
        correct_index: 0,
        answer: "3x^2 - 4",
        parameters: { a: 1, b: -4 },
        check_ref: checkRecord.check_ref,
    },
];

export const pilotBatch: PilotBatch = {
    template_id: "template-1",
    seed: 42,
    questions,
    requested_quantity: 3,
    shortfall: 1,
    findings: ["The bounded draw produced two distinct questions."],
};
