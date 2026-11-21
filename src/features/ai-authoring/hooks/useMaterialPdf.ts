import { useEffect, useRef, useState } from "react";
import { getAuthoringErrorMessage } from "../errors";
import { extractMaterialPages } from "../services/materials.service";

const MAX_SOURCE_NAME_LENGTH = 300;

export interface MaterialPdf {
    id: string;
    file: File;
    label: string;
    url: string;
    pages: string[];
    pending: boolean;
    error: string | null;
}

export function materialPageUrl(url: string, page: number) {
    return `${url}#page=${page}`;
}

export function useMaterialPdfs() {
    const [pdfs, setPdfs] = useState<MaterialPdf[]>([]);
    const nextId = useRef(1);
    const uploadsByName = useRef(new Map<string, number>());
    const resources = useRef(new Map<string, string>());

    useEffect(() => {
        const uploads = resources.current;
        return () => {
            for (const url of uploads.values()) URL.revokeObjectURL(url);
            uploads.clear();
        };
    }, []);

    function removePdf(id: string) {
        const url = resources.current.get(id);
        if (url) {
            URL.revokeObjectURL(url);
            resources.current.delete(id);
        }
        setPdfs((previous) => previous.filter((pdf) => pdf.id !== id));
    }

    function importPdf(file: File) {
        const id = String(nextId.current++);
        const ordinal = (uploadsByName.current.get(file.name) ?? 0) + 1;
        uploadsByName.current.set(file.name, ordinal);
        const label = ordinal === 1 ? file.name : `${file.name} (upload ${ordinal})`;
        if (Array.from(label.trim()).length > MAX_SOURCE_NAME_LENGTH) {
            setPdfs((previous) => [...previous, {
                id, file, label, url: "", pages: [], pending: false,
                error: "Use a PDF filename up to 300 characters.",
            }]);
            return;
        }
        const preview = file.type === "application/pdf" ? file : new Blob([file], { type: "application/pdf" });
        const reading: MaterialPdf = {
            id,
            file,
            label,
            url: URL.createObjectURL(preview),
            pages: [],
            pending: true,
            error: null,
        };
        resources.current.set(id, reading.url);
        setPdfs((previous) => [...previous, reading]);

        function finish(pages: string[], error: string | null) {
            if (!resources.current.has(id)) return;
            setPdfs((previous) => previous.map((pdf) =>
                pdf.id === id ? { ...reading, pages, pending: false, error } : pdf,
            ));
        }

        void extractMaterialPages(file).then(
            ({ pages }) => finish(pages, null),
            (error) => finish([], getAuthoringErrorMessage(error, "The PDF could not be read.")),
        );
    }

    return { pdfs, importPdf, removePdf };
}
