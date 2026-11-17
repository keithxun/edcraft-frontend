import { useEffect, useMemo, useState } from "react";
import { Check, Circle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatElapsed } from "../format";
import {
    getJobProgress,
    getJobStages,
    getJobStatus,
    type AuthoringStageState,
} from "../status";
import type { AuthoringJob } from "../types";

function useElapsedSeconds(startedAt: string, running: boolean): number {
    const start = useMemo(() => Date.parse(startedAt), [startedAt]);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (!running || Number.isNaN(start)) return;
        setNow(Date.now());
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, [running, start]);

    if (Number.isNaN(start)) return 0;
    return Math.max(0, Math.floor((now - start) / 1000));
}

function StageIcon({ state }: { state: AuthoringStageState }) {
    if (state === "done") {
        return <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />;
    }
    if (state === "active") {
        return (
            <Loader2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" />
        );
    }
    return <Circle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />;
}

function stageStateText(state: AuthoringStageState): string {
    if (state === "done") return "Done";
    if (state === "active") return "Current stage";
    return "Not started";
}

export function ProgressPanel({ job }: { job: AuthoringJob }) {
    const running = job.state === "running";
    const elapsed = useElapsedSeconds(job.started_at ?? job.created_at, running);

    // Completed and failed reviews show their state in the page header, so the
    // progress strip is only useful while the question is still being created.
    if (job.state === "completed" || job.state === "failed") {
        return null;
    }

    const status = getJobStatus(job.state);
    const progress = getJobProgress(job);
    const stages = getJobStages(job);
    const activeStage = stages.find((stage) => stage.state === "active") ?? null;
    const announcement =
        job.state === "queued"
            ? status.summary
            : activeStage
              ? activeStage.detail
                  ? `${activeStage.label}: ${activeStage.detail}`
                  : activeStage.label
              : status.summary;

    return (
        <Card aria-busy="true">
            <CardHeader className="flex-row items-center justify-between gap-2 pb-3">
                <CardTitle as="h2">Question progress</CardTitle>
                <Badge variant={status.variant}>{status.label}</Badge>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
                <p role="status" aria-live="polite" aria-atomic="true" className="font-medium">
                    {announcement}
                </p>
                <ol aria-label="Authoring stages" className="space-y-2">
                    {stages.map((stage) => (
                        <li
                            key={stage.id}
                            aria-current={stage.state === "active" ? "step" : undefined}
                            className="flex gap-2"
                        >
                            <StageIcon state={stage.state} />
                            <div className="min-w-0">
                                <p
                                    className={
                                        stage.state === "pending"
                                            ? "text-muted-foreground"
                                            : "font-medium"
                                    }
                                >
                                    {stage.label}
                                    <span className="sr-only">
                                        {", "}
                                        {stageStateText(stage.state)}
                                    </span>
                                </p>
                                {stage.detail && (
                                    <p className="text-xs text-muted-foreground">{stage.detail}</p>
                                )}
                            </div>
                        </li>
                    ))}
                </ol>
                {job.state === "queued" ? (
                    <p className="text-muted-foreground">
                        Your question is waiting for a turn. You can leave this page and reopen it
                        later.
                    </p>
                ) : (
                    !progress && (
                        <p className="text-muted-foreground">Question creation is starting.</p>
                    )
                )}
                <p className="text-xs text-muted-foreground">Elapsed {formatElapsed(elapsed)}</p>
                <p className="text-xs text-muted-foreground">Created {formatDate(job.created_at)}</p>
            </CardContent>
        </Card>
    );
}
