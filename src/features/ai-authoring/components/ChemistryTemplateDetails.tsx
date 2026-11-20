import { Fragment } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { capitalize } from "../format";
import type { ChemistryReactionSnapshot, ChemistryTemplateCandidate } from "../types";
import { ChemEquation, ChemFormula } from "./ChemFormula";
import {
    chemistryMisconceptionLabel,
    chemistryReasonText,
    chemistryRecipeText,
    chemistrySlotLabel,
    chemistryTargetLabel,
} from "./chemistryRender";
import { isRecord } from "./questionPayload";

interface ChemistryCheckEvidence {
    tool: string;
    details?: unknown;
}

interface ChemistryTemplateDetailsProps {
    candidate: ChemistryTemplateCandidate;
    /** Balance and option check evidence, when the review carries it. */
    checks?: readonly ChemistryCheckEvidence[];
}

function evidenceRows(
    checks: readonly ChemistryCheckEvidence[] | undefined,
    tool: string,
): Record<string, unknown>[] {
    const check = checks?.find((entry) => entry.tool === tool);
    if (!check || !isRecord(check.details)) return [];
    const rows = check.details.rows;
    return Array.isArray(rows) ? rows.filter(isRecord) : [];
}

function cellText(value: unknown): string {
    if (value === null || value === undefined || value === "") return "—";
    if (Array.isArray(value)) return value.map(cellText).join(", ");
    // Recipes and reasons are rendered by name, never by coercing an object.
    if (typeof value === "object") return "—";
    return String(value);
}

/** Option 0 is the key; every later option is numbered as a distractor. */
function optionLabel(value: unknown): string {
    if (typeof value === "number" && Number.isInteger(value)) {
        return value === 0 ? "Key" : `Distractor ${value}`;
    }
    return cellText(value);
}

function FormulaList({ formulas }: { formulas: string[] }) {
    return (
        <>
            {formulas.map((formula, index) => (
                <Fragment key={`${formula}-${index}`}>
                    {index > 0 ? " + " : null}
                    <ChemFormula formula={formula} />
                </Fragment>
            ))}
        </>
    );
}

function Skeleton({ reaction }: { reaction: ChemistryReactionSnapshot }) {
    return (
        <span className="break-words">
            <FormulaList formulas={reaction.reactants ?? []} />
            {" → "}
            <FormulaList formulas={reaction.products ?? []} />
        </span>
    );
}

function EquationCell({ value }: { value: unknown }) {
    return typeof value === "string" && value.length > 0 ? (
        <ChemEquation equation={value} />
    ) : (
        <span>{cellText(value)}</span>
    );
}

/**
 * The authored chemistry template shown as reactions and recipes rather than
 * the nested payload. Optional check evidence adds the balance rows and option
 * verdicts when the review carries them; a partial payload still renders.
 */
