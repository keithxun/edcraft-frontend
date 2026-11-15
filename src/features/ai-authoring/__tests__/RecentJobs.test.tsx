import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
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

function jobSummary(
    overrides: Partial<AuthoringJobSummary> = {},
): AuthoringJobSummary {
    return {
        job_id: "job-1",
        domain: "code",
        state: "completed",
        created_at: "2026-11-03T00:00:00Z",
        prompt_preview: "Write a question about summing a list.",
        difficulty: "easy",
        approval: null,
        ...overrides,
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
}

describe("RecentJobs", () => {
    beforeEach(() => {
        useUserStore.getState().setUser(makeUser("user-a", "Alice"));
        vi.mocked(listAuthoringJobs).mockReset();
    });

    afterEach(() => {
        cleanup();
        useUserStore.getState().logout();
    });

    it("labels a completed job that needs review as Needs review", async () => {
        vi.mocked(listAuthoringJobs).mockResolvedValue([
            jobSummary({ result_status: "needs_review" }),
        ]);

        renderRecentJobs();

        expect(await screen.findByText("Needs review")).toBeInTheDocument();
        expect(screen.getByText("Needs review")).toHaveClass("bg-primary");
        expect(screen.queryByText("Completed")).not.toBeInTheDocument();
    });

    it("keeps Completed for a checked job and shows it in green", async () => {
        vi.mocked(listAuthoringJobs).mockResolvedValue([
            jobSummary({ result_status: "checked" }),
        ]);

        renderRecentJobs();

        expect(await screen.findByText("Completed")).toBeInTheDocument();
        expect(screen.getByText("Completed")).toHaveClass("bg-success");
        expect(screen.queryByText("Needs review")).not.toBeInTheDocument();
    });

    it("shows an approved decision in green and a rejected decision in red", async () => {
        vi.mocked(listAuthoringJobs).mockResolvedValue([
            jobSummary({
                job_id: "job-approved",
                approval: {
                    decision: "approved",
                    artifact_sha256: "a".repeat(64),
                    reviewer: "teacher@example.com",
                    note: null,
                    decided_at: "2026-11-03T00:00:00Z",
                },
            }),
            jobSummary({
                job_id: "job-rejected",
                approval: {
                    decision: "rejected",
                    artifact_sha256: "b".repeat(64),
                    reviewer: "teacher@example.com",
                    note: null,
                    decided_at: "2026-11-03T00:00:00Z",
                },
            }),
        ]);

        renderRecentJobs();

        expect(await screen.findByText("Approved")).toHaveClass("bg-success");
        expect(screen.getByText("Rejected")).toHaveClass("bg-destructive");
    });
});
