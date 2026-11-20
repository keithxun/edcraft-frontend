import { isRecord } from "./questionPayload";

export function QuestionFigure({ figure }: { figure: unknown }) {
    if (
        !isRecord(figure) ||
        typeof figure.data_url !== "string" ||
        !/^data:image\/png;base64,[a-z0-9+/=]+$/i.test(figure.data_url) ||
        typeof figure.alt !== "string" ||
        typeof figure.credit !== "string"
    ) {
        return null;
    }

    return (
        <figure className="space-y-2">
            <img
                className="max-h-96 max-w-full rounded-md"
                src={figure.data_url}
                alt={figure.alt}
                decoding="async"
            />
            <figcaption className="text-xs text-muted-foreground">{figure.credit}</figcaption>
        </figure>
    );
}
