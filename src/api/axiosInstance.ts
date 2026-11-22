import axios, { AxiosError, type AxiosRequestConfig, type AxiosResponse } from "axios";
import { toast } from "sonner";
import type { MaterialRetrievalRequest } from "./models/materialRetrievalRequest";

export class ApiError extends Error {
    status: number;
    detail: string;
    errorType?: string;

    constructor(status: number, detail: string, errorType?: string) {
        super(detail);
        this.name = "ApiError";
        this.status = status;
        this.detail = detail;
        this.errorType = errorType;
    }
}

// Callback for handling logout on auth failure (set by auth service)
let onAuthFailure: (() => void) | null = null;
export const setAuthFailureHandler = (handler: () => void) => {
    onAuthFailure = handler;
};

const instance = axios.create({
    baseURL: "/api",
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 30000,
    withCredentials: true,
});

let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

// Response interceptor for error handling
instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        if (axios.isCancel(error)) throw error;

        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // Handle 401: attempt token refresh then retry
        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url?.includes("/auth/")
        ) {
            originalRequest._retry = true;
            try {
                if (!isRefreshing) {
                    isRefreshing = true;
                    refreshPromise = instance
                        .post("/auth/refresh")
                        .then(() => {})
                        .finally(() => {
                            isRefreshing = false;
                        });
                }
                await refreshPromise;
                return instance(originalRequest);
            } catch {
                // Refresh failed — clear auth state
                if (onAuthFailure) {
                    onAuthFailure();
                }
                return Promise.reject(error);
            }
        }

        if (error.response) {
            const data = error.response.data as { detail?: string; error_type?: string };
            const apiError = new ApiError(
                error.response.status,
                data?.detail || error.message,
                data?.error_type,
            );

            // Show user-friendly toast for specific errors
            if (apiError.status >= 500) {
                toast.error("Server error. Please try again later.");
            } else if (
                apiError.status === 401 &&
                error.config?.url?.includes("/auth/") &&
                !error.config?.url?.includes("/auth/refresh")
            ) {
                toast.error(apiError.detail || "Authentication failed");
            } else if (apiError.status === 404) {
                toast.error(apiError.detail || "Resource not found");
            } else if (apiError.status === 403) {
                toast.error("You do not have permission to perform this action");
            } else if (apiError.status === 400) {
                toast.error(apiError.detail || "Invalid request");
            } else if (apiError.status === 409) {
                toast.error(apiError.detail || "Conflict error");
            }

            // Log API errors for debugging
            console.error("API Error:", {
                status: apiError.status,
                detail: apiError.detail,
                type: apiError.errorType,
                url: error.config?.url,
            });

            throw apiError;
        }

        // Network error (no response received)
        if (error.request) {
            toast.error("Network error. Please check your connection.");
            const networkError = new ApiError(
                0,
                "Network error. Please check your connection.",
                "network_error",
            );

            console.error("Network Error:", error.message);

            throw networkError;
        }

        // Request setup error
        console.error("Request Error:", error.message);
        throw error;
    },
);

// Mutator function for orval
export const axiosInstance = <T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return instance.request<T>(config);
};

export function materialRetrievalAxiosInstance<T>(config: AxiosRequestConfig<MaterialRetrievalRequest>) {
    const request = config.data?.strategy === "semantic" ? { ...config, timeout: 180_000 } : config;
    return axiosInstance<T>(request);
}
