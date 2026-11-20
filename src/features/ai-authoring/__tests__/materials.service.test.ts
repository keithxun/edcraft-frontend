import { describe, expect, it, vi } from "vitest";
import { retrieveMaterialEvidence } from "../services/materials.service";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock("axios", () => ({
    default: {
        create: () => ({ request, interceptors: { response: { use: vi.fn() } } }),
    },
}));

describe("material evidence retrieval", () => {
    it("allows cold semantic retrieval up to three minutes without extending other requests", async () => {
        request.mockResolvedValue({ data: { evidence: [], topics: [] } });
        const pages = [{ document: "1: lecture.pdf", page: 1, text: "Series" }];

        await retrieveMaterialEvidence({ pages, topic: "Ratio test", strategy: "semantic" });
        expect(request).toHaveBeenLastCalledWith(expect.objectContaining({
            url: "/ai-authoring/materials/retrieve",
            timeout: 180_000,
        }));

        await retrieveMaterialEvidence({ pages, topic: "Ratio test", strategy: "keyword" });
        expect(request.mock.lastCall?.[0]).not.toHaveProperty("timeout");
        await retrieveMaterialEvidence({ pages, strategy: "selected" });
        expect(request.mock.lastCall?.[0]).not.toHaveProperty("timeout");
    });
});
