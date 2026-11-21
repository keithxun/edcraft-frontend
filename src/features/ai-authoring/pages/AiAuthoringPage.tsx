import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AuthorForm } from "../components/AuthorForm";
import { FlowSteps } from "../components/FlowSteps";
import { MaterialsAuthoring, type MaterialAuthoringSelection } from "../components/MaterialsAuthoring";
import { PageShell } from "../components/PageShell";
import { RecentJobs } from "../components/RecentJobs";
import { getAuthoringErrorMessage } from "../errors";
import { useAuthoringCapabilities } from "../hooks/useAiAuthoring";
import type { AuthoringRetryPrefill } from "../types";

type AuthoringMode = "description" | "materials" | "material-settings";

export default function AiAuthoringPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const retry = (location.state as { authoringPrefill?: AuthoringRetryPrefill } | null)?.authoringPrefill;
    const capabilitiesQuery = useAuthoringCapabilities();
    const [mode, setMode] = useState<AuthoringMode>(
        retry?.materials ? "material-settings" : "description",
    );
    const [selection, setSelection] = useState<MaterialAuthoringSelection | null>(null);
    const [formVersion, setFormVersion] = useState(0);
    const usingMaterials = mode === "materials";
    const materialsSelected = mode !== "description";

    function startDescription() {
        if (selection || retry?.materials) {
            setSelection(null);
            setFormVersion((previous) => previous + 1);
        }
        if (retry?.materials) {
            navigate(location.pathname, { replace: true, state: null });
        }
        setMode("description");
    }

    return (
        <PageShell>
            {!usingMaterials && <FlowSteps current={1} />}
            <header className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold">Create question</h1>
                    {!usingMaterials && (
                        <p className="text-sm text-muted-foreground">
                            {materialsSelected
                                ? "Review the source excerpts and choose question settings."
                                : "Describe the question you want, then review what the model wrote."}
                        </p>
                    )}
                </div>
            </header>

            <div role="group" aria-label="Authoring source" className="flex flex-wrap gap-2">
                <Button
                    type="button"
                    aria-pressed={!materialsSelected}
                    variant={materialsSelected ? "outline" : "secondary"}
                    onClick={startDescription}
                >
                    From a description
                </Button>
                <Button
                    type="button"
                    aria-pressed={materialsSelected}
                    variant={materialsSelected ? "secondary" : "outline"}
                    onClick={() => setMode("materials")}
                >
                    From module materials
                </Button>
            </div>

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

            <div hidden={usingMaterials} className="space-y-6">
                {capabilitiesQuery.isPending && (
                    <Card>
                        <CardContent className="text-sm text-muted-foreground">
                            Loading question settings…
                        </CardContent>
                    </Card>
                )}

                {capabilitiesQuery.data && (
                    <>
                        <AuthorForm key={formVersion} capabilities={capabilitiesQuery.data} selection={selection} />
                        <RecentJobs />
                    </>
                )}
            </div>
            <div hidden={!usingMaterials}>
                <MaterialsAuthoring domains={capabilitiesQuery.data?.enabled_domains} onContinue={(source) => {
                    setSelection(source);
                    setFormVersion((previous) => previous + 1);
                    setMode("material-settings");
                }} />
            </div>
        </PageShell>
    );
}
