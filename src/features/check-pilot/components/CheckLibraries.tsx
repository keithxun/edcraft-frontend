import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    qualificationSummary,
    reuseLabel,
    templateApprovalLabel,
    templateStatusLabel,
} from "../checkPilot";
import { getCheckPilotErrorMessage } from "../errors";
import type { CheckRecord, PilotTemplateRecord } from "../types";

interface TemplateLibraryProps {
    templates: PilotTemplateRecord[] | undefined;
    selectedTemplateId: string | null;
    isPending: boolean;
    isError: boolean;
    error: unknown;
    onSelect: (templateId: string) => void;
    onRetry: () => void;
}

function templateApprovalVariant(
    approval: PilotTemplateRecord["approval"],
): "success" | "destructive" | "outline" {
    if (approval === "approved") return "success";
    if (approval === "rejected") return "destructive";
    return "outline";
}

export function TemplateLibrary({
    templates,
    selectedTemplateId,
    isPending,
    isError,
    error,
    onSelect,
    onRetry,
}: TemplateLibraryProps) {
    return (
        <section aria-labelledby="pilot-templates-heading" className="space-y-3">
            <h2 id="pilot-templates-heading" className="text-sm font-medium">
                Saved templates
            </h2>

            {isPending ? (
                <p className="text-sm text-muted-foreground">Loading saved templates…</p>
            ) : isError ? (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Saved templates could not be loaded</AlertTitle>
                    <AlertDescription className="space-y-2">
                        <p>
                            {getCheckPilotErrorMessage(
                                error,
                                "The private template library could not be loaded.",
                            )}
                        </p>
                        <Button type="button" size="sm" variant="outline" onClick={onRetry}>
                            <RefreshCw className="h-4 w-4" />
                            Retry
                        </Button>
                    </AlertDescription>
                </Alert>
            ) : !templates || templates.length === 0 ? (
                <p className="text-sm text-muted-foreground">No saved templates yet.</p>
            ) : (
                <ul className="space-y-2">
                    {templates.map((record) => {
                        const selected = record.template_id === selectedTemplateId;
                        return (
                            <li key={record.template_id}>
                                <button
                                    type="button"
                                    onClick={() => onSelect(record.template_id)}
                                    aria-pressed={selected}
                                    className={
                                        selected
                                            ? "w-full rounded-md border border-primary/40 bg-primary/5 p-3 text-left"
                                            : "w-full rounded-md border p-3 text-left hover:bg-muted/40"
                                    }
                                >
                                    <span className="block break-words text-sm font-medium">
                                        {record.prompt}
                                    </span>
                                    <span className="mt-2 flex flex-wrap items-center gap-1.5">
                                        <Badge variant="outline">
                                            {templateStatusLabel(record.status)}
                                        </Badge>
                                        <Badge
                                            variant={templateApprovalVariant(record.approval)}
                                        >
                                            {templateApprovalLabel(record.approval)}
                                        </Badge>
                                        <Badge variant="secondary">
                                            {reuseLabel(record.reused_check)}
                                        </Badge>
                                    </span>
                                    {record.check && (
                                        <span className="mt-2 block text-xs text-muted-foreground">
                                            Check: {record.check.title} · version{" "}
                                            {record.check.check_ref.version}
                                        </span>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}

interface CheckLibraryProps {
    checks: CheckRecord[] | undefined;
    selectedCheckId: string | null;
    isPending: boolean;
    isError: boolean;
    error: unknown;
    onSelect: (checkId: string) => void;
    onRetry: () => void;
}

function qualificationVariant(
    status: CheckRecord["qualification"]["status"],
): "success" | "destructive" | "outline" {
    if (status === "passed") return "success";
    if (status === "failed" || status === "error") return "destructive";
    return "outline";
}

export function CheckLibrary({
    checks,
    selectedCheckId,
    isPending,
    isError,
    error,
    onSelect,
    onRetry,
}: CheckLibraryProps) {
    return (
        <section aria-labelledby="pilot-checks-heading" className="space-y-3">
            <h2 id="pilot-checks-heading" className="text-sm font-medium">
                Qualified check library
            </h2>

            {isPending ? (
                <p className="text-sm text-muted-foreground">Loading qualified checks…</p>
            ) : isError ? (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Qualified checks could not be loaded</AlertTitle>
                    <AlertDescription className="space-y-2">
                        <p>
                            {getCheckPilotErrorMessage(
                                error,
                                "The private check library could not be loaded.",
                            )}
                        </p>
                        <Button type="button" size="sm" variant="outline" onClick={onRetry}>
                            <RefreshCw className="h-4 w-4" />
                            Retry
                        </Button>
                    </AlertDescription>
                </Alert>
            ) : !checks || checks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No qualified checks yet.</p>
            ) : (
                <ul className="space-y-2">
                    {checks.map((check) => {
                        const selected = check.check_ref.check_id === selectedCheckId;
                        return (
                            <li key={check.check_ref.check_id}>
                                <button
                                    type="button"
                                    onClick={() => onSelect(check.check_ref.check_id)}
                                    aria-pressed={selected}
                                    className={
                                        selected
                                            ? "w-full rounded-md border border-primary/40 bg-primary/5 p-3 text-left"
                                            : "w-full rounded-md border p-3 text-left hover:bg-muted/40"
                                    }
                                >
                                    <span className="block break-words text-sm font-medium">
                                        {check.title}
                                    </span>
                                    <span className="mt-2 flex flex-wrap items-center gap-1.5">
                                        <Badge
                                            variant={qualificationVariant(
                                                check.qualification.status,
                                            )}
                                        >
                                            {qualificationSummary(check.qualification).label}
                                        </Badge>
                                        <Badge variant="outline">
                                            version {check.check_ref.version}
                                        </Badge>
                                    </span>
                                    <span className="mt-2 block text-xs text-muted-foreground">
                                        {check.qualification.accepted_cases} accepted
                                        samples · {check.qualification.execution_calls}{" "}
                                        execution calls
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}
