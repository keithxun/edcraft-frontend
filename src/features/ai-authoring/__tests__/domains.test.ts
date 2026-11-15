import { describe, expect, it } from "vitest";
import { domainInfo, domainLabel, showsDomainView } from "../domains";

describe("domainInfo", () => {
    it("returns the Code entry", () => {
        expect(domainInfo("code")).toEqual({
            label: "Code",
            badge: "Python · multiple choice",
            promptPlaceholder:
                "Describe the programming concept and what students should reason about.",
        });
    });

    it("returns the Mathematics entry and badge", () => {
        expect(domainInfo("math").label).toBe("Mathematics");
        expect(domainInfo("math").badge).toBe("Mathematics · multiple choice");
    });

    it("falls back to a generic badge for an unknown domain", () => {
        expect(domainInfo("science")).toEqual({
            label: "Science",
            badge: "Multiple choice",
            promptPlaceholder: "Describe the question and what students should reason about.",
        });
    });
});

describe("domainLabel", () => {
    it("uses the label for a known domain", () => {
        expect(domainLabel("code")).toBe("Code");
        expect(domainLabel("math")).toBe("Mathematics");
    });

    it("capitalises an unknown domain", () => {
        expect(domainLabel("science")).toBe("Science");
    });

    it("returns Unknown domain for empty values", () => {
        expect(domainLabel("")).toBe("Unknown domain");
        expect(domainLabel(null)).toBe("Unknown domain");
        expect(domainLabel(undefined)).toBe("Unknown domain");
    });
});

describe("showsDomainView", () => {
    it("shows for a matching domain", () => {
        expect(showsDomainView("math", "math")).toBe(true);
    });

    it("hides for a different domain", () => {
        expect(showsDomainView("code", "math")).toBe(false);
    });
});
