# SolveSphere

SolveSphere is a student coding-practice and placement-readiness project. It brings a user's competitive-programming profiles into one dashboard and includes a separate machine-learning workspace for placement-data analysis and coding-problem recommendations.

> **Project status:** The working end-to-end web flow includes Google sign-in, Firebase token verification, saving platform usernames, viewing live public profile statistics, and generating a five-question LeetCode study plan from the authenticated Preparation page. The placement package-regression pipeline remains an offline workflow and is not served by the web app.

## Contents

- [What works today](#what-works-today)
- [Architecture](#architecture)
- [Repository layout](#repository-layout)
- [Requirements](#requirements)
- [Run locally](#run-locally)
- [Configuration](#configuration)
- [Web application](#web-application)
- [Backend API](#backend-api)
- [LPA package estimator](#lpa-package-estimator)
- [Data and machine learning](#data-and-machine-learning)
- [Problem recommendation and AI assistant](#problem-recommendation-and-ai-assistant)
- [Validation and troubleshooting](#validation-and-troubleshooting)
- [Security and deployment notes](#security-and-deployment-notes)

## What works today

- Google sign-in in the React client through Firebase Authentication.
- Firebase ID-token verification by the Express API and user synchronization in MongoDB.
- Authenticated storage of LeetCode, GeeksforGeeks, Codeforces, and GitHub usernames.
- Username validation against the platforms' public services before saving.
- A dashboard that fetches public statistics from connected profiles and shows available metrics and charts, including LeetCode and Codeforces contest rating trends when history is available.
- An authenticated Preparation page that uses linked LeetCode contest rating, or a self-selected starting difficulty, to generate five linked practice questions.
- Standalone Python workflows for synthetic student placement data, preprocessing, exploratory analysis, and package regression.
- A rule-based Python problem recommender used by both the Preparation API and standalone CLI, plus an optional Gemini-powered chat wrapper.

The site also has landing-page sections for trackers, notes, company preparation, and achievements. Those sections are currently presentation/mock content and do not represent implemented persistence or workflows. The placement package-regression model and Gemini assistant are not integrated into the web app.

## Architecture

```text
Browser (React 19 + Vite)
  ├─ Firebase Authentication (Google sign-in)
  └─ Express API (REST, Firebase ID token in Bearer header)
       ├─ Firebase Admin SDK verifies ID tokens
       ├─ MongoDB / Mongoose stores users and platform usernames
       ├─ Public platform services provide profile statistics
       └─ Python rule-based recommender generates LeetCode practice plans

ML/ (separate Python workspace)
  ├─ Student placement data → cleaning → features → train/test → preprocessing
  ├─ XGBoost package regression model
  └─ Problem CSV → CLI/API recommendations → optional Gemini assistant
```

The frontend and API are separate Node projects. The ML scripts are independent of both. No root-level command currently starts all three parts.

## Repository layout

```text
.
├── backend/
│   ├── config/                 MongoDB and Firebase Admin setup
│   ├── controllers/            Authentication and platform request handlers
│   ├── middlewares/            Firebase token verification
│   ├── models/                 MongoDB User and PlatformProfile schemas
│   ├── routes/                 /api/auth and /api/platforms routes
│   ├── services/               Platform validation, statistics, and LeetCode API
│   ├── .env.example            Backend environment-variable template
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/         Landing-page sections, profile form, dashboard
│   │   ├── api.js              API base URL
│   │   ├── firebase.js         Firebase client initialization
│   │   ├── App.jsx             Authentication and page routing
│   │   └── main.jsx            React entry point
│   ├── public/                 Static icons and assets
│   ├── .env.example            Frontend environment-variable template
│   └── package.json
├── ML/
│   ├── config.py               Paths, targets, feature lists, and split settings
│   ├── data/                   Raw, processed, and recommendation datasets
│   ├── src/                    Placement data and model pipeline (steps 00–07)
│   ├── recommendation/         Problem database, recommender, and AI assistant
│   ├── models/                 Serialized preprocessing/model artifacts
│   └── reports/eda/            Generated analysis figures
├── package.json                Root manifest; it does not define app scripts
└── README.md
```

`node_modules`, build output, Python bytecode, and local environment files are generated/local data and should not be committed.

## Requirements

- Node.js and npm (use a current Node.js LTS release).
- Python 3.10 or newer for the ML scripts; a virtual environment is recommended.
- Python and pandas available to the backend process to generate Preparation-page study plans.
- A running MongoDB instance or MongoDB Atlas database.
- A Firebase project with Google Authentication enabled:
  - Firebase **web app** configuration for the browser.
  - Firebase **service-account** credentials for the backend Admin SDK.
- Internet access for Firebase, database access as applicable, and live platform-statistics/validation requests.
- Optional: a Gemini API key for the Python AI assistant.

## Run locally

Run each command in its own terminal from the repository root.

### 1. Configure and start MongoDB

Start a local MongoDB server, or prepare a MongoDB Atlas connection string. The backend does not start if it cannot connect to MongoDB.

### 2. Configure and start the backend

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Edit `backend/.env` and set `MONGODB_URL` and the Firebase Admin service-account values. Set `PORT=5000` to match the frontend's default API URL. Then start the API:

```powershell
npm run dev
```

The API starts at `http://localhost:5000` after a successful database connection. Check it at `http://localhost:5000/api/health`.

### 3. Configure and start the frontend

In another terminal:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
```

Set the `VITE_FIREBASE_*` values in `frontend/.env` to the Firebase web-app configuration for your project. Set `VITE_API_BASE_URL=http://localhost:5000/api` (or the URL where your API is running). Then run:

```powershell
npm run dev
```

Open the Vite URL printed in the terminal, normally `http://localhost:5173`. Make sure this host is authorized for Google sign-in in Firebase Authentication.

### 4. Install Python dependencies for Preparation plans

The backend calls the recommender script in `ML/recommendation/` as a Python subprocess. Install pandas for the interpreter used by the backend:

```powershell
python -m pip install pandas
```

Set `PYTHON_EXECUTABLE` in `backend/.env` if the backend should use a particular interpreter, for example an absolute path to a virtual-environment Python executable. The recommender's problem catalog is included at `ML/recommendation/data/problem_database.csv`; refresh it separately by following the recommendation database instructions below.

### 5. Run the Python placement pipeline (optional)

From the repository root:

```powershell
cd ML
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python src/00_generate_synthetic_data.py
python src/01_load_data.py
python src/02_clean_data.py
python src/03_eda.py
python src/04_feature_engineering.py
python src/05_split_data.py
python src/06_preprocessing.py
python src/07_train_model.py
```

On macOS/Linux, activate the environment with `source .venv/bin/activate`. Step `00` creates reproducible synthetic input data. If using a real dataset instead, place a schema-compatible CSV at `ML/data/raw/students_raw.csv` and omit step `00`.

## Configuration

### Backend: `backend/.env`

Copy `backend/.env.example` to `backend/.env`; never commit the resulting file.

| Variable | Purpose |
|---|---|
| `PORT` | Express listening port. Use `5000` for the supplied local frontend default, or update the frontend API URL to match. |
| `MONGODB_URL` | MongoDB connection string. |
| `FIREBASE_PROJECT_ID` | Firebase project ID used by Firebase Admin. |
| `FIREBASE_CLIENT_EMAIL` | Service-account email. |
| `FIREBASE_PRIVATE_KEY` | Service-account private key; preserve newlines as `\n` in an env file. |
| `FIREBASE_PRIVATE_KEY_ID` | Service-account private-key ID; required by the current initializer. |
| `FIREBASE_TYPE`, `FIREBASE_CLIENT_ID`, `FIREBASE_AUTH_URI`, `FIREBASE_TOKEN_URI`, `FIREBASE_AUTH_PROVIDER_X509_CERT_URL`, `FIREBASE_CLIENT_X509_CERT_URL` | Other service-account fields read by the Firebase Admin initializer. |
| `NODE_ENV` | Controls whether some API errors include development details. |
| `LEETCODE_API_BASE_URL` | Optional override for the LeetCode profile service; defaults to `https://alfa-leetcode-api.onrender.com`. |

The backend initializes Firebase Admin only when the required service-account settings are present. Without them, the server can start, but protected requests return `503`.

### Frontend: `frontend/.env`

Copy `frontend/.env.example` to `frontend/.env` and use the Firebase **web app** settings:

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | API root including `/api`, e.g. `http://localhost:5000/api`. Defaults to that URL in `src/api.js`. |
| `VITE_FIREBASE_API_KEY` | Firebase web-app API key. |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Authentication domain. |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID. |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket setting. |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID. |
| `VITE_FIREBASE_APP_ID` | Firebase web-app ID. |
| `VITE_FIREBASE_MEASUREMENT_ID` | Optional Analytics measurement ID. |

The client requires the first six Firebase configuration values other than the measurement ID before it initializes Firebase Authentication. Vite embeds `VITE_*` values in the browser bundle; they are configuration, not a place for private keys or server secrets.

## Web application

### Pages and user flow

- `/` — landing page with navigation, hero, feature previews, analytics mockups, platform showcase, company-preparation content, and sign-in actions.
- `/lpa-prediction` — a demo package estimator form using academic and optional coding-profile details. It is not a placement-probability predictor.
- `/preparation` — an authenticated preparation page with a five-question LeetCode plan generator. Other preparation-area cards remain placeholders for future feature work.
- `/profile` — authenticated form to add or edit platform usernames. On save, values are sent to the backend for validation and persistence.
- `/dashboard` — authenticated live dashboard. It loads platform profile statistics from the backend and offers refresh and profile-edit actions.

Unauthenticated visits to `/profile` or `/dashboard` return to `/`. Unknown paths also redirect to `/`.

After Google sign-in, the client obtains a Firebase ID token and calls `POST /api/auth/login` to synchronize the account. The profile form and dashboard obtain a fresh token from the Firebase client and send it as a Bearer token to protected API routes.

The profile form also caches saved platform IDs in browser `localStorage` for that Firebase UID. MongoDB remains the server-side source of truth; the dashboard requests current statistics from the API.

### LPA package estimator

The homepage's **Predict LPA** button opens a form for age, gender, branch, CGPA, projects, internships, skills, and optional platform/GitHub statistics. Users must sign in with Firebase before requesting an estimate. `POST /api/predictions/lpa` verifies the Firebase ID token, validates the submitted values, and invokes the saved preprocessing and XGBoost regression artifacts. Inputs are sent to the Python worker over standard input and are not saved; MongoDB stores only a hashed user identifier and per-window request count for rate limiting.

This is a clearly labeled demo estimate: the current package regressor was trained on synthetic student data and only on students marked placed. It estimates package, not the chance of placement; it is not reliable career or compensation advice. The endpoint allows five requests per Firebase user in each 15-minute window and limits concurrent Python predictions to two per backend process. The backend's Python interpreter must have the dependencies from `ML/requirements.txt` installed, and both `ML/models/model_package_v1.joblib` and `ML/models/preprocessor.joblib` must exist.

### Frontend commands

Run these from `frontend/`:

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Create the production bundle in `frontend/dist/`. |
| `npm run preview` | Preview a production build locally. |
| `npm run lint` | Run Oxlint on the frontend source. |

## Backend API

The local API base URL is `http://localhost:5000`; prepend `/api` to the routes below. All protected routes require:

```http
Authorization: Bearer <Firebase ID token>
```

### Routes

| Method | Path | Auth | Behavior |
|---|---|---:|---|
| `GET` | `/api/health` | No | Returns a basic server health response. |
| `POST` | `/api/predictions/lpa` | Yes | Validates and estimates package using the synthetic-data demo model; limited to five requests per user per 15-minute window. |
| `POST` | `/api/auth/login` | Yes | Verifies the Firebase token and creates or updates the MongoDB user. Request body is empty. |
| `GET` | `/api/auth/me` | Yes | Returns the synchronized MongoDB user for the token's Firebase UID. |
| `POST` | `/api/auth/logout` | Yes | Acknowledges logout; the browser must still sign out of Firebase. The API does not revoke tokens. |
| `GET` | `/api/platforms/profile` | Yes | Returns the saved platform usernames and user information. |
| `PATCH` | `/api/platforms/profile` | Yes | Validates and saves only the submitted platform fields. |
| `GET` | `/api/platforms/dashboard` | Yes | Fetches live statistics for the saved platform usernames. |
| `GET` | `/api/platforms/leetcode/:username` | Yes | Returns the full profile payload from the configured LeetCode service. |
| `POST` | `/api/platforms/preparation-plan` | Yes | Generates five LeetCode recommendations using linked contest rating or a selected fallback difficulty. |
| `GET` | `/api/platforms/preparation-topics` | Yes | Lists topic tags available in the Codeforces problem catalog. |
| `POST` | `/api/platforms/preparation-plan/topic` | Yes | Generates five Codeforces questions matching a selected topic tag. |
| `GET` | `/api/platforms/preparation-plans` | Yes | Restores the user's active level-based and topic-based plans. |
| `GET` | `/api/platforms/preparation-progress` | Yes | Returns solved-question records for the signed-in user. |
| `PUT` | `/api/platforms/preparation-progress` | Yes | Adds or removes one question from that user's solved list. |

Example profile update:

```http
PATCH /api/platforms/profile
Content-Type: application/json
Authorization: Bearer <Firebase ID token>
```

```json
{
  "platforms": {
    "leetcode": "example-user",
    "github": "example-user"
  }
}
```

Supported keys are `leetcode`, `geeksforgeeks`, `codeforces`, and `github`. Send only fields to add/change; omitted fields stay as saved. Send a field as `null` to clear it. A submitted non-null username is checked against its platform before it is stored. A missing profile can return `404` until at least one ID has been saved.

### Generate a LeetCode preparation plan

`POST /api/platforms/preparation-plan` takes an optional fallback difficulty:

```json
{
  "fallbackDifficulty": "Medium"
}
```

The backend uses the linked LeetCode contest rating when available and ignores the fallback in that case. If the profile has no contest rating, the endpoint responds with `409` and code `LEVEL_REQUIRED`; retry with `fallbackDifficulty` set to `Easy`, `Medium`, or `Hard`. A missing linked LeetCode username returns `409` with code `LEETCODE_NOT_CONNECTED`.

Success response:

```json
{
  "success": true,
  "data": {
    "username": "example-user",
    "currentRating": 1500,
    "ratingSource": "self_assessment",
    "recommendations": [
      {
        "type": "ZPD (Zone of Proximal Development)",
        "problem_id": "leetcode-123",
        "title": "Example problem",
        "platform": "LeetCode",
        "url": "https://leetcode.com/problems/example-problem/",
        "difficulty": 1500,
        "tags": "",
        "reason": "Matched to your current level."
      }
    ]
  }
}
```

There are five recommendation entries in the full response. Contest-rating lookup is independent of the dashboard's solved/profile stats; if rating lookup is unavailable, choose a fallback difficulty to continue. The recommender is rule-based, not a trained model: it samples available catalog problems around the rating and fills the plan with additional problems as needed. The current LeetCode catalog does not have topic tags, so the web plan does not diagnose weak topics. Each generated link comes from the catalog.

### Topic-based questions and solved progress

The Preparation page also loads the available Codeforces topic tags and can generate a five-question set for the selected tag. This uses Codeforces because the current catalog has topic tags for Codeforces problems; its imported LeetCode questions have no tags. Topic matching uses an exact tag match, and each question links to Codeforces.

Each generated plan is stored per user and restored from `GET /api/platforms/preparation-plans` after refresh. There is one active level-based plan and one active topic plan per user. The generator stays disabled while its plan is active, and repeated API requests return that plan rather than replacing it. A plan remains visible while only some questions are checked. After every question in that plan is marked solved, the backend removes the active plan; the solved-question history remains saved.

Each question has a solved toggle. The authenticated progress API stores the selected problem ID and basic question details in MongoDB, keyed by the verified Firebase UID. `GET /api/platforms/preparation-progress` restores solved IDs when the user returns; `PUT /api/platforms/preparation-progress` accepts `{ "problemId", "platform", "title", "url", "difficulty", "topic", "solved" }`. Setting `solved` to `false` removes that user's solved record. The API only accepts HTTPS question URLs on the matching LeetCode or Codeforces domain.

### Server-side organization

- `backend/index.js` configures Express, JSON and cookie parsing, local CORS origins, routes, health check, error handling, and startup after MongoDB connects.
- `backend/config/firebase.js` initializes Firebase Admin from environment variables.
- `backend/config/connectDb.js` connects Mongoose to `MONGODB_URL`.
- `backend/middlewares/auth.middleware.js` verifies Firebase ID tokens and attaches decoded user information to the request.
- `backend/controllers/` handles authentication, platform profile, dashboard, and direct LeetCode profile requests.
- `backend/models/User.js` stores the application user, keyed by unique Firebase UID.
- `backend/models/PlatformProfile.js` stores the user's four platform IDs and display information.
- `backend/models/SolvedProblem.js` stores solved question records under a unique Firebase-UID/problem-ID pair.
- `backend/models/PreparationPlan.js` stores each user's active generated plans until all questions are solved.
- `backend/services/platform-validation.service.js` validates usernames with upstream platform services.
- `backend/services/platform-dashboard.service.js` gathers public statistics and normalizes the results for the dashboard.
- `backend/services/leetcode.service.js` calls the configured LeetCode profile service with a request timeout.

### Data stored by the API

`User` stores Firebase UID, optional email and phone, display name, photo URL, sign-in provider, verification flags, active status, and login/timestamp metadata. `PlatformProfile` stores the Firebase UID, email/display name, and nullable usernames for the four supported platforms. `SolvedProblem` stores the platform, problem ID, title, URL, difficulty, topic, and solved time for each question marked by a user. Passwords and Firebase service-account credentials are not stored in these user documents.

Dashboard statistics are retrieved on request from public services; they are not saved as historical snapshots. Upstream service availability, rate limits, and response changes can affect individual metrics.

## Data and machine learning

The ML work under `ML/` includes the placement-data workflow and a demo package-estimation endpoint. The web dashboard does not use the regression model.

### Placement data pipeline

Run the scripts in order from `ML/`:

| Step | Script | Purpose and output |
|---:|---|---|
| 0 | `src/00_generate_synthetic_data.py` | Generates 500 reproducible synthetic student records at `data/raw/students_raw.csv`. |
| 1 | `src/01_load_data.py` | Prints shape, columns, missingness, duplicates, targets, and descriptive statistics. |
| 2 | `src/02_clean_data.py` | Standardizes columns, removes duplicate rows, coerces types, checks ranges, and writes `data/processed/cleaned_students.csv`. |
| 3 | `src/03_eda.py` | Saves placement, package, feature, and branch plots under `reports/eda/`. |
| 4 | `src/04_feature_engineering.py` | Adds aggregate platform, rating, activity, CP-score, and profile-completeness features; writes `features.csv`. |
| 5 | `src/05_split_data.py` | Filters to placed students with package data, drops identifiers/targets from features, and writes an 80/20 train/test split. |
| 6 | `src/06_preprocessing.py` | Fits numeric median imputation and categorical mode imputation/one-hot encoding; saves `models/preprocessor.joblib`. |
| 7 | `src/07_train_model.py` | Trains and evaluates an XGBoost package regressor, saves `models/model_package_v1.joblib`, and creates the feature-importance plot. |

Paths, feature lists, target names, split size, and random seed are centralized in `ML/config.py`. Generated CSVs, plots, and model artifacts are written beneath `ML/`.

### Student dataset fields

| Field | Meaning |
|---|---|
| `student_id` | Student identifier; excluded from model features. |
| `age`, `gender`, `branch` | Demographic/academic context; branch examples include CSE, IT, ECE, EEE, MECH, CIVIL. |
| `cgpa` | CGPA on a 0–10 scale. |
| `projects`, `internships`, `skills_count` | Project, internship, and skill counts. |
| `leetcode_solved`, `leetcode_rating`, `leetcode_contest_rating` | LeetCode activity and ratings. |
| `codeforces_rating`, `codeforces_solved` | Codeforces activity and rating. |
| `codechef_rating`, `codechef_solved` | CodeChef activity and rating. |
| `github_repos`, `github_contributions`, `github_stars` | GitHub activity measures. |
| `placed` | Placement label (`0` or `1`); present in the dataset, but no classifier is trained by the current pipeline. |
| `package_lpa` | Package in lakhs per annum; regression target for placed students. |

Some platform values and `package_lpa` may be missing. The cleaning step turns invalid/out-of-range values into missing values. The preprocessing pipeline imputes feature columns; the split step drops rows without the package target.

The engineered features include `total_problems_solved`, `platforms_connected`, `highest_rating`, `average_rating`, `coding_activity_score`, `cp_score`, and `profile_completeness`. The current `05_split_data.py` trains only on placed students with package values. A `placed` classification model is a future direction, not an implemented model.

### Data and model caveats

- Synthetic data is for exercising the workflow, not for estimating real placement outcomes.
- The package model is trained on synthetic data, and its web result is only a demo estimate for student profiles.
- The package model was trained only on placed students. There is no placement-classification model or placement-probability prediction.
- Evaluation metrics are printed by the training script; model quality must be assessed against representative, correctly labeled real data before practical use.
- If replacing the synthetic CSV, preserve the expected column names/types and ensure there are enough placed records for the stratified train/test split.
- `ML/requirements.txt` contains the data-science stack used by the placement pipeline.

## Problem recommendation and AI assistant

The scripts under `ML/recommendation/` provide a rule-based recommendation workflow. The Preparation page calls this recommender through `POST /api/platforms/preparation-plan`; the placement package-regression model is separate and is not involved.

### Build/update the problem database

From `ML/recommendation/`:

```powershell
python -m pip install pandas requests
python 01_fetch_problems.py
```

`01_fetch_problems.py` fetches rated problems from the public Codeforces problemset API and combines them with a small built-in mock LeetCode list. It writes `data/problem_database.csv`; network/API availability is required.

`01b_import_leetcode.py` can replace the mock LeetCode entries with rows from a LeetCode CSV. Before running it, edit its `CSV_PATH` constant to the location of a CSV with the columns `Difficulty`, `Question_No`, `Question`, and `Question_Link`. Its difficulty mapping is a rough conversion to the numeric Codeforces scale, and imported rows do not include topic tags.

### Get recommendations

```powershell
python 02_recommend.py
python 02_recommend.py --rating 1400 --weak "dp,graphs" --strong "math"
```

The CLI accepts rating, weak/strong topic lists, preferred platform, and output count. By default it returns up to three recommendations; `--count 5` requests five. The web API filters to LeetCode and requests five problems based on the user's contest rating or fallback difficulty. LeetCode catalog rows currently have no topic tags, so web-generated plans are level-based rather than topic-personalized.

### Optional Gemini assistant

The assistant wraps the recommender with a conversational interface. Install its extra packages and provide a Gemini API key in `ML/recommendation/.env`:

```dotenv
GEMINI_API_KEY=your-key
```

```powershell
python -m pip install google-generativeai python-dotenv
python 03_ai_assistant.py
python 03_ai_assistant.py --query "What should I practice today?"
```

The AI assistant is experimental and not connected to the web application's authentication, saved profile, or dashboard. Keep the API key private and out of version control.

## Validation and troubleshooting

### Frontend checks

From `frontend/`:

```powershell
npm run lint
npm run build
```

### Backend checks

From `backend/`:

```powershell
npm run dev
```

The current backend `npm test` script is a placeholder that exits with an error; no automated backend test suite is configured yet.

### Common issues

| Symptom | Checks |
|---|---|
| Frontend reports Firebase configuration missing | Confirm the required `VITE_FIREBASE_*` values are set in `frontend/.env`, then restart Vite. |
| Google sign-in is blocked or fails | Enable the Google provider in Firebase Authentication and authorize the development host in Firebase's authorized domains. |
| Browser cannot reach the API | Start the backend, check `GET /api/health`, and ensure `VITE_API_BASE_URL` and backend `PORT` agree. |
| Browser reports a CORS error | The API currently allows `http://localhost:5173` and `http://127.0.0.1:5173`; use one of these locally or update the backend CORS allowlist for another origin. |
| Backend exits during startup | Verify MongoDB is available and `MONGODB_URL` is correct. The server listens only after connecting to the database. |
| Protected API returns `503` | Check required Firebase Admin service-account environment variables in `backend/.env`. |
| Preparation plan cannot be generated | Ensure Python and pandas are installed for the backend interpreter; set `PYTHON_EXECUTABLE` in `backend/.env` if needed. Check that `ML/recommendation/data/problem_database.csv` exists and contains LeetCode rows. |
| LPA estimator reports the model unavailable | Install `ML/requirements.txt` in the same Python environment used by the backend, set `PYTHON_EXECUTABLE` if necessary, and verify both saved model artifacts exist. |
| Preparation asks for a starting level | Connect a LeetCode account with a contest rating, or select Easy, Medium, or Hard when prompted. |
| Platform IDs cannot be saved or stats are missing | Check the username and network/upstream service availability. Public APIs may rate-limit or change their responses. |
| ML script cannot find its input | Run the earlier pipeline step first, or place compatible input data at the configured path in `ML/config.py`. |
| Problem recommender says database missing | Run `01_fetch_problems.py` to generate `ML/recommendation/data/problem_database.csv`. |

## Security and deployment notes

- Never commit `backend/.env`, private keys, Gemini API keys, or other service credentials.
- Firebase web-app configuration is delivered to the browser; it is not equivalent to a Firebase Admin private key. Configure Firebase Authentication and security rules appropriately.
- Protected API requests must use a Firebase ID token. Do not send Firebase service-account credentials to the browser.
- The API's current CORS allowlist is local-development-only. Configure it for the deployed frontend before production use.
- For deployment, configure the frontend API URL, Firebase authorized domains, backend secrets, MongoDB network access, and CORS origins for the target environment.
- Upstream coding-platform services are third-party dependencies and may impose availability or rate limits.
- The platform links/dashboard handle public usernames and public profile statistics; the API does not authenticate to those platform accounts.
- The site and ML outputs are project/demo functionality, not placement guarantees or professional career advice.
