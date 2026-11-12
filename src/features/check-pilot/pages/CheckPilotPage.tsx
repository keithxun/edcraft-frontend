import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageShell } from "@/features/ai-authoring/components/PageShell";
import { useAuthoringCapabilities } from "@/features/ai-authoring/hooks/useAiAuthoring";
import { getAuthoringErrorMessage } from "@/features/ai-authoring/errors";
import { useUserStore } from "@/shared/stores/user.store";
import { ROUTES } from "@/router/paths";
import { getCheckPilotErrorMessage } from "../errors";
import {
    usePilotCheck,
    usePilotChecks,
    usePilotTemplate,
    usePilotTemplates,
} from "../hooks/useCheckPilot";
import { CheckLibrary, TemplateLibrary } from "../components/CheckLibraries";
import { CheckInspector } from "../components/CheckInspector";
import { CheckPilotCreateForm } from "../components/CheckPilotCreateForm";
import { TemplateInspector } from "../components/TemplateInspector";
import type { PilotTemplateRecord } from "../types";

function LoadingCard({ children }: { children: string }) {
    return (
        <Card>
            <CardContent className="text-sm text-muted-foreground">{children}</CardContent>
        </Card>
    );
}

export default function CheckPilotPage() {
    const ownerId = useUserStore((state) => state.user?.id ?? null);
    const [selection, setSelection] = useState<{
        ownerId: string | null;
        templateId: string | null;
        checkId: string | null;
    }>({ ownerId, templateId: null, checkId: null });

    // Selection itself is owner data. Deriving it from the owner in the same
    // render prevents a detail request from briefly using the prior account's
    // id under the new account's cache key.
    const selectionsMatchOwner = selection.ownerId === ownerId;
    const selectedTemplateId = selectionsMatchOwner ? selection.templateId : null;
    const selectedCheckId = selectionsMatchOwner ? selection.checkId : null;

    useEffect(() => {
        if (selection.ownerId === ownerId) return;
        setSelection({ ownerId, templateId: null, checkId: null });
    }, [ownerId, selection.ownerId]);

    const capabilitiesQuery = useAuthoringCapabilities();
    const templatesQuery = usePilotTemplates();
    const checksQuery = usePilotChecks();
    const templateQuery = usePilotTemplate(selectedTemplateId ?? undefined);
    const checkQuery = usePilotCheck(selectedCheckId ?? undefined);

    const handleCreated = (record: PilotTemplateRecord) => {
        setSelection({
            ownerId,
            templateId: record.template_id,
            checkId: null,
        });
    };

    return (
        <PageShell>
            <div className="space-y-1">
                <Link
                    to={ROUTES.AI_AUTHORING}
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-2 hover:underline"
                >
                    <ArrowLeft className="h-4 w-4" />
                    AI authoring
                </Link>
                <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-semibold">
                        Reusable maths checks
                    </h1>
                    <Badge variant="outline">Private pilot</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                    Author and review a private reusable maths check for polynomial
                    differentiation (degree 1–5) and bounded real linear/quadratic
                    equations and inequalities (degree at most 2), then generate seeded
                    practice privately. Qualification is sampled evidence, not an
                    exhaustive check.
                </p>
            </div>

            {capabilitiesQuery.isPending && (
                <LoadingCard>Loading model settings…</LoadingCard>
            )}

            {capabilitiesQuery.isError && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Model settings could not be loaded</AlertTitle>
                    <AlertDescription className="space-y-2">
                        <p>
                            {getAuthoringErrorMessage(
                                capabilitiesQuery.error,
                                "The configured models could not be loaded.",
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
                <CheckPilotCreateForm
                    capabilities={capabilitiesQuery.data}
                    onCreated={handleCreated}
                />
            )}

            <div className="grid gap-6 lg:grid-cols-2">
                <TemplateLibrary
                    templates={templatesQuery.data}
                    selectedTemplateId={selectedTemplateId}
                    isPending={templatesQuery.isPending}
                    isError={templatesQuery.isError}
                    error={templatesQuery.error}
                    onSelect={(templateId) => {
                        setSelection({
                            ownerId,
                            templateId,
                            checkId: null,
                        });
                    }}
                    onRetry={() => void templatesQuery.refetch()}
                />
                <CheckLibrary
                    checks={checksQuery.data}
                    selectedCheckId={selectedCheckId}
                    isPending={checksQuery.isPending}
                    isError={checksQuery.isError}
                    error={checksQuery.error}
                    onSelect={(checkId) => {
                        setSelection({
                            ownerId,
                            templateId: null,
                            checkId,
                        });
                    }}
                    onRetry={() => void checksQuery.refetch()}
                />
            </div>

            {selectedTemplateId && templateQuery.isPending && (
                <LoadingCard>Loading saved template…</LoadingCard>
            )}

            {selectedTemplateId && templateQuery.isError && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Saved template could not be loaded</AlertTitle>
                    <AlertDescription className="space-y-2">
                        <p>
                            {getCheckPilotErrorMessage(
                                templateQuery.error,
                                "The private template is unavailable.",
                            )}
                        </p>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void templateQuery.refetch()}
                        >
                            <RefreshCw className="h-4 w-4" />
                            Retry
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {selectedTemplateId &&
                templateQuery.data && (
                    <Card>
                        <CardContent>
                            <TemplateInspector
                                record={templateQuery.data}
                                maxQuantity={Math.max(
                                    1,
                                    capabilitiesQuery.data?.max_quantity ?? 20,
                                )}
                            />
                        </CardContent>
                    </Card>
                )}

            {selectedCheckId && checkQuery.isPending && (
                <LoadingCard>Loading saved check…</LoadingCard>
            )}

            {selectedCheckId && checkQuery.isError && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Saved check could not be loaded</AlertTitle>
                    <AlertDescription className="space-y-2">
                        <p>
                            {getCheckPilotErrorMessage(
                                checkQuery.error,
                                "The private check is unavailable.",
                            )}
                        </p>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void checkQuery.refetch()}
                        >
                            <RefreshCw className="h-4 w-4" />
                            Retry
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {selectedCheckId && checkQuery.data && (
                <Card>
                    <CardContent>
                        <CheckInspector record={checkQuery.data} headingLevel="h2" />
                    </CardContent>
                </Card>
            )}

            {!selectedTemplateId &&
                !selectedCheckId &&
                !templatesQuery.isPending &&
                !checksQuery.isPending && (
                    <p className="text-sm text-muted-foreground">
                        Select a saved template or qualified check to inspect its
                        evidence.
                    </p>
                )}
        </PageShell>
    );
}