export function ChemistryTemplateDetails({
    candidate,
    checks,
}: ChemistryTemplateDetailsProps) {
    const item = candidate?.item;
    const targetKind = item?.target?.kind ?? null;
    const parameters = item?.parameters ?? [];
    const speciesValues = parameters
        .filter((parameter) => parameter.name === "species")
        .flatMap((parameter) => parameter.values ?? []);
    const distractors = item?.distractors ?? [];
    const catalogue = candidate?.catalogue;
    const family = catalogue?.family;
    const familyTitle = family?.title ?? "";
    const familyDescription = family?.description ?? "";
    const reactions = catalogue?.reactions ?? [];
    const contexts = catalogue?.contexts ?? [];
    const balanceRows = evidenceRows(checks, "chemistry_verify_balance");
    const optionRows = evidenceRows(checks, "chemistry_verify_options");
    const showAskedColumn = optionRows.some(
        (row) => typeof row.asked_slot === "string" && row.asked_slot.length > 0,
    );
    const heading = [
        familyTitle,
        candidate?.difficulty ? capitalize(candidate.difficulty) : "",
    ]
        .filter((part) => part.length > 0)
        .join(" · ");

    return (
        <div className="space-y-3 text-xs">
            <p className="text-muted-foreground">{heading}</p>

            <section aria-label="Target" className="space-y-1">
                <h4 className="text-xs font-medium">Target</h4>
                <p className="break-words text-sm">
                    {targetKind === null
                        ? "Not specified"
                        : chemistryTargetLabel(targetKind)}
                </p>
            </section>

            {(familyTitle.length > 0 || familyDescription.length > 0) && (
                <section
                    aria-label="Family and context sentence (from the catalogue)"
                    className="space-y-1"
                >
                    <h4 className="text-xs font-medium">
                        Family and context sentence (from the catalogue)
                    </h4>
                    {familyTitle.length > 0 && (
                        <p className="break-words text-sm font-medium">{familyTitle}</p>
                    )}
                    {familyDescription.length > 0 && (
                        <p className="whitespace-pre-wrap break-words text-sm">
                            {familyDescription}
                        </p>
                    )}
                </section>
            )}

            {targetKind === "concept" ? (
                <section aria-label="Question contexts" className="space-y-1">
                    <h4 className="text-xs font-medium">Question contexts</h4>
                    <ul className="space-y-1">
                        {contexts.map((context) => (
                            <li key={context.id}>{context.question}</li>
                        ))}
                    </ul>
                </section>
            ) : (
                <section aria-label="Reactions" className="space-y-1">
                    <h4 className="text-xs font-medium">Reactions</h4>
                    {reactions.length === 0 ? (
                        <p className="text-muted-foreground">None</p>
                    ) : (
                        <Table className="text-xs [&_td]:whitespace-normal [&_td]:align-top">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="h-8 px-2">Name</TableHead>
                                    <TableHead className="h-8 px-2">Skeleton</TableHead>
                                    <TableHead className="h-8 px-2">Source</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reactions.map((reaction) => (
                                    <TableRow key={reaction.id}>
                                        <TableCell className="px-2">{reaction.name}</TableCell>
                                        <TableCell className="px-2">
                                            <Skeleton reaction={reaction} />
                                        </TableCell>
                                        <TableCell className="px-2">{reaction.source}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </section>
            )}

            {targetKind === "theoretical_yield" && item.target.kind === "theoretical_yield" && (
                <section aria-label="Yield inputs" className="space-y-1">
                    <h4 className="text-xs font-medium">Yield inputs</h4>
                    <p>Asked product: {chemistrySlotLabel(item.target.product)}</p>
                    {parameters
                        .filter((axis) => axis.name === "reactant_1_mmol" || axis.name === "reactant_2_mmol")
                        .map((axis) => (
                            <p key={axis.name}>
                                {axis.name === "reactant_1_mmol" ? "Reactant 1" : "Reactant 2"}: {axis.values.join(", ")} mmol
                            </p>
                        ))}
                </section>
            )}

            {targetKind === "coefficient" && speciesValues.length > 0 && (
                <section aria-label="Species slots" className="space-y-1">
                    <h4 className="text-xs font-medium">Species slots</h4>
                    <ul className="flex flex-wrap gap-x-3 gap-y-1">
                        {speciesValues.map((slot, index) => (
                            <li key={`${slot}-${index}`}>{chemistrySlotLabel(slot)}</li>
                        ))}
                    </ul>
                </section>
            )}

            <section aria-label="Wrong choices" className="space-y-1">
                <h4 className="text-xs font-medium">Wrong choices</h4>
                {distractors.length === 0 ? (
                    <p className="text-muted-foreground">None</p>
                ) : (
                    <ul className="space-y-1">
                        {distractors.map((distractor, index) => {
                            const reason =
                                typeof distractor.reason === "string"
                                    ? distractor.reason.trim()
                                    : "";
                            return (
                                <li key={index} className="space-y-0.5">
                                    <p className="break-words text-sm">
                                        {chemistryRecipeText(distractor)}
                                    </p>
                                    {distractor.misconception && (
                                        <p className="text-muted-foreground">
                                            {chemistryMisconceptionLabel(distractor.misconception)}
                                        </p>
                                    )}
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

            {typeof catalogue?.catalogue_version === "string" &&
                catalogue.catalogue_version.length > 0 && (
                    <p className="text-muted-foreground">
                        Catalogue version: {catalogue.catalogue_version}
                    </p>
                )}

            {balanceRows.length > 0 && (
                <section aria-label="Balance evidence" className="space-y-1">
                    <h4 className="text-xs font-medium">Checked coefficients</h4>
                    <Table className="text-xs [&_td]:whitespace-normal [&_td]:align-top">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="h-8 px-2">Reaction</TableHead>
                                <TableHead className="h-8 px-2">Coefficients</TableHead>
                                <TableHead className="h-8 px-2">Equation</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {balanceRows.map((row, index) => (
                                <TableRow key={`balance-${index}`}>
                                    <TableCell className="px-2">
                                        {cellText(row.reaction_id)}
                                    </TableCell>
                                    <TableCell className="px-2">
                                        {cellText(row.coefficients)}
                                    </TableCell>
                                    <TableCell className="px-2">
                                        <EquationCell value={row.equation} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </section>
            )}

            {optionRows.length > 0 && (
                <section aria-label="Option evidence" className="space-y-1">
                    <h4 className="text-xs font-medium">Checked choices</h4>
                    <Table className="text-xs [&_td]:whitespace-normal [&_td]:align-top">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="h-8 px-2">Reaction</TableHead>
                                {showAskedColumn && (
                                    <TableHead className="h-8 px-2">Asked</TableHead>
                                )}
                                <TableHead className="h-8 px-2">Option</TableHead>
                                <TableHead className="h-8 px-2">Recipe</TableHead>
                                <TableHead className="h-8 px-2">Rendered</TableHead>
                                <TableHead className="h-8 px-2">Verdict</TableHead>
                                <TableHead className="h-8 px-2">Reason</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {optionRows.map((row, index) => (
                                <TableRow key={`option-${index}`}>
                                    <TableCell className="px-2">
                                        {cellText(row.reaction_id)}
                                    </TableCell>
                                    {showAskedColumn && (
                                        <TableCell className="px-2">
                                            {typeof row.asked_slot === "string"
                                                ? chemistrySlotLabel(row.asked_slot)
                                                : "—"}
                                        </TableCell>
                                    )}
                                    <TableCell className="px-2">
                                        {optionLabel(row.option)}
                                    </TableCell>
                                    <TableCell className="px-2">
                                        {chemistryRecipeText(row.recipe)}
                                    </TableCell>
                                    <TableCell className="px-2">
                                        {targetKind === "balanced_equation" ? (
                                            <EquationCell value={row.rendered} />
                                        ) : (
                                            <span>{cellText(row.rendered)}</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="px-2">
                                        {cellText(row.verdict)}
                                    </TableCell>
                                    <TableCell className="px-2">
                                        {chemistryReasonText(row.reason)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </section>
            )}
        </div>
    );
}
