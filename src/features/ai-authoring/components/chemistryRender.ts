import { capitalize } from "../format";

/** One run of plain text, a subscript, or a hydrate dot in a formula. */
export interface FormulaPart {
    kind: "text" | "sub" | "dot";
    value: string;
}

/** One token of a rendered equation. Formula tokens carry their own subscripts. */
export type EquationToken =
    | { kind: "coefficient"; value: string }
    | { kind: "formula"; value: string; parts: FormulaPart[] }
    | { kind: "operator"; value: string };

const DIGIT = /^[0-9]$/;
const ELEMENT_LETTER = /^[A-Za-z]$/;
const HYDRATE_DOTS = new Set(["·", ".", "*"]);
const EQUATION_OPERATORS = new Set(["→", "⇌", "⇋", "⟶", "->", "=>", "=", "+"]);

// Whitespace and reaction operators are kept so the rendered equation reads
// exactly like the authored string while formulas gain subscripts.
const EQUATION_SEPARATOR = /(\s+|\+|\u2192|\u21cc|\u21cb|\u27f6|->|=>|=)/;

const TARGET_LABELS: Record<string, string> = {
    balanced_equation: "Balanced equation",
    coefficient: "One coefficient",
    theoretical_yield: "Theoretical product amount",
    concept: "Concept question",
};

const MISCONCEPTION_LABELS: Record<string, string> = {
    unbalanced_element: "An element is left unbalanced",
    non_reduced_coefficients: "Coefficients are not in the smallest whole-number ratio",
    unbalanced_skeleton: "The skeleton equation is left unbalanced",
    misassigned_coefficients: "Coefficients are swapped between species",
    wrong_species: "A species is replaced by a wrong formula",
};

const SLOT_NOUNS: Record<string, string> = {
    reactant: "Reactant",
    product: "Product",
};

function humanize(value: string): string {
    const text = value.replaceAll("_", " ").trim();
    return text.length === 0 ? value : capitalize(text);
}

function lowerFirst(value: string): string {
    return value.length === 0 ? value : value[0].toLowerCase() + value.slice(1);
}

