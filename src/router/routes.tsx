import { lazy, Suspense } from "react";
import type { ComponentType } from "react";
import { createBrowserRouter } from "react-router-dom";
import { MainLayout } from "@/components/layout";
import { PageSkeleton } from "@/shared/components/feedback/LoadingSkeleton";
import { ProtectedRoute } from "./ProtectedRoute";

// Re-export ROUTES for convenience
export { ROUTES } from "./paths";

// Lazy load pages
const FolderPage = lazy(() => import("@/features/folders/pages/FolderPage"));
const QuestionBuilderPage = lazy(() => import("@/features/question-builder/pages/QuestionBuilderPage"));
const AssessmentPage = lazy(() => import("@/features/assessments/pages/AssessmentPage"));
const AssessmentTemplatePage = lazy(
    () => import("@/features/assessment-templates/pages/AssessmentTemplatePage"),
);
const QuestionBankPage = lazy(() => import("@/features/question-banks/pages/QuestionBankPage"));
const QuestionTemplateBankPage = lazy(
    () => import("@/features/question-template-banks/pages/QuestionTemplateBankPage"),
);
const AiAuthoringPage = lazy(() => import("@/features/ai-authoring/pages/AiAuthoringPage"));
const CheckPilotPage = lazy(
    () => import("@/features/check-pilot/pages/CheckPilotPage"),
);
const AiAuthoringJobPage = lazy(
    () => import("@/features/ai-authoring/pages/AiAuthoringJobPage"),
);
const AiAuthoringGeneratePage = lazy(
    () => import("@/features/ai-authoring/pages/AiAuthoringGeneratePage"),
);
const ModelConnectionsPage = lazy(
    () => import("@/features/model-connections/pages/ModelConnectionsPage"),
);
const TemplateBuilderPage = lazy(
    () => import("@/features/question-template-builder/pages/TemplateBuilderPage"),
);
const OAuthCallbackPage = lazy(() => import("@/features/auth/pages/OAuthCallbackPage"));
const VerifyEmailPage = lazy(() => import("@/features/auth/pages/VerifyEmailPage"));
const HomeRoute = lazy(() => import("./HomeRoute"));

const TutorialPage = lazy(() => import("@/features/tutorials/TutorialPage"));
const TemplateBuilderTutorialPage = lazy(
    () => import("@/features/tutorials/TemplateBuilderTutorialPage"),
);
const GenerateQuestionFromTemplateTutorialPage = lazy(
    () => import("@/features/tutorials/GenerateQuestionFromTemplateTutorialPage"),
);
const CreateAssessmentFromTemplateTutorialPage = lazy(
    () => import("@/features/tutorials/CreateAssessmentFromTemplateTutorialPage"),
);
const LinkDuplicateTutorialPage = lazy(
    () => import("@/features/tutorials/LinkDuplicateTutorialPage"),
);
const UploadToCanvasTutorialPage = lazy(
    () => import("@/features/tutorials/UploadToCanvasTutorialPage"),
);
const TargetSelectionTutorialPage = lazy(
    () => import("@/features/tutorials/TargetSelectionTutorialPage"),
);
const KnownLimitationsPage = lazy(() => import("@/features/landing/KnownLimitationsPage"));

// Helper to wrap lazy loaded components with Suspense
function lazyRoute(Component: ComponentType) {
    return (
        <Suspense fallback={<PageSkeleton />}>
            <Component />
        </Suspense>
    );
}

// Router configuration
export const router = createBrowserRouter([
    {
        path: "/",
        element: <MainLayout />,
        children: [
            {
                index: true,
                element: lazyRoute(HomeRoute),
            },
            // Public routes
            {
                path: "tutorial",
                children: [
                    {
                        index: true,
                        element: lazyRoute(TutorialPage),
                    },
                    {
                        path: "template-builder",
                        element: lazyRoute(TemplateBuilderTutorialPage),
                    },
                    {
                        path: "generate-question-from-template",
                        element: lazyRoute(GenerateQuestionFromTemplateTutorialPage),
                    },
                    {
                        path: "create-assessment-from-template",
                        element: lazyRoute(CreateAssessmentFromTemplateTutorialPage),
                    },
                    {
                        path: "link-duplicate",
                        element: lazyRoute(LinkDuplicateTutorialPage),
                    },
                    {
                        path: "upload-to-canvas",
                        element: lazyRoute(UploadToCanvasTutorialPage),
                    },
                    {
                        path: "target-selection",
                        element: lazyRoute(TargetSelectionTutorialPage),
                    },
                ],
            },
            {
                path: "known-limitations",
                element: lazyRoute(KnownLimitationsPage),
            },
            {
                path: "question-builder",
                element: lazyRoute(QuestionBuilderPage),
            },
            {
                path: "template-builder",
                element: lazyRoute(TemplateBuilderPage),
            },
            {
                path: "auth/callback",
                element: lazyRoute(OAuthCallbackPage),
            },
            {
                path: "auth/verify-email",
                element: lazyRoute(VerifyEmailPage),
            },
            {
                path: "assessments/:assessmentId",
                element: lazyRoute(AssessmentPage),
            },
            {
                path: "assessment-templates/:templateId",
                element: lazyRoute(AssessmentTemplatePage),
            },
            {
                path: "question-banks/:questionBankId",
                element: lazyRoute(QuestionBankPage),
            },
            {
                path: "question-template-banks/:templateBankId",
                element: lazyRoute(QuestionTemplateBankPage),
            },
            // Protected routes
            {
                element: <ProtectedRoute />,
                children: [
                    {
                        path: "folders/:folderId",
                        element: lazyRoute(FolderPage),
                    },
                    {
                        path: "ai-authoring",
                        element: lazyRoute(AiAuthoringPage),
                    },
                    {
                        path: "ai-authoring/check-pilot",
                        element: lazyRoute(CheckPilotPage),
                    },
                    {
                        path: "ai-authoring/:jobId",
                        element: lazyRoute(AiAuthoringJobPage),
                    },
                    {
                        path: "ai-authoring/:jobId/generate",
                        element: lazyRoute(AiAuthoringGeneratePage),
                    },
                    {
                        path: "settings/model-connections",
                        element: lazyRoute(ModelConnectionsPage),
                    },
                ],
            },
        ],
    },
]);

export default router;
