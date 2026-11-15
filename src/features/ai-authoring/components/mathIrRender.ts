import type {
    MathIrAnswerRecipe,
    MathIrDistractor,
    MathIrExpression,
    MathIrGiven,
    MathIrGoal,
    MathIrTemplate,
} from "../types";

type IrBody = MathIrTemplate["body"];
type ParameterValues = Record<string, string>;

interface Exact {
    numerator: bigint;
    denominator: bigint;
}

const RELATION_OPERATORS: Record<string, string> = {
    eq: "=",
    ne: "≠",
    lt: "<",
    le: "≤",
    gt: ">",
    ge: "≥",
};

const FUNCTION_OPERATORS: Record<string, string> = {
    sqrt: "sqrt",
    abs: "Abs",
    exp: "exp",
    sin: "sin",
    cos: "cos",
    tan: "tan",
    asin: "asin",
    acos: "acos",
    atan: "atan",
    log: "log",
};

/** LaTeX commands for the named IR functions; `sqrt` is handled separately. */
const TEX_FUNCTION_NAMES: Record<string, string> = {
    exp: "\\exp",
    sin: "\\sin",
    cos: "\\cos",
    tan: "\\tan",
    asin: "\\arcsin",
    acos: "\\arccos",
    atan: "\\arctan",
    log: "\\log",
};

/** A function that turns one expression node into notation for a given context. */
type IrExpressionRenderer = (
    expr: MathIrExpression,
    values: ParameterValues,
) => string;

const PRECEDENCE: Record<string, number> = {
    add: 1,
    sub: 1,
    mul: 2,
    div: 2,
    pow: 4,
};

function absolute(value: bigint): bigint {
    return value < 0n ? -value : value;
}

function greatestCommonDivisor(left: bigint, right: bigint): bigint {
    let a = absolute(left);
    let b = absolute(right);
    while (b !== 0n) {
        const remainder = a % b;
        a = b;
        b = remainder;
    }
    return a === 0n ? 1n : a;
}

function exact(numerator: bigint, denominator: bigint): Exact | null {
    if (denominator === 0n) return null;
    const sign = denominator < 0n ? -1n : 1n;
    const divisor = greatestCommonDivisor(numerator, denominator);
    return {
        numerator: (sign * numerator) / divisor,
        denominator: (sign * denominator) / divisor,
    };
}

/** Parse the exact literals the IR allows: integers, fractions and decimals. */
function parseExact(text: string): Exact | null {
    const trimmed = text.trim();
    const fraction = /^([+-]?\d+)\/(\d+)$/.exec(trimmed);
    if (fraction) {
        return exact(BigInt(fraction[1]), BigInt(fraction[2]));
    }
    const decimal = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(trimmed);
    if (decimal) {
        const sign = decimal[1] === "-" ? -1n : 1n;
        const whole = BigInt(decimal[2]);
        const fractionDigits = decimal[3] ?? "";
        const denominator = 10n ** BigInt(fractionDigits.length);
        const numerator =
            sign * (whole * denominator + BigInt(fractionDigits || "0"));
        return exact(numerator, denominator);
    }
    return null;
}

function formatExact(value: Exact): string {
    return value.denominator === 1n
        ? value.numerator.toString()
        : `${value.numerator}/${value.denominator}`;
}

function formatExactTex(value: Exact): string {
    return value.denominator === 1n
        ? value.numerator.toString()
        : `\\frac{${value.numerator}}{${value.denominator}}`;
}

