import { useId, useRef, useState } from "react";
import type {
    MaterialEvidence,
    AuthoringMaterials,
    MaterialRetrievalRequestStrategy,
} from "@/api/models";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { domainLabel } from "../domains";
import { getAuthoringErrorMessage } from "../errors";
import { materialPageUrl, useMaterialPdfs, type MaterialPdf } from "../hooks/useMaterialPdf";
import {
    retrieveMaterialEvidence,
    suggestMaterialTopics,
} from "../services/materials.service";
import { MaterialExamPicker, type MaterialExamExcerpt } from "./MaterialExamPicker";
import { MaterialPdfPicker } from "./MaterialPdfPicker";
const MAX_LECTURE_EXCERPT_LENGTH = 60_000;
const MAX_EXAM_EXCERPT_LENGTH = 24_000;
const RETRIEVAL_LIMIT = 3;
const MAX_TOPIC_LENGTH = 500;
const MAX_COLLECTION_PAGES = 750;
const MAX_COLLECTION_LENGTH = 4_000_000;
const MAX_SOURCE_REFS = 750;

export interface MaterialAuthoringSelection {
    domain: string;
    prompt: string;
    materials: AuthoringMaterials;
}

interface MaterialsProps {
    domains?: string[];
    onContinue: (selection: MaterialAuthoringSelection) => void;
}

function LecturePdfPicker({ pdf, selectedPages, onSelectPage, onRemove }: {
    pdf: MaterialPdf;
    selectedPages: number[];
    onSelectPage?: (page: number, selected: boolean) => void;
    onRemove: () => void;
}) {
    const [previewPage, setPreviewPage] = useState(1);

    return (
        <MaterialPdfPicker
            label={pdf.label}
            pagesLabel={`${pdf.label} pages`}
            pdf={pdf}
            selectedPages={selectedPages}
            previewPage={previewPage}
            onRemove={onRemove}
            onSelectPage={onSelectPage && ((page, selected) => {
                onSelectPage(page, selected);
                if (selected) setPreviewPage(page);
            })}
            onPreviewPage={setPreviewPage}
        />
    );
}

export function MaterialsAuthoring({ domains = [], onContinue }: MaterialsProps) {
    const [collection, setCollection] = useState(0);

    return (
        <Card>
            <CardHeader>
                <CardTitle as="h2">Generate from module materials</CardTitle>
                <CardDescription>Upload lecture PDFs, choose a topic and review source evidence before writing and checking questions with your selected model.</CardDescription>
            </CardHeader>
            <ModuleCollection domains={domains} onContinue={onContinue} key={collection} onReset={() => setCollection((previous) => previous + 1)} />
        </Card>
    );
}

