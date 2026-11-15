import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { domainLabel } from "../domains";
import { capitalize, modelLabel } from "../format";
import type { AuthoringReview } from "../types";

/** The prompt and settings the reviewer used, shown alongside the result. */
export function RequestSummary({ request }: { request: AuthoringReview["request"] }) {
    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle as="h2">Your request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                <p className="whitespace-pre-wrap text-sm">{request.prompt}</p>
                <p className="text-xs text-muted-foreground">
                    {domainLabel(request.domain)} · {capitalize(request.difficulty)} ·{" "}
                    {request.num_distractors + 1} choices · {modelLabel(request)}
                </p>
            </CardContent>
        </Card>
    );
}
