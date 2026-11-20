import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { capitalize } from "../format";
import type { PhysicsTemplateCandidate, ValidationLimits } from "../types";
import { MathTex } from "./MathTex";
import {
    answerFormLabel,
    misconceptionLabel,
    renderPhysicsRecipe,
    renderPhysicsRecipeTex,
    targetLabel,
} from "./physicsRender";

interface PhysicsTemplateDetailsProps {
    candidate: PhysicsTemplateCandidate;
    /** Sampled-check limits, when the review carries them. */
    limits?: ValidationLimits | null;
}

const QUANTITY_LABELS: Record<string, string> = {
    mass: "Mass",
    force: "Force",
    acceleration: "Acceleration",
};

const RULES: Record<string, string> = {
    acceleration: "a = F_net / m",
    net_force: "F_net = m a",
    mass: "m = F_net / a",
    missing_force: "F_u = s_u (m a − Σ s_i F_i)",
};

function quantityLabel(quantity: string): string {
    const known = QUANTITY_LABELS[quantity];
    if (known) return known;
    const text = quantity.replaceAll("_", " ").trim();
    if (text.length === 0) return quantity;
    return capitalize(text);
}

function PhysicsDisplay({ tex, plain }: { tex: string | null; plain: string }) {
    return (
        <span className="break-words">
            {tex !== null ? <MathTex latex={tex} /> : plain}
        </span>
    );
}

/**
 * Read the same coverage rule the validation-limits section uses, so the
 * template never claims every combination was checked when some were skipped.
 */
function coverageText(limits: ValidationLimits | null | undefined): string | null {
    if (!limits) return null;
    const checked = limits.examples_checked;
    const declared = limits.declared_domain_size;
    if (checked === null || checked === undefined) return null;
    const everyCombination =
        limits.whole_domain === true &&
        (declared === null || declared === undefined || checked >= declared);
    if (everyCombination) return `Checked for all ${checked} combinations`;
    if (declared !== null && declared !== undefined) {
        return `Checked ${checked} of ${declared} combinations`;
    }
    return `Checked ${checked} combinations`;
}

/**
 * The authored physics template shown as symbols rather than the nested generic
 * IR tree. Parameter names stay visible everywhere so reviewers see the
 * template rather than one concrete instance. Optional chaining keeps a partial
 * payload rendering instead of throwing.
 */
export function PhysicsTemplateDetails({ candidate, limits = null }: PhysicsTemplateDetailsProps) {
    const template = candidate?.item;
    const parameters = Array.isArray(template?.parameters) ? template.parameters : [];
    const body = template?.body;
    const answer = body?.answer_recipe ?? null;
    const answerTex = answer && renderPhysicsRecipeTex(answer);
    const answerText = answer && renderPhysicsRecipe(answer);
    const distractors = body?.distractors ?? [];
    const rule = template?.rule ?? RULES[body?.target ?? ""] ?? null;
    const positive = template?.axis?.positive ?? "";
    const coverage = coverageText(limits);

    if (template?.schema_version?.startsWith("physics-h2-statements/")) {
        return (
            <div className="space-y-3 text-xs">
                <p className="text-muted-foreground">
                    {template.topic}
                    {candidate?.difficulty ? ` · ${capitalize(candidate.difficulty)}` : ""}
                </p>
                {rule && <p className="text-sm">{rule}</p>}
                <p className="whitespace-pre-wrap break-words text-sm">{body?.text}</p>
                {coverage && <p className="text-muted-foreground">{coverage}</p>}
            </div>
        );
    }

    return (
        <div className="space-y-3 text-xs">
            <p className="text-muted-foreground">
                {template?.topic || template?.family_id}
                {candidate?.difficulty ? ` · ${capitalize(candidate.difficulty)}` : ""}
            </p>

            <section aria-label="Question" className="space-y-1">
                <h4 className="text-xs font-medium">Question</h4>
                <p className="whitespace-pre-wrap break-words text-sm">
                    {body?.text ?? ""}
                </p>
            </section>

            <section aria-label="Target" className="space-y-1">
                <h4 className="text-xs font-medium">Target</h4>
                <p className="text-sm">
                    {targetLabel(body?.target ?? "") || "Not set"}
                </p>
                <p className="text-muted-foreground">
                    Answer form: {answerFormLabel(body?.answer_form ?? "") || "Not set"}
                </p>
            </section>

            {template?.schema_version?.startsWith("physics-1d/") && (
                <section aria-label="Positive direction" className="space-y-1">
                    <h4 className="text-xs font-medium">Positive direction</h4>
                    <p className="text-sm">{positive ? capitalize(positive) : "Not set"}</p>
                </section>
            )}

            <section aria-label="Parameters" className="space-y-1">
                <h4 className="text-xs font-medium">Parameters</h4>
                {parameters.length === 0 ? (
                    <p className="text-muted-foreground">None</p>
                ) : (
                    <Table className="text-xs [&_td]:whitespace-normal [&_td]:align-top">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="h-8 px-2">Name</TableHead>
                                <TableHead className="h-8 px-2">Quantity</TableHead>
                                <TableHead className="h-8 px-2">Unit</TableHead>
                                <TableHead className="h-8 px-2">Values</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {parameters.map((parameter) => (
                                <TableRow key={parameter.name}>
                                    <TableCell className="px-2 font-mono text-xs">
                                        {parameter.name}
                                    </TableCell>
                                    <TableCell className="px-2">
                                        {quantityLabel(parameter.quantity ?? "")}
                                    </TableCell>
                                    <TableCell className="px-2">
                                        {parameter.unit ?? ""}
                                    </TableCell>
                                    <TableCell className="px-2">
                                        {(parameter.values ?? []).join(", ")}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </section>

            <section aria-label="Rule" className="space-y-1">
                <h4 className="text-xs font-medium">Rule</h4>
                <p className="break-words text-sm">
                    {rule ?? "No rule declared."}
                </p>
            </section>

            <section aria-label="Answer" className="space-y-1">
                <h4 className="text-xs font-medium">Answer</h4>
                {answer ? (
                    <p className="break-words text-sm">
                        <PhysicsDisplay
                            tex={answerTex}
                            plain={answerText ?? "The answer could not be shown."}
                        />
                    </p>
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
                            const explanation = distractor.explanation?.trim() ?? "";
                            return (
                                <li key={index} className="space-y-0.5">
                                    <p className="break-words text-sm">
                                        <PhysicsDisplay
                                            tex={renderPhysicsRecipeTex(distractor.recipe)}
                                            plain={
                                                renderPhysicsRecipe(distractor.recipe) ??
                                                "The wrong choice could not be shown."
                                            }
                                        />
                                    </p>
                                    <p className="text-muted-foreground">
                                        Misconception:{" "}
                                        {misconceptionLabel(distractor.misconception)}
                                    </p>
                                    {explanation.length > 0 && (
                                        <p className="text-muted-foreground">
                                            Explanation: {explanation}
                                        </p>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            {coverage !== null && (
                <p className="text-muted-foreground">{coverage}</p>
            )}
        </div>
    );
}
