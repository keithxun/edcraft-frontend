import { capitalize } from "../format";
import type {
    IrMathTemplateCandidate,
    MathIrGiven,
    MathIrGoal,
    MathIrTemplate,
} from "../types";
import {
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

// The closed GoalKind vocabulary from the maths IR schema.
const GOAL_LABELS: Record<string, string> = {
    evaluate: "Evaluate",
    solve: "Solve",
    simplify: "Simplify",
    factor: "Factorise",
    expand: "Expand",
    derivative: "Differentiate",
    integral: "Integrate",
    limit: "Find the limit of",
    determinant: "Find the determinant of",
    eigenvalues: "Find the eigenvalues of",
};

// The closed Domain literals from the maths IR schema.
const DOMAIN_TEX: Record<string, string> = {
    real: "\\mathbb{R}",
    integer: "\\mathbb{Z}",
    rational: "\\mathbb{Q}",
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

function parameterNames(
    parameters: MathIrTemplate["parameters"],
): Record<string, string> {
    return Object.fromEntries(
        parameters.map((parameter) => [parameter.name, parameter.name]),
    );
}

function ordinal(value: number): string {
    const mod100 = value % 100;
    if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
    if (value % 10 === 1) return `${value}st`;
    if (value % 10 === 2) return `${value}nd`;
    if (value % 10 === 3) return `${value}rd`;
    return `${value}th`;
}

function MathDisplay({ tex, plain }: { tex: string | null; plain: string }) {
    return <span className="break-words">{tex !== null ? <MathTex latex={tex} /> : plain}</span>;
}

function goalLabel(goal: MathIrGoal): string {
    if (goal.kind === "solve") {
        const symbols = (goal.symbols ?? []).filter(Boolean);
        if (symbols.length > 0) return `Solve for ${symbols.join(", ")}`;
        if (goal.symbol) return `Solve for ${goal.symbol}`;
        return "Solve";
    }
    if (goal.kind === "derivative") {
        const order = goal.order ?? 1;
        if (order <= 1) return "Differentiate";
        if (order === 2) return "Find the second derivative of";
        return `Find the ${ordinal(order)} derivative of`;
    }
    return GOAL_LABELS[goal.kind] ?? humanizeGoalKind(goal.kind);
}

function relationGivens(givens: MathIrGiven[]): MathIrGiven[] {
    return givens.filter(
        (given) => given.kind !== "domain" && given.kind !== "dataset",
    );
}

function goalRelationTex(
    body: MathIrTemplate["body"] | undefined,
    names: Record<string, string>,
): string | null {
    const relations = relationGivens(body?.givens ?? []).map((given) =>
        renderIrRelationTex(given, names),
    );
    const rendered = relations.filter(
        (relation): relation is string => relation !== null,
    );
    if (rendered.length === 0 || rendered.length !== relations.length) return null;
    return rendered.join(" \\text{ and } ");
}

function goalRelationText(
    body: MathIrTemplate["body"] | undefined,
    names: Record<string, string>,
): string {
    return relationGivens(body?.givens ?? [])
        .map((given) => renderIrRelation(given, names))
        .filter((relation): relation is string => relation !== null)
        .join(" and ");
}

function goalExpression(
    goal: MathIrGoal,
    body: MathIrTemplate["body"] | undefined,
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
    names,
}: {
    given: MathIrGiven;
    names: Record<string, string>;
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
                    tex={renderIrRelationTex(given, names)}
                    plain={renderIrRelation(given, names) ?? given.id}
                />
            </li>
        );
    }
    return <li>{given.id}</li>;
}

/**
 * The authored maths template shown as symbols rather than the nested generic
 * IR tree. Parameter names stay visible everywhere so reviewers see the
 * template rather than one concrete instance. Optional chaining keeps a partial
 * payload rendering instead of throwing.
 */
export function MathTemplateDetails({ candidate }: MathTemplateDetailsProps) {
    const template = candidate?.item;
    const parameters = template?.parameters ?? [];
    const body = template?.body;
    const givens = body?.givens ?? [];
    const names = parameterNames(parameters);
    const goal: MathIrGoal = body?.goal ?? { kind: "" };
    const goalMath = goalExpression(goal, body, names);
    const answer = body?.answer_recipe ?? null;
    const answerTex = renderIrAnswerRecipeTex(answer, names);
    const answerText = renderIrAnswerRecipe(answer, names);
    const distractors = body?.distractors ?? [];
    // A goal built from relation givens already shows them, so do not list the
    // same relations again under Givens.
    const relationsInGoal =
        !goal.expr && !goal.matrix && goalMath.tex !== null;
    const visibleGivens = relationsInGoal
        ? givens.filter(
              (given) => given.kind === "domain" || given.kind === "dataset",
          )
        : givens;

    return (
        <div className="space-y-3 text-xs">
            <p className="text-muted-foreground">
                {template?.topic || body?.topic || ""}
                {candidate?.difficulty ? ` · ${capitalize(candidate.difficulty)}` : ""}
            </p>

            <section aria-label="Parameters" className="space-y-1">
                <h4 className="text-xs font-medium">Parameters</h4>
                {parameters.length === 0 ? (
                    <p className="text-muted-foreground">None</p>
                ) : (
                    <dl className="space-y-1">
                        {parameters.map((parameter) => (
                            <div key={parameter.name} className="flex flex-wrap gap-x-2">
                                <dt className="font-medium">{parameter.name}</dt>
                                <dd className="break-words">
                                    {(parameter.values ?? []).join(", ")}
                                </dd>
                            </div>
                        ))}
                    </dl>
                )}
            </section>

            <section aria-label="Question" className="space-y-1">
                <h4 className="text-xs font-medium">Question</h4>
                <p className="whitespace-pre-wrap break-words text-sm">
                    {body?.text?.template ?? ""}
                </p>
            </section>

            {(!relationsInGoal || visibleGivens.length > 0) && (
                <section aria-label="Givens" className="space-y-1">
                    <h4 className="text-xs font-medium">Givens</h4>
                    {visibleGivens.length === 0 ? (
                        <p className="text-muted-foreground">None</p>
                    ) : (
                        <ul className="space-y-1">
                            {visibleGivens.map((given) => (
                                <GivenLine key={given.id} given={given} names={names} />
                            ))}
                        </ul>
                    )}
                </section>
            )}

            <section aria-label="Goal" className="space-y-1">
                <h4 className="text-xs font-medium">Goal</h4>
                <p className="break-words text-sm">
                    <span className="font-medium">{goalLabel(goal)}</span>
                    {(goalMath.tex !== null || goalMath.plain !== "") && (
                        <>
                            {" "}
                            <MathDisplay tex={goalMath.tex} plain={goalMath.plain} />
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
                        {distractors.map((distractor, index) => {
                            const reason = distractor.reason?.trim() ?? "";
                            return (
                                <li key={index} className="space-y-0.5">
                                    <p className="break-words text-sm">
                                        <MathDisplay
                                            tex={renderIrDistractorTex(distractor, names)}
                                            plain={
                                                renderIrDistractor(distractor, names) ??
                                                "The wrong choice could not be shown."
                                            }
                                        />
                                    </p>
                                    <p className="text-muted-foreground">
                                        Misconception:{" "}
                                        {humanizeMisconception(distractor.misconception)}
                                    </p>
                                    {reason.length > 0 && (
                                        <p className="text-muted-foreground">
                                            Reason: {reason}
                                        </p>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>
        </div>
    );
}
