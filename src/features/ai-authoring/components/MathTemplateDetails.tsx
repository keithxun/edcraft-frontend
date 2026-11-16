import { capitalize } from "../format";
import type {
    IrMathTemplateCandidate,
    MathIrGiven,
    MathIrGoal,
    MathIrTemplate,
} from "../types";
import {
    firstParameterValues,
    renderIrAnswerRecipe,
    renderIrAnswerRecipeTex,
    renderIrDistractor,
    renderIrDistractorTex,
    renderIrExpression,
    renderIrMatrix,
    renderIrRelation,
    renderIrRelationTex,
    renderIrTex,
} from "./mathIrRender";
import { MathTex } from "./MathTex";

interface MathTemplateDetailsProps {
    candidate: IrMathTemplateCandidate;
}

const GOAL_LABELS: Record<string, string> = {
    calculate: "Calculate",
    compute: "Compute",
    derivative: "Differentiate",
    determinant: "Find the determinant of",
    differentiate: "Differentiate",
    evaluate: "Evaluate",
    expand: "Expand",
    factor: "Factorise",
    factorise: "Factorise",
    factorize: "Factorise",
    find: "Find",
    graph: "Sketch",
    integral: "Integrate",
    integrate: "Integrate",
    matrix: "Find",
    prove: "Prove",
    roots: "Find the roots of",
    simplify: "Simplify",
    sketch: "Sketch",
    solve: "Solve",
    zeros: "Find the zeros of",
};

const DOMAIN_TEX: Record<string, string> = {
    complex: "\\mathbb{C}",
    integer: "\\mathbb{Z}",
    integers: "\\mathbb{Z}",
    natural: "\\mathbb{N}",
    naturals: "\\mathbb{N}",
    rational: "\\mathbb{Q}",
    rationals: "\\mathbb{Q}",
    real: "\\mathbb{R}",
    "real number": "\\mathbb{R}",
    "real numbers": "\\mathbb{R}",
};

const SAFE_SYMBOL = /^[A-Za-z][A-Za-z0-9_]*$/;
const SAFE_MATH_VALUE = /^-?\d+(?:\.\d+)?$|^[A-Za-z][A-Za-z0-9_]*$/;

function humanizeGoalKind(kind: string): string {
    const text = kind.replaceAll("_", " ").trim();
    return text.length === 0 ? kind : capitalize(text);
}

function humanizeMisconception(value: string): string {
    const text = value.replaceAll("_", " ").trim().toLowerCase();
    return text.length === 0 ? "Wrong choice" : capitalize(text);
}

function parameterNames(template: MathIrTemplate): Record<string, string> {
    return Object.fromEntries(
        template.parameters.map((parameter) => [parameter.name, parameter.name]),
    );
}

function MathDisplay({ tex, plain }: { tex: string | null; plain: string }) {
    return <span className="break-words">{tex !== null ? <MathTex latex={tex} /> : plain}</span>;
}

function goalLabel(goal: MathIrGoal): string {
    if (goal.kind === "solve" && goal.symbol) return `Solve for ${goal.symbol}`;
    return GOAL_LABELS[goal.kind] ?? humanizeGoalKind(goal.kind);
}

function goalRelationTex(body: MathIrTemplate["body"], names: Record<string, string>): string | null {
    const relations = (body.givens ?? [])
        .filter((given) => given.kind !== "domain" && given.kind !== "dataset")
        .map((given) => renderIrRelationTex(given, names));
    const rendered = relations.filter(
        (relation): relation is string => relation !== null,
    );
    if (rendered.length === 0 || rendered.length !== relations.length) return null;
    return rendered.join(" \\text{ and } ");
}

function goalRelationText(body: MathIrTemplate["body"], names: Record<string, string>): string {
    return (body.givens ?? [])
        .filter((given) => given.kind !== "domain" && given.kind !== "dataset")
        .map((given) => renderIrRelation(given, names))
        .filter((relation): relation is string => relation !== null)
        .join(" and ");
}

function goalExpression(
    goal: MathIrGoal,
    body: MathIrTemplate["body"],
    names: Record<string, string>,
): {
    tex: string | null;
    plain: string;
} {
    if (goal.expr) {
        const plainExpression = renderIrExpression(goal.expr, names);
        const expression = renderIrTex(goal.expr, names);
        if (expression === null) {
            return { tex: null, plain: plainExpression };
        }
        if (
            (goal.kind === "derivative" || goal.kind === "integral") &&
            goal.symbol &&
            SAFE_SYMBOL.test(goal.symbol)
        ) {
            return { tex: `f(${goal.symbol}) = ${expression}`, plain: `f(${goal.symbol}) = ${plainExpression}` };
        }
        return { tex: expression, plain: plainExpression };
    }
    if (goal.matrix) {
        return {
            tex: renderIrMatrix(goal.matrix, names, renderIrTex),
            plain: renderIrMatrix(goal.matrix, names) ?? "",
        };
    }
    const relationTex = goalRelationTex(body, names);
    if (relationTex !== null) {
        return { tex: relationTex, plain: goalRelationText(body, names) };
    }
    return { tex: null, plain: "" };
}

function domainGivenTex(given: MathIrGiven): string | null {
    const domain = (given.domain ?? "").trim().toLowerCase();
    const texDomain = DOMAIN_TEX[domain];
    if (!given.symbol || !texDomain || !SAFE_SYMBOL.test(given.symbol)) return null;
    return `${given.symbol} \\in ${texDomain}`;
}

