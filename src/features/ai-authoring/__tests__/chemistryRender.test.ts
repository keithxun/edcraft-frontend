import { describe, expect, it } from "vitest";
import {
    chemistryReasonText,
    chemistryRecipeText,
    chemistrySlotLabel,
    equationParts,
    formulaParts,
} from "../components/chemistryRender";

describe("formulaParts", () => {
    it("marks digits after an element symbol as subscripts", () => {
        expect(formulaParts("H2O")).toEqual([
            { kind: "text", value: "H" },
            { kind: "sub", value: "2" },
            { kind: "text", value: "O" },
        ]);
    });

    it("keeps parentheses as text and subscripts the closing group", () => {
        expect(formulaParts("Ca(OH)2")).toEqual([
            { kind: "text", value: "Ca(OH)" },
            { kind: "sub", value: "2" },
        ]);
    });

    it("handles nested groups and several subscripts", () => {
        expect(formulaParts("Al2(SO4)3")).toEqual([
            { kind: "text", value: "Al" },
            { kind: "sub", value: "2" },
            { kind: "text", value: "(SO" },
            { kind: "sub", value: "4" },
            { kind: "text", value: ")" },
            { kind: "sub", value: "3" },
        ]);
    });

    it.each(["·", ".", "*"])(
        "keeps a multiplier after the %s hydrate dot as text",
        (dot) => {
            expect(formulaParts(`CuSO4${dot}5H2O`)).toEqual([
                { kind: "text", value: "CuSO" },
                { kind: "sub", value: "4" },
                { kind: "dot", value: dot },
                { kind: "text", value: "5H" },
                { kind: "sub", value: "2" },
                { kind: "text", value: "O" },
            ]);
        },
    );

    it("keeps multi-digit counts together", () => {
        expect(formulaParts("C10H22")).toEqual([
            { kind: "text", value: "C" },
            { kind: "sub", value: "10" },
            { kind: "text", value: "H" },
            { kind: "sub", value: "22" },
        ]);
    });

    it("does not throw on odd input and keeps unknown characters as text", () => {
        expect(formulaParts("")).toEqual([]);
        expect(() => formulaParts("<b>x</b>")).not.toThrow();
        expect(formulaParts("<b>x</b>").map((part) => part.value).join("")).toBe(
            "<b>x</b>",
        );
        expect(formulaParts("2H2O").map((part) => part.value).join("")).toBe("2H2O");
    });
});

describe("equationParts", () => {
    function compact(equation: string): Array<[string, string]> {
        return equationParts(equation)
            .filter((token) => !(token.kind === "operator" && token.value.trim() === ""))
            .map((token) => [token.kind, token.value]);
    }

    it("splits coefficients, formulas and operators", () => {
        expect(compact("CH4 + 2 O2 → CO2 + 2 H2O")).toEqual([
            ["formula", "CH4"],
            ["operator", "+"],
            ["coefficient", "2"],
            ["formula", "O2"],
            ["operator", "→"],
            ["formula", "CO2"],
            ["operator", "+"],
            ["coefficient", "2"],
            ["formula", "H2O"],
        ]);
    });

    it("gives formula tokens their subscript parts", () => {
        const [methane] = equationParts("CH4 + 2 O2 → CO2 + 2 H2O");
        expect(methane.kind).toBe("formula");
        if (methane.kind === "formula") {
            expect(methane.parts).toEqual([
                { kind: "text", value: "CH" },
                { kind: "sub", value: "4" },
            ]);
        }
    });

    it("splits a coefficient that is attached to its formula", () => {
        expect(compact("2H2 + O2 -> 2H2O")).toEqual([
            ["coefficient", "2"],
            ["formula", "H2"],
            ["operator", "+"],
            ["formula", "O2"],
            ["operator", "->"],
            ["coefficient", "2"],
            ["formula", "H2O"],
        ]);
    });

    it("keeps spacing so the equation can be rebuilt", () => {
        const equation = "CH4 + 2 O2 → CO2 + 2 H2O";
        expect(equationParts(equation).map((token) => token.value).join("")).toBe(
            equation,
        );
    });

    it("does not throw on odd input", () => {
        expect(equationParts("")).toEqual([]);
        expect(() => equationParts("<script>x</script>")).not.toThrow();
        expect(compact("??")).toEqual([["formula", "??"]]);
    });
});