/** Evaluate a parameter-only subtree so equations keep the engine's form. */
function evaluateConstant(
    expr: MathIrExpression,
    values: ParameterValues,
): Exact | null {
    if (typeof expr.num === "string") return parseExact(expr.num);
    if (typeof expr.param === "string") {
        const value = values[expr.param];
        return value === undefined ? null : parseExact(value);
    }
    if (typeof expr.sym === "string" || !expr.op) return null;

    const args = expr.args ?? [];
    const operands: Exact[] = [];
    for (const arg of args) {
        const operand = evaluateConstant(arg, values);
        if (operand === null) return null;
        operands.push(operand);
    }
    if (operands.length === 0) return null;

    switch (expr.op) {
        case "add":
            return operands.reduce((total, operand) =>
                exact(
                    total.numerator * operand.denominator +
                        operand.numerator * total.denominator,
                    total.denominator * operand.denominator,
                ) ?? total,
            );
        case "sub":
            return operands.slice(1).reduce((total, operand) => {
                const next = exact(
                    total.numerator * operand.denominator -
                        operand.numerator * total.denominator,
                    total.denominator * operand.denominator,
                );
                return next ?? total;
            }, operands[0]);
        case "mul":
            return operands.reduce((total, operand) =>
                exact(
                    total.numerator * operand.numerator,
                    total.denominator * operand.denominator,
                ) ?? total,
            );
        case "div": {
            if (operands.length !== 2 || operands[1].numerator === 0n) return null;
            return exact(
                operands[0].numerator * operands[1].denominator,
                operands[0].denominator * operands[1].numerator,
            );
        }
        case "pow": {
            if (operands.length !== 2 || operands[1].denominator !== 1n) return null;
            const exponent = operands[1].numerator;
            if (absolute(exponent) > 64n) return null;
            const magnitude = absolute(exponent);
            const numerator = operands[0].numerator ** magnitude;
            const denominator = operands[0].denominator ** magnitude;
            return exponent < 0n
                ? exact(denominator, numerator)
                : exact(numerator, denominator);
        }
        default:
            return null;
    }
}

/** Use the first declared value so reviewers see one concrete rendering. */
export function firstParameterValues(template: MathIrTemplate): ParameterValues {
    return Object.fromEntries(
        template.parameters.map((parameter) => [
            parameter.name,
            parameter.values[0] ?? parameter.name,
        ]),
    );
}

function renderChild(
    expr: MathIrExpression,
    values: ParameterValues,
    parentPrecedence: number,
    foldConstants: boolean,
): string {
    return renderNode(expr, values, parentPrecedence, foldConstants);
}

/**
 * Render one closed expression tree using the same notation as the question.
 * Constant folding is on by default so relations match the engine's canonical
 * form; pass `false` for authored text that must keep its written structure.
 */
export function renderIrExpression(
    expr: MathIrExpression,
    values: ParameterValues = {},
    parentPrecedence = 0,
    foldConstants = true,
): string {
    return renderNode(expr, values, parentPrecedence, foldConstants);
}

/**
 * Render the same expression tree as LaTeX. Fractions become `\frac`, roots
 * become `\sqrt`, products keep juxtaposition except between numbers (which use
 * `\cdot`), and named functions use their LaTeX commands.
 */
export function renderIrTex(
    expr: MathIrExpression,
    values: ParameterValues = {},
    parentPrecedence = 0,
    foldConstants = true,
): string {
    return renderTexNode(expr, values, parentPrecedence, foldConstants);
}

function texIsNumber(text: string): boolean {
    return /^-?\d+(?:\.\d+)?$/.test(text);
}

