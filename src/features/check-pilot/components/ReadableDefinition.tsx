import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { formatValue } from "@/features/ai-authoring/format";

interface ReadableDefinitionProps {
    title: string;
    value: Record<string, unknown> | null | undefined;
    headingLevel?: "h2" | "h3" | "h4" | "h5" | "h6";
    className?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

const FIELD_LABELS: Record<string, string> = {
    id: "ID",
    check_id: "Check ID",
    template_id: "Template ID",
    sha256: "SHA-256",
    template_sha256: "Template SHA-256",
    check_sha256: "Check SHA-256",
    degree_max: "Degree max",
    degree_min: "Degree min",
    coefficient_domains: "Coefficient domains",
};

function humanizeKey(key: string): string {
    if (FIELD_LABELS[key]) return FIELD_LABELS[key];
    return key
        .replaceAll("_", " ")
        .trim()
        .replace(/\b\w/g, (character) => character.toUpperCase());
}

function scalarText(value: unknown): string {
    if (value === null || value === undefined || value === "") return "—";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return String(value);
}

function ReadableValue({ value }: { value: unknown }): ReactNode {
    if (Array.isArray(value)) {
        if (value.length === 0) {
            return <span className="text-muted-foreground">None</span>;
        }
        if (value.every((item) => !isRecord(item) && !Array.isArray(item))) {
            return (
                <span className="break-words">
                    [{value.map((item) => scalarText(item)).join(", ")}]
                </span>
            );
        }
        return (
            <ol className="list-decimal space-y-2 pl-4">
                {value.map((item, index) => (
                    <li key={index}>
                        <ReadableValue value={item} />
                    </li>
                ))}
            </ol>
        );
    }
    if (isRecord(value)) {
        return <ReadableFields value={value} />;
    }
    return <span className="break-words">{scalarText(value)}</span>;
}

export function ReadableFields({ value }: { value: Record<string, unknown> }): ReactNode {
    const entries = Object.entries(value).filter(
        ([, entry]) => entry !== null && entry !== undefined && entry !== "",
    );
    if (entries.length === 0) {
        return <p className="text-sm text-muted-foreground">None</p>;
    }
    return (
        <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[minmax(7rem,auto)_1fr]">
            {entries.map(([key, entry]) => (
                <div key={key} className="contents">
                    <dt className="font-medium text-muted-foreground">{humanizeKey(key)}</dt>
                    <dd className="min-w-0">
                        <ReadableValue value={entry} />
                    </dd>
                </div>
            ))}
        </dl>
    );
}

function findRecipe(value: Record<string, unknown>): Record<string, unknown> | null {
    return isRecord(value.recipe) ? value.recipe : null;
}

const STEP_KEYS = ["steps", "operations", "plan"];

function findSteps(value: Record<string, unknown>, recipe: Record<string, unknown> | null) {
    const sources = [recipe, value];
    for (const source of sources) {
        if (!source) continue;
        for (const key of STEP_KEYS) {
            if (Array.isArray(source[key])) return source[key];
        }
    }
    return null;
}

function findSummary(value: Record<string, unknown>, recipe: Record<string, unknown> | null) {
    for (const candidate of [
        recipe?.summary,
        recipe?.description,
        recipe?.explanation,
        value.summary,
        value.description,
        value.explanation,
    ]) {
        if (typeof candidate === "string" && candidate.trim()) return candidate;
    }
    return null;
}

const STEP_PROSE_KEYS = new Set([
    "title",
    "name",
    "operation",
    "op",
    "description",
    "explanation",
    "summary",
]);

function stepTitle(step: Record<string, unknown>, index: number): string {
    for (const candidate of [step.title, step.name, step.operation, step.op, step.id]) {
        if (typeof candidate === "string" && candidate.trim()) return candidate;
    }
    return `Step ${index + 1}`;
}

function exclusion(
    value: Record<string, unknown>,
    keys: string[],
): Record<string, unknown> {
    return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

/**
 * Renders an AI-owned definition shape generically. The pilot does not assume
 * one nested recipe schema, but it does surface steps, operation names and
 * explanations as readable text while keeping the exact JSON one click away.
 */
export function ReadableDefinition({
    title,
    value,
    headingLevel = "h3",
    className,
}: ReadableDefinitionProps) {
    const Heading = headingLevel;
    if (!value) {
        return (
            <section className={cn("space-y-2", className)}>
                <Heading className="text-sm font-medium">{title}</Heading>
                <p className="text-sm text-muted-foreground">
                    No structured definition was stored with this version.
                </p>
            </section>
        );
    }

    const recipe = findRecipe(value);
    const steps = findSteps(value, recipe);
    const summary = findSummary(value, recipe);
    const topLevel = exclusion(value, [
        "recipe",
        ...STEP_KEYS,
        "summary",
        "description",
        "explanation",
    ]);
    const recipeFields = recipe
        ? exclusion(recipe, [...STEP_KEYS, "summary", "description", "explanation"])
        : {};

    return (
        <section className={cn("space-y-3", className)} aria-label={title}>
            <Heading className="text-sm font-medium">{title}</Heading>
            {summary && <p className="text-sm">{summary}</p>}

            {steps && steps.length > 0 ? (
                <ol className="space-y-3">
                    {steps.map((step, index) => {
                        if (!isRecord(step)) {
                            return (
                                <li
                                    key={index}
                                    className="rounded-md border bg-muted/20 p-3 text-sm"
                                >
                                    <ReadableValue value={step} />
                                </li>
                            );
                        }
                        const stepSummary = [step.description, step.explanation, step.summary].find(
                            (candidate): candidate is string =>
                                typeof candidate === "string" && candidate.trim().length > 0,
                        );
                        const fields = exclusion(
                            step,
                            Array.from(STEP_PROSE_KEYS),
                        );
                        return (
                            <li key={index} className="rounded-md border bg-muted/20 p-3">
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    Step {index + 1}
                                </p>
                                <p className="mt-0.5 break-words text-sm font-medium">
                                    {stepTitle(step, index)}
                                </p>
                                {stepSummary && (
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {stepSummary}
                                    </p>
                                )}
                                {Object.keys(fields).length > 0 && (
                                    <div className="mt-2">
                                        <ReadableFields value={fields} />
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ol>
            ) : null}

            {Object.keys(recipeFields).length > 0 && (
                <ReadableFields value={recipeFields} />
            )}
            {Object.keys(topLevel).length > 0 && <ReadableFields value={topLevel} />}

            <details className="rounded-md border bg-muted/20 p-3 text-sm">
                <summary className="cursor-pointer font-medium">Raw definition JSON</summary>
                <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs">
                    {formatValue(value)}
                </pre>
            </details>
        </section>
    );
}
