import katex from "katex";
// KaTeX's fonts and layout rules travel with the feature, so the stylesheet is
// loaded once wherever the maths views mount.
import "katex/dist/katex.min.css";

interface MathTexProps {
    latex: string;
    /** Display maths sits on its own line and is centred by KaTeX. */
    displayMode?: boolean;
    className?: string;
}

/**
 * Typeset one declared LaTeX string with KaTeX. Only KaTeX's own output is
 * injected, never the raw TeX source, and an expression KaTeX cannot parse
 * falls back to the plain string so a bad payload cannot break the preview.
 */
function renderMarkup(latex: string, displayMode: boolean): string | null {
    try {
        return katex.renderToString(latex, {
            displayMode,
            throwOnError: true,
            output: "htmlAndMathml",
            trust: false,
        });
    } catch {
        return null;
    }
}

export function MathTex({ latex, displayMode = false, className }: MathTexProps) {
    const markup = renderMarkup(latex, displayMode);
    if (markup === null) {
        return <span className={className}>{latex}</span>;
    }
    return (
        <span
            className={className}
            dangerouslySetInnerHTML={{ __html: markup }}
        />
    );
}
