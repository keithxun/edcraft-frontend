import { describe, expect, it } from "vitest";
import type { PhysicsRecipeNode, PhysicsTemplateItem } from "../types";
import {
    answerFormLabel,
    misconceptionLabel,
    renderPhysicsRecipe,
    renderPhysicsRecipeTex,
    renderPhysicsSampleStem,
    targetLabel,
} from "../components/physicsRender";
import { physicsTemplateCandidate } from "./fixtures";

const differenceOverMass: PhysicsRecipeNode = {
    op: "div",
    args: [
        { op: "sub", args: [{ param: "F1" }, { param: "F2" }] },
        { param: "m" },
    ],
};

describe("physics recipe text", () => {
    it("renders nested recipes with parentheses only where needed", () => {
        expect(renderPhysicsRecipe(differenceOverMass)).toBe("(F1 - F2) / m");
        expect(
            renderPhysicsRecipe({
                op: "sub",
                args: [
                    { param: "F1" },
                    {
                        op: "add",
                        args: [{ param: "F2" }, { param: "F3" }],
                    },
                ],
            }),
        ).toBe("F1 - (F2 + F3)");
        expect(
            renderPhysicsRecipe({
                op: "mul",
                args: [{ param: "m" }, { param: "a" }],
            }),
        ).toBe("m * a");
    });

    it("parenthesises a compound operand of neg", () => {
        expect(
            renderPhysicsRecipe({
                op: "neg",
                args: [
                    {
                        op: "div",
                        args: [{ param: "F1" }, { param: "m" }],
                    },
                ],
            }),
        ).toBe("-(F1 / m)");
        expect(
            renderPhysicsRecipe({ op: "neg", args: [{ param: "F1" }] }),
        ).toBe("-F1");
    });

    it("turns a negative term into a subtraction", () => {
        expect(
            renderPhysicsRecipe({
                op: "add",
                args: [
                    { param: "F1" },
                    { op: "neg", args: [{ param: "F2" }] },
                ],
            }),
        ).toBe("F1 - F2");
    });

    it("returns null for a malformed node instead of throwing", () => {
        expect(
            renderPhysicsRecipe({
                op: "add",
                args: [{ param: "F1" }],
            }),
        ).toBeNull();
        expect(renderPhysicsRecipe({ param: "F 1" })).toBeNull();
        expect(renderPhysicsRecipe({ const: "\\frac{1}{2}" })).toBeNull();
        expect(
            renderPhysicsRecipe(null as unknown as PhysicsRecipeNode),
        ).toBeNull();
    });
});

describe("physics recipe LaTeX", () => {
    it("renders nested recipes as fractions", () => {
        expect(renderPhysicsRecipeTex(differenceOverMass)).toBe(
            "\\frac{F_{1} - F_{2}}{m}",
        );
        expect(
            renderPhysicsRecipeTex({
                op: "sub",
                args: [
                    { param: "F1" },
                    {
                        op: "add",
                        args: [{ param: "F2" }, { param: "F3" }],
                    },
                ],
            }),
        ).toBe("F_{1} - \\left(F_{2} + F_{3}\\right)");
    });

    it("puts a minus in front of a fraction without extra parentheses", () => {
        expect(
            renderPhysicsRecipeTex({
                op: "neg",
                args: [
                    {
                        op: "div",
                        args: [{ param: "F1" }, { param: "m" }],
                    },
                ],
            }),
        ).toBe("-\\frac{F_{1}}{m}");
    });

    it("subscripts trailing digits and keeps multi-letter names upright italic", () => {
        expect(renderPhysicsRecipeTex({ param: "F1" })).toBe("F_{1}");
        expect(renderPhysicsRecipeTex({ param: "F12" })).toBe("F_{12}");
        expect(renderPhysicsRecipeTex({ param: "Fnet" })).toBe("\\mathit{Fnet}");
        expect(renderPhysicsRecipeTex({ param: "m" })).toBe("m");
        expect(renderPhysicsRecipeTex({ const: "2" })).toBe("2");
    });

    it("accepts underscores in parameter names, as the schema does", () => {
        expect(renderPhysicsRecipe({ param: "F_net" })).toBe("F_net");
        expect(renderPhysicsRecipeTex({ param: "F_net" })).toBe("\\mathit{F\\_net}");
    });

    it("returns null for a malformed node instead of throwing", () => {
        expect(
            renderPhysicsRecipeTex({
                op: "pow",
                args: [{ param: "F1" }, { const: "2" }],
            } as unknown as PhysicsRecipeNode),
        ).toBeNull();
        expect(
            renderPhysicsRecipeTex({
                op: "div",
                args: [{ param: "F1" }],
            }),
        ).toBeNull();
        expect(renderPhysicsRecipeTex({ param: "F 1" })).toBeNull();
        expect(
            renderPhysicsRecipeTex(null as unknown as PhysicsRecipeNode),
        ).toBeNull();
    });
});

