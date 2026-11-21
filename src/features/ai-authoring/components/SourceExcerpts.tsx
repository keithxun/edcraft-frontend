import type { AuthoringMaterials } from "@/api/models";

export function SourceExcerpts({ materials }: { materials: AuthoringMaterials }) {
    const passages = [
        ...materials.lecture.map((passage) => ({ passage, role: "Lecture" })),
        ...(materials.exam ? [{ passage: materials.exam, role: "Past paper" }] : []),
    ];

    return (
        <details className="rounded-md border p-3 text-sm">
            <summary className="cursor-pointer font-medium">Source excerpts</summary>
            <ul className="mt-3 space-y-3">
                {passages.map(({ passage, role }, index) => (
                    <li key={index} className="space-y-1">
                        <p className="break-words font-medium">
                            {role} · {passage.document} · {passage.pages.length === 1 ? "Page" : "Pages"}{" "}
                            {passage.pages.join(", ")}
                            {passage.edited && (
                                <span className="ml-2 text-xs font-normal text-muted-foreground">Edited excerpt</span>
                            )}
                        </p>
                        <p className="max-h-52 overflow-y-auto whitespace-pre-wrap break-words">{passage.text}</p>
                    </li>
                ))}
            </ul>
        </details>
    );
}