function GivenLine({
    given,
    values,
}: {
    given: MathIrGiven;
    values: Record<string, string>;
}) {
    if (given.kind === "domain") {
        const plain = `${given.symbol ?? given.id} ∈ ${given.domain ?? ""}`.trim();
        return (
            <li>
                <MathDisplay tex={domainGivenTex(given)} plain={plain} />
            </li>
        );
    }
    if (given.kind === "dataset") {
        const dataset = given.values ?? [];
        const plain = dataset.join(", ");
        const tex = dataset.every((value) => SAFE_MATH_VALUE.test(value.trim()))
            ? `\\left\\{${dataset.map((value) => value.trim()).join(", ")}\\right\\}`
            : null;
        return (
            <li>
                <span className="text-muted-foreground">Data: </span>
                <MathDisplay tex={tex} plain={plain} />
            </li>
        );
    }
    if (given.relation) {
        return (
            <li>
                <MathDisplay
                    tex={renderIrRelationTex(given, values)}
                    plain={renderIrRelation(given, values) ?? given.id}
                />
            </li>
        );
    }
    return <li>{given.id}</li>;
}

/**
 * The authored maths template shown as symbols rather than the nested generic
 * IR tree. Parameters stay visible by name in the goal so reviewers can see the
 * template rather than one concrete instance.
 */
export function MathTemplateDetails({ candidate }: MathTemplateDetailsProps) {
    const template = candidate.item;
    const values = firstParameterValues(template);
    const names = parameterNames(template);
    const goal = goalExpression(template.body.goal, template.body, names);
    const answer = template.body.answer_recipe;
    const answerTex = renderIrAnswerRecipeTex(answer, values);
    const answerText = renderIrAnswerRecipe(answer, values);
    const distractors = template.body.distractors ?? [];

    return (
        <div className="space-y-3 text-xs">
            <p className="text-muted-foreground">
                {template.topic || template.body.topic}
                {candidate.difficulty ? ` · ${capitalize(candidate.difficulty)}` : ""}
            </p>

            <section aria-label="Parameters" className="space-y-1">
                <h4 className="text-xs font-medium">Parameters</h4>
                {template.parameters.length === 0 ? (
                    <p className="text-muted-foreground">None</p>
                ) : (
                    <dl className="space-y-1">
                        {template.parameters.map((parameter) => (
                            <div key={parameter.name} className="flex flex-wrap gap-x-2">
                                <dt className="font-medium">{parameter.name}</dt>
                                <dd className="break-words">
                                    {parameter.values.join(", ")}
                                </dd>
                            </div>
                        ))}
                    </dl>
                )}
            </section>

            <section aria-label="Question" className="space-y-1">
                <h4 className="text-xs font-medium">Question</h4>
                <p className="whitespace-pre-wrap break-words text-sm">
                    {template.body.text.template}
                </p>
            </section>

            <section aria-label="Givens" className="space-y-1">
                <h4 className="text-xs font-medium">Givens</h4>
                {(template.body.givens ?? []).length === 0 ? (
                    <p className="text-muted-foreground">None</p>
                ) : (
                    <ul className="space-y-1">
                        {(template.body.givens ?? []).map((given) => (
                            <GivenLine key={given.id} given={given} values={values} />
                        ))}
                    </ul>
                )}
            </section>

            <section aria-label="Goal" className="space-y-1">
                <h4 className="text-xs font-medium">Goal</h4>
                <p className="break-words text-sm">
                    <span className="font-medium">{goalLabel(template.body.goal)}</span>
                    {(goal.tex !== null || goal.plain !== "") && (
                        <>
                            {" "}
                            <MathDisplay tex={goal.tex} plain={goal.plain} />
                        </>
                    )}
                </p>
            </section>

            <section aria-label="Answer" className="space-y-1">
                <h4 className="text-xs font-medium">Answer</h4>
                {answer ? (
                    <>
                        <p className="break-words text-sm">
                            <MathDisplay
                                tex={answerTex}
                                plain={answerText ?? "The answer could not be shown."}
                            />
                        </p>
                        {answer.display && (
                            <p className="break-words text-muted-foreground">
                                {answer.display}
                            </p>
                        )}
                    </>
                ) : (
                    <p className="text-muted-foreground">No answer recipe declared.</p>
                )}
            </section>

            <section aria-label="Wrong choices" className="space-y-1">
                <h4 className="text-xs font-medium">Wrong choices</h4>
                {distractors.length === 0 ? (
                    <p className="text-muted-foreground">None</p>
                ) : (
                    <ul className="space-y-1">
                        {distractors.map((distractor, index) => (
                            <li key={index} className="space-y-0.5">
                                <p className="break-words text-sm">
                                    <MathDisplay
                                        tex={renderIrDistractorTex(distractor, values)}
                                        plain={
                                            renderIrDistractor(distractor, values) ??
                                            "The wrong choice could not be shown."
                                        }
                                    />
                                </p>
                                <p className="text-muted-foreground">
                                    Misconception:{" "}
                                    {humanizeMisconception(distractor.misconception)}
                                </p>
                                <p className="text-muted-foreground">
                                    Reason: {distractor.reason ?? "No reason"}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
