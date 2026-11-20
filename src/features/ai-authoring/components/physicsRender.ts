import type { PhysicsParameter, PhysicsRecipeNode, PhysicsTemplateItem } from "../types";

type RecipeOperator = "add" | "sub" | "mul" | "div" | "neg";

const PRECEDENCE: Record<RecipeOperator, number> = {
    add: 1,
    sub: 1,
    mul: 2,
    div: 2,
    neg: 3,
};

const ARITY: Record<RecipeOperator, { min: number; max: number }> = {
    add: { min: 2, max: 4 },
    sub: { min: 2, max: 2 },
    mul: { min: 2, max: 4 },
    div: { min: 2, max: 2 },
    neg: { min: 1, max: 1 },
};

const NUMBER_LITERAL = /^-?\d+(?:\.\d+)?$/;
const PARAMETER_NAME = /^[A-Za-z][A-Za-z0-9_]*$/;

// Display symbols for the SI units the physics contract allows. Unknown units
// keep their written form.
const UNIT_SYMBOLS: Record<string, string> = {
    "m/s^2": "m/s²",
};

const TARGET_LABELS: Record<string, string> = {
    acceleration: "Acceleration",
    net_force: "Net force",
    mass: "Mass",
    missing_force: "Missing force",
};

const ANSWER_FORM_LABELS: Record<string, string> = {
    signed_component: "Signed component",
    magnitude_and_direction: "Magnitude and direction",
    magnitude: "Magnitude",
};

const MISCONCEPTION_LABELS: Record<string, string> = {
    multiplied_instead_of_divided: "Multiplied instead of divided",
    inverted_ratio: "Inverted the ratio",
    added_opposing_forces: "Added opposing forces",
    ignored_opposing_force: "Ignored the opposing force",
    direction_sign_error: "Direction sign error",
    reported_net_force: "Reported the net force",
    other: "Other",
};

function isRecipeNode(node: unknown): node is PhysicsRecipeNode {
    return typeof node === "object" && node !== null && !Array.isArray(node);
}

function recipeOperator(node: PhysicsRecipeNode): RecipeOperator | null {
    const op = node.op;
    if (op === "add" || op === "sub" || op === "mul" || op === "div" || op === "neg") {
        return op;
    }
    return null;
}

function recipeArgs(
    node: PhysicsRecipeNode,
    op: RecipeOperator,
): PhysicsRecipeNode[] | null {
    const args = Array.isArray(node.args) ? node.args : [];
    const arity = ARITY[op];
    return args.length >= arity.min && args.length <= arity.max ? args : null;
}

/** A parameter or numeric literal, the two leaf shapes a recipe may declare. */
function recipeAtom(node: PhysicsRecipeNode): { param: string } | { literal: string } | null {
    if (typeof node.param === "string") {
        return PARAMETER_NAME.test(node.param) ? { param: node.param } : null;
    }
    if (typeof node.const === "string") {
        const literal = node.const.trim();
        return NUMBER_LITERAL.test(literal) ? { literal } : null;
    }
    return null;
}

function renderPlainNode(
    node: PhysicsRecipeNode,
    parentPrecedence: number,
): string | null {
    if (!isRecipeNode(node)) return null;
    const atom = recipeAtom(node);
    if (atom !== null) {
        return "param" in atom ? atom.param : atom.literal;
    }

    const op = recipeOperator(node);
    if (op === null) return null;
    const args = recipeArgs(node, op);
    if (args === null) return null;

    const precedence = PRECEDENCE[op];
    let text: string;
    switch (op) {
        case "add": {
            const pieces: string[] = [];
            for (const [index, arg] of args.entries()) {
                const piece = renderPlainNode(arg, precedence);
                if (piece === null) return null;
                if (index === 0) {
                    pieces.push(piece);
                } else {
                    pieces.push(
                        piece.startsWith("-") ? ` - ${piece.slice(1)}` : ` + ${piece}`,
                    );
                }
            }
            text = pieces.join("");
            break;
        }
        case "sub": {
            const [leftArg, rightArg] = args;
            const left = renderPlainNode(leftArg, precedence);
            const right = renderPlainNode(rightArg, precedence + 1);
            if (left === null || right === null) return null;
            text = right.startsWith("-") ? `${left} + ${right.slice(1)}` : `${left} - ${right}`;
            break;
        }
        case "mul": {
            const pieces: string[] = [];
            for (const [index, arg] of args.entries()) {
                const piece = renderPlainNode(arg, precedence);
                if (piece === null) return null;
                pieces.push(index > 0 && piece.startsWith("-") ? `(${piece})` : piece);
            }
            text = pieces.join(" * ");
            break;
        }
        case "div": {
            const [leftArg, rightArg] = args;
            const left = renderPlainNode(leftArg, precedence);
            const right = renderPlainNode(rightArg, precedence + 1);
            if (left === null || right === null) return null;
            text = `${left} / ${right}`;
            break;
        }
        case "neg": {
            const operand = renderPlainNode(args[0], precedence + 1);
            if (operand === null) return null;
            text = `-${operand}`;
            break;
        }
    }
    return precedence < parentPrecedence ? `(${text})` : text;
}

