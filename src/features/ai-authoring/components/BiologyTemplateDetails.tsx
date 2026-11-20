import { capitalize } from "../format";
import type {
    BiologyDistractorRule,
    BiologyParameter,
    BiologyQuestionSpec,
    BiologyTemplateCandidate,
} from "../types";

interface BiologyTemplateDetailsProps {
    candidate: BiologyTemplateCandidate;
}

const QUANTITY_LABELS: Record<string, string> = {
    probability: "Probability",
    expected_count: "Expected count",
    ratio: "Ratio",
};

const GIVEN_LABELS: Record<string, string> = {
    dominant: "Dominant phenotype",
    recessive: "Recessive phenotype",
};

const RULE_LABELS: Record<string, string> = {
    unconditioned: "Ignores the condition",
    complement: "Complement",
    fixed_value: "Fixed value",
};

const ASSUMPTION_LABELS: Record<string, string> = {
    inheritance: "Inheritance",
    dominance: "Dominance",
    segregation: "Segregation",
    allele_count: "Allele count",
};

function humanize(value: string): string {
    const text = value.replaceAll("_", " ").trim().toLowerCase();
    return text.length === 0 ? "Not set" : capitalize(text);
}

function assumptionValue(key: string, value: string | number): string {
    if (key === "allele_count") return `${value} alleles`;
    if (key === "inheritance" && value === "autosomal") return "Autosomal";
    if (key === "dominance" && value === "complete") return "Complete";
    if (key === "segregation" && value === "mendelian") return "Mendelian";
    return String(value);
}

function parameterValues(
    parameters: BiologyParameter[],
    name: string,
): string | null {
    const parameter = parameters.find((entry) => entry.name === name);
    const values = parameter?.values ?? [];
    return values.length > 0 ? values.join(", ") : null;
}

function targetLabel(question: BiologyQuestionSpec | undefined): string {
    if (!question?.target) return "Not set";
    return `${humanize(question.target.kind)} ${question.target.param}`;
}

function givenLabel(question: BiologyQuestionSpec | undefined): string {
    const phenotype = question?.given?.phenotype;
    if (!phenotype) return "Not restricted";
    return GIVEN_LABELS[phenotype] ?? humanize(phenotype);
}

function RuleLine({ distractor }: { distractor: BiologyDistractorRule }) {
    const rule = RULE_LABELS[distractor.rule] ?? humanize(distractor.rule);
    const reason = distractor.reason?.trim() ?? "";
    const value = distractor.value?.trim() ?? "";
    const showsValue = distractor.rule === "fixed_value" && value.length > 0;

    return (
        <li className="space-y-0.5">
            <p className="break-words text-sm font-medium">{rule}</p>
            <p className="text-muted-foreground">
                Misconception: {distractor.misconception}
            </p>
            {reason.length > 0 && (
                <p className="text-muted-foreground">Reason: {reason}</p>
            )}
            {showsValue && (
                <p className="break-words text-muted-foreground">Value: {value}</p>
            )}
        </li>
    );
}

/**
 * The authored genetics template in plain words: the cross, the question it
 * asks, its allowed values and how wrong choices are built. Optional chaining
 * keeps a partial payload rendering instead of throwing.
 */