function ModuleCollection({ onReset, domains = [], onContinue }: MaterialsProps & { onReset: () => void }) {
    const id = useId();
    const { pdfs, importPdf, removePdf } = useMaterialPdfs();
    const [moduleName, setModuleName] = useState("");
    const [domain, setDomain] = useState("");
    const [topic, setTopic] = useState("");
    const [suggestions, setSuggestions] = useState<string[] | null>(null);
    const [strategy, setStrategy] = useState<MaterialRetrievalRequestStrategy>("selected");
    const [selectedPages, setSelectedPages] = useState<Record<string, number[]>>({});
    const [evidence, setEvidence] = useState<MaterialEvidence[] | null>(null);
    const [exam, setExam] = useState<MaterialExamExcerpt | null>(null);
    const [pending, setPending] = useState<"topics" | "retrieve" | null>(null);
    const [error, setError] = useState<string | null>(null);
    const requestVersion = useRef(0);

    const pages = pdfs.flatMap(({ id: document, pages }) =>
        pages.flatMap((text, index) => text.trim() ? [{ document, page: index + 1, text }] : []),
    );
    const selected = strategy === "selected"
        ? pages.filter(({ document, page }) => selectedPages[document]?.includes(page))
            .map(({ document, page }) => ({ document, page }))
        : [];
    const collectionTooLarge = pages.length > MAX_COLLECTION_PAGES
        || pages.some(({ text }) => text.length > MAX_LECTURE_EXCERPT_LENGTH)
        || pages.reduce((length, { text }) => length + text.length, 0) > MAX_COLLECTION_LENGTH;
    const hasCollection = pages.length > 0 && !collectionTooLarge && !pdfs.some((pdf) => pdf.pending);
    const canRetrieve = hasCollection && topic.trim() && (strategy !== "selected" || selected.length > 0);
    const lectureSources = (evidence ?? []).flatMap(({ document, page, text }) => {
        const pdf = pdfs.find((pdf) => pdf.id === document);
        const original = pdf?.pages[page - 1];
        if (!pdf || !original?.trim() || !text.trim()) return [];
        return [{ pdf, text, reference: { document, page, role: "lecture" as const, edited: text !== original } }];
    });
    const excerpts = {
        ...(domain ? { domain } : {}),
        lecture: lectureSources.map(({ text }) => text).join("\n\n"),
        exam: exam?.text ?? "",
        topic: topic.trim(),
    };
    const lectureTooLong = excerpts.lecture.length > MAX_LECTURE_EXCERPT_LENGTH;
    const examTooLong = excerpts.exam.length > MAX_EXAM_EXCERPT_LENGTH;
    const tooManySourcePages = lectureSources.length + (exam?.pages.length ?? 0) > MAX_SOURCE_REFS;
    const canContinue = domain && topic.trim() && excerpts.lecture && !lectureTooLong && !examTooLong && !tooManySourcePages;

    function cancelPendingRequest() {
        requestVersion.current += 1;
        setPending(null);
    }

    function invalidateEvidence() {
        setError(null);
        if (pending === "retrieve") cancelPendingRequest();
        setEvidence(null);
    }

    function changeTopic(text: string) {
        if (topic === text) return;
        invalidateEvidence();
        setTopic(text);
    }

    function invalidateCollection() {
        invalidateEvidence();
        if (pending === "topics") cancelPendingRequest();
        setSuggestions(null);
    }

    async function runRequest(
        kind: NonNullable<typeof pending>,
        fallback: string,
        run: (isCurrent: () => boolean) => Promise<void>,
    ) {
        const version = ++requestVersion.current;
        const isCurrent = () => requestVersion.current === version;
        setError(null);
        setPending(kind);
        try {
            await run(isCurrent);
        } catch (reason) {
            if (isCurrent()) setError(getAuthoringErrorMessage(reason, fallback));
        } finally {
            if (isCurrent()) setPending(null);
        }
    }

    function suggestTopics() {
        if (!hasCollection || pending) return;
        void runRequest("topics", "Topic suggestions could not be loaded.", async (isCurrent) => {
            const { topics } = await suggestMaterialTopics(pages);
            if (isCurrent()) setSuggestions(topics);
        });
    }

    function retrieve() {
        if (!canRetrieve || pending) return;
        invalidateEvidence();
        void runRequest("retrieve", "Lecture evidence could not be retrieved.", async (isCurrent) => {
            const response = await retrieveMaterialEvidence({
                pages, topic: excerpts.topic, strategy, selected, limit: RETRIEVAL_LIMIT,
            });
            if (!isCurrent()) return;
            setEvidence(response.evidence);
            setSuggestions(response.topics);
        });
    }

    function continueAuthoring() {
        if (!canContinue || pending) return;
        const lecture = lectureSources.map(({ pdf, text, reference }) => ({
            document: pdf.label, text, pages: [reference.page], edited: reference.edited,
        }));
        const task = exam
            ? "Use the assessed skill and style of the selected exam question."
            : "Use the reviewed lecture material.";
        onContinue({
            domain,
            prompt: `Create a multiple-choice question on ${topic.trim()}${moduleName.trim() ? ` for ${moduleName.trim()}` : ""}. ${task}${exam?.reference ? ` Exam question: ${exam.reference}.` : ""}`,
            materials: {
                lecture,
                exam: exam ? {
                    document: exam.pdf.file.name, pages: exam.pages, text: exam.text,
                    edited: exam.editedPages.length > 0,
                } : null,
            },
        });
    }

    return (
        <CardContent className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="w-full max-w-sm space-y-2">
                    <Label htmlFor={`${id}-module`}>Module name (optional)</Label>
                    <Input
                        id={`${id}-module`}
                        maxLength={200}
                        placeholder="e.g. MA1521"
                        value={moduleName}
                        onChange={(event) => setModuleName(event.currentTarget.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor={`${id}-subject`}>Subject</Label>
                    <select
                        id={`${id}-subject`}
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                        value={domain}
                        onChange={(event) => {
                            setDomain(event.currentTarget.value);
                            setError(null);
                        }}
                    >
                        <option value="">Choose a subject</option>
                        {domains.map((subject) => <option key={subject} value={subject}>{domainLabel(subject)}</option>)}
                    </select>
                </div>
                <Button type="button" variant="outline" onClick={onReset}>New collection</Button>
            </div>

            <div className="grid items-start gap-6 lg:grid-cols-2">
                <div className="space-y-3">
                    <div className="space-y-2">
                        <Label htmlFor={`${id}-lecture`}>Lecture PDFs</Label>
                        <Input
                            id={`${id}-lecture`}
                            type="file"
                            accept=".pdf,application/pdf"
                            multiple
                            onChange={(event) => {
                                const files = Array.from(event.currentTarget.files ?? []);
                                if (files.length) {
                                    invalidateCollection();
                                    files.forEach(importPdf);
                                }
                                event.currentTarget.value = "";
                            }}
                        />
                    </div>
                    {pdfs.map((pdf) => (
                        <LecturePdfPicker
                            key={pdf.id}
                            pdf={pdf}
                            selectedPages={selectedPages[pdf.id] ?? []}
                            onRemove={() => {
                                invalidateCollection();
                                removePdf(pdf.id);
                            }}
                            onSelectPage={strategy === "selected" ? (page, selected) => {
                                invalidateEvidence();
                                setSelectedPages((previous) => {
                                    const pages = previous[pdf.id] ?? [];
                                    return {
                                        ...previous,
                                        [pdf.id]: selected ? [...pages, page] : pages.filter((item) => item !== page),
                                    };
                                });
                            } : undefined}
                        />
                    ))}
                    <div className="space-y-2">
                        <Label htmlFor={`${id}-topic`}>Topic</Label>
                        <div className="flex flex-wrap gap-2">
                            <Input
                                id={`${id}-topic`}
                                placeholder="e.g. Chain rule"
                                maxLength={MAX_TOPIC_LENGTH}
                                value={topic}
                                onChange={(event) => changeTopic(event.currentTarget.value)}
                                className="min-w-36 flex-1"
                            />
                            <Button type="button" variant="outline" disabled={!hasCollection || pending !== null} onClick={suggestTopics}>
                                {pending === "topics" ? "Finding topics…" : "Suggest topics"}
                            </Button>
                        </div>
                        {suggestions?.length === 0 && (
                            <p role="status" className="text-sm text-muted-foreground">No topic suggestions found. Enter a topic above.</p>
                        )}
                        {suggestions && suggestions.length > 0 && (
                            <div role="group" aria-label="Suggested topics" className="flex max-h-36 flex-wrap gap-2 overflow-y-auto p-0.5">
                                {suggestions.map((suggestion) => (
                                    <Button key={suggestion} type="button" size="sm" variant="outline" className="h-auto max-w-full whitespace-normal text-left" onClick={() => changeTopic(suggestion)}>
                                        {suggestion}
                                    </Button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor={`${id}-strategy`}>Evidence retrieval</Label>
                        <select
                            id={`${id}-strategy`}
                            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                            value={strategy}
                            onChange={(event) => {
                                invalidateEvidence();
                                setStrategy(event.currentTarget.value as MaterialRetrievalRequestStrategy);
                            }}
                        >
                            <option value="selected">Selected pages</option>
                            <option value="keyword">Keyword search</option>
                            <option value="semantic">Semantic search</option>
                        </select>
                        <p className="text-sm text-muted-foreground">
                            {strategy === "selected" ? "Tick the lecture pages you want to use." : "Search the uploaded lecture PDFs for up to three relevant pages."}
                        </p>
                    </div>
                    {collectionTooLarge && (
                        <p role="alert" className="text-sm text-destructive">
                            The collection exceeds the limit of 750 text pages, 60,000 characters per page or 4 million characters total. Remove a lecture PDF to continue.
                        </p>
                    )}
                    <Button type="button" variant="outline" disabled={!canRetrieve || pending !== null} onClick={retrieve}>
                        {pending === "retrieve" ? "Retrieving evidence…" : "Retrieve evidence"}
                    </Button>
                </div>
                <MaterialExamPicker onChange={(excerpt) => {
                    setError(null);
                    setExam(excerpt);
                }} />
            </div>

            {evidence && (
                <fieldset className="space-y-3 rounded-lg border p-4">
                    <legend className="px-1 font-semibold">Lecture evidence</legend>
                    {evidence.length > 0 ? (
                        <p className="text-sm text-muted-foreground">
                            Keep relevant passages and correct extraction errors using the original PDFs. Clear a passage to omit it.
                        </p>
                    ) : (
                        <p role="status" className="text-sm text-muted-foreground">No matching lecture pages. Try a different topic or select pages manually.</p>
                    )}
                    {evidence.map(({ document, page, text }, index) => {
                        const pdf = pdfs.find((pdf) => pdf.id === document);
                        if (!pdf) return null;
                        const excerptId = `${id}-evidence-${index}`;
                        return (
                            <div key={`${document}/${page}`} className="space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Label htmlFor={excerptId}>{pdf.label}, page {page} excerpt</Label>
                                        {text !== pdf.pages[page - 1] && <span className="text-xs text-muted-foreground">Edited excerpt</span>}
                                    </div>
                                    <a href={materialPageUrl(pdf.url, page)} target="_blank" rel="noreferrer" className="text-sm text-primary underline underline-offset-2">
                                        Open {pdf.label}, page {page}
                                    </a>
                                </div>
                                <Textarea
                                    id={excerptId}
                                    className="max-h-52 font-mono"
                                    rows={5}
                                    value={text}
                                    onChange={(event) => {
                                        const text = event.currentTarget.value;
                                        setError(null);
                                        setEvidence((previous) =>
                                            previous?.map((item, itemIndex) => itemIndex === index ? { ...item, text } : item) ?? null,
                                        );
                                    }}
                                />
                            </div>
                        );
                    })}
                </fieldset>
            )}
            {lectureTooLong && <p role="alert" className="text-sm text-destructive">Limit lecture evidence to 60,000 characters total.</p>}
            {examTooLong && <p role="alert" className="text-sm text-destructive">Limit the shared stem and question to 24,000 characters total.</p>}
            {tooManySourcePages && <p role="alert" className="text-sm text-destructive">Use up to 750 source pages across the lecture and past-paper excerpts.</p>}
            <Button type="button" disabled={!canContinue || pending !== null} onClick={continueAuthoring}>
                Continue to question settings
            </Button>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </CardContent>
    );
}
