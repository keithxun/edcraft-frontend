import { useId, useRef, useState } from "react";
import type { MaterialExcerpts, MaterialPracticeBatch, MaterialTaskProposal } from "@/api/models";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getAuthoringErrorMessage } from "../errors";
import { useMaterialPdf } from "../hooks/useMaterialPdf";
import { generateMaterialQuestions, proposeMaterialMatch } from "../services/materials.service";
import { MaterialPdfPicker } from "./MaterialPdfPicker";
import { MaterialQuestionSetView } from "./MaterialQuestionSetView";

const MAX_SEED = 2_147_483_647;
const MAX_LECTURE_EXCERPT_LENGTH = 60_000;
const MAX_EXAM_EXCERPT_LENGTH = 24_000;

function updatePageSelection(pages: number[], page: number, selected: boolean) {
    return selected ? [...pages, page].sort((a, b) => a - b) : pages.filter((item) => item !== page);
}

function joinPassages(passages: string[]) {
    return passages.filter((passage) => passage.trim()).join("\n\n");
}

export function MaterialsAuthoring() {
    const id = useId();
    const examExtract = useRef<HTMLTextAreaElement>(null);
    const lectureImport = useMaterialPdf();
    const examImport = useMaterialPdf();
    const lecturePdf = lectureImport.pdf;
    const examPdf = examImport.pdf;
    const [lecturePages, setLecturePages] = useState<number[]>([]);
    const [examPages, setExamPages] = useState<number[]>([]);
    const [lecturePreview, setLecturePreview] = useState(1);
    const [examPreview, setExamPreview] = useState(1);
    const [lectureEdits, setLectureEdits] = useState<Record<number, string>>({});
    const [examReference, setExamReference] = useState("");
    const [sharedStem, setSharedStem] = useState("");
    const [question, setQuestion] = useState("");
    const [seedText, setSeedText] = useState("0");
    const [proposal, setProposal] = useState<(MaterialTaskProposal & { excerpts: MaterialExcerpts }) | null>(null);
    const [selectedFamily, setSelectedFamily] = useState<string | null>(null);
    const [confirmed, setConfirmed] = useState(false);
    const [result, setResult] = useState<MaterialPracticeBatch | null>(null);
    const [pending, setPending] = useState<"proposal" | "generate" | null>(null);
    const [error, setError] = useState<string | null>(null);
    const requestVersion = useRef(0);

    function lectureExcerpt(page: number) {
        return lectureEdits[page] ?? lecturePdf?.pages[page - 1] ?? "";
    }

    const excerpts = {
        lecture: joinPassages(lecturePages.map(lectureExcerpt)),
        exam: joinPassages([sharedStem, question]),
    };
    const lectureTooLong = excerpts.lecture.length > MAX_LECTURE_EXCERPT_LENGTH;
    const examTooLong = excerpts.exam.length > MAX_EXAM_EXCERPT_LENGTH;
    const canPropose = excerpts.lecture && examPages.length && examReference.trim() && question.trim()
        && !lectureTooLong && !examTooLong;
    const seed = Number(seedText);
    const validSeed = seedText !== "" && Number.isInteger(seed) && seed >= 0 && seed <= MAX_SEED;

    function resetConfirmation() {
        // A response is usable only while its excerpts and chosen task are current.
        requestVersion.current += 1;
        setConfirmed(false);
        setResult(null);
        setError(null);
        setPending(null);
    }

    function invalidateSource() {
        resetConfirmation();
        setProposal(null);
        setSelectedFamily(null);
    }

    function addExamSelection(setExcerpt: typeof setQuestion) {
        const textArea = examExtract.current;
        if (!textArea) return;
        const selection = textArea.value.slice(textArea.selectionStart, textArea.selectionEnd);
        if (!selection.trim()) return;
        invalidateSource();
        setExcerpt((previous) => joinPassages([previous, selection]));
    }

    async function propose() {
        if (!canPropose || pending) return;
        invalidateSource();
        const version = requestVersion.current;
        setPending("proposal");
        try {
            const proposed = await proposeMaterialMatch(excerpts);
            if (requestVersion.current === version) {
                setProposal({ ...proposed, excerpts });
                setSelectedFamily(proposed.family);
            }
        } catch (reason) {
            if (requestVersion.current === version) {
                setError(getAuthoringErrorMessage(reason, "The match could not be proposed."));
            }
        } finally {
            if (requestVersion.current === version) setPending(null);
        }
    }

    async function generate(chosenSeed: number) {
        if (!confirmed || !proposal || !selectedFamily || pending) return;
        const version = requestVersion.current;
        setResult(null);
        setError(null);
        setPending("generate");
        try {
            const generated = await generateMaterialQuestions({ ...proposal.excerpts, family: selectedFamily, seed: chosenSeed });
            if (requestVersion.current === version) setResult(generated);
        } catch (reason) {
            if (requestVersion.current === version) {
                setError(getAuthoringErrorMessage(reason, "The practice questions could not be generated."));
            }
        } finally {
            if (requestVersion.current === version) setPending(null);
        }
    }

    const matches = proposal?.family && proposal.alternatives?.length
        ? [proposal, ...proposal.alternatives]
        : [];

    return (
        <Card>
            <CardHeader>
                <CardTitle as="h2">Generate from CS1010E materials</CardTitle>
                <CardDescription>
                    Choose lecture pages and one past-paper question or subpart. Review the proposed match before generating five practice MCQs.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
                <div className="grid items-start gap-4 lg:grid-cols-2">
                    <MaterialPdfPicker
                        label="Lecture PDF"
                        pagesLabel="Lecture pages"
                        pdf={lecturePdf}
                        selectedPages={lecturePages}
                        previewPage={lecturePreview}
                        onImport={(file) => {
                            invalidateSource();
                            setLecturePages([]);
                            setLecturePreview(1);
                            setLectureEdits({});
                            void lectureImport.importPdf(file);
                        }}
                        onSelectPage={(page, selected) => {
                            invalidateSource();
                            setLecturePages((pages) => updatePageSelection(pages, page, selected));
                            if (selected) setLecturePreview(page);
                        }}
                        onPreviewPage={setLecturePreview}
                    >
                        {lecturePages.length > 0 && (
                            <p className="text-sm text-muted-foreground">
                                Keep the relevant passage and correct any extraction errors using the original PDF.
                            </p>
                        )}
                        {lecturePages.map((page) => (
                            <div key={page} className="space-y-2">
                                <Label htmlFor={`${id}-lecture-${page}`}>Lecture page {page} excerpt</Label>
                                <Textarea
                                    id={`${id}-lecture-${page}`}
                                    className="max-h-52 font-mono"
                                    rows={5}
                                    value={lectureExcerpt(page)}
                                    onChange={(event) => {
                                        invalidateSource();
                                        const text = event.currentTarget.value;
                                        setLectureEdits((edits) => ({ ...edits, [page]: text }));
                                    }}
                                />
                            </div>
                        ))}
                    </MaterialPdfPicker>
                    <MaterialPdfPicker
                        label="Past-paper PDF"
                        pagesLabel="Past-paper pages"
                        pdf={examPdf}
                        selectedPages={examPages}
                        previewPage={examPreview}
                        onImport={(file) => {
                            invalidateSource();
                            setExamPages([]);
                            setExamPreview(1);
                            setExamReference("");
                            setSharedStem("");
                            setQuestion("");
                            void examImport.importPdf(file);
                        }}
                        onSelectPage={(page, selected) => {
                            invalidateSource();
                            setExamPages((pages) => updatePageSelection(pages, page, selected));
                            if (selected) {
                                setExamPreview(page);
                            } else {
                                setSharedStem("");
                                setQuestion("");
                            }
                        }}
                        onPreviewPage={setExamPreview}
                    >
                        {examPages.includes(examPreview) && (
                            <div className="space-y-2">
                                <Label htmlFor={`${id}-paper-text`}>Extracted past-paper page {examPreview}</Label>
                                <p className="text-sm text-muted-foreground">
                                    Highlight the relevant text to add it below. Include any shared directions, even when they appear on another page.
                                </p>
                                <Textarea
                                    key={examPreview}
                                    id={`${id}-paper-text`}
                                    ref={examExtract}
                                    readOnly
                                    rows={6}
                                    className="max-h-52 font-mono"
                                    value={examPdf?.pages[examPreview - 1] ?? ""}
                                />
                                <div className="flex flex-wrap gap-2">
                                    <Button type="button" size="sm" variant="outline" onClick={() => addExamSelection(setQuestion)}>
                                        Add selection to question
                                    </Button>
                                    <Button type="button" size="sm" variant="outline" onClick={() => addExamSelection(setSharedStem)}>
                                        Add selection to shared stem
                                    </Button>
                                </div>
                            </div>
                        )}
                        {examPages.length > 0 && (
                            <fieldset className="space-y-3 rounded-md border p-3">
                                <legend className="px-1 text-sm font-medium">Selected exam excerpt</legend>
                                <p className="text-sm text-muted-foreground">
                                    Check the text against the original PDF. Removing a selected page clears the shared stem and question.
                                </p>
                                <div className="space-y-2">
                                    <Label htmlFor={`${id}-reference`}>Exam question reference</Label>
                                    <Input
                                        id={`${id}-reference`}
                                        placeholder="Q2(b)"
                                        value={examReference}
                                        onChange={(event) => {
                                            invalidateSource();
                                            setExamReference(event.currentTarget.value);
                                        }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor={`${id}-stem`}>Shared stem (optional)</Label>
                                    <Textarea
                                        id={`${id}-stem`}
                                        className="max-h-52 font-mono"
                                        value={sharedStem}
                                        onChange={(event) => {
                                            invalidateSource();
                                            setSharedStem(event.currentTarget.value);
                                        }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor={`${id}-question`}>Question or subpart</Label>
                                    <Textarea
                                        id={`${id}-question`}
                                        className="max-h-52 font-mono"
                                        value={question}
                                        onChange={(event) => {
                                            invalidateSource();
                                            setQuestion(event.currentTarget.value);
                                        }}
                                    />
                                </div>
                            </fieldset>
                        )}
                    </MaterialPdfPicker>
                </div>

                {lectureTooLong && <p role="alert" className="text-sm text-destructive">Limit the lecture excerpts to 60,000 characters total.</p>}
                {examTooLong && <p role="alert" className="text-sm text-destructive">Limit the shared stem and question to 24,000 characters total.</p>}
                <Button type="button" disabled={!canPropose || pending !== null} onClick={() => void propose()}>
                    {pending === "proposal" ? "Finding a match…" : "Propose a match"}
                </Button>
                {proposal && (
                    <section aria-label="Proposed match" className="space-y-3 rounded-lg border p-4">
                        <h3 className="font-semibold">{proposal.family ? "Proposed match" : "No supported match"}</h3>
                        {matches.length > 0 ? (
                            <fieldset className="space-y-2">
                                <legend className="mb-2 text-sm">Choose a supported task</legend>
                                {matches.map((match, index) => (
                                    <label key={match.family} className="flex items-start gap-2 rounded-md border p-3 text-sm">
                                        <input
                                            type="radio"
                                            name={`${id}-match`}
                                            checked={match.family === selectedFamily}
                                            aria-labelledby={`${id}-match-label-${index}`}
                                            aria-describedby={`${id}-match-reason-${index}`}
                                            onChange={() => {
                                                resetConfirmation();
                                                setSelectedFamily(match.family);
                                            }}
                                            className="mt-1 accent-primary"
                                        />
                                        <span className="space-y-1">
                                            <span id={`${id}-match-label-${index}`} className="block font-medium">{match.task}</span>
                                            <span id={`${id}-match-reason-${index}`} className="block text-muted-foreground">{match.reason}</span>
                                        </span>
                                    </label>
                                ))}
                            </fieldset>
                        ) : (
                            <div className="space-y-1">
                                {proposal.task && <p className="font-medium">{proposal.task}</p>}
                                <p className="text-sm text-muted-foreground">{proposal.reason}</p>
                            </div>
                        )}
                        {selectedFamily && !confirmed && (
                            <Button type="button" variant="outline" onClick={() => setConfirmed(true)}>Confirm match</Button>
                        )}
                        {confirmed && (
                            <div className="flex flex-wrap items-end gap-3">
                                <div className="space-y-2">
                                    <Label htmlFor={`${id}-seed`}>Replay seed</Label>
                                    <Input
                                        id={`${id}-seed`}
                                        type="number"
                                        min={0}
                                        max={MAX_SEED}
                                        step={1}
                                        value={seedText}
                                        aria-invalid={!validSeed}
                                        aria-describedby={!validSeed ? `${id}-seed-error` : undefined}
                                        onChange={(event) => setSeedText(event.currentTarget.value)}
                                        className="w-40"
                                    />
                                </div>
                                <Button type="button" disabled={!validSeed || pending !== null} onClick={() => void generate(seed)}>
                                    {pending === "generate" ? "Generating questions…" : "Generate five MCQs"}
                                </Button>
                            </div>
                        )}
                        {confirmed && !validSeed && (
                            <p id={`${id}-seed-error`} className="text-sm text-destructive">Enter a whole number from 0 to 2,147,483,647.</p>
                        )}
                    </section>
                )}
                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                {result && lecturePdf && examPdf && (
                    <MaterialQuestionSetView
                        result={result}
                        sources={[{ pdf: lecturePdf, pages: lecturePages }, { pdf: examPdf, pages: examPages }]}
                        examReference={examReference.trim()}
                        onReplay={() => {
                            setSeedText(String(result.seed));
                            void generate(result.seed);
                        }}
                    />
                )}
            </CardContent>
        </Card>
    );
}
