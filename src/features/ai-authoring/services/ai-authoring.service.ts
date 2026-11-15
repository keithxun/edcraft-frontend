import { api } from "@/api/client";
import type {
    ApprovalInput,
    AuthoringApproval,
    AuthoringBatch,
    AuthoringCapabilities,
    AuthoringJob,
    AuthoringJobSummary,
    AuthoringPreview,
    AuthoringReview,
    CreateAuthoringJobRequest,
    CreatedAuthoringJob,
    GenerateInput,
} from "../types";

export async function getAuthoringCapabilities(): Promise<AuthoringCapabilities> {
    const response = await api.getCapabilitiesAiAuthoringCapabilitiesGet();
    return response.data;
}

export async function createAuthoringJob(
    request: CreateAuthoringJobRequest,
): Promise<CreatedAuthoringJob> {
    const response = await api.submitJobAiAuthoringJobsPost(request);
    return response.data;
}

export async function listAuthoringJobs(): Promise<AuthoringJobSummary[]> {
    const response = await api.listJobsAiAuthoringJobsGet();
    return response.data;
}

export async function getAuthoringJob(jobId: string): Promise<AuthoringJob> {
    const response = await api.getJobAiAuthoringJobsJobIdGet(jobId);
    return response.data;
}

export async function getAuthoringReview(jobId: string): Promise<AuthoringReview> {
    const response = await api.reviewJobAiAuthoringJobsJobIdReviewGet(jobId);
    return response.data;
}

export async function getAuthoringPreview(
    jobId: string,
    seed: number,
): Promise<AuthoringPreview> {
    const response = await api.previewJobAiAuthoringJobsJobIdPreviewPost(jobId, { seed });
    return response.data;
}

export async function decideAuthoringApproval(
    jobId: string,
    input: ApprovalInput,
): Promise<AuthoringApproval> {
    const response = await api.decideJobAiAuthoringJobsJobIdApprovalPost(jobId, input);
    return response.data;
}

export async function generateAuthoringBatch(
    jobId: string,
    input: GenerateInput,
): Promise<AuthoringBatch> {
    const response = await api.generateJobAiAuthoringJobsJobIdGeneratePost(jobId, input);
    return response.data;
}