/**
 * Render one authored physics recipe as plain text, adding parentheses only
 * where precedence needs them: `(F1 - F2) / m` and `-(F1 / m)`. Returns `null`
 * for a malformed node instead of throwing.
 */
export function renderPhysicsRecipe(node: PhysicsRecipeNode): string | null {
    return renderPlainNode(node, 0);
}

/**
 * TeX for one parameter name. A single letter with trailing digits becomes a
 * subscript (`F1` -> `F_{1}`), a bare letter stays as it is (`m`), and any
 * other alphanumeric identifier is upright italic text (`Fnet` ->
 * `\mathit{Fnet}`). Names outside `[A-Za-z][A-Za-z0-9_]*` are rejected.
 */
function texParameterName(name: string): string | null {
    if (!PARAMETER_NAME.test(name)) return null;
    const subscripted = /^([A-Za-z])(\d+)$/.exec(name);
    if (subscripted) return `${subscripted[1]}_{${subscripted[2]}}`;
    if (name.length === 1) return name;
    return `\\mathit{${name.replaceAll("_", "\\_")}}`;
}

function texIsNumber(text: string): boolean {
    return NUMBER_LITERAL.test(text);
}

function renderTexAtom(node: PhysicsRecipeNode): string | null {
    if (typeof node.param === "string") return texParameterName(node.param);
    if (typeof node.const === "string") {
        const literal = node.const.trim();
        return NUMBER_LITERAL.test(literal) ? literal : null;
    }
    return null;
}

function renderTexNode(
    node: PhysicsRecipeNode,
    parentPrecedence: number,
): string | null {
    if (!isRecipeNode(node)) return null;
    const atom = renderTexAtom(node);
    if (atom !== null) return atom;

    const op = recipeOperator(node);
    if (op === null) return null;
    const args = recipeArgs(node, op);
    if (args === null) return null;

    const precedence = PRECEDENCE[op];
    let text: string;
    switch (op) {
        case "add": {
            const pieces: string[] = [];
            for (const [index, arg] of args.entries()) {
                const piece = renderTexNode(arg, precedence);
                if (piece === null) return null;
                if (index === 0) {
                    pieces.push(piece);
                } else {
                    pieces.push(
                        piece.startsWith("-") ? ` - ${piece.slice(1)}` : ` + ${piece}`,
                    );
                }
            }
            text = pieces.join("");
            break;
        }
        case "sub": {
            const [leftArg, rightArg] = args;
            const left = renderTexNode(leftArg, precedence);
            const right = renderTexNode(rightArg, precedence + 1);
            if (left === null || right === null) return null;
            text = right.startsWith("-") ? `${left} + ${right.slice(1)}` : `${left} - ${right}`;
            break;
        }
        case "mul": {
            const pieces: string[] = [];
            for (const arg of args) {
                const piece = renderTexNode(arg, precedence);
                if (piece === null) return null;
                pieces.push(piece);
            }
            text = pieces.reduce((joined, piece, index) => {
                if (index === 0) return piece;
                const previous = pieces[index - 1];
                const numeric = texIsNumber(previous) && texIsNumber(piece);
                const separator = numeric ? " \\cdot " : " ";
                const operand =
                    !numeric && piece.startsWith("-")
                        ? `\\left(${piece}\\right)`
                        : piece;
                return `${joined}${separator}${operand}`;
            }, "");
            break;
        }
        case "div": {
            const [leftArg, rightArg] = args;
            const left = renderTexNode(leftArg, 0);
            const right = renderTexNode(rightArg, 0);
            if (left === null || right === null) return null;
            text = `\\frac{${left}}{${right}}`;
            break;
        }
        case "neg": {
            const operand = renderTexNode(args[0], 0);
            if (operand === null) return null;
            const operandOp = recipeOperator(args[0]);
            const needsParentheses =
                operandOp === "add" || operandOp === "sub" || operandOp === "neg";
            text = needsParentheses
                ? `-\\left(${operand}\\right)`
                : `-${operand}`;
            break;
        }
    }
    return precedence < parentPrecedence ? `\\left(${text}\\right)` : text;
}

