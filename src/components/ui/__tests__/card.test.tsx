import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CardTitle } from "../card";

describe("CardTitle", () => {
    afterEach(cleanup);

    it("stays a div by default so every other page keeps its outline", () => {
        render(<CardTitle>Recent questions</CardTitle>);

        const title = screen.getByText("Recent questions");
        expect(title.tagName).toBe("DIV");
        expect(title).toHaveAttribute("data-slot", "card-title");
    });

    it("renders an h2 when asked", () => {
        render(<CardTitle as="h2">Your request</CardTitle>);

        expect(
            screen.getByRole("heading", { level: 2, name: "Your request" }),
        ).toBeInTheDocument();
    });

    it("renders an h3 when asked", () => {
        render(<CardTitle as="h3">Example question</CardTitle>);

        expect(
            screen.getByRole("heading", { level: 3, name: "Example question" }),
        ).toBeInTheDocument();
    });
});
