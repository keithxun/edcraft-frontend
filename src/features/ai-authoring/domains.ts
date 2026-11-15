import { capitalize } from "./format";

export interface DomainInfo {
    label: string;
    badge: string;
    promptPlaceholder: string;
}

const DOMAINS: Record<string, DomainInfo> = {
    code: {
        label: "Code",
        badge: "Python · multiple choice",
        promptPlaceholder:
            "Describe the programming concept and what students should reason about.",
    },
    math: {
        label: "Mathematics",
        badge: "Mathematics · multiple choice",
        promptPlaceholder:
            "Describe the maths skill, for example factorising quadratics with small integer roots.",
    },
};

const GENERIC_DOMAIN: DomainInfo = {
    label: "Domain",
    badge: "Multiple choice",
    promptPlaceholder: "Describe the question and what students should reason about.",
};

/** Per-domain copy; unknown domains get a generic badge and capitalised label. */
export function domainInfo(domain: string): DomainInfo {
    return DOMAINS[domain] ?? { ...GENERIC_DOMAIN, label: capitalize(domain) };
}

/** Readable label for an authoring domain. Unknown domains show their capitalised identifier. */
export function domainLabel(domain: string | null | undefined): string {
    if (!domain) return "Unknown domain";
    return domainInfo(domain).label;
}

/** A missing domain means a legacy payload, so every view is shown. */
export function showsDomainView(domain: string | undefined, name: string): boolean {
    return domain === undefined || domain === name;
}