export function BiologyTemplateDetails({ candidate }: BiologyTemplateDetailsProps) {
    const template = candidate?.item;
    const gene = template?.gene;
    const assumptions = Object.entries(template?.assumptions ?? {});
    const parameters = template?.parameters ?? [];
    const question = template?.question;
    const cross = template?.cross;
    const examples = template?.answer_recipe?.claimed_examples ?? [];
    const distractors = template?.distractors ?? [];
    const answerRule = template?.answer_recipe?.rule ?? "";
    const parent1Values = cross?.parent1
        ? parameterValues(parameters, cross.parent1)
        : null;
    const parent2Values = cross?.parent2
        ? parameterValues(parameters, cross.parent2)
        : null;

    return (
        <div className="space-y-3 text-xs">
            <p className="text-muted-foreground">
                {template?.topic ?? ""}
                {candidate?.difficulty ? ` · ${capitalize(candidate.difficulty)}` : ""}
            </p>

            <section aria-label="Organism and trait" className="space-y-1">
                <h4 className="text-xs font-medium">Organism and trait</h4>
                <dl className="space-y-1">
                    <div className="flex flex-wrap gap-x-2">
                        <dt className="font-medium">Organism</dt>
                        <dd className="break-words">{template?.organism ?? ""}</dd>
                    </div>
                    <div className="flex flex-wrap gap-x-2">
                        <dt className="font-medium">Trait</dt>
                        <dd className="break-words">{template?.trait ?? ""}</dd>
                    </div>
                </dl>
            </section>

            <section aria-label="Gene" className="space-y-1">
                <h4 className="text-xs font-medium">Gene</h4>
                <dl className="space-y-1">
                    <div className="flex flex-wrap gap-x-2">
                        <dt className="font-medium">Symbol</dt>
                        <dd className="break-words italic">{gene?.symbol ?? ""}</dd>
                    </div>
                    <div className="flex flex-wrap gap-x-2">
                        <dt className="font-medium">Dominant phenotype</dt>
                        <dd className="break-words">{gene?.dominant_phenotype ?? ""}</dd>
                    </div>
                    <div className="flex flex-wrap gap-x-2">
                        <dt className="font-medium">Recessive phenotype</dt>
                        <dd className="break-words">{gene?.recessive_phenotype ?? ""}</dd>
                    </div>
                </dl>
            </section>

            <section aria-label="Assumptions" className="space-y-1">
                <h4 className="text-xs font-medium">Assumptions</h4>
                {assumptions.length === 0 ? (
                    <p className="text-muted-foreground">None</p>
                ) : (
                    <dl className="space-y-1">
                        {assumptions.map(([key, value]) => (
                            <div key={key} className="flex flex-wrap gap-x-2">
                                <dt className="font-medium">
                                    {ASSUMPTION_LABELS[key] ?? humanize(key)}
                                </dt>
                                <dd className="break-words">
                                    {assumptionValue(key, value)}
                                </dd>
                            </div>
                        ))}
                    </dl>
                )}
            </section>

            <section aria-label="Cross" className="space-y-1">
                <h4 className="text-xs font-medium">Cross</h4>
                <dl className="space-y-1">
                    <div className="flex flex-wrap gap-x-2">
                        <dt className="font-medium">Parent 1</dt>
                        <dd className="break-words">
                            {cross?.parent1 ?? "Not set"}
                            {parent1Values !== null && ` (${parent1Values})`}
                        </dd>
                    </div>
                    <div className="flex flex-wrap gap-x-2">
                        <dt className="font-medium">Parent 2</dt>
                        <dd className="break-words">
                            {cross?.parent2 ?? "Not set"}
                            {parent2Values !== null && ` (${parent2Values})`}
                        </dd>
                    </div>
                </dl>
            </section>

            <section aria-label="Question" className="space-y-1">
                <h4 className="text-xs font-medium">Question</h4>
                <dl className="space-y-1">
                    <div className="flex flex-wrap gap-x-2">
                        <dt className="font-medium">Asks for</dt>
                        <dd className="break-words">
                            {QUANTITY_LABELS[question?.quantity ?? ""] ??
                                humanize(question?.quantity ?? "")}
                        </dd>
                    </div>
                    <div className="flex flex-wrap gap-x-2">
                        <dt className="font-medium">Target</dt>
                        <dd className="break-words">{targetLabel(question)}</dd>
                    </div>
                    <div className="flex flex-wrap gap-x-2">
                        <dt className="font-medium">Given</dt>
                        <dd className="break-words">{givenLabel(question)}</dd>
                    </div>
                    <div className="flex flex-wrap gap-x-2">
                        <dt className="font-medium">Offspring count</dt>
                        <dd className="break-words">
                            {question?.offspring_count ?? "Not set"}
                        </dd>
                    </div>
                    <div className="flex flex-wrap gap-x-2">
                        <dt className="font-medium">Ratio</dt>
                        <dd className="break-words">
                            {question?.ratio_kind
                                ? humanize(question.ratio_kind)
                                : "Not applicable"}
                        </dd>
                    </div>
                </dl>
            </section>

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
                                    {humanize(parameter.kind)}:{" "}
                                    {(parameter.values ?? []).join(", ")}
                                </dd>
                            </div>
                        ))}
                    </dl>
                )}
            </section>

            <section aria-label="Answer recipe" className="space-y-1">
                <h4 className="text-xs font-medium">Answer recipe</h4>
                {answerRule.length === 0 && examples.length === 0 ? (
                    <p className="text-muted-foreground">No answer recipe declared.</p>
                ) : (
                    <>
                        {answerRule.length > 0 && (
                            <p className="text-muted-foreground">
                                Rule: {humanize(answerRule)}
                            </p>
                        )}
                        {examples.length === 0 ? (
                            <p className="text-muted-foreground">No example answers declared.</p>
                        ) : (
                            <ul className="space-y-1">
                                {examples.map((example, index) => (
                                    <li key={index} className="space-y-0.5">
                                        <p className="break-words font-mono text-sm">
                                            {example.answer}
                                        </p>
                                        <p className="break-words text-muted-foreground">
                                            {Object.entries(example.parameters ?? {})
                                                .map(([name, value]) => `${name} = ${value}`)
                                                .join(", ")}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </>
                )}
            </section>

            <section aria-label="Wrong choices" className="space-y-1">
                <h4 className="text-xs font-medium">Wrong choices</h4>
                {distractors.length === 0 ? (
                    <p className="text-muted-foreground">None</p>
                ) : (
                    <ul className="space-y-2">
                        {distractors.map((distractor, index) => (
                            <RuleLine key={index} distractor={distractor} />
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
