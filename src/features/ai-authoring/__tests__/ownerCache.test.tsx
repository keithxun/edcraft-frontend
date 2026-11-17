import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { ApiError } from "@/api/axiosInstance";
import { useUserStore } from "@/shared/stores/user.store";
import { RecentJobs } from "../components/RecentJobs";
import { listAuthoringJobs } from "../services/ai-authoring.service";
import type { AuthoringJobSummary } from "../types";
import { makeUser } from "./fixtures";

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

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, resolve, reject };
}

function jobSummary(jobId: string, prompt: string): AuthoringJobSummary {
    return {
        job_id: jobId,
        domain: "code",
        state: "completed",
        created_at: "2026-11-03T00:00:00Z",
        prompt_preview: prompt,
        difficulty: "easy",
        approval: null,
    };
}

function renderRecentJobs() {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
        <QueryClientProvider client={client}>
            <MemoryRouter>
                <RecentJobs />
            </MemoryRouter>
        </QueryClientProvider>,
    );
    return client;
}

describe("AI authoring owner-scoped cache", () => {
    beforeEach(() => {
        useUserStore.getState().logout();
        vi.mocked(listAuthoringJobs).mockReset();
    });

    afterEach(cleanup);

    it("never renders account A data while account B's request is pending", async () => {
        const jobsA = deferred<AuthoringJobSummary[]>();
        const jobsB = deferred<AuthoringJobSummary[]>();
        vi.mocked(listAuthoringJobs)
            .mockReturnValueOnce(jobsA.promise)
            .mockReturnValueOnce(jobsB.promise);

        act(() => useUserStore.getState().setUser(makeUser("user-a", "Alice")));
        renderRecentJobs();

        await act(async () => {
            jobsA.resolve([jobSummary("job-a", "Alice private prompt")]);
        });
        expect(await screen.findByText("Alice private prompt")).toBeInTheDocument();

        act(() => useUserStore.getState().setUser(makeUser("user-b", "Bob")));

        await waitFor(() =>
            expect(screen.queryByText("Alice private prompt")).not.toBeInTheDocument(),
        );
        expect(screen.getByText("Loading your recent questions…")).toBeInTheDocument();
        expect(listAuthoringJobs).toHaveBeenCalledTimes(2);

        await act(async () => {
            jobsB.resolve([jobSummary("job-b", "Bob private prompt")]);
        });
        expect(await screen.findByText("Bob private prompt")).toBeInTheDocument();
        expect(screen.queryByText("Alice private prompt")).not.toBeInTheDocument();
    });

    it("does not render cached data after logout, even when the next request 404s", async () => {
        const jobsA = deferred<AuthoringJobSummary[]>();
        const jobsLoggedOut = deferred<AuthoringJobSummary[]>();
        vi.mocked(listAuthoringJobs)
            .mockReturnValueOnce(jobsA.promise)
            .mockReturnValueOnce(jobsLoggedOut.promise);

        act(() => useUserStore.getState().setUser(makeUser("user-a", "Alice")));
        renderRecentJobs();

        await act(async () => {
            jobsA.resolve([jobSummary("job-a", "Alice private prompt")]);
        });
        expect(await screen.findByText("Alice private prompt")).toBeInTheDocument();

        act(() => useUserStore.getState().logout());

        await waitFor(() =>
            expect(screen.queryByText("Alice private prompt")).not.toBeInTheDocument(),
        );
        expect(screen.getByText("Loading your recent questions…")).toBeInTheDocument();

        await act(async () => {
            jobsLoggedOut.reject(new ApiError(404, "No jobs found."));
        });

        expect(
            await screen.findByText("Recent questions could not be loaded"),
        ).toBeInTheDocument();
        expect(screen.queryByText("Alice private prompt")).not.toBeInTheDocument();
    });
});