function renderTexNode(
    expr: MathIrExpression,
    values: ParameterValues,
    parentPrecedence: number,
    foldConstants: boolean,
): string {
    const constant = foldConstants ? evaluateConstant(expr, values) : null;
    if (constant !== null) return formatExactTex(constant);
    if (typeof expr.num === "string") {
        const literal = parseExact(expr.num);
        return literal ? formatExactTex(literal) : expr.num;
    }
    if (typeof expr.sym === "string") return expr.sym;
    if (typeof expr.param === "string") {
        return values[expr.param] ?? `{${expr.param}}`;
    }

    const op = expr.op ?? "";
    const args = expr.args ?? [];
    if (op === "sqrt") {
        const radicand = args[0]
            ? renderTexNode(args[0], values, 0, foldConstants)
            : "";
        return `\\sqrt{${radicand}}`;
    }
    if (op === "abs") {
        const inner = args
            .map((arg) => renderTexNode(arg, values, 0, foldConstants))
            .join(", ");
        return `\\left|${inner}\\right|`;
    }
    if (op in TEX_FUNCTION_NAMES) {
        const inner = args
            .map((arg) => renderTexNode(arg, values, 0, foldConstants))
            .join(", ");
        return `${TEX_FUNCTION_NAMES[op]}\\left(${inner}\\right)`;
    }

    const precedence = PRECEDENCE[op] ?? 5;
    let text: string;
    switch (op) {
        case "add":
            text = args
                .map((arg, index) => {
                    const piece = renderTexNode(
                        arg,
                        values,
                        precedence,
                        foldConstants,
                    );
                    if (index === 0) return piece;
                    return piece.startsWith("-")
                        ? ` - ${piece.slice(1)}`
                        : ` + ${piece}`;
                })
                .join("");
            break;
        case "sub": {
            const [left, ...rest] = args;
            text = left
                ? renderTexNode(left, values, precedence, foldConstants)
                : "";
            for (const arg of rest) {
                const piece = renderTexNode(
                    arg,
                    values,
                    precedence + 1,
                    foldConstants,
                );
                text += piece.startsWith("-")
                    ? ` + ${piece.slice(1)}`
                    : ` - ${piece}`;
            }
            break;
        }
        case "mul": {
            const pieces = args.map((arg) =>
                renderTexNode(arg, values, precedence, foldConstants),
            );
            text = pieces.reduce((joined, piece, index) => {
                if (index === 0) return piece;
                const previous = pieces[index - 1];
                const separator =
                    texIsNumber(previous) && texIsNumber(piece) ? " \\cdot " : "";
                const operand =
                    separator === "" && piece.startsWith("-")
                        ? `\\left(${piece}\\right)`
                        : piece;
                return `${joined}${separator}${operand}`;
            }, "");
            break;
        }
        case "div": {
            const [first, ...rest] = args;
            text = first
                ? renderTexNode(first, values, 0, foldConstants)
                : "";
            for (const arg of rest) {
                text = `\\frac{${text}}{${renderTexNode(
                    arg,
                    values,
                    0,
                    foldConstants,
                )}}`;
            }
            break;
        }
        case "pow": {
            const [base, exponent] = args;
            if (!base || !exponent) {
                text = "";
                break;
            }
            const baseTex = renderTexNode(
                base,
                values,
                precedence + 1,
                foldConstants,
            );
            const wrappedBase = baseTex.startsWith("-")
                ? `\\left(${baseTex}\\right)`
                : baseTex;
            const exponentTex = renderTexNode(
                exponent,
                values,
                0,
                foldConstants,
            );
            text = `${wrappedBase}^{${exponentTex}}`;
            break;
        }
        default:
            text = `\\operatorname{${op}}\\left(${args
                .map((arg) => renderTexNode(arg, values, 0, foldConstants))
                .join(", ")}\\right)`;
    }
    return precedence < parentPrecedence ? `\\left(${text}\\right)` : text;
}

