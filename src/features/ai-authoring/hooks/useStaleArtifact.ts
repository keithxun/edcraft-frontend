import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api";

/**
 * Clears stale preview and review data for one job and exposes the notice the
 * page shows afterwards.
 */
export function useStaleArtifact(jobId: string | undefined) {
    const queryClient = useQueryClient();
    const [staleJobId, setStaleJobId] = useState<string | null>(null);

    const markStale = useCallback(() => {
        setStaleJobId(jobId ?? null);
        if (!jobId) return;
        queryClient.removeQueries({ queryKey: queryKeys.aiAuthoring.previewRoot(jobId) });
        // The job key prefix also covers the review and preview child keys.
        void queryClient.invalidateQueries({ queryKey: queryKeys.aiAuthoring.job(jobId) });
    }, [jobId, queryClient]);

    const dismissStale = useCallback(() => setStaleJobId(null), []);

    return {
        showStaleArtifact: staleJobId === jobId,
        markStale,
        dismissStale,
    };
}
