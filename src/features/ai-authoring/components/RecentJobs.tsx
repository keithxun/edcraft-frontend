import { Link } from "react-router-dom";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ROUTES } from "@/router/paths";
import { getAuthoringErrorMessage } from "../errors";
import { capitalize, formatDate } from "../format";
import { useAuthoringJobs } from "../hooks/useAiAuthoring";
import { getSummaryStatus, statusView } from "../status";
import type { AuthoringJobSummary } from "../types";

function decisionBadge(job: AuthoringJobSummary) {
    if (!job.approval) return <span className="text-muted-foreground">—</span>;
    const status = statusView(job.approval.decision);
    return <Badge variant={status.variant}>{status.label}</Badge>;
}

export function RecentJobs() {
    const jobsQuery = useAuthoringJobs();

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle as="h2">Recent questions</CardTitle>
            </CardHeader>
            <CardContent>
                {jobsQuery.isPending && (
                    <p className="text-sm text-muted-foreground">Loading your recent questions…</p>
                )}

                {jobsQuery.isError && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Recent questions could not be loaded</AlertTitle>
                        <AlertDescription className="space-y-2">
                            <p>
                                {getAuthoringErrorMessage(
                                    jobsQuery.error,
                                    "Your recent questions could not be loaded.",
                                )}
                            </p>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => void jobsQuery.refetch()}
                            >
                                <RefreshCw className="h-4 w-4" />
                                Retry
                            </Button>
                        </AlertDescription>
                    </Alert>
                )}

                {jobsQuery.data?.length === 0 && (
                    <p className="text-sm text-muted-foreground">No questions yet.</p>
                )}

                {jobsQuery.data && jobsQuery.data.length > 0 && (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Request</TableHead>
                                <TableHead>Difficulty</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Decision</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="text-right">
                                    <span className="sr-only">Open</span>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {jobsQuery.data.map((job) => {
                                const status = getSummaryStatus(job);
                                return (
                                    <TableRow key={job.job_id}>
                                        <TableCell className="max-w-96 whitespace-normal">
                                            <Link
                                                to={ROUTES.AI_AUTHORING_JOB(job.job_id)}
                                                className="line-clamp-2 font-medium underline-offset-2 hover:text-primary hover:underline"
                                            >
                                                {job.prompt_preview || "Untitled question"}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {capitalize(job.difficulty)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={status.variant}>{status.label}</Badge>
                                        </TableCell>
                                        <TableCell>{decisionBadge(job)}</TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {formatDate(job.created_at)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Link
                                                to={ROUTES.AI_AUTHORING_JOB(job.job_id)}
                                                className="text-sm font-medium underline-offset-2 hover:underline"
                                            >
                                                Open
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
