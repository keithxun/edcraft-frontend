export function formatValue(value: unknown): string {
    if (value === null || value === undefined) return "—";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
}

export function formatCountSummary(counts: {
    requested_quantity: number;
    actual_quantity: number;
    distinct_count: number;
    duplicates: number;
}): string {
    const different = `${counts.distinct_count} different`;
    const repeated = counts.duplicates === 1 ? "1 repeated" : `${counts.duplicates} repeated`;
    const created =
        counts.actual_quantity === counts.requested_quantity
            ? `${counts.actual_quantity} created`
            : `${counts.actual_quantity} of ${counts.requested_quantity} created`;
    return counts.duplicates > 0
        ? `${created}, ${different}, ${repeated}.`
        : `${created}, all different.`;
}

export function formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
}

export function capitalize(value: string): string {
    return value.length === 0 ? value : value.charAt(0).toUpperCase() + value.slice(1);
}

const DOMAIN_LABELS: Record<string, string> = {
    code: "Code",
    math: "Mathematics",
};

/** Readable label for an authoring domain; unknown domains keep their identifier. */
export function domainLabel(domain: string | null | undefined): string {
    if (!domain) return "Unknown domain";
    return DOMAIN_LABELS[domain] ?? capitalize(domain);
}

/** Prefer the connection model, falling back to a legacy server profile. */
export function modelLabel(request: {
    model_profile?: string | null;
    model?: string | null;
}): string {
    return request.model_profile ?? request.model ?? "Unknown model";
}

export function hasEvidence(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object") return Object.keys(value).length > 0;
    if (typeof value === "string") return value.trim().length > 0;
    return true;
}
