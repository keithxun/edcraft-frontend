# EdCraft

EdCraft is an education assessment platform that streamlines the assessment creation process. Create reusable question templates, organize them into question template banks, and generate assessments with different inputs.

## Overview

EdCraft is designed for educators who want to create algorithm and programming questions efficiently. Instead of manually writing questions, you provide code and configuration, and EdCraft generates questions by executing the code and analyzing the execution trace.

### Key Capabilities

- **Question Generation**: Generate MCQs, MRQs, and short answer questions from algorithm code and configuration
- **Code Execution Analysis**: Execute code with custom inputs and query specific elements in the execution trace to create reusable questions
- **Template System**: Create reusable question templates that can be instantiated with different inputs
- **Question Banks**: Organize questions and templates into collections

## Core Features

### Question Builder

Generate individual questions from code with specific input data.

**Workflow:**
1. Enter your algorithm code (Python)
2. Click "Analyse Code" to parse the code structure
3. Select target elements (function call, variable, return value, etc.) as the instructions to obtain the answer
4. Configure question parameters (type, output format, number of distractors)
5. Provide input data for the algorithm
6. Generate question - EdCraft executes the code and creates the question with distractors
7. Save to a new or existing question bank

### Question Template Builder

Create reusable question templates without specifying input data.

**Workflow:**
1. Enter your algorithm code (Python)
2. Click "Analyse Code" to parse the code structure
3. Select target elements (function call, variable, return value, etc.) as the instructions to obtain the answer
4. Configure question parameters (type, output format, number of distractors)
5. Generate template preview
6. Save to a new or existing question template bank

**Benefits:**
- Create question once, use with multiple inputs
- Build comprehensive question template banks
- Mix and match templates for different assessments

### Create Questions from Templates

**Workflow:**
1. Select the question template
2. Click the options and select "Create Question"
3. Provide input data for the algorithm
4. Generate question
5. Save to a new or existing question bank

**Assessment Instantiation Process:**
When you instantiate an assessment from a template:
1. Provide title and description for the new assessment
2. Supply input data for each question template
3. EdCraft executes all templates with the provided inputs
4. Generates a complete assessment with all questions

### AI Authoring

Author a checked code question with a server-configured model, review the evidence, approve the exact artifact, and export a deterministic JSON batch. The workflow is protected and requires the normal EdCraft sign-in.

1. Open **AI Authoring** in the header.
2. Enter a prompt and choose the difficulty, number of distractors and (under Advanced) a configured model profile.
3. Follow the job's phase and attempt progress; reopen owned jobs from the recent list or by URL.
4. Review the prompt, technical and advisory checks, sampling limits and seeded preview. Advisory difficulty/relevance findings do not block approval; technical failures do.
5. After approval, choose a base seed and quantity, generate the batch, check actual/distinct counts and warnings, then download the JSON batch.

Model connections, judge configuration and generation limits come from the backend. The frontend never asks for API keys or provider endpoints.

### Reusable maths checks pilot

The private `/ai-authoring/check-pilot` flow authors a reusable maths check, shows the model's selected contract and reason, and lets you review the pinned check reference, saved scope, recipe and sampled qualification evidence before approving the exact template and check digests. Templates remain unreviewed even when they reuse a passing check, and generated questions are seeded and provider-free.

The pilot supports bounded univariate real polynomials in x: differentiation with degree 1–5, and linear or quadratic equations/inequalities with degree at most 2. Equation and inequality checks compare complete real solution sets, including repeated or no real roots, endpoints and interval unions. Other operations (for example LU decomposition or general integration) are not supported. Qualification is sampled property-based evidence, not a proof or an exhaustive check.

New records include an additive optional `selection` metadata object (`contract_id`, `reason`, `source` and `check_ref`). Older records omit it; the inspector keeps them readable and does not invent a selection.

### Resource Management

Organize all resources in a hierarchical folder structure. Organize questions and question templates into banks.

**Resource Types:**
- Folders (for organization)
- Assessments (collections of generated questions)
- Assessment Templates (collection of question templates)

**Operations:**
- Create, rename, move, and delete resources
- Search and filter (coming soon)
- Share with students (coming soon)

### Canvas LMS Integration

Export assessments and individual questions directly to Canvas quizzes.

