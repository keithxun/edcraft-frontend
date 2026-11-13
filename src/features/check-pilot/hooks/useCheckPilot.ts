import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api";
import { useUserStore } from "@/shared/stores/user.store";
import {
    createPilotTemplate,
    decidePilotTemplate,
    generatePilotBatch,
    getPilotCheck,
    getPilotTemplate,
    listPilotChecks,
    listPilotTemplates,
} from "../services/checkPilot.service";
import type {
    CreatePilotTemplateInput,
    PilotApprovalInput,
    PilotBatch,
    PilotGenerateInput,
    PilotTemplateRecord,
} from "../types";

// Every key includes the owner, following the existing AI authoring cache
// convention. A different account therefore starts in its own loading state
// instead of seeing another owner's private artifacts.
function useOwnerId(): string | null {
    return useUserStore((state) => state.user?.id ?? null);
}

export function usePilotTemplates() {
    const ownerId = useOwnerId();
    return useQuery({
        queryKey: [...queryKeys.checkPilot.templates(), ownerId],
        queryFn: listPilotTemplates,
    });
}

export function usePilotTemplate(templateId: string | undefined) {
    const ownerId = useOwnerId();
    return useQuery({
        queryKey: [...queryKeys.checkPilot.template(templateId ?? ""), ownerId],
        queryFn: () => getPilotTemplate(templateId ?? ""),
        enabled: Boolean(templateId),
        retry: 1,
    });
}

export function usePilotChecks() {
    const ownerId = useOwnerId();
    return useQuery({
        queryKey: [...queryKeys.checkPilot.checks(), ownerId],
        queryFn: listPilotChecks,
    });
}

export function usePilotCheck(checkId: string | undefined) {
    const ownerId = useOwnerId();
    return useQuery({
        queryKey: [...queryKeys.checkPilot.check(checkId ?? ""), ownerId],
        queryFn: () => getPilotCheck(checkId ?? ""),
        enabled: Boolean(checkId),
        retry: 1,
    });
}

export function useCreatePilotTemplate(
    options: { timeoutMs?: number } = {},
) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: CreatePilotTemplateInput) =>
            createPilotTemplate(input, { timeoutMs: options.timeoutMs }),
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: queryKeys.checkPilot.templates(),
            });
            void queryClient.invalidateQueries({
                queryKey: queryKeys.checkPilot.checks(),
            });
        },
    });
}

export function useDecidePilotTemplate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            templateId,
            input,
        }: {
            templateId: string;
            input: PilotApprovalInput;
        }) => decidePilotTemplate(templateId, input),
        onSuccess: (_record: PilotTemplateRecord, { templateId }) => {
            // The templates prefix covers both the list and this detail key.
            void queryClient.invalidateQueries({
                queryKey: queryKeys.checkPilot.templates(),
            });
            void queryClient.invalidateQueries({
                queryKey: queryKeys.checkPilot.template(templateId),
            });
        },
    });
}

export function useGeneratePilotBatch() {
    return useMutation({
        mutationFn: ({
            templateId,
            input,
        }: {
            templateId: string;
            input: PilotGenerateInput;
        }): Promise<PilotBatch> => generatePilotBatch(templateId, input),
    });
}
