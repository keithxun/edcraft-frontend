import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { PhysicsTemplateDetails } from "../components/PhysicsTemplateDetails";
import type { PhysicsTemplateCandidate, ValidationLimits } from "../types";
import { physicsTemplateCandidate } from "./fixtures";

const wholeDomainLimits: ValidationLimits = {
    validator_version: "mcp-physics-template-v1",
    checking_mode: "property_based",
    examples_checked: 60,
    execution_calls: 120,
    max_examples: 100,
    max_execution_calls: 400,
    timeout_seconds: 15,
    seed: 1234,
    whole_domain: true,
    declared_domain_size: 60,
};

function withItem(
    item: Partial<PhysicsTemplateCandidate["item"]>,
): PhysicsTemplateCandidate {
    return {
        ...physicsTemplateCandidate,
        item: {
            ...physicsTemplateCandidate.item,
            ...item,
        },
    };
}

function annotations(section: HTMLElement): string[] {
    return Array.from(section.querySelectorAll("annotation")).map(
        (annotation) => annotation.textContent ?? "",
    );
}

describe("PhysicsTemplateDetails", () => {
    afterEach(cleanup);

    it("shows the reviewed statement skill without numeric-recipe placeholders", () => {
        const candidate = withItem({
            schema_version: "physics-h2-statements/1.0",
            topic: "H2 Physics 9478 · Outcome 16a",
            rule: "Recognise circuit symbols.",
            parameters: [],
            body: { target: "Statement set", text: "Read the symbols.", distractors: [] },
        });
        render(<PhysicsTemplateDetails candidate={candidate} limits={wholeDomainLimits} />);
        expect(screen.getByText("Recognise circuit symbols.")).toBeInTheDocument();
        expect(screen.getByText("Read the symbols.")).toBeInTheDocument();
        expect(screen.queryByText("No answer recipe declared.")).not.toBeInTheDocument();
        expect(screen.getByText("Checked for all 60 combinations")).toBeInTheDocument();
    });

    it("shows the target, axis, parameters, rule, answer and wrong choices", () => {
        render(
            <PhysicsTemplateDetails
                candidate={physicsTemplateCandidate}
                limits={wholeDomainLimits}
            />,
        );

        expect(
            screen.getByText("newton2.acceleration_from_forces · Medium"),
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                "A cart of mass {m} is pushed with a force of {F1}. A friction force of {F2} also acts on it.",
            ),
        ).toBeInTheDocument();

        const target = screen.getByLabelText("Target");
        expect(within(target).getByText("Acceleration")).toBeInTheDocument();
        expect(
            within(target).getByText("Answer form: Magnitude and direction"),
        ).toBeInTheDocument();

        const direction = screen.getByLabelText("Positive direction");
        expect(within(direction).getByText("Right")).toBeInTheDocument();

        const parameters = screen.getByLabelText("Parameters");
        expect(
            within(parameters).getByRole("columnheader", { name: "Name" }),
        ).toBeInTheDocument();
        expect(
            within(parameters).getByRole("columnheader", { name: "Quantity" }),
        ).toBeInTheDocument();
        expect(
            within(parameters).getByRole("columnheader", { name: "Unit" }),
        ).toBeInTheDocument();
        expect(
            within(parameters).getByRole("columnheader", { name: "Values" }),
        ).toBeInTheDocument();
        expect(within(parameters).getByText("m")).toBeInTheDocument();
        expect(within(parameters).getByText("Mass")).toBeInTheDocument();
        expect(within(parameters).getByText("kg")).toBeInTheDocument();
        expect(within(parameters).getByText("2, 4")).toBeInTheDocument();
        expect(within(parameters).getByText("F1")).toBeInTheDocument();
        expect(within(parameters).getAllByText("Force")).toHaveLength(2);
        expect(within(parameters).getByText("30, 50")).toBeInTheDocument();

        expect(screen.getByText("a = F_net / m")).toBeInTheDocument();

        const answer = screen.getByLabelText("Answer");
        expect(annotations(answer)).toEqual(["\\frac{F_{1} - F_{2}}{m}"]);

        const choices = screen.getByLabelText("Wrong choices");
        expect(
            within(choices).getByText("Misconception: Added opposing forces"),
        ).toBeInTheDocument();
        expect(
            within(choices).getByText(
                "Explanation: Adds the friction force instead of subtracting it.",
            ),
        ).toBeInTheDocument();
        expect(
            within(choices).getByText(
                "Misconception: Ignored the opposing force",
            ),
        ).toBeInTheDocument();
        expect(annotations(choices)).toEqual([
            "\\frac{F_{1} + F_{2}}{m}",
            "\\frac{F_{1}}{m}",
        ]);

        expect(
            screen.getByText("Checked for all 60 combinations"),
        ).toBeInTheDocument();
    });

    it("shows a sampled coverage line when the whole domain was not checked", () => {
        render(
            <PhysicsTemplateDetails
                candidate={physicsTemplateCandidate}
                limits={{
                    ...wholeDomainLimits,
                    whole_domain: false,
                    examples_checked: 13,
                    declared_domain_size: 500,
                }}
            />,
        );

        expect(
            screen.getByText("Checked 13 of 500 combinations"),
        ).toBeInTheDocument();
        expect(screen.queryByText(/Checked for all/)).not.toBeInTheDocument();
    });

    it("does not claim every combination when some were skipped", () => {
        render(
            <PhysicsTemplateDetails
                candidate={physicsTemplateCandidate}
                limits={{
                    ...wholeDomainLimits,
                    whole_domain: true,
                    examples_checked: 13,
                    declared_domain_size: 26,
                }}
            />,
        );

        expect(
            screen.getByText("Checked 13 of 26 combinations"),
        ).toBeInTheDocument();
        expect(screen.queryByText(/Checked for all/)).not.toBeInTheDocument();
    });

    it("omits the coverage line when no limits are carried", () => {
        render(<PhysicsTemplateDetails candidate={physicsTemplateCandidate} />);

        expect(screen.queryByText(/Checked/)).not.toBeInTheDocument();
    });

    it("shows the rule for each target", () => {
        const rules: Array<[string, string]> = [
            ["acceleration", "a = F_net / m"],
            ["net_force", "F_net = m a"],
            ["mass", "m = F_net / a"],
            ["missing_force", "F_u = s_u (m a − Σ s_i F_i)"],
        ];

        for (const [target, rule] of rules) {
            render(
                <PhysicsTemplateDetails
                    candidate={withItem({
                        body: {
                            ...physicsTemplateCandidate.item.body,
                            target,
                        },
                    })}
                />,
            );
            expect(screen.getByText(rule)).toBeInTheDocument();
            cleanup();
        }
    });

    it("hides an empty distractor explanation", () => {
        const candidate = withItem({
            body: {
                ...physicsTemplateCandidate.item.body,
                distractors: [
                    {
                        recipe: { param: "F1" },
                        misconception: "other",
                        explanation: "   ",
                    },
                ],
            },
        });

        render(<PhysicsTemplateDetails candidate={candidate} />);

        const choices = screen.getByLabelText("Wrong choices");
        expect(within(choices).getByText("Misconception: Other")).toBeInTheDocument();
        expect(within(choices).queryByText(/^Explanation:/)).not.toBeInTheDocument();
    });

    it("renders a partial payload without throwing", () => {
        const candidate = {
            template_id: "partial",
            difficulty: "easy",
            question_type: "mcq",
            item: {
                topic: "physics.partial",
                parameters: [],
                body: {},
            },
        } as unknown as PhysicsTemplateCandidate;

        expect(() =>
            render(<PhysicsTemplateDetails candidate={candidate} />),
        ).not.toThrow();

        expect(within(screen.getByLabelText("Target")).getByText("Not set")).toBeInTheDocument();
        expect(screen.getByText("No rule declared.")).toBeInTheDocument();
        expect(screen.getByText("No answer recipe declared.")).toBeInTheDocument();
        expect(
            within(screen.getByLabelText("Wrong choices")).getByText("None"),
        ).toBeInTheDocument();
    });
});