function renderNode(
    expr: MathIrExpression,
    values: ParameterValues,
    parentPrecedence: number,
    foldConstants: boolean,
): string {
    const constant = foldConstants ? evaluateConstant(expr, values) : null;
    if (constant !== null) return formatExact(constant);
    if (typeof expr.sym === "string") return expr.sym;
    if (typeof expr.param === "string") {
        return values[expr.param] ?? `{${expr.param}}`;
    }

    const op = expr.op ?? "";
    const args = expr.args ?? [];
    if (op in FUNCTION_OPERATORS) {
        return `${FUNCTION_OPERATORS[op]}(${args
            .map((arg) => renderNode(arg, values, 0, foldConstants))
            .join(", ")})`;
    }

    const precedence = PRECEDENCE[op] ?? 5;
    let text: string;
    switch (op) {
        case "add":
            text = args
                .map((arg, index) => {
                    const piece = renderChild(arg, values, precedence, foldConstants);
                    if (index === 0) return piece;
                    return piece.startsWith("-")
                        ? ` - ${piece.slice(1)}`
                        : ` + ${piece}`;
                })
                .join("");
            break;
        case "sub": {
            const [left, ...rest] = args;
            text = left ? renderChild(left, values, precedence, foldConstants) : "";
            for (const arg of rest) {
                const piece = renderChild(
                    arg,
                    values,
                    precedence + 1,
                    foldConstants,
                );
                text += piece.startsWith("-") ? ` + ${piece.slice(1)}` : ` - ${piece}`;
            }
            break;
        }
        case "mul":
            text = args
                .map((arg) => renderChild(arg, values, precedence, foldConstants))
                .join("*");
            break;
        case "div":
            text = args
                .map((arg, index) =>
                    renderChild(
                        arg,
                        values,
                        index === 0 ? precedence : precedence + 1,
                        foldConstants,
                    ),
                )
                .join("/");
            break;
        case "pow":
            text = args
                .map((arg, index) =>
                    renderChild(
                        arg,
                        values,
                        index === 0 ? precedence : precedence + 1,
                        foldConstants,
                    ),
                )
                .join("^");
            break;
        default:
            text = `${op}(${args
                .map((arg) => renderNode(arg, values, 0, foldConstants))
                .join(", ")})`;
    }
    return precedence < parentPrecedence ? `(${text})` : text;
}

function renderRelation(
    given: MathIrGiven,
    values: ParameterValues,
): string | null {
    const relation = given.relation;
    if (!relation) return null;
    const operator = RELATION_OPERATORS[relation.kind ?? "eq"] ?? "=";
    return `${renderIrExpression(relation.lhs, values)} ${operator} ${renderIrExpression(
        relation.rhs,
        values,
    )}`;
}

export function renderIrRelations(
    body: IrBody,
    values: ParameterValues = {},
): string[] {
    return (body.givens ?? [])
        .filter((given) => given.kind !== "domain" && given.kind !== "dataset")
        .map((given) => renderRelation(given, values))
        .filter((relation): relation is string => relation !== null);
}

export function renderIrMatrix(
    matrix: MathIrExpression[][],
    values: ParameterValues = {},
    render: IrExpressionRenderer = renderIrExpression,
): string {
    const rows = matrix.map(
        (row) => `[${row.map((cell) => render(cell, values)).join(", ")}]`,
    );
    return `[${rows.join(", ")}]`;
}

function renderGoalDisplay(
    body: IrBody,
    values: ParameterValues,
    relations: string[],
    text: string,
): string {
    if (relations.length > 0) return relations.join(" and ");
    const goal: MathIrGoal = body.goal;
    if (goal.kind === "evaluate") return text;
    if (goal.expr) {
        const expression = renderIrExpression(goal.expr, values);
        if ((goal.kind === "derivative" || goal.kind === "integral") && goal.symbol) {
            return `f(${goal.symbol}) = ${expression}`;
        }
        return expression;
    }
    if (goal.matrix) return renderIrMatrix(goal.matrix, values);
    return text;
}

function substitutePlaceholders(
    template: string,
    values: ParameterValues,
): string {
    // Literal braces are doubled in authored text; protect them while the
    // single-brace placeholders are replaced.
    const protectedText = template
        .replaceAll("{{", "\u0001")
        .replaceAll("}}", "\u0002");
    return protectedText
        .replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (match, name: string) =>
            values[name] ?? match,
        )
        .replaceAll("\u0001", "{")
        .replaceAll("\u0002", "}");
}

export function renderIrText(
    body: IrBody,
    values: ParameterValues = {},
): string {
    const relations = renderIrRelations(body, values);
    const resolved: ParameterValues = { ...values };
    if (relations.length > 0) {
        resolved.equation = relations[0];
        resolved.equations = relations.join(" and ");
    }
    if (body.goal.expr) {
        resolved.expr = renderIrExpression(body.goal.expr, values, 0, false);
    }
    if (body.goal.matrix) {
        resolved.matrix = renderIrMatrix(body.goal.matrix, values);
    }
    return substitutePlaceholders(body.text.template, resolved);
}

