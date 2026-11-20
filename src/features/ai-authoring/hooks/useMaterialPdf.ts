import { useEffect, useRef, useState } from "react";
import { getAuthoringErrorMessage } from "../errors";
import { extractMaterialPages } from "../services/materials.service";

export interface MaterialPdf {
    file: File;
    url: string;
    pages: string[];
    pending: boolean;
    error: string | null;
}

export function materialPageUrl(url: string, page: number) {
    return `${url}#page=${page}`;
}

export function useMaterialPdf() {
    const [pdf, setPdf] = useState<MaterialPdf | null>(null);
    const version = useRef(0);
    const url = pdf?.url;

    useEffect(() => {
        return () => {
            if (url) URL.revokeObjectURL(url);
        };
    }, [url]);

    async function importPdf(file: File) {
        const upload = ++version.current;
        const preview = file.type === "application/pdf"
            ? file
            : new Blob([file], { type: "application/pdf" });
        const reading = {
            file,
            url: URL.createObjectURL(preview),
            pages: [],
            pending: true,
            error: null,
        };
        setPdf(reading);
        try {
            const { pages } = await extractMaterialPages(file);
            if (version.current === upload) setPdf({ ...reading, pages, pending: false });
        } catch (error) {
            if (version.current !== upload) return;
            setPdf({
                ...reading,
                pending: false,
                error: getAuthoringErrorMessage(error, "The PDF could not be read."),
            });
        }
    }

    return { pdf, importPdf };
}
