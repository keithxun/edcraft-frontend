import { QuestionContent } from "@/features/questions/components/QuestionContent";
import type {
    AuthoringTemplateCandidate,
    BiologyTemplateCandidate,
    ChemistryReactionSnapshot,
    ChemistryTemplateCandidate,
    CodeTemplateCandidate,
    IrMathTemplateCandidate,
    PhysicsTemplateCandidate,
    ReviewTemplate,
} from "../types";
import { showsDomainView } from "../domains";
import { ChemEquation } from "./ChemFormula";
import { chemistryTargetLabel } from "./chemistryRender";
import { EvidenceDetails } from "./EvidenceDetails";
import {
    firstParameterValues,
    renderIrAnswerRecipe,
    renderIrAnswerRecipeTex,
    renderIrDistractor,
    renderIrDistractorTex,
    renderIrSample,
    renderIrSampleEquationTex,
} from "./mathIrRender";
import { MathTex } from "./MathTex";
import {
    misconceptionLabel,
    renderPhysicsRecipe,
    renderPhysicsRecipeTex,
    renderPhysicsSampleStem,
} from "./physicsRender";
import {
    isBiologyTemplateCandidate,
    isChemistryTemplateCandidate,
    isIrMathTemplateCandidate,
    isPhysicsTemplateCandidate,
    isRecord,
} from "./questionPayload";
import { QuestionInputs } from "./QuestionInputs";
import { ReadOnlyCode } from "./ReadOnlyCode";

interface TemplateQuestionPreviewProps {
    template: ReviewTemplate;
    /** Authoring domain from the review request. */
    domain: string;
}

function renderExpression(value: unknown) {
    return <span className="break-words font-mono text-sm">{String(value)}</span>;
}

function isCodeCandidate(
    candidate: AuthoringTemplateCandidate,
): candidate is CodeTemplateCandidate {
    if (!isRecord(candidate)) return false;
    const record: Record<string, unknown> = candidate;
    return (
        typeof record.code === "string" &&
        typeof record.question_template === "string" &&
        Array.isArray(record.distractors)
    );
}

/** Code-domain template rendered the way a student would see it. */
function CodeTemplateView({ candidate }: { candidate: CodeTemplateCandidate }) {
    const choices = [
        { value: candidate.answer_expression, correct: true, reason: undefined },
        ...candidate.distractors.map((distractor) => ({
            value: distractor.expression,
            correct: false,
            reason: distractor.reason_template,
        })),
    ];
    return (
        <article className="space-y-4">
            <h3 className="min-w-0 text-base font-medium">{candidate.question_template}</h3>

            <ReadOnlyCode code={candidate.code} label="Template code" />

            <QuestionContent
                questionType={candidate.question_type ?? "mcq"}
                options={choices.map((choice) => choice.value)}
                optionExplanations={choices.map((choice) =>
                    choice.correct ? undefined : choice.reason,
                )}
                correctIndices={[0]}
                answer={candidate.answer_expression}
                hideAnswerButton
                showAnswerByDefault
                hideAnswerSummary
                renderValue={renderExpression}
            />
        </article>
    );
}

/**
 * Generic IR template rendered as one representative instance. The answer is
 * the authored recipe the deterministic engine grades, so this view can show
 * it without deriving anything from the problem statement.
 */
function IrMathTemplateView({
    candidate,
}: {
    candidate: IrMathTemplateCandidate;
}) {
    const template = candidate.item;
    const values = firstParameterValues(template);
    const sample = renderIrSample(template);
    const equationTex = renderIrSampleEquationTex(template);
    const answer = renderIrAnswerRecipe(template.body.answer_recipe, values);
    const answerTex = renderIrAnswerRecipeTex(template.body.answer_recipe, values);
    const parameters = Object.fromEntries(
        template.parameters.map((parameter) => [parameter.name, parameter.values]),
    );
    const showEquation =
        sample.equation !== sample.text && !sample.text.includes(sample.equation);

    return (
        <article className="space-y-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {template.topic}
            </p>

            <h3 className="min-w-0 text-base font-medium">{sample.text}</h3>

            {showEquation && (
                <p className="break-words text-center text-xl font-medium">
                    {equationTex !== null ? (
                        <MathTex latex={equationTex} />
                    ) : (
                        sample.equation
                    )}
                </p>
            )}

            <p className="text-xs text-muted-foreground">
                Sample instance uses the first value of each parameter. The
                deterministic engine grades the authored answer recipe for
                every combination.
            </p>

            <section aria-label="Template parameters" className="space-y-1">
                <h4 className="text-sm font-medium">Parameters</h4>
                <QuestionInputs inputs={parameters} />
            </section>

            <section aria-label="Goal" className="space-y-1">
                <h4 className="text-sm font-medium">Goal</h4>
                <p className="font-mono text-sm">{template.body.goal.kind}</p>
            </section>

            <section aria-label="Correct answer" className="space-y-1">
                <h4 className="text-sm font-medium">
                    Correct answer (authored recipe)
                </h4>
                {answer !== null ? (
                    <p className="break-words font-mono text-sm">
                        {answerTex !== null ? <MathTex latex={answerTex} /> : answer}
                    </p>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        No answer recipe declared.
                    </p>
                )}
            </section>

            <section aria-label="Distractors" className="space-y-2">
                <h4 className="text-sm font-medium">Wrong choices</h4>
                <ul className="space-y-2">
                    {template.body.distractors.map((distractor, index) => {
                        const rendered = renderIrDistractor(distractor, values);
                        const renderedTex = renderIrDistractorTex(distractor, values);
                        return (
                            <li
                                key={index}
                                className="rounded border bg-background/60 p-2"
                            >
                                {rendered !== null && (
                                    <p className="break-words font-mono text-sm">
                                        {renderedTex !== null ? (
                                            <MathTex latex={renderedTex} />
                                        ) : (
                                            rendered
                                        )}
                                    </p>
                                )}
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {distractor.reason || distractor.misconception}
                                </p>
                            </li>
                        );
                    })}
                </ul>
            </section>
        </article>
    );
}

