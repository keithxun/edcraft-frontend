import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { ROUTES } from "@/router/paths";
import { getAuthoringErrorMessage } from "../errors";
import { domainInfo, domainLabel } from "../domains";
import { capitalize } from "../format";
import { useCreateAuthoringJob } from "../hooks/useAiAuthoring";
import {
    buildJudgeSelections,
    buildModelRequest,
    resolveStoredJudgeSelection,
    resolveStoredModelSelection,
} from "../modelSelection";
import { createAuthoringSchema, type AuthoringFormValues } from "../authorFormSchema";
import type {
    AuthoringCapabilities,
    AuthoringDifficulty,
    AuthoringRetryPrefill,
} from "../types";
import { ModelPickerField } from "./ModelPickerField";

const DIFFICULTY_ORDER: AuthoringDifficulty[] = ["easy", "medium", "hard"];

interface AuthorFormProps {
    capabilities: AuthoringCapabilities;
}

export function AuthorForm({ capabilities }: AuthorFormProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const createJob = useCreateAuthoringJob();
    const [submitError, setSubmitError] = useState<string | null>(null);
    const summaryRef = useRef<HTMLDivElement>(null);

    const difficultyOptions = DIFFICULTY_ORDER.filter((difficulty) =>
        capabilities.difficulty_labels.includes(difficulty),
    );
    const domains = capabilities.enabled_domains;
    const defaultDomain = domains.includes("code") ? "code" : (domains[0] ?? "");
    const defaultDifficulty = difficultyOptions[0] ?? "easy";
    const connections = capabilities.connections ?? [];
    const profiles = capabilities.model_profiles;
    const relevanceDefaultLabel = capabilities.judge
        ? `Server default (${capabilities.judge.label})`
        : "Same as question model";
    const minDistractors = capabilities.min_distractors ?? 1;
    const maxDistractors = capabilities.max_distractors ?? 10;
    const defaultDistractors = capabilities.default_distractors ?? 3;
    const authoringSchema = useMemo(
        () => createAuthoringSchema(minDistractors, maxDistractors),
        [minDistractors, maxDistractors],
    );

    const state = location.state as { authoringPrefill?: Partial<AuthoringRetryPrefill> } | null;
    const prefill = state?.authoringPrefill;
    const prefilledPrompt =
        typeof prefill?.prompt === "string" ? prefill.prompt.slice(0, 4000) : "";
    const prefilledDifficulty =
        prefill?.difficulty && difficultyOptions.includes(prefill.difficulty)
            ? prefill.difficulty
            : defaultDifficulty;
    const prefilledDistractors =
        typeof prefill?.num_distractors === "number"
            ? Math.min(
                  maxDistractors,
                  Math.max(minDistractors, prefill.num_distractors),
              )
            : defaultDistractors;
    const initialSelection = resolveStoredModelSelection({
        connections,
        profiles,
        connectionId: prefill?.connection_id,
        profileId: prefill?.model_profile,
        model: prefill?.model,
    });
    const initialDifficultySelection = resolveStoredJudgeSelection({
        connections,
        profiles,
        selection: prefill?.judges?.difficulty,
    });
    const initialRelevanceSelection = resolveStoredJudgeSelection({
        connections,
        profiles,
        selection: prefill?.judges?.relevance,
    });
    const [authorMissing, setAuthorMissing] = useState(initialSelection.missing);
    const [difficultyMissing, setDifficultyMissing] = useState(
        initialDifficultySelection.missing,
    );
    const [relevanceMissing, setRelevanceMissing] = useState(
        initialRelevanceSelection.missing,
    );
    const [advancedOpen, setAdvancedOpen] = useState(
        initialSelection.missing ||
            initialDifficultySelection.missing ||
            initialRelevanceSelection.missing,
    );

    const form = useForm<AuthoringFormValues>({
        resolver: zodResolver(authoringSchema),
        defaultValues: {
            prompt: prefilledPrompt,
            domain: defaultDomain,
            difficulty: prefilledDifficulty,
            distractors: prefilledDistractors,
            model_source: initialSelection.source,
            model: initialSelection.model,
            difficulty_source: initialDifficultySelection.source,
            difficulty_model: initialDifficultySelection.model,
            relevance_source: initialRelevanceSelection.source,
            relevance_model: initialRelevanceSelection.model,
        },
    });
    const selectedDomain = form.watch("domain");
    const domain = selectedDomain || defaultDomain;

    useEffect(() => {
        if (submitError) summaryRef.current?.focus();
    }, [submitError]);

    const onInvalid = (errors: FieldErrors<AuthoringFormValues>) => {
        setSubmitError("Check the highlighted fields and try again.");
        const advancedFields: Array<keyof AuthoringFormValues> = [
            "model_source",
            "model",
            "difficulty_source",
            "difficulty_model",
            "relevance_source",
            "relevance_model",
        ];
        if (advancedFields.some((field) => errors[field])) {
            setAdvancedOpen(true);
        }
    };

    const onSubmit = (values: AuthoringFormValues) => {
        setSubmitError(null);
        createJob.mutate(
            {
                domain: values.domain,
                prompt: values.prompt,
                difficulty: values.difficulty,
                num_distractors: values.distractors,
                ...buildModelRequest(values.model_source, values.model),
                judges: buildJudgeSelections(
                    {
                        source: values.difficulty_source,
                        model: values.difficulty_model,
                    },
                    {
                        source: values.relevance_source,
                        model: values.relevance_model,
                    },
                ),
            },
            {
                onSuccess: (job) => {
                    navigate(ROUTES.AI_AUTHORING_JOB(job.job_id), { replace: true });
                },
                onError: (error) => {
                    setSubmitError(
                        getAuthoringErrorMessage(error, "The question could not be started."),
                    );
                },
            },
        );
    };

    if (domains.length === 0) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle as="h2">Question creation is unavailable</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Authoring is not enabled on this server.
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (connections.length === 0 && profiles.length === 0) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle as="h2">No question-writing model configured</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Add your own OpenAI or SocLaas connection to start authoring.
                        Your API key is encrypted and only used for your jobs.
                    </p>
                    <Button asChild>
                        <Link to={ROUTES.MODEL_CONNECTIONS}>Add a model connection</Link>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="@container/form">
            <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle as="h2">New question</CardTitle>
                    <Badge variant="outline">{domainInfo(domain).badge}</Badge>
                </div>
            </CardHeader>
            <CardContent>
                {submitError && (
                    <div ref={summaryRef} tabIndex={-1} className="mb-4">
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>The question could not be started</AlertTitle>
                            <AlertDescription>{submitError}</AlertDescription>
                        </Alert>
                    </div>
                )}

                {prefill && !submitError && (
                    <div className="mb-4">
                        <Alert>
                            <RotateCcw className="h-4 w-4" />
                            <AlertTitle>Prefilled from your last request</AlertTitle>
                            <AlertDescription>
                                Adjust anything, then create the question.
                            </AlertDescription>
                        </Alert>
                    </div>
                )}

                {(authorMissing || difficultyMissing || relevanceMissing) && (
                    <div className="mb-4">
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Original model unavailable</AlertTitle>
                            <AlertDescription>
                                The original model is no longer available. Choose a model
                                before creating the question.
                            </AlertDescription>
                        </Alert>
                    </div>
                )}

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} noValidate>
                        <div className="space-y-5">
                            <div className="grid items-start gap-4 @3xl/form:grid-cols-2">
                                {domains.length > 1 && (
                                    <FormField
                                        control={form.control}
                                        name="domain"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Domain</FormLabel>
                                                <Select
                                                    value={field.value}
                                                    onValueChange={field.onChange}
                                                    disabled={createJob.isPending}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Choose a domain" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {domains.map((domain) => (
                                                            <SelectItem
                                                                key={domain}
                                                                value={domain}
                                                            >
                                                                {domainLabel(domain)}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                                <FormField
                                    control={form.control}
                                    name="distractors"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel htmlFor="distractors">
                                                Wrong choices (distractors)
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    id="distractors"
                                                    type="number"
                                                    min={minDistractors}
                                                    max={maxDistractors}
                                                    step={1}
                                                    {...field}
                                                    onChange={(event) =>
                                                        field.onChange(
                                                            Number(event.target.value),
                                                        )
                                                    }
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                {minDistractors}–{maxDistractors} wrong
                                                choices. The correct answer is added
                                                automatically.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="prompt"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Prompt</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                {...field}
                                                rows={6}
                                                maxLength={4000}
                                                className="min-h-40 resize-y"
                                                placeholder={domainInfo(domain).promptPlaceholder}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="difficulty"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel id="difficulty-label">Difficulty</FormLabel>
                                        <FormControl>
                                            <RadioGroup
                                                value={field.value}
                                                onValueChange={field.onChange}
                                                aria-labelledby="difficulty-label"
                                                className="flex flex-wrap gap-4"
                                            >
                                                {difficultyOptions.map((difficulty) => (
                                                    <div
                                                        key={difficulty}
                                                        className="flex items-center gap-2"
                                                    >
                                                        <RadioGroupItem
                                                            id={`difficulty-${difficulty}`}
                                                            value={difficulty}
                                                        />
                                                        <Label
                                                            htmlFor={`difficulty-${difficulty}`}
                                                            className="font-normal"
                                                        >
                                                            {capitalize(difficulty)}
                                                        </Label>
                                                    </div>
                                                ))}
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="mt-6 flex flex-wrap items-center gap-4 border-t pt-4">
                            <Button
                                type="submit"
                                disabled={createJob.isPending || difficultyOptions.length === 0}
                            >
                                {createJob.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                ) : (
                                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                                )}
                                {createJob.isPending ? "Creating…" : "Create question"}
                            </Button>
                            <Button
                                type="button"
                                variant="link"
                                className="h-auto p-0 text-sm"
                                aria-expanded={advancedOpen}
                                aria-controls="advanced-settings"
                                onClick={() => setAdvancedOpen((open) => !open)}
                            >
                                Advanced settings
                            </Button>
                        </div>

                        {advancedOpen && (
                            <div
                                id="advanced-settings"
                                className="mt-4 space-y-5 rounded-lg border bg-muted/20 p-4"
                            >
                                <ModelPickerField
                                    form={form}
                                    connections={connections}
                                    profiles={profiles}
                                    sourceField="model_source"
                                    modelField="model"
                                    onMissingCleared={() => setAuthorMissing(false)}
                                    disabled={createJob.isPending}
                                />

                                <div className="space-y-4 rounded-md border bg-background p-3">
                                    <div>
                                        <p className="text-sm font-medium">Advisory checks</p>
                                        <p className="text-xs text-muted-foreground">
                                            Keep the question model, or choose a separate model
                                            when it cannot run the checks. They are advisory and
                                            never block a technically checked artifact.
                                        </p>
                                    </div>
                                    <ModelPickerField
                                        form={form}
                                        connections={connections}
                                        profiles={profiles}
                                        sourceField="difficulty_source"
                                        modelField="difficulty_model"
                                        onMissingCleared={() => setDifficultyMissing(false)}
                                        disabled={createJob.isPending}
                                        idPrefix="difficulty-check"
                                        label="Difficulty check"
                                        allowInherit
                                    />
                                    <ModelPickerField
                                        form={form}
                                        connections={connections}
                                        profiles={profiles}
                                        sourceField="relevance_source"
                                        modelField="relevance_model"
                                        onMissingCleared={() => setRelevanceMissing(false)}
                                        disabled={createJob.isPending}
                                        idPrefix="relevance-check"
                                        label="Relevance check"
                                        allowInherit
                                        inheritLabel={relevanceDefaultLabel}
                                    />
                                </div>

                                <Link
                                    to={ROUTES.MODEL_CONNECTIONS}
                                    className="inline-block text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                                >
                                    Manage connections
                                </Link>
                            </div>
                        )}

                        {difficultyOptions.length === 0 && (
                            <p className="mt-2 text-sm text-destructive">
                                The server did not publish any difficulty options.
                            </p>
                        )}
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