export interface MathIrSample {
    text: string;
    equation: string;
}

/** Render one representative instance from the finite parameter domain. */
export function renderIrSample(template: MathIrTemplate): MathIrSample {
    const values = firstParameterValues(template);
    const relations = renderIrRelations(template.body, values);
    const text = renderIrText(template.body, values);
    return {
        text,
        equation: renderGoalDisplay(template.body, values, relations, text),
    };
}

interface IrNotation {
    render: IrExpressionRenderer;
    setOpen: string;
    setClose: string;
}

const PLAIN_NOTATION: IrNotation = {
    render: (expr, values) => renderIrExpression(expr, values),
    setOpen: "{",
    setClose: "}",
};

const TEX_NOTATION: IrNotation = {
    render: (expr, values) => renderIrTex(expr, values),
    setOpen: "\\left\\{",
    setClose: "\\right\\}",
};

function renderDistractor(
    distractor: MathIrDistractor,
    values: ParameterValues,
    notation: IrNotation,
): string | null {
    if (distractor.value) return notation.render(distractor.value, values);
    if (distractor.components && distractor.components.length > 0) {
        return `(${distractor.components
            .map((component) => notation.render(component, values))
            .join(", ")})`;
    }
    if (distractor.items && distractor.items.length > 0) {
        return `${notation.setOpen}${distractor.items
            .map((item) => notation.render(item, values))
            .join(", ")}${notation.setClose}`;
    }
    return null;
}

/** Render a wrong choice from its scalar, tuple or set form. */
export function renderIrDistractor(
    distractor: MathIrDistractor,
    values: ParameterValues = {},
): string | null {
    return renderDistractor(distractor, values, PLAIN_NOTATION);
}

/** Render a wrong choice as LaTeX for typeset previews. */
export function renderIrDistractorTex(
    distractor: MathIrDistractor,
    values: ParameterValues = {},
): string | null {
    return renderDistractor(distractor, values, TEX_NOTATION);
}

function renderAnswerRecipe(
    recipe: MathIrAnswerRecipe | null | undefined,
    values: ParameterValues,
    notation: IrNotation,
): string | null {
    if (!recipe) return null;
    const items = recipe.items ?? [];
    const renderItems = () =>
        items.map((item) => notation.render(item, values));
    switch (recipe.kind) {
        case "numeric":
        case "expression":
            return items[0] ? notation.render(items[0], values) : null;
        case "set":
            return items.length > 0
                ? `${notation.setOpen}${renderItems().join(", ")}${notation.setClose}`
                : null;
        case "tuple":
            return items.length > 0 ? `(${renderItems().join(", ")})` : null;
        case "matrix":
            return recipe.matrix
                ? renderIrMatrix(recipe.matrix, values, notation.render)
                : null;
        case "interval": {
            const interval = recipe.interval;
            if (!interval) return null;
            const lower = interval.lower
                ? notation.render(interval.lower, values)
                : "-∞";
            const upper = interval.upper
                ? notation.render(interval.upper, values)
                : "∞";
            const left = interval.lower_open === false ? "[" : "(";
            const right = interval.upper_open === false ? "]" : ")";
            return `${left}${lower}, ${upper}${right}`;
        }
        case "boolean":
            return typeof recipe.boolean === "boolean"
                ? String(recipe.boolean)
                : null;
        default:
            return null;
    }
}

/** Render the authored answer recipe the engine grades for this instance. */
export function renderIrAnswerRecipe(
    recipe: MathIrAnswerRecipe | null | undefined,
    values: ParameterValues = {},
): string | null {
    return renderAnswerRecipe(recipe, values, PLAIN_NOTATION);
}

/** Render the authored answer recipe as LaTeX for typeset previews. */
export function renderIrAnswerRecipeTex(
    recipe: MathIrAnswerRecipe | null | undefined,
    values: ParameterValues = {},
): string | null {
    return renderAnswerRecipe(recipe, values, TEX_NOTATION);
}
