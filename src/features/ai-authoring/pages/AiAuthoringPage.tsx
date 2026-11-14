import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AuthorForm } from "../components/AuthorForm";
import { FlowSteps } from "../components/FlowSteps";
import { PageShell } from "../components/PageShell";
import { RecentJobs } from "../components/RecentJobs";
import { getAuthoringErrorMessage } from "../errors";
import { useAuthoringCapabilities } from "../hooks/useAiAuthoring";

export default function AiAuthoringPage() {
    const capabilitiesQuery = useAuthoringCapabilities();

    return (
        <PageShell>
            <FlowSteps current={1} />
            <header className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold">Create question</h1>
                    <p className="text-sm text-muted-foreground">
                        Describe the question you want, then review what the model wrote.
                    </p>
                </div>
            </header>

            {capabilitiesQuery.isPending && (
                <Card>
                    <CardContent className="text-sm text-muted-foreground">
                        Loading question settings…
                    </CardContent>
                </Card>
            )}

            {capabilitiesQuery.isError && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Question settings could not be loaded</AlertTitle>
                    <AlertDescription className="space-y-2">
                        <p>
                            {getAuthoringErrorMessage(
                                capabilitiesQuery.error,
                                "The question settings could not be loaded.",
                            )}
                        </p>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void capabilitiesQuery.refetch()}
                        >
                            <RefreshCw className="h-4 w-4" />
                            Retry
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {capabilitiesQuery.data && (
                <>
                    <AuthorForm capabilities={capabilitiesQuery.data} />
                    <RecentJobs />
                </>
            )}
        </PageShell>
    );
}
