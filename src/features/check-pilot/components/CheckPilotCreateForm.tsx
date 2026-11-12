import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/router/paths";
import { getCheckPilotErrorMessage } from "../errors";
import { useCreatePilotTemplate } from "../hooks/useCheckPilot";
import {
    buildModelRequest,
    parseModelSource,
    resolveModelSelection,
} from "@/features/ai-authoring/modelSelection";
import { ModelPicker } from "@/features/ai-authoring/components/ModelPicker";
import type { AuthoringCapabilities } from "@/features/ai-authoring/types";
import type { PilotTemplateRecord } from "../types";

interface CheckPilotCreateFormProps {
    capabilities: AuthoringCapabilities;
    onCreated?: (record: PilotTemplateRecord) => void;
}

function createPilotSchema(minDistractors: number, maxDistractors: number) {
    return z
        .object({
            prompt: z
                .string()
                .trim()
                .min(1, "Describe the polynomial differentiation template you want.")
                .max(4000, "Keep the request to 4000 characters or fewer."),
            num_distractors: z
                .number()
                .int("Enter a whole number of wrong choices.")
                .min(minDistractors, `Enter at least ${minDistractors} wrong choices.`)
                .max(maxDistractors, `Enter at most ${maxDistractors} wrong choices.`),
            model_source: z.string().min(1, "Choose a check-author model."),
            model: z.string(),
        })
        .superRefine((values, ctx) => {
            const source = parseModelSource(values.model_source);
            if (!source) {
                ctx.addIssue({
                    code: "custom",
                    path: ["model_source"],
                    message: "Choose a check-author model.",
                });
                return;
            }
            if (source.kind === "connection" && !values.model.trim()) {
                ctx.addIssue({
                    code: "custom",
                    path: ["model"],
                    message: "Choose a model for this connection.",
                });
            }
        });
}

type PilotFormValues = z.infer<ReturnType<typeof createPilotSchema>>;

function PilotScope() {
    return (
        <div className="rounded-lg border bg-muted/20 p-4">
            <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">What this pilot can author</p>
                <Badge variant="outline">Private pilot</Badge>
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                <li>
                    Univariate real polynomials in x with degree at most 5 and bounded
                    integer coefficients.
                </li>
                <li>
                    New checks use sampled, not exhaustive, property-based evidence.
                </li>
                <li>
                    Templates and checks stay private to your account. Nothing is
                    published or shared.
                </li>
            </ul>
        </div>
    );
}

export function CheckPilotCreateForm({
    capabilities,
    onCreated,
}: CheckPilotCreateFormProps) {
    const createTemplate = useCreatePilotTemplate();
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [successId, setSuccessId] = useState<string | null>(null);
    const connections = capabilities.connections ?? [];
    const profiles = capabilities.model_profiles;
    const minDistractors = capabilities.min_distractors ?? 1;
    const maxDistractors = capabilities.max_distractors ?? 10;
    const defaultDistractors = Math.min(
        maxDistractors,
        Math.max(minDistractors, capabilities.default_distractors ?? 3),
    );
    const schema = useMemo(
        () => createPilotSchema(minDistractors, maxDistractors),
        [minDistractors, maxDistractors],
    );
    const initialSelection = resolveModelSelection({ connections, profiles });

    const form = useForm<PilotFormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            prompt: "",
            num_distractors: defaultDistractors,
            model_source: initialSelection.source,
            model: initialSelection.model,
        },
    });
    const modelSource = form.watch("model_source");
    const model = form.watch("model");

    if (connections.length === 0 && profiles.length === 0) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle>No check-author model configured</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Add your own model connection before authoring a check template.
                        The check author is a separate prompt role using the same
                        configured provider.
                    </p>
                    <Button asChild>
                        <Link to={ROUTES.MODEL_CONNECTIONS}>Add a model connection</Link>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    const onSubmit = (values: PilotFormValues) => {
        setSubmitError(null);
        setSuccessId(null);
        createTemplate.mutate(
            {
                prompt: values.prompt,
                num_distractors: values.num_distractors,
                ...buildModelRequest(values.model_source, values.model),
            },
            {
                onSuccess: (record) => {
                    setSuccessId(record.template_id);
                    form.reset({
                        ...values,
                        prompt: "",
                    });
                    onCreated?.(record);
                },
                onError: (error) => {
                    setSubmitError(
                        getCheckPilotErrorMessage(
                            error,
                            "The check template could not be authored.",
                        ),
                    );
                },
            },
        );
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle>Request a differentiation template</CardTitle>
                    <Badge variant="outline">Polynomials · multiple choice</Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <PilotScope />

                {submitError && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Template could not be authored</AlertTitle>
                        <AlertDescription>{submitError}</AlertDescription>
                    </Alert>
                )}

                {successId && !submitError && (
                    <Alert variant="success">
                        <Sparkles className="h-4 w-4" />
                        <AlertTitle>Template authored</AlertTitle>
                        <AlertDescription>
                            Review the sampled evidence and exact digests before
                            approving this private template.
                        </AlertDescription>
                    </Alert>
                )}

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
                        <div className="space-y-5">
                            <FormField
                                control={form.control}
                                name="prompt"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Template request</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                {...field}
                                                rows={6}
                                                maxLength={4000}
                                                className="min-h-40 resize-y"
                                                placeholder="For example: differentiate bounded cubic polynomials with small integer coefficients, using distinct wrong choices."
                                                disabled={createTemplate.isPending}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="num_distractors"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel htmlFor="pilot-distractors">
                                            Wrong choices per question
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                id="pilot-distractors"
                                                type="number"
                                                min={minDistractors}
                                                max={maxDistractors}
                                                step={1}
                                                {...field}
                                                onChange={(event) =>
                                                    field.onChange(Number(event.target.value))
                                                }
                                                disabled={createTemplate.isPending}
                                                className="w-32"
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            {minDistractors}–{maxDistractors} wrong choices,
                                            in addition to the correct answer.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <ModelPicker
                                connections={connections}
                                profiles={profiles}
                                source={modelSource}
                                model={model}
                                onSourceChange={(source, nextModel) => {
                                    form.setValue("model_source", source, {
                                        shouldValidate: true,
                                    });
                                    form.setValue("model", nextModel, {
                                        shouldValidate: true,
                                    });
                                }}
                                onModelChange={(nextModel) =>
                                    form.setValue("model", nextModel, {
                                        shouldValidate: true,
                                    })
                                }
                                sourceError={form.formState.errors.model_source?.message}
                                modelError={form.formState.errors.model?.message}
                                disabled={createTemplate.isPending}
                                idPrefix="check-author-model"
                                label="Check-author model"
                            />
                        </div>

                        <div className="mt-6 flex flex-wrap items-center gap-3 border-t pt-4">
                            <Button type="submit" disabled={createTemplate.isPending}>
                                {createTemplate.isPending ? (
                                    <Loader2
                                        className="h-4 w-4 animate-spin"
                                        aria-hidden="true"
                                    />
                                ) : (
                                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                                )}
                                {createTemplate.isPending
                                    ? "Authoring template…"
                                    : "Author template"}
                            </Button>
                            <p className="text-xs text-muted-foreground">
                                The application runs bounded sampled qualification; the
                                model cannot narrow or skip it.
                            </p>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
