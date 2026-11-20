import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReviewQuestionPreview } from "../components/ReviewQuestionPreview";
import { getAuthoringPreview } from "../services/ai-authoring.service";
import type { AuthoringPreview } from "../types";
import { MAX_SEED } from "../validation";

vi.mock("../services/ai-authoring.service", () => ({
    getAuthoringPreview: vi.fn(),
}));

const digest = "a".repeat(64);

// Both choice sets were captured from the unapproved wave-speed preview API.
function wavePreview(seed: number, question: string, options: string[]): AuthoringPreview {
    return {
        job_id: "wave-job",
        domain: "physics",
        artifact_id: "wave-artifact",
        artifact_sha256: digest,
        seed,
        question: {
            template_id: "physics.wave_speed",
            target: "h2_quantity",
            question,
            choices: options,
            answer: options[0],
            correct_index: 0,
            seed,
        },
    };
}

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

it("shows all numeric answer choices before approval and after randomizing", async () => {
    const first = wavePreview(
        0,
        "A progressive wave has frequency 2 Hz and wavelength 0.8 m. What is its propagation speed?",
        ["1.6 m/s", "2.8 m/s", "1.2 m/s", "2.5 m/s"],
    );
    const second = wavePreview(
        3,
        "A progressive wave has frequency 5 Hz and wavelength 0.4 m. What is its propagation speed?",
        ["2 m/s", "5.4 m/s", "4.6 m/s", "12.5 m/s"],
    );
    vi.mocked(getAuthoringPreview).mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <QueryClientProvider client={client}>
            <ReviewQuestionPreview
                jobId="wave-job"
                domain="physics"
                artifactSha256={digest}
                onStaleArtifact={vi.fn()}
            />
        </QueryClientProvider>,
    );
    for (const option of ["1.6 m/s", "2.8 m/s", "1.2 m/s", "2.5 m/s"]) {
        expect(await screen.findByText(option)).toBeInTheDocument();
    }
    expect(getAuthoringPreview).toHaveBeenCalledWith("wave-job", 0);

    vi.spyOn(Math, "random").mockReturnValue(3 / (MAX_SEED + 1));
    await userEvent.setup().click(screen.getByRole("button", { name: "Randomize" }));

    for (const option of ["2 m/s", "5.4 m/s", "4.6 m/s", "12.5 m/s"]) {
        expect(await screen.findByText(option)).toBeInTheDocument();
    }
    expect(getAuthoringPreview).toHaveBeenLastCalledWith("wave-job", 3);
    expect(screen.getByText("Seed 3")).toBeInTheDocument();
    expect(screen.queryByText("2.8 m/s")).not.toBeInTheDocument();
});
