import { capitalize } from "./format";

export interface DomainInfo {
    label: string;
    badge: string;
    promptPlaceholder: string;
}

const DOMAINS: Record<string, DomainInfo> = {
    code: {
        label: "Code",
        badge: "Computing · multiple choice",
        promptPlaceholder:
            "Describe the task, for example tracing the front index in a circular queue.",
    },
    math: {
        label: "Mathematics",
        badge: "Mathematics · multiple choice",
        promptPlaceholder:
            "Describe the task, for example finding sample variance from summary totals.",
    },
    biology: {
        label: "Biology",
        badge: "H2 Biology · multiple choice",
        promptPlaceholder:
            "Describe the H2 Biology topic and skill, for example calculating an offspring probability for a hypothetical single-gene cross.",
    },
    chemistry: {
        label: "Chemistry",
        badge: "Chemistry · multiple choice",
        promptPlaceholder:
            "Describe the balancing skill, for example balancing combustion equations for simple alkanes.",
    },
    physics: {
        label: "Physics",
        badge: "Physics · multiple choice",
        promptPlaceholder:
            "Describe the physics skill, for example finding final velocity from initial velocity, acceleration and time.",
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

/** Whether the named domain view applies to this payload's domain. */
export function showsDomainView(domain: string, name: string): boolean {
    return domain === name;
}