/** The authored template with each placeholder marked while staying readable. */
function TemplateText({ template }: { template: string }) {
    return (
        <span className="whitespace-pre-wrap break-words">
            {template.split(/(\{[^}]+\})/).map((part, index) =>
                part.startsWith("{") && part.endsWith("}") ? (
                    <span key={index} className="rounded bg-muted px-1 font-mono text-sm">
                        {part}
                    </span>
                ) : (
                    <span key={index}>{part}</span>
                ),
            )}
        </span>
    );
}

/**
 * Genetics template rendered as the authored text, with placeholders marked,
 * plus the answer the recipe claims for its first example.
 */
function BiologyTemplateView({ candidate }: { candidate: BiologyTemplateCandidate }) {
    const template = candidate?.item;
    const text = template?.text?.template ?? "";
    const example = template?.answer_recipe?.claimed_examples?.[0] ?? null;

    return (
        <article className="space-y-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {template?.topic ?? ""}
            </p>

            <h3 className="min-w-0 text-base font-medium">
                <TemplateText template={text} />
            </h3>

            <p className="text-xs text-muted-foreground">
                Each placeholder is filled with the values of a generated question.
            </p>

            <section aria-label="Claimed example answer" className="space-y-1">
                <h4 className="text-sm font-medium">Claimed example answer</h4>
                {example ? (
                    <>
                        <p className="break-words font-mono text-sm">{example.answer}</p>
                        <p className="break-words text-xs text-muted-foreground">
                            {Object.entries(example.parameters ?? {})
                                .map(([name, value]) => `${name} = ${value}`)
                                .join(", ")}
                        </p>
                    </>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        No example answer declared.
                    </p>
                )}
            </section>
        </article>
    );
}

/** The skeleton equation for one catalogue reaction. */
function reactionSkeleton(reaction: ChemistryReactionSnapshot): string {
    const reactants = (reaction.reactants ?? []).join(" + ");
    const products = (reaction.products ?? []).join(" + ");
    return `${reactants} → ${products}`;
}

/**
 * Chemistry template rendered as one representative reaction. The catalogue
 * decides which reactions can appear, so the preview names the count rather
 * than inventing a concrete question.
 */
function ChemistryTemplateView({ candidate }: { candidate: ChemistryTemplateCandidate }) {
    const item = candidate.item;
    const reactions = candidate.catalogue?.reactions ?? [];
    const first = reactions[0];
    const contexts = candidate.catalogue?.contexts ?? [];
    const family = candidate.catalogue?.family;
    const familyTitle = family?.title ?? "";
    const familyDescription = family?.description ?? "";
    const targetKind = item?.target?.kind ?? null;
    const count = reactions.length;
    let varietyNote = count === 1
            ? "Every generated question uses the same reaction, so seeds do not vary the question."
            : `Each generated question uses one of ${count} reactions.`;
    if (targetKind === "concept") {
        varietyNote = contexts.length === 1
            ? "Every generated question uses this context."
            : `Each generated question uses one of ${contexts.length} contexts.`;
    }
    if (targetKind === "theoretical_yield") {
        const varyingAmounts = item.parameters.some((axis) =>
            (axis.name === "reactant_1_mmol" || axis.name === "reactant_2_mmol")
            && axis.values.length > 1,
        );
        varietyNote = varyingAmounts
            ? "Generated questions vary the starting reactant amounts."
            : `Each generated question uses fixed starting amounts and one of ${count} reactions.`;
    }

    return (
        <article className="space-y-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {familyTitle}
            </p>

            {familyDescription.length > 0 && (
                <h3 className="min-w-0 text-base font-medium">{familyDescription}</h3>
            )}

            {first && (
                <p className="break-words text-center text-xl font-medium">
                    <ChemEquation equation={reactionSkeleton(first)} />
                </p>
            )}

            {contexts[0] && <p className="break-words text-sm">{contexts[0].question}</p>}

            <section aria-label="Target" className="space-y-1">
                <h4 className="text-sm font-medium">Target</h4>
                <p className="text-sm">
                    {targetKind === null
                        ? "Not specified"
                        : chemistryTargetLabel(targetKind)}
                </p>
            </section>

            <p className="text-xs text-muted-foreground">
                {varietyNote}
            </p>
        </article>
    );
}