**Setup:**
1. Start the CORS proxy (see [cors-proxy repository](https://github.com/edcraft-org/cors-proxy))
2. In the app header, open the user menu and select **Canvas Settings**
3. Enter your Canvas domain (e.g. `myschool.instructure.com`) and a personal access token

## Tech Stack

### Frontend Framework
- **React 19** with TypeScript
- **Vite** - Fast build tool and dev server
- **React Router v7** - Client-side routing

### State Management
- **Zustand** - Lightweight state management
- **TanStack Query** (React Query) - Server state management with caching

### Forms & Validation
- **React Hook Form** - Performant form handling
- **Zod** - TypeScript-first schema validation

### UI & Styling
- **shadcn/ui** – Reusable, accessible UI components built on Radix UI and Tailwind CSS
- **Tailwind CSS v4** - Utility-first CSS framework
- **Lucide React** - Beautiful icon library
- **Sonner** - Toast notifications

### API Integration
- **Axios** - HTTP client with cookie-based authentication
- **Orval** - Automatic TypeScript API client generation from OpenAPI spec

### Deployment
- **Docker** - Containerized deployment with multi-stage builds
- **Nginx** - Production web server with reverse proxy for API

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or pnpm
- Backend API running (see [backend repository](https://github.com/edcraft-org/edcraft-backend))

### Installation

1. Clone the repository:
```bash
git clone https://github.com/edcraft-org/edcraft-frontend.git
cd edcraft-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:

Create a `.env` file in the root directory:
```env
VITE_API_BASE_URL=<backend_url>
VITE_CANVAS_PROXY_URL=http://localhost:8080  # URL of the CORS proxy for Canvas API requests
```

4. Start the development server:
```bash
npm run dev
```

### Docker Setup

EdCraft frontend can be run in a containerized environment using Docker. This provides a consistent, production-ready deployment.

#### Prerequisites

- Docker and Docker Compose installed
- Backend API running (see [backend repository](https://github.com/edcraft-org/edcraft-backend))

#### Quick Start with Docker Compose

1. Clone the repository:
```bash
git clone https://github.com/edcraft-org/edcraft-frontend.git
cd edcraft-frontend
```

2. Build and start all services:
```bash
# Assume backend and database started
docker-compose up -d
```

3. Access the application:
   - Frontend: http://localhost:3000
   - API (proxied): http://localhost:3000/api/*

4. View logs:
```bash
docker-compose logs -f frontend
```

5. Stop services:
```bash
docker-compose down
```

#### Build Docker Image Only

```bash
# Build the production image
docker build -t edcraft-frontend .

# Run the container
docker run -d \
  --name edcraft-frontend \
  -p 3000:80 \
  --network edcraft-network \
  edcraft-frontend
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Type-check and build for production
- `npm run lint` - Run ESLint for code quality
- `npm test` - Run the focused Vitest + Testing Library suite
- `npm run api:generate` - Generate API client from the backend OpenAPI specification

## Project Structure

The project follows a feature-based, modular architecture inside the src/ directory.
* `api/` – Handles backend communication and data fetching setup, including the generated API client, Axios configuration, React Query setup, and query key management.
* `components/` – Contains shared UI components:
  * `layout/` for structural components like headers and sidebars.
  * `ui/` for reusable UI primitives (e.g., buttons, dialogs).
* `features/` – Organised by domain-specific functionality (e.g., assessments, folders, questions, templates, builders). Each feature encapsulates its own logic and components.
* `router/` – Manages application routing, including route definitions and path constants.
- `shared/` – Holds cross-feature reusable logic such as shared components, global Zustand stores, and custom hooks.
- `lib/` – General utility functions.
- `constants/` – Centralised application-wide constants.
- `types/` – TypeScript type definitions.

## Canvas CORS Proxy

Canvas API requests are routed through a Caddy-based CORS proxy to work around browser CORS restrictions. The proxy selects the upstream host from the `X-Host` request header.

## API Integration

The application uses Orval to automatically generate a type-safe TypeScript API client from an OpenAPI specification.

### Regenerating the API Client

When the backend API changes, start the backend (or point Orval at a saved `openapi.json`) and run:

```bash
npm run api:generate
```

This reads `orval.config.ts` and regenerates:
- API client methods in `src/api/edcraftClient.ts`
- TypeScript types in `src/api/models/`

Do not hand-edit generated files. The AI authoring feature wraps the generated client in `src/features/ai-authoring/services/ai-authoring.service.ts`; set `input.target` in a temporary Orval config to regenerate from a file when a live backend is unavailable.

### API Configuration

The API base URL is configured via environment variables. Update `.env` to point to your backend:

```env
VITE_API_BASE_URL=<backend_url>
```

## Future Enhancements

### Target Selector Improvements

The current target selector workflow can be improved to make it more intuitive and less confusing for users.

### Builder Explainability

Improve transparency in how answers are generated.

* Step-by-step explanation of how answers are derived
* Visualization of execution trace evaluation
* Display of intermediate values and selected targets

### Advanced Target Selector Mode

Introduce an advanced mode for experienced users who want finer control over question generation.

* More direct access to the underlying query engine
* Support for composing more complex target expressions

### Assessment Instantiation UX Improvements

Simplify the assessment instantiation workflow.

Current workflow:

* Each template input is filled in step-by-step

Planned improvement:

* Replace the multi-step process with a single consolidated form page
* Allow users to provide inputs for all templates in one view

### Input Data Configuration Improvements

Improve input data configuration experience.

* Automatically identify the input type when typed inputs are provided
* Have default configurations based on the detected input type

### Frontend Testing

Add comprehensive frontend testing coverage to improve reliability and maintainability.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