describe("chemistrySlotLabel", () => {
    it("names slots as positions rather than formulas", () => {
        expect(chemistrySlotLabel("product:2")).toBe("Product 2");
        expect(chemistrySlotLabel("reactant:1")).toBe("Reactant 1");
        expect(chemistrySlotLabel("asked")).toBe("the asked species");
    });
});

describe("chemistryRecipeText", () => {
    it("describes every real recipe kind", () => {
        expect(
            chemistryRecipeText({
                kind: "perturb_coefficient",
                slot: "product:2",
                delta: 1,
                misconception: "unbalanced_element",
            }),
        ).toBe("Add 1 to the coefficient of product 2");
        expect(
            chemistryRecipeText({
                kind: "perturb_coefficient",
                slot: "asked",
                delta: 1,
                misconception: "unbalanced_element",
            }),
        ).toBe("Add 1 to the coefficient of the asked species");
        expect(
            chemistryRecipeText({
                kind: "scale_balanced",
                factor: 2,
                misconception: "non_reduced_coefficients",
            }),
        ).toBe("Multiply every coefficient by 2");
        expect(
            chemistryRecipeText({
                kind: "skeleton_coefficients",
                misconception: "unbalanced_skeleton",
            }),
        ).toBe("Leave every coefficient at 1");
        expect(
            chemistryRecipeText({
                kind: "swap_coefficients",
                slot_a: "reactant:1",
                slot_b: "product:2",
                misconception: "misassigned_coefficients",
            }),
        ).toBe("Swap the coefficients of reactant 1 and product 2");
        expect(
            chemistryRecipeText({
                kind: "swap_species",
                variant: "O2_as_O",
                misconception: "wrong_species",
            }),
        ).toBe("Use the O2_as_O variant");
        expect(chemistryRecipeText({ kind: "normalised_coefficients" })).toBe(
            "Use the balanced coefficients",
        );
    });

    it("never coerces an unknown recipe object to [object Object]", () => {
        const text = chemistryRecipeText({ kind: "unknown", nested: { a: 1 } });
        expect(text).toBe("Unknown");
        expect(chemistryRecipeText({ nested: { a: 1 } })).toBe("—");
        expect(chemistryRecipeText(null)).toBe("—");
    });
});

describe("chemistryReasonText", () => {
    it("explains each option verdict reason", () => {
        expect(
            chemistryReasonText({ code: "ELEMENT_UNBALANCED", element: "O", left: 4, right: 5 }),
        ).toBe("O is unbalanced: 4 on the left, 5 on the right");
        expect(chemistryReasonText({ code: "NOT_REDUCED", divisor: 2 })).toContain("divides by 2");
        expect(
            chemistryReasonText({
                code: "SPECIES_CHANGED",
                slot: "product:2",
                expected: "O2",
                actual: "O",
            }),
        ).toBe("Product 2 uses O instead of O2");
        expect(
            chemistryReasonText({ code: "SPECIES_CHANGED", expected: "O2", actual: "O" }),
        ).toBe("Uses O instead of O2");
        expect(
            chemistryReasonText({ code: "COEFFICIENT_DIFFERS", expected: 2, actual: 3 }),
        ).toBe("Gives 3, the balanced coefficient is 2");
        expect(chemistryReasonText({ code: "OTHER", note: "x" })).toBe("code: OTHER, note: x");
    });

    it("explains duplicates, unusable coefficients and an empty reason", () => {
        expect(chemistryReasonText({ code: "DUPLICATE_OPTION" })).toBe(
            "Duplicates another option",
        );
        expect(chemistryReasonText({ code: "COEFFICIENT_UNUSABLE" })).toBe(
            "Cannot be used as a coefficient",
        );
        // The real shape from checks.py: the out-of-range coefficient.
        expect(chemistryReasonText({ code: "COEFFICIENT_UNUSABLE", coefficient: 0 })).toBe(
            "Cannot be used: coefficient 0 is outside 1 to 99",
        );
        expect(chemistryReasonText({})).toBe("—");
        expect(chemistryReasonText(null)).toBe("—");
    });

    it("renders nested reason values without [object Object]", () => {
        const text = chemistryReasonText({ code: "OTHER", nested: { a: 1 } });
        expect(text).not.toContain("[object Object]");
        expect(text).toContain("nested: a: 1");
    });
});
