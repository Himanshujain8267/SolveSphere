# SolveSphere

SolveSphere is a student placement-readiness project. The repository contains a React frontend scaffold, an Express authentication API, and an ML pipeline for exploring student placement outcomes and recommending coding problems.

## Repository Layout

```text
frontend/   React 19 and Vite client
backend/    Express API, Firebase token verification, and MongoDB user records
ML/         Placement analysis/model pipeline and coding-problem recommendations
```

The frontend currently contains the default Vite starter screen. The authentication API and ML tools are separate components and are not yet connected into a complete frontend workflow.

## Requirements

- Node.js and npm
- Python 3.10 or newer
- A MongoDB database for the backend
- A Firebase project with Authentication enabled and service-account credentials for the backend

## Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite serves the client at `http://localhost:5173` by default. To create a production build, run `npm run build` from `frontend/`.

## Run the Backend

Create `backend/.env` and configure:

```dotenv
PORT=5000
MONGODB_URL=mongodb://127.0.0.1:27017/solvesphere
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="your-service-account-private-key"
```

The Firebase Admin configuration also reads `FIREBASE_TYPE`, `FIREBASE_PRIVATE_KEY_ID`, `FIREBASE_CLIENT_ID`, `FIREBASE_AUTH_URI`, `FIREBASE_TOKEN_URI`, `FIREBASE_AUTH_PROVIDER_X509_CERT_URL`, and `FIREBASE_CLIENT_X509_CERT_URL` when supplied. Keep credentials out of version control.

Then start the API:

```bash
cd backend
npm install
npm run dev
```

The API listens on `http://localhost:5000` by default. Available routes include:

- `GET /api/health` for a health check
- `POST /api/auth/login` to verify a Firebase ID token and create or update the MongoDB user
- `GET /api/auth/me` to retrieve the authenticated user
- `POST /api/auth/logout` for the authenticated logout endpoint

Protected routes require `Authorization: Bearer <FIREBASE_ID_TOKEN>`. See [backend/README.md](backend/README.md) for request and response details.

## Machine Learning

The ML directory contains data preparation, feature engineering, model artifacts, exploratory-analysis reports, and coding-problem recommendation scripts. Follow [ML/README.md](ML/README.md) for the pipeline steps, dependencies, and data schema. The AI assistant script uses a `GEMINI_API_KEY`; configure it in the environment when using that feature.

## Current Status

The frontend is still a Vite starter, and frontend authentication has not yet been integrated with the backend. The backend currently allows CORS requests from `http://localhost:5173`. The ML workflow is run independently from the web application.