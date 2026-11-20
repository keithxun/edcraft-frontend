import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMaterialPdfs, type MaterialPdf } from "../hooks/useMaterialPdf";
import { MaterialPdfPicker } from "./MaterialPdfPicker";

export interface MaterialExamExcerpt {
    text: string;
    reference: string;
    pdf: MaterialPdf;
    pages: number[];
    editedPages: number[];
}

interface ExamPassage {
    text: string;
    pages: number[];
    edited: boolean;
}

const EMPTY_PASSAGE: ExamPassage = { text: "", pages: [], edited: false };

export function MaterialExamPicker({ onChange }: { onChange: (excerpt: MaterialExamExcerpt | null) => void }) {
    const id = useId();
    const extracted = useRef<HTMLTextAreaElement>(null);
    const { pdfs, importPdf, removePdf } = useMaterialPdfs();
    const pdf = pdfs[0];
    const [selectedPages, setSelectedPages] = useState<number[]>([]);
    const [previewPage, setPreviewPage] = useState(1);
    const [reference, setReference] = useState("");
    const [sharedStem, setSharedStem] = useState(EMPTY_PASSAGE);
    const [question, setQuestion] = useState(EMPTY_PASSAGE);

    function publish(stem: ExamPassage, part: ExamPassage, label: string) {
        if (!pdf || !part.text.trim()) {
            onChange(null);
            return;
        }
        const passages = [stem, part].filter(({ text }) => text.trim());
        onChange({
            text: passages.map(({ text }) => text).join("\n\n"),
            reference: label.trim(),
            pdf,
            pages: [...new Set(passages.flatMap(({ pages }) => pages))].sort((a, b) => a - b),
            editedPages: passages.filter(({ edited }) => edited).flatMap(({ pages }) => pages),
        });
    }

    function clearPassages() {
        setReference("");
        setSharedStem(EMPTY_PASSAGE);
        setQuestion(EMPTY_PASSAGE);
        onChange(null);
    }

    function addSelection(passage: ExamPassage, update: (passage: ExamPassage) => void) {
        const textArea = extracted.current;
        if (!textArea) return;
        const selection = textArea.value.slice(textArea.selectionStart, textArea.selectionEnd);
        if (!selection.trim()) return;
        update({
            text: [passage.text, selection].filter((text) => text.trim()).join("\n\n"),
            pages: [...new Set([...passage.pages, previewPage])],
            edited: passage.edited,
        });
    }

    function changeSharedStem(passage: ExamPassage) {
        setSharedStem(passage);
        publish(passage, question, reference);
    }

    function changeQuestion(passage: ExamPassage) {
        setQuestion(passage);
        publish(sharedStem, passage, reference);
    }

    function editPassage(passage: ExamPassage, text: string): ExamPassage {
        if (!text.trim()) return { ...EMPTY_PASSAGE, text };
        return { text, pages: passage.pages.length ? passage.pages : selectedPages, edited: true };
    }

    return (
        <div className="space-y-2">
            <h3 className="font-semibold">Past paper <span className="text-sm font-normal text-muted-foreground">(optional)</span></h3>
            <MaterialPdfPicker
                label="Past-paper PDF"
                pagesLabel="Past-paper pages"
                pdf={pdf ?? null}
                selectedPages={selectedPages}
                previewPage={previewPage}
                onImport={(file) => {
                    if (pdf) removePdf(pdf.id);
                    clearPassages();
                    setSelectedPages([]);
                    setPreviewPage(1);
                    importPdf(file);
                }}
                onRemove={() => {
                    if (pdf) removePdf(pdf.id);
                    clearPassages();
                    setSelectedPages([]);
                    setPreviewPage(1);
                }}
                onSelectPage={(page, selected) => {
                    if (selected) {
                        setSelectedPages((pages) => [...pages, page].sort((a, b) => a - b));
                        setPreviewPage(page);
                    } else {
                        setSelectedPages((pages) => pages.filter((item) => item !== page));
                        setSharedStem(EMPTY_PASSAGE);
                        setQuestion(EMPTY_PASSAGE);
                        onChange(null);
                    }
                }}
                onPreviewPage={setPreviewPage}
            >
                {selectedPages.includes(previewPage) && (
                    <div className="space-y-2">
                        <Label htmlFor={`${id}-paper-text`}>Extracted past-paper page {previewPage}</Label>
                        <p className="text-sm text-muted-foreground">
                            Highlight a question or subpart, and include any shared instructions from the same or another page.
                        </p>
                        <Textarea
                            key={previewPage}
                            id={`${id}-paper-text`}
                            ref={extracted}
                            readOnly
                            rows={6}
                            className="max-h-52 font-mono"
                            value={pdf?.pages[previewPage - 1] ?? ""}
                        />
                        <div className="flex flex-wrap gap-2">
                            <Button type="button" size="sm" variant="outline" onClick={() => addSelection(question, changeQuestion)}>
                                Add selection to question
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => addSelection(sharedStem, changeSharedStem)}>
                                Add selection to shared stem
                            </Button>
                        </div>
                    </div>
                )}
                {selectedPages.length > 0 && (
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
                                value={reference}
                                onChange={(event) => {
                                    const label = event.currentTarget.value;
                                    setReference(label);
                                    publish(sharedStem, question, label);
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor={`${id}-stem`}>Shared stem (optional)</Label>
                            {sharedStem.edited && <span className="ml-2 text-xs text-muted-foreground">Edited excerpt</span>}
                            <Textarea
                                id={`${id}-stem`}
                                className="max-h-52 font-mono"
                                value={sharedStem.text}
                                onChange={(event) => changeSharedStem(editPassage(sharedStem, event.currentTarget.value))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor={`${id}-question`}>Question or subpart</Label>
                            {question.edited && <span className="ml-2 text-xs text-muted-foreground">Edited excerpt</span>}
                            <Textarea
                                id={`${id}-question`}
                                className="max-h-52 font-mono"
                                value={question.text}
                                onChange={(event) => changeQuestion(editPassage(question, event.currentTarget.value))}
                            />
                        </div>
                    </fieldset>
                )}
            </MaterialPdfPicker>
        </div>
    );
}
