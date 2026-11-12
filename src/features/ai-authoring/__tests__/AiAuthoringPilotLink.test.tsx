import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import { useUserStore } from "@/shared/stores/user.store";
import { router } from "@/router/routes";
import { ROUTES } from "@/router/paths";
import AiAuthoringPage from "../pages/AiAuthoringPage";
import { getAuthoringCapabilities, listAuthoringJobs } from "../services/ai-authoring.service";
import { capabilities, makeUser } from "./fixtures";

function routePaths(routes: RouteObject[]): string[] {
    return routes.flatMap((route) => [
        route.path ?? "",
        ...routePaths(route.children ?? []),
    ]);
}

vi.mock("../services/ai-authoring.service", () => ({
    getAuthoringCapabilities: vi.fn(),
    createAuthoringJob: vi.fn(),
    listAuthoringJobs: vi.fn(),
    getAuthoringJob: vi.fn(),
    getAuthoringReview: vi.fn(),
    getAuthoringPreview: vi.fn(),
    decideAuthoringApproval: vi.fn(),
    generateAuthoringBatch: vi.fn(),
}));

describe("AI authoring discoverability", () => {
    beforeEach(() => {
        useUserStore.getState().logout();
        act(() => useUserStore.getState().setUser(makeUser("user-a", "Alice")));
        vi.mocked(getAuthoringCapabilities).mockReset();
        vi.mocked(getAuthoringCapabilities).mockResolvedValue(capabilities);
        vi.mocked(listAuthoringJobs).mockReset();
        vi.mocked(listAuthoringJobs).mockResolvedValue([]);
    });

    afterEach(cleanup);

    it("links to private reusable maths checks from the existing authoring page", async () => {
        const client = new QueryClient({
            defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        });
        render(
            <QueryClientProvider client={client}>
                <MemoryRouter initialEntries={["/ai-authoring"]}>
                    <AiAuthoringPage />
                </MemoryRouter>
            </QueryClientProvider>,
        );

        expect(
            await screen.findByRole("link", { name: /Try reusable maths checks/i }),
        ).toHaveAttribute("href", "/ai-authoring/check-pilot");
        expect(
            screen.getByText(/Private pilot · polynomials and equations/),
        ).toBeInTheDocument();
        expect(
            screen.getByText(/differentiation and bounded real linear\/quadratic equations/i),
        ).toBeInTheDocument();
        expect(screen.queryByText(/arbitrary maths|LU decomposition/i)).not.toBeInTheDocument();
        expect(ROUTES.AI_AUTHORING_CHECK_PILOT).toBe("/ai-authoring/check-pilot");
        expect(routePaths(router.routes)).toContain("ai-authoring/check-pilot");
    });
});