function isRecordValue(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberField(record: Record<string, unknown>, key: string): number | null {
    const value = record[key];
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringField(record: Record<string, unknown>, key: string): string {
    const value = record[key];
    return typeof value === "string" ? value : "";
}

/**
 * Readable label for a species slot such as `product:2`, `reactant:1` or the
 * special `asked` slot. A slot is a position, not a formula, so it is always
 * displayed as text rather than through the formula renderer.
 */
export function chemistrySlotLabel(slot: string): string {
    if (slot === "asked") return "the asked species";
    const [side, position] = slot.split(":");
    const noun = SLOT_NOUNS[side];
    if (noun && position) return `${noun} ${position}`;
    return humanize(slot);
}

/**
 * Readable description of a distractor or option recipe. The validator sends
 * the recipe as a dictionary keyed by `kind`, so the UI names the operation
 * instead of showing the raw fields.
 */
export function chemistryRecipeText(recipe: unknown): string {
    if (typeof recipe === "string") return humanize(recipe);
    if (!isRecordValue(recipe)) return "—";

    const kind = stringField(recipe, "kind");
    switch (kind) {
        case "normalised_coefficients":
            return "Use the balanced coefficients";
        case "concept_key":
            return "Use the curated answer";
        case "concept_alternative":
            return `Curated alternative ${numberField(recipe, "index") ?? ""}`.trim();
        case "limiting_extent":
            return "Use the limiting reactant and balanced coefficients";
        case "yield_alternative":
            return humanize(stringField(recipe, "method"));
        case "perturb_coefficient": {
            const slot = stringField(recipe, "slot");
            const target = slot ? lowerFirst(chemistrySlotLabel(slot)) : "the coefficient";
            const delta = numberField(recipe, "delta") ?? 0;
            if (delta === 0) return `Keep the coefficient of ${target} unchanged`;
            return `${delta > 0 ? "Add" : "Subtract"} ${Math.abs(delta)} ${
                delta > 0 ? "to" : "from"
            } the coefficient of ${target}`;
        }
        case "scale_balanced": {
            const factor = numberField(recipe, "factor");
            return factor === null
                ? "Multiply every coefficient"
                : `Multiply every coefficient by ${factor}`;
        }
        case "skeleton_coefficients":
            return "Leave every coefficient at 1";
        case "swap_coefficients": {
            const slotA = stringField(recipe, "slot_a");
            const slotB = stringField(recipe, "slot_b");
            const left = slotA ? lowerFirst(chemistrySlotLabel(slotA)) : "one species";
            const right = slotB ? lowerFirst(chemistrySlotLabel(slotB)) : "another species";
            return `Swap the coefficients of ${left} and ${right}`;
        }
        case "swap_species": {
            const variant = stringField(recipe, "variant");
            return variant.length > 0
                ? `Use the ${variant} variant`
                : "Use a different species";
        }
        default:
            return kind.length > 0 ? humanize(kind) : "—";
    }
}

/**
 * Split a chemical formula into plain text, subscript and hydrate-dot runs.
 * Digits after an element symbol or a closing parenthesis are subscripts. A
 * leading multiplier after a hydrate dot stays plain text, so CuSO4·5H2O reads
 * CuSO₄·5H₂O. Unknown characters are kept as text and the function never throws.
 */
export function formulaParts(formula: string): FormulaPart[] {
    if (typeof formula !== "string" || formula.length === 0) return [];

    const parts: FormulaPart[] = [];
    let text = "";
    let subscript = "";
    // What the previous non-digit character was, which decides whether digits
    // close to it are subscripts or ordinary text.
    let previous: "element" | "close" | "other" | null = null;
    let afterHydrateDot = false;

    const flushText = () => {
        if (text.length > 0) {
            parts.push({ kind: "text", value: text });
            text = "";
        }
    };
    const flushSubscript = () => {
        if (subscript.length > 0) {
            parts.push({ kind: "sub", value: subscript });
            subscript = "";
        }
    };

    for (const character of formula) {
        if (DIGIT.test(character)) {
            if (subscript.length > 0) {
                subscript += character;
            } else if (afterHydrateDot) {
                // The multiplier after a hydrate dot, such as the 5 in ·5H2O.
                text += character;
            } else if (previous === "element" || previous === "close") {
                flushText();
                subscript = character;
            } else {
                text += character;
            }
            continue;
        }

        flushSubscript();

        if (HYDRATE_DOTS.has(character)) {
            flushText();
            parts.push({ kind: "dot", value: character });
            previous = "other";
            afterHydrateDot = true;
            continue;
        }

        if (afterHydrateDot) {
            afterHydrateDot = false;
        }
        if (character === ")") {
            previous = "close";
        } else if (ELEMENT_LETTER.test(character)) {
            previous = "element";
        } else {
            previous = "other";
        }
        text += character;
    }

    flushSubscript();
    flushText();
    return parts;
}

/**
 * Split a rendered equation into coefficient, formula and operator tokens.
 * Whitespace is preserved as an operator token, so callers can rebuild the
 * exact authored text while rendering formulas with subscripts.
 */
export function equationParts(equation: string): EquationToken[] {
    if (typeof equation !== "string" || equation.length === 0) return [];

    const tokens: EquationToken[] = [];

    for (const chunk of equation.split(EQUATION_SEPARATOR)) {
        if (chunk.length === 0) continue;
        if (/^\s+$/.test(chunk) || EQUATION_OPERATORS.has(chunk)) {
            tokens.push({ kind: "operator", value: chunk });
            continue;
        }

        const coefficient = /^(\d+)(.*)$/.exec(chunk);
        if (!coefficient) {
            tokens.push({
                kind: "formula",
                value: chunk,
                parts: formulaParts(chunk),
            });
            continue;
        }

        tokens.push({ kind: "coefficient", value: coefficient[1] });
        if (coefficient[2].length > 0) {
            tokens.push({
                kind: "formula",
                value: coefficient[2],
                parts: formulaParts(coefficient[2]),
            });
        }
    }

    return tokens;
}

/** Readable label for a chemistry target kind. */
export function chemistryTargetLabel(kind: string): string {
    return TARGET_LABELS[kind] ?? humanize(kind);
}

/** Readable label for a chemistry distractor misconception. */
export function chemistryMisconceptionLabel(misconception: string): string {
    return MISCONCEPTION_LABELS[misconception] ?? humanize(misconception);
}

/** Render an unknown reason value without collapsing objects to `[object Object]`. */
function reasonValue(value: unknown): string {
    if (Array.isArray(value)) return value.map(reasonValue).join(", ");
    if (isRecordValue(value)) {
        return Object.entries(value)
            .map(([key, nested]) => `${key}: ${reasonValue(nested)}`)
            .join(", ");
    }
    return String(value);
}

/** Readable text for an option verdict reason from the options check. */
export function chemistryReasonText(reason: unknown): string {
    if (typeof reason === "string") return reason;
    if (!isRecordValue(reason)) return "—";
    // A key's reason is an empty dictionary; there is nothing to explain.
    if (Object.keys(reason).length === 0) return "—";

    const code = stringField(reason, "code");
    switch (code) {
        case "ELEMENT_UNBALANCED":
            return `${stringField(reason, "element")} is unbalanced: ${reasonValue(
                reason.left,
            )} on the left, ${reasonValue(reason.right)} on the right`;
        case "NOT_REDUCED":
            return `Not in the smallest ratio (every coefficient divides by ${reasonValue(
                reason.divisor,
            )})`;
        case "SPECIES_CHANGED": {
            const slot = stringField(reason, "slot");
            const actual = stringField(reason, "actual");
            const expected = stringField(reason, "expected");
            const subject = slot ? `${chemistrySlotLabel(slot)} uses` : "Uses";
            return `${subject} ${actual} instead of ${expected}`;
        }
        case "COEFFICIENT_DIFFERS":
            return `Gives ${reasonValue(reason.actual)}, the balanced coefficient is ${reasonValue(
                reason.expected,
            )}`;
        case "COEFFICIENT_UNUSABLE": {
            // checks.py sends {"code", "coefficient"}: a value outside 1 to 99.
            const coefficient = numberField(reason, "coefficient");
            return coefficient === null
                ? "Cannot be used as a coefficient"
                : `Cannot be used: coefficient ${coefficient} is outside 1 to 99`;
        }
        case "DUPLICATE_OPTION":
            // checks.py sends only the code; the row's option number says which.
            return "Duplicates another option";
        default:
            return Object.entries(reason)
                .map(([key, value]) => `${key}: ${reasonValue(value)}`)
                .join(", ");
    }
}
