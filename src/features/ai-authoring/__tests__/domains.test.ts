import { describe, expect, it } from "vitest";
import { domainInfo, domainLabel, showsDomainView } from "../domains";

describe("domainInfo", () => {
    it("returns the Code entry", () => {
        expect(domainInfo("code")).toEqual({
            label: "Code",
            badge: "Computing · multiple choice",
            promptPlaceholder:
                "Describe the task, for example tracing the front index in a circular queue.",
        });
    });

    it("returns the Mathematics entry and badge", () => {
        expect(domainInfo("math").label).toBe("Mathematics");
        expect(domainInfo("math").badge).toBe("Mathematics · multiple choice");
    });

    it("returns the Biology entry, badge and placeholder", () => {
        expect(domainInfo("biology")).toEqual({
            label: "Biology",
            badge: "H2 Biology · multiple choice",
            promptPlaceholder:
                "Describe the H2 Biology topic and skill, for example calculating an offspring probability for a hypothetical single-gene cross.",
        });
    });

    it("returns the Chemistry entry", () => {
        expect(domainInfo("chemistry")).toEqual({
            label: "Chemistry",
            badge: "Chemistry · multiple choice",
            promptPlaceholder:
                "Describe the balancing skill, for example balancing combustion equations for simple alkanes.",
        });
    });

    it("returns the Physics entry and badge", () => {
        expect(domainInfo("physics")).toEqual({
            label: "Physics",
            badge: "Physics · multiple choice",
            promptPlaceholder:
                "Describe the physics skill, for example finding final velocity from initial velocity, acceleration and time.",
        });
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
        expect(domainLabel("biology")).toBe("Biology");
        expect(domainLabel("chemistry")).toBe("Chemistry");
        expect(domainLabel("physics")).toBe("Physics");
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
        expect(showsDomainView("biology", "biology")).toBe(true);
    });

    it("hides for a different domain", () => {
        expect(showsDomainView("code", "math")).toBe(false);
        expect(showsDomainView("biology", "math")).toBe(false);
        expect(showsDomainView("math", "biology")).toBe(false);
        expect(showsDomainView("code", "chemistry")).toBe(false);
        expect(showsDomainView("physics", "chemistry")).toBe(false);
    });

    it("shows the chemistry view only for chemistry", () => {
        expect(showsDomainView("chemistry", "chemistry")).toBe(true);
        expect(showsDomainView("math", "chemistry")).toBe(false);
    });
});
