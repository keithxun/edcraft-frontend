import type {
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

const FUNCTION_OPERATORS = new Set([
    "sqrt",
    "abs",
    "exp",
    "sin",
    "cos",
    "tan",
    "asin",
    "acos",
    "atan",
    "log",
]);

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

/** Evaluate a parameter-only subtree so previews keep the solver's clean form. */
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
): string {
    return renderIrExpression(expr, values, parentPrecedence);
}

/** Render one closed expression tree using the same notation as the question. */
export function renderIrExpression(
    expr: MathIrExpression,
    values: ParameterValues = {},
    parentPrecedence = 0,
): string {
    const constant = evaluateConstant(expr, values);
    if (constant !== null) return formatExact(constant);
    if (typeof expr.sym === "string") return expr.sym;
    if (typeof expr.param === "string") {
        return values[expr.param] ?? `{${expr.param}}`;
    }

    const op = expr.op ?? "";
    const args = expr.args ?? [];
    if (FUNCTION_OPERATORS.has(op)) {
        return `${op}(${args
            .map((arg) => renderIrExpression(arg, values))
            .join(", ")})`;
    }

    const precedence = PRECEDENCE[op] ?? 5;
    let text: string;
    switch (op) {
        case "add":
            text = args
                .map((arg, index) => {
                    const piece = renderChild(arg, values, precedence);
                    if (index === 0) return piece;
                    return piece.startsWith("-")
                        ? ` - ${piece.slice(1)}`
                        : ` + ${piece}`;
                })
                .join("");
            break;
        case "sub": {
            const [left, ...rest] = args;
            text = left ? renderChild(left, values, precedence) : "";
            for (const arg of rest) {
                const piece = renderChild(arg, values, precedence + 1);
                text += piece.startsWith("-") ? ` + ${piece.slice(1)}` : ` - ${piece}`;
            }
            break;
        }
        case "mul":
            text = args.map((arg) => renderChild(arg, values, precedence)).join("*");
            break;
        case "div":
            text = args
                .map((arg, index) =>
                    renderChild(arg, values, index === 0 ? precedence : precedence + 1),
                )
                .join("/");
            break;
        case "pow":
            text = args
                .map((arg, index) =>
                    renderChild(arg, values, index === 0 ? precedence : precedence + 1),
                )
                .join("^");
            break;
        default:
            text = `${op}(${args
                .map((arg) => renderIrExpression(arg, values))
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
): string {
    const rows = matrix.map(
        (row) =>
            `[${row.map((cell) => renderIrExpression(cell, values)).join(", ")}]`,
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
        resolved.expr = renderIrExpression(body.goal.expr, values);
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

/** Render a wrong choice from its scalar, tuple or set form. */
export function renderIrDistractor(
    distractor: MathIrDistractor,
    values: ParameterValues = {},
): string | null {
    if (distractor.value) return renderIrExpression(distractor.value, values);
    if (distractor.components && distractor.components.length > 0) {
        return `(${distractor.components
            .map((component) => renderIrExpression(component, values))
            .join(", ")})`;
    }
    if (distractor.items && distractor.items.length > 0) {
        return `{${distractor.items
            .map((item) => renderIrExpression(item, values))
            .join(", ")}}`;
    }
    return null;
}
