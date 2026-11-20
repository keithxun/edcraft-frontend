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
            "Describe a programming task, or start with H2 for a syllabus family, e.g. H2 binary search.",
    },
    math: {
        label: "Mathematics",
        badge: "Mathematics · multiple choice",
        promptPlaceholder:
            "Describe a maths skill, or start with H2 for a syllabus family, e.g. H2 hypothesis testing.",
    },
    biology: {
        label: "Biology",
        badge: "H2 Biology · multiple choice",
        promptPlaceholder:
            "Describe the H2 Biology topic and skill, for example interpreting a dihybrid test cross.",
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
            "Describe the physics skill, for example finding average force from a change in momentum or comparing ideal gas states.",
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