/**
 * Physics template rendered as one representative instance. The stem fills in
 * the first value of each parameter; the recipe stays symbolic so reviewers see
 * the template the engine grades.
 */
function PhysicsTemplateView({ candidate }: { candidate: PhysicsTemplateCandidate }) {
    const template = candidate.item;
    const body = template.body;
    const rows = Array.isArray(template.parameters) ? template.parameters : [];
    const parameters = Object.fromEntries(
        rows.map((parameter) => [
            parameter.name,
            parameter.values,
        ]),
    );
    const answer = body.answer_recipe ? renderPhysicsRecipe(body.answer_recipe) : null;
    const answerTex = body.answer_recipe ? renderPhysicsRecipeTex(body.answer_recipe) : null;
    const distractors = body.distractors ?? [];

    return (
        <article className="space-y-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {template.topic || template.family_id}
            </p>

            <h3 className="min-w-0 whitespace-pre-wrap text-base font-medium">
                {renderPhysicsSampleStem(template)}
            </h3>

            <p className="text-xs text-muted-foreground">
                {template.schema_version === "physics-h2/1.0"
                    ? "Sample uses the first value of each parameter."
                    : "Sample uses the first value of each parameter. EdCraft adds the direction convention, the assumptions and the question sentence."}
            </p>

            <section aria-label="Template parameters" className="space-y-1">
                <h4 className="text-sm font-medium">Parameters</h4>
                <QuestionInputs inputs={parameters} />
            </section>

            <section aria-label="Correct answer" className="space-y-1">
                <h4 className="text-sm font-medium">
                    Correct answer (authored recipe)
                </h4>
                {answer !== null ? (
                    <p className="break-words font-mono text-sm">
                        {answerTex !== null ? <MathTex latex={answerTex} /> : answer}
                    </p>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        No answer recipe declared.
                    </p>
                )}
            </section>

            <section aria-label="Distractors" className="space-y-2">
                <h4 className="text-sm font-medium">Wrong choices</h4>
                <ul className="space-y-2">
                    {distractors.map((distractor, index) => {
                        const recipe = renderPhysicsRecipe(distractor.recipe);
                        const recipeTex = renderPhysicsRecipeTex(distractor.recipe);
                        return (
                            <li
                                key={index}
                                className="rounded border bg-background/60 p-2"
                            >
                                {recipe !== null && (
                                    <p className="break-words font-mono text-sm">
                                        {recipeTex !== null ? (
                                            <MathTex latex={recipeTex} />
                                        ) : (
                                            recipe
                                        )}
                                    </p>
                                )}
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {misconceptionLabel(distractor.misconception)}
                                </p>
                            </li>
                        );
                    })}
                </ul>
            </section>
        </article>
    );
}

/** Domain-neutral fallback: show the candidate fields without code assumptions. */
function GenericTemplateView({ candidate }: { candidate: AuthoringTemplateCandidate }) {
    const record: Record<string, unknown> = isRecord(candidate) ? candidate : {};
    const heading =
        typeof record.question_template === "string"
            ? record.question_template
            : typeof record.question === "string"
              ? record.question
              : "Question template";

    return (
        <article className="space-y-4">
            <h3 className="min-w-0 text-base font-medium">{heading}</h3>
            <EvidenceDetails
                summary="Template fields"
                value={candidate}
                variant="structured"
            />
        </article>
    );
}

/**
 * The reusable template shown the way a student would see the generated
 * question. Template metadata stays in Technical details so reviewers can
 * focus on the question itself.
 */
export function TemplateQuestionPreview({
    template,
    domain,
}: TemplateQuestionPreviewProps) {
    const { candidate } = template;
    // Each specialised view assumes its candidate shape; other domains take
    // the field-based fallback.
    const showMath =
        showsDomainView(domain, "math") && isIrMathTemplateCandidate(candidate);
    const showBiology =
        showsDomainView(domain, "biology") && isBiologyTemplateCandidate(candidate);
    const showChemistry =
        showsDomainView(domain, "chemistry") &&
        isChemistryTemplateCandidate(candidate);
    const showPhysics =
        showsDomainView(domain, "physics") && isPhysicsTemplateCandidate(candidate);
    const showCode =
        showsDomainView(domain, "code") && isCodeCandidate(candidate);

    if (showChemistry) {
        return <ChemistryTemplateView candidate={candidate} />;
    }
    if (showMath) {
        return <IrMathTemplateView candidate={candidate} />;
    }
    if (showBiology) {
        return <BiologyTemplateView candidate={candidate} />;
    }
    if (showPhysics) {
        return <PhysicsTemplateView candidate={candidate} />;
    }
    return showCode ? (
        <CodeTemplateView candidate={candidate} />
    ) : (
        <GenericTemplateView candidate={candidate} />
    );
}
