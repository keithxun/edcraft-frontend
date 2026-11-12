import { beforeEach, describe, expect, it, vi } from "vitest";
import { axiosInstance } from "@/api/axiosInstance";
import {
    checkPilotTimeoutMs,
    createPilotTemplate,
    decidePilotTemplate,
    generatePilotBatch,
    getPilotCheck,
    getPilotTemplate,
    listPilotChecks,
    listPilotTemplates,
} from "../services/checkPilot.service";

vi.mock("@/api/axiosInstance", () => ({
    axiosInstance: vi.fn(),
}));

const record = {
    template_id: "template-1",
    template_sha256: "b".repeat(64),
};

describe("check pilot client", () => {
    beforeEach(() => {
        vi.mocked(axiosInstance).mockReset();
        vi.mocked(axiosInstance).mockResolvedValue({ data: record } as never);
    });

    it("authors a template at the agreed route with the exact request fields", async () => {
        await createPilotTemplate({
            prompt: "Differentiate bounded cubic polynomials.",
            connection_id: "connection-1",
            model: "gpt-test",
            num_distractors: 3,
        });

        expect(axiosInstance).toHaveBeenCalledWith({
            url: "/ai-authoring/check-pilot/templates",
            method: "POST",
            headers: { "Content-Type": "application/json" },
            data: {
                prompt: "Differentiate bounded cubic polynomials.",
                connection_id: "connection-1",
                model: "gpt-test",
                num_distractors: 3,
            },
            // Older backends report a combined 185 second bound; wait 15 s longer.
            timeout: 200_000,
        });
    });

    it("uses the configured server bound plus transport margin", async () => {
        await createPilotTemplate(
            { prompt: "Differentiate polynomials." },
            { timeoutMs: 3_675_000 },
        );

        expect(axiosInstance).toHaveBeenCalledWith(
            expect.objectContaining({ timeout: 3_675_000 }),
        );
        expect(checkPilotTimeoutMs(3660)).toBe(3_675_000);
        expect(checkPilotTimeoutMs(undefined)).toBe(200_000);
    });

    it("omits an unset model profile rather than sending undefined fields", async () => {
        await createPilotTemplate({
            prompt: "Differentiate polynomials.",
            model_profile: "default",
        });

        expect(axiosInstance).toHaveBeenCalledWith(
            expect.objectContaining({
                data: {
                    prompt: "Differentiate polynomials.",
                    model_profile: "default",
                },
            }),
        );
    });

    it("lists templates and checks with authenticated GET requests", async () => {
        await listPilotTemplates();
        expect(axiosInstance).toHaveBeenLastCalledWith({
            url: "/ai-authoring/check-pilot/templates",
            method: "GET",
        });

        await listPilotChecks();
        expect(axiosInstance).toHaveBeenLastCalledWith({
            url: "/ai-authoring/check-pilot/checks",
            method: "GET",
        });
    });

    it("encodes template and check identifiers as single path segments", async () => {
        await getPilotTemplate("template/../other");
        expect(axiosInstance).toHaveBeenLastCalledWith({
            url: "/ai-authoring/check-pilot/templates/template%2F..%2Fother",
            method: "GET",
        });

        await getPilotCheck("check with space");
        expect(axiosInstance).toHaveBeenLastCalledWith({
            url: "/ai-authoring/check-pilot/checks/check%20with%20space",
            method: "GET",
        });
    });

    it("sends both digests for an explicit approval decision", async () => {
        await decidePilotTemplate("template-1", {
            template_sha256: "a".repeat(64),
            check_sha256: "c".repeat(64),
            decision: "approved",
        });

        expect(axiosInstance).toHaveBeenLastCalledWith({
            url: "/ai-authoring/check-pilot/templates/template-1/approval",
            method: "POST",
            headers: { "Content-Type": "application/json" },
            data: {
                template_sha256: "a".repeat(64),
                check_sha256: "c".repeat(64),
                decision: "approved",
            },
        });
    });

    it("sends seed and quantity only to the generation route", async () => {
        await generatePilotBatch("template-1", { seed: 42, quantity: 4 });

        expect(axiosInstance).toHaveBeenLastCalledWith({
            url: "/ai-authoring/check-pilot/templates/template-1/generate",
            method: "POST",
            headers: { "Content-Type": "application/json" },
            data: { seed: 42, quantity: 4 },
            timeout: 60_000,
        });
    });
});
