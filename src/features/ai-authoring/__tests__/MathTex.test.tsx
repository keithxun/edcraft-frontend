import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { MathTex } from "../components/MathTex";

describe("MathTex", () => {
    afterEach(cleanup);

    it("renders KaTeX markup and MathML for a fraction", () => {
        const { container } = render(<MathTex latex="\frac{1}{2}" />);

        expect(container.querySelector(".katex")).not.toBeNull();
        expect(container.querySelector("math")).not.toBeNull();
        expect(container.querySelector("mfrac")).not.toBeNull();
    });

    it("falls back to the plain string for invalid LaTeX", () => {
        const { container } = render(<MathTex latex="\frac{1}{" />);

        expect(container.querySelector(".katex")).toBeNull();
        expect(container.querySelector(".katex-error")).toBeNull();
        expect(container.textContent).toBe("\\frac{1}{");
    });

    it("typesets valid LaTeX that contains the text katex-error", () => {
        const { container } = render(<MathTex latex={"\\text{katex-error}"} />);

        expect(container.querySelector(".katex")).not.toBeNull();
        expect(container.textContent).toContain("katex-error");
    });
});
