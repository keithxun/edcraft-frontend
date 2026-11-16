import { Fragment, type ReactNode } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { formatDate, formatValue, hasEvidence } from "../format";

interface EvidenceDetailsProps {
    summary: string;
    value: unknown;
    /** "structured" reads the payload as labelled fields; "raw" shows JSON only. */
    variant?: "raw" | "structured";
    /** A purpose-built readable view, shown above the raw JSON. */
    readable?: ReactNode;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

// Values under these keys are short machine labels; title-casing them keeps the
// payload readable without inventing friendly wording.
const LABEL_KEYS = new Set([
    "status",
    "decision",
    "assessment_path",
    "confidence_source",
    "checking_mode",
]);

// Headers that read better than a mechanical title-case of the API field.
const FIELD_LABELS: Record<string, string> = {
    reason_template: "Reason",
    answer_expression: "Answer expression",
    question_template: "Question template",
    template_id: "Template ID",
    entry_function: "Entry function",
    answer_target: "Answer target",
    question_type: "Question type",
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function humanizeKey(key: string): string {
    return key
        .replaceAll("_", " ")
        .trim()
        .replace(/\b\w/g, (character) => character.toUpperCase());
}

function labelFor(key: string): string {
    return FIELD_LABELS[key] ?? humanizeKey(key);
}

function looksLikeCodeCandidate(item: Record<string, unknown>): boolean {
    // A `code` key alone does not make an item a code candidate: other domains
    // may use the same key. Require the surrounding code template shape.
    return (
        typeof item.code === "string" &&
        (typeof item.entry_function === "string" ||
            typeof item.question_template === "string")
    );
}

function itemTitleKey(item: Record<string, unknown>): string | null {
    if (typeof item.tool === "string") return "tool";
    if (typeof item.number === "number") return "number";
    if (looksLikeCodeCandidate(item)) return "code";
    if (typeof item.name === "string") return "name";
    return null;
}

function itemTitle(
    item: Record<string, unknown>,
    index: number,
    titleKey: string | null,
): string {
    if (titleKey === "tool") return humanizeKey(item.tool as string);
    if (titleKey === "number") return `Attempt ${item.number}`;
    if (titleKey === "code") return humanizeKey(item.code as string);
    if (titleKey === "name") return item.name as string;
    return `Item ${index + 1}`;
}

function formatScalar(value: unknown, fieldKey?: string): string {
    if (value === null || value === undefined || value === "") return "—";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "number") return String(value);

    const text = String(value);
    if (ISO_DATE.test(text)) return formatDate(text);
    return fieldKey && LABEL_KEYS.has(fieldKey) ? humanizeKey(text) : text;
}

function formatInline(value: unknown, fieldKey: string): string {
    if (!Array.isArray(value)) {
        return isRecord(value) ? formatValue(value) : formatScalar(value, fieldKey);
    }
    if (value.length === 0) return "—";
    return value
        .map((entry) =>
            Array.isArray(entry)
                ? `[${formatInline(entry, fieldKey)}]`
                : formatInline(entry, fieldKey),
        )
        .join(", ");
}

function ScalarValue({ fieldKey, value }: { fieldKey?: string; value: unknown }): ReactNode {
    if (typeof value === "string") {
        // Format by content, not by field name: another domain may also have a
        // `code` key, and short labels should stay inline.
        const isLongText = value.includes("\n") || value.length > 160;
        if (isLongText) {
            return (
                <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-words font-mono text-xs">
                    {formatScalar(value, fieldKey)}
                </pre>
            );
        }
    }
    return <span className="break-words">{formatScalar(value, fieldKey)}</span>;
}

function EvidenceFieldList({
    value,
    omit,
}: {
    value: Record<string, unknown>;
    omit?: string | null;
}): ReactNode {
    const entries = Object.entries(value).filter(
        ([key, entry]) =>
            key !== omit && entry !== null && entry !== undefined && entry !== "",
    );

    if (entries.length === 0) {
        return <p className="text-xs text-muted-foreground">None</p>;
    }

    return (
        <dl className="grid gap-x-4 gap-y-1 text-xs @sm:grid-cols-[minmax(7rem,auto)_1fr]">
            {entries.map(([key, entry]) => (
                <Fragment key={key}>
                    <dt className="font-medium text-muted-foreground">{labelFor(key)}</dt>
                    <dd className="min-w-0 break-words">
                        <StructuredValue value={entry} fieldKey={key} />
                    </dd>
                </Fragment>
            ))}
        </dl>
    );
}

function isFlatCell(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    if (Array.isArray(value)) {
        // Lists of scalars (or nested lists of scalars, such as integer_list
        // parameter values) can be shown inline in a table cell.
        return value.every(isFlatCell);
    }
    return typeof value !== "object";
}

function isTableShape(items: unknown[]): items is Record<string, unknown>[] {
    return (
        items.length > 0 &&
        items.every(
            (item) =>
                isRecord(item) &&
                // Check records are identified by their tool and read better as
                // cards; tables are reserved for lists such as parameters and
                // distractor recipes.
                !("tool" in item) &&
                Object.values(item).every(isFlatCell),
        )
    );
}

function columnsFor(items: Record<string, unknown>[]): string[] {
    const columns: string[] = [];
    for (const item of items) {
        for (const key of Object.keys(item)) {
            if (!columns.includes(key)) columns.push(key);
        }
    }
    return columns;
}

function EvidenceTable({ items }: { items: Record<string, unknown>[] }) {
    const columns = columnsFor(items);

    return (
        <Table className="text-xs [&_td]:whitespace-normal [&_td]:align-top">
            <TableHeader>
                <TableRow>
                    {columns.map((column) => (
                        <TableHead key={column} className="h-8 px-2">
                            {labelFor(column)}
                        </TableHead>
                    ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {items.map((item, index) => (
                    <TableRow key={index}>
                        {columns.map((column) => (
                            <TableCell key={column} className="p-2">
                                <span className="break-words">
                                    {formatInline(item[column], column)}
                                </span>
                            </TableCell>
                        ))}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

function EvidenceList({ items }: { items: unknown[] }): ReactNode {
    if (items.length === 0) {
        return <p className="text-xs text-muted-foreground">None</p>;
    }

    if (isTableShape(items)) {
        return <EvidenceTable items={items} />;
    }

    const allScalar = items.every((item) => !isRecord(item) && !Array.isArray(item));
    if (allScalar) {
        return (
            <ul className="list-disc space-y-1 pl-4 text-xs">
                {items.map((item, index) => (
                    <li key={index} className="break-words">
                        <ScalarValue value={item} />
                    </li>
                ))}
            </ul>
        );
    }

    return (
        <ol className="space-y-2">
            {items.map((item, index) => (
                <li key={index} className="rounded border bg-background/60 p-2">
                    {isRecord(item) ? (
                        <ItemFields item={item} index={index} />
                    ) : (
                        <StructuredValue value={item} />
                    )}
                </li>
            ))}
        </ol>
    );
}

function ItemFields({ item, index }: { item: Record<string, unknown>; index: number }) {
    const titleKey = itemTitleKey(item);
    return (
        <>
            <p className="mb-1 text-xs font-medium">{itemTitle(item, index, titleKey)}</p>
            <EvidenceFieldList value={item} omit={titleKey} />
        </>
    );
}

export function StructuredValue({
    value,
    fieldKey,
}: {
    value: unknown;
    fieldKey?: string;
}): ReactNode {
    if (Array.isArray(value)) {
        return <EvidenceList items={value} />;
    }
    if (isRecord(value)) {
        return <EvidenceFieldList value={value} />;
    }
    return <ScalarValue fieldKey={fieldKey} value={value} />;
}

function RawJson({ value }: { value: unknown }) {
    return (
        <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground">Raw JSON</summary>
            <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap break-words">
                {formatValue(value)}
            </pre>
        </details>
    );
}

export function EvidenceDetails({
    summary,
    value,
    variant = "raw",
    readable,
}: EvidenceDetailsProps) {
    if (!hasEvidence(value)) return null;

    const structured = variant === "structured" && (isRecord(value) || Array.isArray(value));

    return (
        <details className="rounded-md border bg-muted/30 p-3 text-sm">
            <summary className="cursor-pointer font-medium">{summary}</summary>
            {readable ? (
                <div className="mt-3 space-y-3">
                    {readable}
                    <RawJson value={value} />
                </div>
            ) : structured ? (
                <div className="mt-3 space-y-3">
                    <StructuredValue value={value} />
                    <RawJson value={value} />
                </div>
            ) : (
                <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs">
                    {formatValue(value)}
                </pre>
            )}
        </details>
    );
}
