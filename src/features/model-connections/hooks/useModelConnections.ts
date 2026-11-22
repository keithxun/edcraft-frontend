import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api";
import { useUserStore } from "@/shared/stores/user.store";
import {
    createProviderConnection,
    deleteProviderConnection,
    listProviderConnections,
    probeProviderConnection,
    testProviderConnection,
    updateProviderConnection,
} from "../services/model-connections.service";
import type {
    CreateProviderConnectionInput,
    ProbeProviderInput,
    UpdateProviderConnectionInput,
} from "../types";

function useOwnerId(): string | null {
    return useUserStore((state) => state.user?.id ?? null);
}

function useInvalidateConnections() {
    const queryClient = useQueryClient();
    return () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.providerConnections.all() });
        // Authoring capabilities embed the caller's connections for the form.
        void queryClient.invalidateQueries({ queryKey: queryKeys.aiAuthoring.capabilities() });
        void queryClient.invalidateQueries({ queryKey: queryKeys.aiAuthoring.judgeCompatibility() });
    };
}

export function useProviderConnections() {
    const ownerId = useOwnerId();
    return useQuery({
        queryKey: [...queryKeys.providerConnections.all(), ownerId],
        queryFn: listProviderConnections,
    });
}

export function useCreateProviderConnection() {
    const invalidate = useInvalidateConnections();
    return useMutation({
        mutationFn: (input: CreateProviderConnectionInput) =>
            createProviderConnection(input),
        onSuccess: invalidate,
    });
}

export function useUpdateProviderConnection() {
    const invalidate = useInvalidateConnections();
    return useMutation({
        mutationFn: ({
            connectionId,
            input,
        }: {
            connectionId: string;
            input: UpdateProviderConnectionInput;
        }) => updateProviderConnection(connectionId, input),
        onSuccess: invalidate,
    });
}

export function useDeleteProviderConnection() {
    const invalidate = useInvalidateConnections();
    return useMutation({
        mutationFn: (connectionId: string) => deleteProviderConnection(connectionId),
        onSuccess: invalidate,
    });
}

export function useProbeProviderConnection() {
    return useMutation({
        mutationFn: (input: ProbeProviderInput) => probeProviderConnection(input),
    });
}

export function useTestProviderConnection() {
    const invalidate = useInvalidateConnections();
    return useMutation({
        mutationFn: (connectionId: string) => testProviderConnection(connectionId),
        onSuccess: invalidate,
    });
}
