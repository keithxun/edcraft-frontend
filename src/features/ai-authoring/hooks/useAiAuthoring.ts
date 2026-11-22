import { useEffect, useState } from "react";
import { skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api";
import { useUserStore } from "@/shared/stores/user.store";
import { nextJobPollingInterval } from "../polling";
import {
    createAuthoringJob,
    decideAuthoringApproval,
    generateAuthoringBatch,
    getAuthoringCapabilities,
    getAuthoringJob,
    getAuthoringPreview,
    getAuthoringReview,
    getJudgeCompatibility,
    listAuthoringJobs,
} from "../services/ai-authoring.service";
import type {
    ApprovalInput,
    CreateAuthoringJobRequest,
    GenerateInput,
    JudgeCompatibilityRequest,
} from "../types";

// Scope every AI query key to the current owner so cached data from a prior
// account can never be selected while the new owner's request is in flight.
function useOwnerId(): string | null {
    return useUserStore((state) => state.user?.id ?? null);
}

export function useAuthoringCapabilities() {
    const ownerId = useOwnerId();
    return useQuery({
        queryKey: [...queryKeys.aiAuthoring.capabilities(), ownerId],
        queryFn: getAuthoringCapabilities,
        staleTime: 60_000,
    });
}

export function useJudgeCompatibility(
    request: JudgeCompatibilityRequest | null,
    hasManualModel: boolean,
) {
    const ownerId = useOwnerId();
    const selectionKey = JSON.stringify(request);
    const [settledSelection, setSettledSelection] = useState(selectionKey);
    const isSettling = hasManualModel && selectionKey !== settledSelection;

    useEffect(() => {
        if (!isSettling) return;
        const timer = setTimeout(() => setSettledSelection(selectionKey), 300);
        return () => clearTimeout(timer);
    }, [isSettling, selectionKey]);

    const query = useQuery({
        queryKey: [...queryKeys.aiAuthoring.judgeCompatibility(), ownerId, request],
        queryFn: request && !isSettling ? ({ signal }) => getJudgeCompatibility(request, signal) : skipToken,
        networkMode: "always",
        retry: false,
        staleTime: 60_000,
    });
    const isChecking = request !== null && (isSettling || query.isPending || query.isFetching);
    return {
        isChecking,
        result: !isChecking && query.isSuccess ? query.data : undefined,
        isError: !isChecking && query.isError,
        refetch: query.refetch,
    };
}

export function useAuthoringJobs() {
    const ownerId = useOwnerId();
    return useQuery({
        queryKey: [...queryKeys.aiAuthoring.jobs(), ownerId],
        queryFn: listAuthoringJobs,
    });
}

export function useAuthoringJob(jobId: string | undefined) {
    const ownerId = useOwnerId();
    return useQuery({
        queryKey: [...queryKeys.aiAuthoring.job(jobId ?? ""), ownerId],
        queryFn: () => getAuthoringJob(jobId ?? ""),
        enabled: Boolean(jobId),
        retry: 1,
        refetchInterval: (query) =>
            nextJobPollingInterval(query.state.data?.state, query.state.error),
        refetchIntervalInBackground: false,
    });
}

export function useAuthoringReview(jobId: string | undefined, enabled = true) {
    const ownerId = useOwnerId();
    return useQuery({
        queryKey: [...queryKeys.aiAuthoring.review(jobId ?? ""), ownerId],
        queryFn: () => getAuthoringReview(jobId ?? ""),
        enabled: Boolean(jobId) && enabled,
        retry: 1,
    });
}

export function useAuthoringPreview(
    jobId: string | undefined,
    artifactSha256: string | null | undefined,
    seed: number,
) {
    const ownerId = useOwnerId();
    return useQuery({
        queryKey: [
            ...queryKeys.aiAuthoring.preview(jobId ?? "", artifactSha256 ?? "", seed),
            ownerId,
        ],
        queryFn: () => getAuthoringPreview(jobId ?? "", seed),
        enabled: Boolean(jobId && artifactSha256),
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: Infinity,
    });
}

export function useCreateAuthoringJob() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (request: CreateAuthoringJobRequest) => createAuthoringJob(request),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.aiAuthoring.jobs() });
        },
    });
}

export function useDecideAuthoringApproval() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ jobId, input }: { jobId: string; input: ApprovalInput }) =>
            decideAuthoringApproval(jobId, input),
        onSuccess: (_approval, { jobId }) => {
            // The job key prefix also covers the review child key.
            void queryClient.invalidateQueries({ queryKey: queryKeys.aiAuthoring.job(jobId) });
            void queryClient.invalidateQueries({ queryKey: queryKeys.aiAuthoring.jobs() });
        },
    });
}

export function useGenerateAuthoringBatch() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ jobId, input }: { jobId: string; input: GenerateInput }) =>
            generateAuthoringBatch(jobId, input),
        onSuccess: (_batch, { jobId }) => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.aiAuthoring.job(jobId) });
        },
    });
}
