import { useId } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { materialPageUrl } from "../hooks/useMaterialPdf";
import type { MaterialPdf } from "../hooks/useMaterialPdf";

interface MaterialPdfPickerProps {
    label: string;
    pagesLabel: string;
    pdf: MaterialPdf | null;
    selectedPages: number[];
    previewPage: number;
    onImport?: (file: File) => void;
    onRemove?: () => void;
    onSelectPage?: (page: number, selected: boolean) => void;
    onPreviewPage: (page: number) => void;
    children?: ReactNode;
}

export function MaterialPdfPicker({
    label,
    pagesLabel,
    pdf,
    selectedPages,
    previewPage,
    onImport,
    onRemove,
    onSelectPage,
    onPreviewPage,
    children,
}: MaterialPdfPickerProps) {
    const inputId = useId();
    const previewId = useId();
    const pageCount = pdf?.pages.length ?? 0;
    const previewUrl = pdf?.url ? materialPageUrl(pdf.url, previewPage) : null;

    return (
        <section aria-label={`${label} source`} className="min-w-0 space-y-4 rounded-lg border p-4">
            <div className="space-y-2">
                {onImport && (
                    <>
                        <Label htmlFor={inputId}>{label}</Label>
                        <Input
                            id={inputId}
                            type="file"
                            accept=".pdf,application/pdf"
                            onChange={(event) => {
                                const file = event.currentTarget.files?.[0];
                                if (file) onImport(file);
                                event.currentTarget.value = "";
                            }}
                        />
                    </>
                )}
                {pdf && (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="break-all text-sm font-medium">{pdf.label}</p>
                        {onRemove && (
                            <Button type="button" size="sm" variant="ghost" aria-label={`Remove ${pdf.label}`} onClick={onRemove}>
                                Remove
                            </Button>
                        )}
                    </div>
                )}
                {pdf?.pending && <p role="status" className="text-sm text-muted-foreground">Reading PDF…</p>}
                {pdf?.error && <p role="alert" className="text-sm text-destructive">{pdf.error}</p>}
            </div>

            {pageCount > 0 && onSelectPage && (
                <fieldset className="space-y-2">
                    <legend className="text-sm font-medium">{pagesLabel}</legend>
                    <div className="flex max-h-28 flex-wrap gap-2 overflow-auto p-1">
                        {pdf?.pages.map((text, index) => {
                            const page = index + 1;
                            return (
                                <label key={page} className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={selectedPages.includes(page)}
                                        disabled={!text.trim()}
                                        onChange={(event) => onSelectPage(page, event.currentTarget.checked)}
                                        className="accent-primary"
                                    />
                                    Page {page}{!text.trim() && " (no text)"}
                                </label>
                            );
                        })}
                    </div>
                </fieldset>
            )}

            {previewUrl && (
                <div className="space-y-3">
                    {pageCount > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                            <Label htmlFor={previewId}>Preview page</Label>
                            <select
                                id={previewId}
                                value={previewPage}
                                onChange={(event) => onPreviewPage(Number(event.currentTarget.value))}
                                className="rounded-md border bg-background px-2 py-1 text-sm"
                            >
                                {pdf?.pages.map((_, index) => <option key={index} value={index + 1}>{index + 1}</option>)}
                            </select>
                        </div>
                    )}
                    <details className="space-y-2 text-sm">
                        <summary className="cursor-pointer font-medium">View original {label}</summary>
                        <a
                            href={previewUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline underline-offset-2"
                        >
                            Open page {previewPage} in a new tab
                        </a>
                        <iframe
                            key={previewUrl}
                            title={`${label}, page ${previewPage}`}
                            src={previewUrl}
                            loading="lazy"
                            className="h-72 w-full rounded-md border lg:h-96"
                        />
                    </details>
                    {children}
                </div>
            )}
        </section>
    );
}
