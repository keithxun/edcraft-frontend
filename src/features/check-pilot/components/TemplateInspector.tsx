import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/features/ai-authoring/format";
import {
    reuseLabel,
    templateApprovalLabel,
    templateStatusLabel,
} from "../checkPilot";
import type { PilotTemplateRecord } from "../types";
import { CheckInspector } from "./CheckInspector";
import { PilotGeneration } from "./PilotGeneration";
import { QualificationEvidence } from "./QualificationEvidence";
import { ReadableDefinition } from "./ReadableDefinition";
import { TemplateApproval } from "./TemplateApproval";

interface TemplateInspectorProps {
    record: PilotTemplateRecord;
    maxQuantity: number;
}

function approvalVariant(
    approval: PilotTemplateRecord["approval"],
): "success" | "destructive" | "outline" {
    if (approval === "approved") return "success";
    if (approval === "rejected") return "destructive";
    return "outline";
}

function statusVariant(
    status: PilotTemplateRecord["status"],
): "success" | "destructive" | "outline" {
    if (status === "ready") return "success";
    if (status === "error") return "destructive";
    return "outline";
}

/** Complete private template inspector: family, check, approval and generation. */
export function TemplateInspector({ record, maxQuantity }: TemplateInspectorProps) {
    const findings = record.findings.filter((finding) => finding.trim().length > 0);

    return (
        <div className="space-y-6">
            <section aria-labelledby="pilot-template-heading" className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                    <h2
                        id="pilot-template-heading"
                        className="text-lg font-semibold"
                    >
                        Saved template
                    </h2>
                    <Badge variant={statusVariant(record.status)}>
                        {templateStatusLabel(record.status)}
                    </Badge>
                    <Badge variant={approvalVariant(record.approval)}>
                        {templateApprovalLabel(record.approval)}
                    </Badge>
                    <Badge variant="secondary">{reuseLabel(record.reused_check)}</Badge>
                    <Badge variant="outline">Private</Badge>
                </div>
                <p className="break-words text-sm">{record.prompt}</p>
                <dl className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-[minmax(9rem,auto)_1fr]">
                    <dt className="font-medium text-muted-foreground">Template ID</dt>
                    <dd className="break-words font-mono">{record.template_id}</dd>
                    <dt className="font-medium text-muted-foreground">Created</dt>
                    <dd>{formatDate(record.created_at)}</dd>
                </dl>

                {findings.length > 0 && (
                    <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3">
                        <AlertCircle
                            className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
                            aria-hidden="true"
                        />
                        <div className="space-y-1">
                            <p className="text-sm font-medium">Authoring findings</p>
                            <ul className="list-disc space-y-1 pl-4 text-sm">
                                {findings.map((finding, index) => (
                                    <li key={index} className="break-words">
                                        {finding}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                <ReadableDefinition
                    title="Template family"
                    value={record.template}
                    headingLevel="h3"
                />

                <QualificationEvidence
                    title="Template qualification"
                    qualification={record.qualification}
                    headingLevel="h3"
                />

                <p className="text-xs text-muted-foreground">
                    Template approval is separate from saved-check qualification. New
                    templates remain unreviewed even when they reuse a passing check.
                </p>
            </section>

            <section aria-labelledby="pilot-attached-check-heading" className="space-y-3">
                <h3 id="pilot-attached-check-heading" className="text-sm font-medium">
                    Attached saved check
                </h3>
                {record.check ? (
                    <CheckInspector record={record.check} headingLevel="h4" />
                ) : (
                    <p className="text-sm text-muted-foreground">
                        No saved check is attached to this template.
                    </p>
                )}
            </section>

            <TemplateApproval record={record} />

            <PilotGeneration record={record} maxQuantity={maxQuantity} />
        </div>
    );
}
