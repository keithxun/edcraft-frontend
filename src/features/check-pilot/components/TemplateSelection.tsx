import { Badge } from "@/components/ui/badge";
import { selectionSourceLabel } from "../checkPilot";
import type { PilotSelection } from "../types";

interface TemplateSelectionProps {
    selection?: PilotSelection | null;
}

function shortDigest(digest: string): string {
    return `${digest.slice(0, 12)}…`;
}

/**
 * Read-only planning metadata recorded by the structured model role. The
 * application, not this view, validates the contract and reference.
 */
export function TemplateSelection({ selection }: TemplateSelectionProps) {
    if (!selection) {
        return (
            <section aria-label="Model selection" className="space-y-2">
                <h3 className="text-sm font-medium">Model selection</h3>
                <p className="text-sm text-muted-foreground">
                    No model selection metadata was recorded for this version.
                    Older templates remain readable, and failed drafts keep their
                    saved scope, recipe and evidence below.
                </p>
            </section>
        );
    }

    const checkRef = selection.check_ref;
    const reason = typeof selection.reason === "string" ? selection.reason.trim() : "";

    return (
        <section
            aria-labelledby="pilot-template-selection-heading"
            className="space-y-3"
        >
            <h3
                id="pilot-template-selection-heading"
                className="text-sm font-medium"
            >
                Model selection
            </h3>

            <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[minmax(9rem,auto)_1fr]">
                <dt className="font-medium text-muted-foreground">
                    Selected contract
                </dt>
                <dd className="break-words font-mono">
                    {selection.contract_id || "—"}
                </dd>
                <dt className="font-medium text-muted-foreground">Reason</dt>
                <dd className="break-words">{reason || "—"}</dd>
                <dt className="font-medium text-muted-foreground">Source</dt>
                <dd>
                    <Badge
                        variant={selection.source === "saved" ? "secondary" : "outline"}
                    >
                        {selectionSourceLabel(selection.source)}
                    </Badge>
                </dd>
                <dt className="font-medium text-muted-foreground">Pinned reference</dt>
                <dd className="break-words">
                    {checkRef ? (
                        <span>
                            {checkRef.check_id} · version {checkRef.version} ·{" "}
                            <code className="font-mono" title={checkRef.sha256}>
                                {shortDigest(checkRef.sha256)}
                            </code>
                        </span>
                    ) : (
                        <span className="text-muted-foreground">
                            No check reference pinned
                        </span>
                    )}
                </dd>
            </dl>

            <p className="text-xs text-muted-foreground">
                The application validated the selected contract against the template
                scope. This metadata does not replace approval of the exact template
                and check digests.
            </p>
        </section>
    );
}