/**
 * Render one authored physics recipe as LaTeX: fractions use `\frac`, products
 * use juxtaposition, and parameter names follow the subscript rule above.
 * Returns `null` for a malformed node instead of throwing.
 */
export function renderPhysicsRecipeTex(node: PhysicsRecipeNode): string | null {
    return renderTexNode(node, 0);
}

function displayUnit(unit: unknown): string {
    if (typeof unit !== "string") return "";
    const trimmed = unit.trim();
    if (trimmed.length === 0) return "";
    return UNIT_SYMBOLS[trimmed] ?? trimmed;
}

/** The side a signed role points to, relative to the declared positive axis. */
function directionSide(direction: string | undefined, positive: unknown): string | null {
    const positiveSide = typeof positive === "string" ? positive.trim().toLowerCase() : "";
    if (positiveSide !== "right" && positiveSide !== "left") return null;
    if (direction === "positive") return positiveSide;
    if (direction === "negative") return positiveSide === "right" ? "left" : "right";
    return null;
}

/**
 * Map each directed parameter to its role direction. The body declares the
 * direction once per role; the parameter list only carries quantity and unit.
 */
function roleDirections(
    body: PhysicsTemplateItem["body"] | null | undefined,
): Record<string, string> {
    const directions: Record<string, string> = {};
    const add = (
        role: { param?: unknown; direction?: unknown } | null | undefined,
    ) => {
        if (role && typeof role.param === "string" && typeof role.direction === "string") {
            directions[role.param] = role.direction;
        }
    };
    if (!body) return directions;
    add(body.net_force);
    add(body.acceleration);
    for (const force of body.forces ?? []) add(force);
    return directions;
}

function sampleValue(
    parameter: PhysicsParameter,
    rawValue: string,
    positive: unknown,
    direction: string | undefined,
): string {
    const unit = displayUnit(parameter.unit);
    const measure = unit.length > 0 ? `${rawValue} ${unit}` : rawValue;
    if (parameter.quantity === "mass") return measure;
    if (parameter.quantity === "force" || parameter.quantity === "acceleration") {
        const side = directionSide(direction, positive);
        return side !== null ? `${measure} to the ${side}` : measure;
    }
    return measure;
}

function substitutePlaceholders(
    template: string,
    values: Record<string, string>,
): string {
    // Same placeholder pattern as the validator's text.py.
    return template.replace(/\{([A-Za-z][A-Za-z0-9_]{0,15})\}/g, (match, name: string) =>
        values[name] ?? match,
    );
}

/**
 * Substitute the first value of every parameter into the question text. Masses
 * read as `2 kg`; forces and accelerations add the side their signed role
 * points to, so a negative role on a right-positive axis reads `to the left`.
 */
export function renderPhysicsSampleStem(item: PhysicsTemplateItem): string {
    const template = item?.body?.text;
    if (typeof template !== "string") return "";
    const parameters = Array.isArray(item.parameters) ? item.parameters : [];
    const directions = roleDirections(item.body);
    const values: Record<string, string> = {};
    for (const parameter of parameters) {
        if (!parameter || typeof parameter.name !== "string") continue;
        const first = Array.isArray(parameter.values) ? parameter.values[0] : undefined;
        if (typeof first !== "string" || first.trim().length === 0) continue;
        values[parameter.name] = item.schema_version === "physics-h2/1.0"
            ? first.trim()
            : sampleValue(parameter, first.trim(), item.axis?.positive, directions[parameter.name]);
    }
    return substitutePlaceholders(template, values);
}

function humanize(value: string): string {
    const text = value.replaceAll("_", " ").trim();
    if (text.length === 0) return value;
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Readable English for the quantity a physics question asks for. */
export function targetLabel(target: string): string {
    return TARGET_LABELS[target] ?? humanize(target);
}

/** Readable English for the form the answer must take. */
export function answerFormLabel(form: string): string {
    return ANSWER_FORM_LABELS[form] ?? humanize(form);
}

/** Readable English for the misconception a wrong choice encodes. */
export function misconceptionLabel(tag: string): string {
    const known = MISCONCEPTION_LABELS[tag];
    if (known) return known;
    const text = humanize(tag);
    return text.length > 0 ? text : "Wrong choice";
}
