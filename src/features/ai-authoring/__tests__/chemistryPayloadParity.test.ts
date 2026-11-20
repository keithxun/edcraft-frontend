import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
    chemistryCoefficientBalanceRows,
    chemistryCoefficientOptionRows,
    chemistryCoefficientQuestionInstances,
    chemistryCoefficientTemplateCandidate,
    chemistryEquationBalanceRows,
    chemistryEquationOptionRows,
    chemistryEquationQuestionInstances,
    chemistryTemplateCandidate,
} from "./fixtures";

interface Payload {
    candidate: unknown;
    checks: { tool: string; details: { rows: unknown[] } }[];
    questions: unknown[];
}

// The payloads are written by the Python validator. The fixtures copy them,
// so this test fails if either side drifts.
function payload(name: string): Payload {
    const path = resolve(__dirname, "payloads", `chemistry-${name}.json`);
    return JSON.parse(readFileSync(path, "utf8")) as Payload;
}

function rows(data: Payload, tool: string): unknown[] {
    return data.checks.find((check) => check.tool === tool)?.details.rows ?? [];
}

describe.each([
    {
        name: "equation",
        candidate: chemistryTemplateCandidate,
        balance: chemistryEquationBalanceRows,
        options: chemistryEquationOptionRows,
        questions: chemistryEquationQuestionInstances,
    },
    {
        name: "coefficient",
        candidate: chemistryCoefficientTemplateCandidate,
        balance: chemistryCoefficientBalanceRows,
        options: chemistryCoefficientOptionRows,
        questions: chemistryCoefficientQuestionInstances,
    },
])("chemistry $name fixtures", ({ name, candidate, balance, options, questions }) => {
    const data = payload(name);

    it("match the validator payload exactly", () => {
        expect(candidate).toEqual(data.candidate);
        expect(balance).toEqual(rows(data, "chemistry_verify_balance"));
        expect(options).toEqual(rows(data, "chemistry_verify_options"));
        expect(questions).toEqual(data.questions);
    });
});
