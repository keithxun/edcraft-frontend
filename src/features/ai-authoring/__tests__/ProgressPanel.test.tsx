import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { ProgressPanel } from "../components/ProgressPanel";
import type { AuthoringJob, AuthoringProgressView } from "../types";
import { completedJob } from "./fixtures";

function runningJob(
    progress: AuthoringProgressView,
    overrides: Partial<AuthoringJob> = {},
): AuthoringJob {
    return {
        ...completedJob,
        state: "running",
        result: null,
        approval: null,
        progress: progress as AuthoringJob["progress"],
        ...overrides,
    };
}

function stageList() {
    return screen.getByRole("list", { name: "Authoring stages" });
}

function stageItems() {
    return within(stageList()).getAllByRole("listitem");
}

function stage(label: string) {
    return within(stageList()).getByText(label).closest("li");
}

describe("ProgressPanel", () => {
    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it.each([
        ["generating", "Writing the question", 0],
        ["checking", "Checking", 1],
        ["assessing", "Assessing difficulty and relevance", 2],
        ["finalizing", "Finishing", 3],
    ] as const)("marks %s as the current stage", (phase, label, activeIndex) => {
        render(<ProgressPanel job={runningJob({ phase, attempt: 1 })} />);

        const items = stageItems();
        expect(items).toHaveLength(4);
        expect(items[activeIndex]).toHaveTextContent(label);
        expect(items[activeIndex]).toHaveAttribute("aria-current", "step");
        expect(items[activeIndex]).toHaveTextContent("Current stage");
        for (const earlier of items.slice(0, activeIndex)) {
            expect(earlier).toHaveTextContent("Done");
            expect(earlier).not.toHaveAttribute("aria-current");
        }
        for (const later of items.slice(activeIndex + 1)) {
            expect(later).toHaveTextContent("Not started");
            expect(later).not.toHaveAttribute("aria-current");
        }
    });

    it("shows the finished check count and the friendly check name while checking", () => {
        render(
            <ProgressPanel
                job={runningJob({
                    phase: "checking",
                    attempt: 1,
                    checks_total: 3,
                    checks_done: 2,
                    current_check: "math_validate_options",
                })}
            />,
        );

        expect(stage("Checking")).toHaveTextContent("2 of 3");
        expect(stage("Checking")).toHaveTextContent("Answer choices");
        expect(screen.getByRole("status")).toHaveTextContent(
            "Checking: 2 of 3 checks · Answer choices",
        );
    });

    it("shows the revision count when a second attempt is under way", () => {
        render(
            <ProgressPanel
                job={runningJob({ phase: "correcting", attempt: 2, max_attempts: 4 })}
            />,
        );

        const items = stageItems();
        expect(items).toHaveLength(5);
        expect(stage("Revising")).toHaveAttribute("aria-current", "step");
        expect(stage("Revising")).toHaveTextContent("attempt 2 of 4");
        expect(stage("Checking")).toHaveTextContent("Done");
        expect(screen.getByRole("status")).toHaveTextContent("Revising: attempt 2 of 4");
    });

    it("shows the waiting message while queued", () => {
        render(
            <ProgressPanel
                job={{
                    ...completedJob,
                    state: "queued",
                    result: null,
                    approval: null,
                    progress: null,
                }}
            />,
        );

        expect(screen.getByText(/waiting for a turn/)).toBeVisible();
        expect(screen.getByRole("status")).toHaveTextContent("Waiting for a free authoring slot");
        for (const item of stageItems()) {
            expect(item).toHaveTextContent("Not started");
            expect(item).not.toHaveAttribute("aria-current");
        }
    });

    it("renders an old payload without check counts", () => {
        render(<ProgressPanel job={runningJob({ phase: "checking", attempt: 1 })} />);

        expect(stage("Checking")).toHaveAttribute("aria-current", "step");
        expect(stage("Checking")).not.toHaveTextContent(/of \d+ checks/);
        expect(screen.queryByText(/of \d+ checks/)).not.toBeInTheDocument();
    });

    it("counts elapsed time once per second while running", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-11-16T01:00:00Z"));
        render(
            <ProgressPanel
                job={runningJob(
                    { phase: "generating", attempt: 1 },
                    { started_at: "2026-11-16T01:00:00Z" },
                )}
            />,
        );

        expect(screen.getByText("Elapsed 0:00")).toBeInTheDocument();
        act(() => {
            vi.advanceTimersByTime(65_000);
        });
        expect(screen.getByText("Elapsed 1:05")).toBeInTheDocument();
    });

    it("falls back to created_at when started_at is not sent", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-11-16T01:00:00Z"));
        render(
            <ProgressPanel
                job={runningJob(
                    { phase: "generating", attempt: 1 },
                    { created_at: "2026-11-16T01:00:00Z" },
                )}
            />,
        );

        act(() => {
            vi.advanceTimersByTime(30_000);
        });
        expect(screen.getByText("Elapsed 0:30")).toBeInTheDocument();
    });

    it("stops counting elapsed time when the job is not running", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-11-16T01:00:00Z"));
        render(
            <ProgressPanel
                job={{
                    ...completedJob,
                    state: "queued",
                    result: null,
                    approval: null,
                    progress: null,
                    created_at: "2026-11-16T01:00:00Z",
                }}
            />,
        );

        expect(screen.getByText("Elapsed 0:00")).toBeInTheDocument();
        act(() => {
            vi.advanceTimersByTime(90_000);
        });
        expect(screen.getByText("Elapsed 0:00")).toBeInTheDocument();
    });
});
