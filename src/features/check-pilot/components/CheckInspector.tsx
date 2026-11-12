import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/features/ai-authoring/format";
import type { CheckRecord } from "../types";
import { QualificationEvidence } from "./QualificationEvidence";
import { ReadableDefinition } from "./ReadableDefinition";

const HEADING_LEVELS = ["h2", "h3", "h4", "h5", "h6"] as const;
type HeadingLevel = (typeof HEADING_LEVELS)[number];

interface CheckInspectorProps {
    record: CheckRecord;
    headingLevel?: HeadingLevel;
}

function childHeadingLevel(level: HeadingLevel): HeadingLevel {
    const index = HEADING_LEVELS.indexOf(level);
    return HEADING_LEVELS[Math.min(index + 1, HEADING_LEVELS.length - 1)];
}

function shortDigest(digest: string): string {
    return `${digest.slice(0, 12)}…`;
}

/** Readable immutable saved-check view with sampled evidence and exact JSON. */
export function CheckInspector({ record, headingLevel = "h3" }: CheckInspectorProps) {
    const Heading = headingLevel;
    const childHeading = childHeadingLevel(headingLevel);

    return (
        <section aria-labelledby={`check-${record.check_ref.check_id}`} className="space-y-4">
            <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                    <Heading
                        id={`check-${record.check_ref.check_id}`}
                        className="text-base font-semibold"
                    >
                        {record.title}
                    </Heading>
                    <Badge variant="outline">Private saved check</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{record.description}</p>
            </div>

            <dl className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-[minmax(9rem,auto)_1fr]">
                <dt className="font-medium text-muted-foreground">Check ID</dt>
                <dd className="break-words font-mono">{record.check_ref.check_id}</dd>
                <dt className="font-medium text-muted-foreground">Version</dt>
                <dd className="font-mono">{record.check_ref.version}</dd>
                <dt className="font-medium text-muted-foreground">SHA-256</dt>
                <dd>
                    <code className="font-mono" title={record.check_ref.sha256}>
                        {shortDigest(record.check_ref.sha256)}
                    </code>
                </dd>
                <dt className="font-medium text-muted-foreground">Created</dt>
                <dd>{formatDate(record.created_at)}</dd>
            </dl>

            <ReadableDefinition
                title="Check scope"
                value={record.scope}
                headingLevel={childHeading}
            />
            <ReadableDefinition
                title="Check recipe"
                value={record.definition}
                headingLevel={childHeading}
            />
            <ReadableDefinition
                title="Check provenance"
                value={record.provenance}
                headingLevel={childHeading}
            />

            <QualificationEvidence
                title="Check qualification"
                qualification={record.qualification}
                headingLevel={childHeading}
            />

            <p className="text-xs text-muted-foreground">
                Saved checks are immutable. Changes create a new version with a new
                digest.
            </p>
        </section>
    );
}