describe("physics sample stem", () => {
    it("fills the first value with units and axis-relative directions", () => {
        expect(renderPhysicsSampleStem(physicsTemplateCandidate.item)).toBe(
            "A cart of mass 2 kg is pushed with a force of 30 N to the right. " +
                "A friction force of 4 N to the left also acts on it.",
        );
    });

    it("fills placeholders whose names contain underscores", () => {
        const item: PhysicsTemplateItem = {
            ...physicsTemplateCandidate.item,
            parameters: [{ name: "m_cart", quantity: "mass", unit: "kg", values: ["3"] }],
            body: { ...physicsTemplateCandidate.item.body, mass: "m_cart", text: "A {m_cart} cart." },
        };

        expect(renderPhysicsSampleStem(item)).toBe("A 3 kg cart.");
    });

    it("flips the sides when the positive axis points left", () => {
        const item: PhysicsTemplateItem = {
            ...physicsTemplateCandidate.item,
            axis: { orientation: "horizontal", positive: "left" },
        };

        expect(renderPhysicsSampleStem(item)).toBe(
            "A cart of mass 2 kg is pushed with a force of 30 N to the left. " +
                "A friction force of 4 N to the right also acts on it.",
        );
    });

    it("renders acceleration with a display unit", () => {
        const item: PhysicsTemplateItem = {
            ...physicsTemplateCandidate.item,
            parameters: [
                {
                    name: "a",
                    quantity: "acceleration",
                    unit: "m/s^2",
                    values: ["3"],
                },
            ],
            body: {
                ...physicsTemplateCandidate.item.body,
                forces: null,
                acceleration: { param: "a", direction: "negative" },
                text: "The cart accelerates at {a}.",
            },
        };

        expect(renderPhysicsSampleStem(item)).toBe(
            "The cart accelerates at 3 m/s² to the left.",
        );
    });

    it("uses the H2 catalogue units already present in the question text", () => {
        const item: PhysicsTemplateItem = {
            ...physicsTemplateCandidate.item,
            schema_version: "physics-h2/1.0",
            parameters: [{ name: "v", quantity: "velocity", unit: "m/s", values: ["-4"] }],
            body: { ...physicsTemplateCandidate.item.body, text: "The velocity is {v} m/s." },
        };
        expect(renderPhysicsSampleStem(item)).toBe("The velocity is -4 m/s.");
    });

    it("leaves an unknown placeholder and a missing text intact", () => {
        const item: PhysicsTemplateItem = {
            ...physicsTemplateCandidate.item,
            body: {
                ...physicsTemplateCandidate.item.body,
                text: "A cart of mass {m} has {unknown}.",
            },
        };

        expect(renderPhysicsSampleStem(item)).toContain("{unknown}");
        expect(
            renderPhysicsSampleStem({
                ...item,
                body: { ...item.body, text: "" },
            }),
        ).toBe("");
    });
});

describe("physics labels", () => {
    it("names the targets and answer forms", () => {
        expect(targetLabel("acceleration")).toBe("Acceleration");
        expect(targetLabel("net_force")).toBe("Net force");
        expect(targetLabel("mass")).toBe("Mass");
        expect(targetLabel("missing_force")).toBe("Missing force");
        expect(answerFormLabel("signed_component")).toBe("Signed component");
        expect(answerFormLabel("magnitude_and_direction")).toBe(
            "Magnitude and direction",
        );
        expect(answerFormLabel("magnitude")).toBe("Magnitude");
    });

    it("names the misconception tags", () => {
        expect(misconceptionLabel("multiplied_instead_of_divided")).toBe(
            "Multiplied instead of divided",
        );
        expect(misconceptionLabel("inverted_ratio")).toBe("Inverted the ratio");
        expect(misconceptionLabel("added_opposing_forces")).toBe(
            "Added opposing forces",
        );
        expect(misconceptionLabel("ignored_opposing_force")).toBe(
            "Ignored the opposing force",
        );
        expect(misconceptionLabel("direction_sign_error")).toBe(
            "Direction sign error",
        );
        expect(misconceptionLabel("reported_net_force")).toBe("Reported the net force");
        expect(misconceptionLabel("other")).toBe("Other");
        expect(misconceptionLabel("")).toBe("Wrong choice");
    });
});
