import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "@/api/axiosInstance";
import { TemplateApproval } from "../components/TemplateApproval";
import { decidePilotTemplate } from "../services/checkPilot.service";
import { templateRecord } from "./fixtures";

vi.mock("../services/checkPilot.service", async (importOriginal) => {
    const actual =
        await importOriginal<typeof import("../services/checkPilot.service")>();
    return {
        ...actual,
        createPilotTemplate: vi.fn(),
        listPilotTemplates: vi.fn(),
        getPilotTemplate: vi.fn(),
        listPilotChecks: vi.fn(),
        getPilotCheck: vi.fn(),
        decidePilotTemplate: vi.fn(),
        generatePilotBatch: vi.fn(),
    };
});

function renderApproval(record = templateRecord()) {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
        <QueryClientProvider client={client}>
            <TemplateApproval record={record} />
        </QueryClientProvider>,
    );
}

describe("TemplateApproval", () => {
    beforeEach(() => {
        vi.mocked(decidePilotTemplate).mockReset();
        vi.mocked(decidePilotTemplate).mockResolvedValue(
            templateRecord({ approval: "approved" }),
        );
    });

    afterEach(cleanup);

    it("shows both exact digests and approves with the current values", async () => {
        const user = userEvent.setup();
        renderApproval();

        expect(screen.getByText("Approval applies to these exact versions.")).toBeInTheDocument();
        expect(screen.getByTitle("a".repeat(64))).toHaveTextContent("aaaaaaaaaaaa…");
        expect(screen.getByTitle("c".repeat(64))).toHaveTextContent("cccccccccccc…");

        await user.click(screen.getByRole("button", { name: "Approve template" }));

        await waitFor(() => {
            expect(decidePilotTemplate).toHaveBeenCalledWith("template-1", {
                template_sha256: "a".repeat(64),
                check_sha256: "c".repeat(64),
                decision: "approved",
            });
        });
    });

    it("keeps rejection explicit and distinct from a failed check", async () => {
        vi.mocked(decidePilotTemplate).mockResolvedValue(
            templateRecord({ approval: "rejected" }),
        );
        const user = userEvent.setup();
        renderApproval();

        await user.click(screen.getByRole("button", { name: "Reject template" }));
        expect(
            screen.getByText(/Rejection binds to the current template version/),
        ).toBeInTheDocument();
        expect(decidePilotTemplate).not.toHaveBeenCalled();

        await user.click(screen.getByRole("button", { name: "Confirm rejection" }));

        await waitFor(() => {
            expect(decidePilotTemplate).toHaveBeenCalledWith("template-1", {
                template_sha256: "a".repeat(64),
                check_sha256: "c".repeat(64),
                decision: "rejected",
            });
        });
    });

    it("disables approval when the version is not currently approvable", () => {
        renderApproval(templateRecord({ status: "needs_review" }));

        expect(screen.getByRole("button", { name: "Approve template" })).toBeDisabled();
        expect(
            screen.getByText(
                "Approve unavailable: only a ready template can be approved.",
            ),
        ).toBeInTheDocument();
    });

    it("allows rejecting an unqualified version when both digests are present", async () => {
        const user = userEvent.setup();
        renderApproval(templateRecord({ status: "needs_review" }));

        expect(screen.getByRole("button", { name: "Approve template" })).toBeDisabled();
        await user.click(screen.getByRole("button", { name: "Reject template" }));
        await user.click(screen.getByRole("button", { name: "Confirm rejection" }));

        await waitFor(() => {
            expect(decidePilotTemplate).toHaveBeenCalledWith("template-1", {
                template_sha256: "a".repeat(64),
                check_sha256: "c".repeat(64),
                decision: "rejected",
            });
        });
    });

    it("allows rejecting a draft with no qualified check and omits the absent digest", async () => {
        vi.mocked(decidePilotTemplate).mockResolvedValue(
            templateRecord({ check: null, approval: "rejected" }),
        );
        const user = userEvent.setup();
        renderApproval(templateRecord({ check: null }));

        expect(
            screen.getByText("Approve unavailable: no qualified check."),
        ).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Approve template" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Reject template" })).toBeEnabled();

        await user.click(screen.getByRole("button", { name: "Reject template" }));
        await user.click(screen.getByRole("button", { name: "Confirm rejection" }));

        await waitFor(() => {
            expect(decidePilotTemplate).toHaveBeenCalledWith("template-1", {
                template_sha256: "a".repeat(64),
                decision: "rejected",
            });
        });
    });

    it("renders a rejected badge and keeps rejected versions visibly distinct", () => {
        renderApproval(
            templateRecord({
                status: "error",
                approval: "rejected",
                check: null,
                template: null,
            }),
        );

        expect(screen.getByText("Rejected")).toBeInTheDocument();
        expect(
            screen.getByText(/findings and saved evidence\s+remain visible/i),
        ).toBeInTheDocument();
    });

    it("shows a safe stale-version error instead of claiming success", async () => {
        vi.mocked(decidePilotTemplate).mockRejectedValue(
            new ApiError(409, "template digest does not match current version"),
        );
        const user = userEvent.setup();
        renderApproval();

        await user.click(screen.getByRole("button", { name: "Approve template" }));

        expect(
            await screen.findByText(/changed, or the approval is stale/i),
        ).toBeInTheDocument();
    });
});
