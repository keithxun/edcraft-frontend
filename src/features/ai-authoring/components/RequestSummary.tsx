import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { domainLabel } from "../domains";
import { capitalize, modelLabel } from "../format";
import type { AuthoringReview } from "../types";
import { isRecord } from "./questionPayload";

function capabilityLabel(value: string) {
    return value.replaceAll("_", " ");
}

function H2RequestEvidence({
    prompt,
    candidate,
}: {
    prompt: string;
    candidate: Record<string, unknown>;
}) {
    // Match the validator's teacher_clauses split because saved citations carry the wording.
    const clauses = prompt
        .split(/(?<=[.!?;])\s+|\n+/)
        .map((clause) => clause.trim())
        .filter(Boolean);
    const requirements = Array.isArray(candidate.quoted_requirements)
        ? candidate.quoted_requirements
        : [];
    const familyCapabilities = Array.isArray(candidate.family_capabilities)
        ? candidate.family_capabilities.filter((value): value is string => typeof value === "string")
        : [];
    const mode = candidate.authoring_mode;
    const scopeNote = candidate.difficulty_scope_note;

    return (
        <div className="space-y-3 text-sm">
            <ul aria-label="Request clauses" className="list-disc space-y-2 pl-5">
                {clauses.map((clause, index) => {
                    const capabilities = new Set(
                        requirements.flatMap((requirement) =>
                            isRecord(requirement) &&
                            requirement.wording === clause &&
                            typeof requirement.value === "string"
                                ? [capabilityLabel(requirement.value)]
                                : [],
                        ),
                    );
                    return (
                        <li key={index}>
                            <p className="whitespace-pre-wrap break-words">{clause}</p>
                            <p className="text-xs text-muted-foreground">
                                {capabilities.size > 0
                                    ? `Cited capabilities · ${[...capabilities].join(", ")}`
                                    : "Needs teacher inspection"}
                            </p>
                        </li>
                    );
                })}
            </ul>
            <p className="text-xs text-muted-foreground">
                Compare each clause with the question and choices, including clauses with citations.
            </p>
            <dl className="space-y-2 rounded-md bg-muted/30 p-3 text-xs">
                <div>
                    <dt className="font-medium">Question source</dt>
                    <dd>{typeof mode === "string" ? mode : "Verified H2 family"}</dd>
                </div>
                <div>
                    <dt className="font-medium">Verified family capabilities</dt>
                    <dd>
                        {familyCapabilities.length > 0
                            ? familyCapabilities.map(capabilityLabel).join(", ")
                            : "Capability details are unavailable for this family."}
                    </dd>
                </div>
            </dl>
            {typeof scopeNote === "string" && scopeNote && (
                <p className="text-muted-foreground">{scopeNote}</p>
            )}
        </div>
    );
}

/** The prompt and settings the reviewer used, shown alongside the result. */
export function RequestSummary({
    request,
    checkedH2Candidate,
}: {
    request: AuthoringReview["request"];
    checkedH2Candidate?: Record<string, unknown> | null;
}) {
    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle as="h2">Your request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {checkedH2Candidate ? (
                    <H2RequestEvidence prompt={request.prompt} candidate={checkedH2Candidate} />
                ) : (
                    <p className="whitespace-pre-wrap text-sm">{request.prompt}</p>
                )}
                <p className="text-xs text-muted-foreground">
                    {domainLabel(request.domain)} · {capitalize(request.difficulty)} ·{" "}
                    {request.num_distractors + 1} choices · {modelLabel(request)}
                </p>
            </CardContent>
        </Card>
    );
}
