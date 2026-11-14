# SolveSphere Backend API

Express backend for SolveSphere authentication. Firebase Authentication handles user sign-in on the client. This backend verifies the Firebase ID token, creates or updates the application user in MongoDB, and provides authenticated user endpoints.

## Base URL

Local development:

```text
http://localhost:4000
```

The port is controlled by `PORT` in `.env`.

## Authentication Flow

1. The frontend signs the user in with Firebase Authentication.
2. Firebase returns an ID token to the frontend.
3. The frontend sends that token to this backend in the `Authorization` header:

```http
Authorization: Bearer <FIREBASE_ID_TOKEN>
```

4. The backend verifies the token with Firebase Admin SDK.
5. The middleware attaches verified Firebase user information to `req.user`.
6. The login endpoint creates or updates the matching MongoDB user using `firebaseUid`.
7. The backend returns the application user data.

The backend does not create Firebase accounts or Firebase ID tokens. Sign-in and sign-out from Firebase are performed by the frontend.

## API Routes

### LPA Package Estimate

Estimates a demo package in lakhs per annum using the student's submitted academic and optional coding-profile details:

```http
POST /api/predictions/lpa
Authorization: Bearer <Firebase ID token>
Content-Type: application/json
```

Authentication is required. Each Firebase user may make five requests per fixed 15-minute window. Rate-limit counters are stored in MongoDB using a hash of the Firebase UID and expire automatically. Exceeded requests return `429` with a `Retry-After` header. The endpoint fails closed with `503` if MongoDB cannot record usage.

Required values: `age`, `gender` (`Male` or `Female`), `branch` (`CSE`, `IT`, `ECE`, `EEE`, `MECH`, or `CIVIL`), `cgpa` (0-10), `projects`, `internships`, and `skills_count`. Platform and GitHub feature values are optional numbers; omit them or send `null` when unknown. See the fields in the root LPA estimator form or controller for the accepted ranges.

Success response:

```json
{
  "success": true,
  "data": {
    "estimatedLpa": 18.21,
    "currency": "INR",
    "source": "synthetic_demo_model",
    "unit": "lakhs per annum",
    "disclaimer": "Demo estimate only: the model was trained on synthetic sample data and is not a real-world salary guarantee."
  }
}
```

The current model is trained on synthetic data and only on placed students. It predicts package only; it does not estimate placement likelihood. Submitted inputs are not persisted and are passed to Python over standard input. The backend permits at most two concurrent Python predictions per process and terminates a prediction process after 30 seconds. Install the packages in `ML/requirements.txt` in the Python environment used by the backend, and retain both artifacts under `ML/models/`.

Invalid profiles return `400`; missing or invalid Firebase credentials return `401`; an exhausted user quota returns `429`; an overloaded or unavailable estimator returns `503`.

### User Platform IDs

Platform IDs are stored in a separate MongoDB document for the authenticated Firebase user. The backend validates each submitted username with its platform before saving. Send only the platforms being added or changed; omitted platforms are preserved. Send `null` for a platform to clear its saved ID.

```http
PATCH /api/platforms/profile
GET /api/platforms/profile
```

Authentication: required for both routes. Use the Firebase ID token in the `Authorization` header.

Example request:

```json
{
  "platforms": {
    "leetcode": "your-leetcode-username"
  }
}
```

Send another `PATCH` later with `{"platforms":{"github":"your-github-username"}}` to add GitHub without replacing the LeetCode ID. Supported keys are `leetcode`, `geeksforgeeks`, `codeforces`, and `github`.

### Platform Dashboard

Fetches live statistics for each saved platform username. Contest rating history is included for LeetCode and Codeforces when returned by their upstream services.

```http
GET /api/platforms/dashboard
```

Authentication: required. The response includes a `platforms` object keyed by platform ID. Each connected platform contains its username, normalized statistics, and an error field when its statistics service is unavailable. LeetCode and Codeforces statistics include `ratingHistory` entries with contest name, rating, and (for LeetCode) contest start time.

### LeetCode Preparation Plan

Generates five LeetCode practice recommendations using the saved LeetCode username and the Python recommender in `ML/recommendation/`.

```http
POST /api/platforms/preparation-plan
```

Authentication: required. The request body is optional:

```json
{
  "fallbackDifficulty": "Medium"
}
```

If the linked LeetCode account has a contest rating, that rating is used and the fallback is ignored. Otherwise, choose `Easy`, `Medium`, or `Hard` (mapped internally to ratings `1000`, `1500`, and `2000`). Without a fallback, the endpoint responds with `409` and code `LEVEL_REQUIRED`. If no LeetCode username is saved, it responds with `409` and code `LEETCODE_NOT_CONNECTED`.

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

The actual response contains five recommendations when the catalog has enough distinct LeetCode problems. Contest rating is fetched independently from profile/solved statistics; if the contest-rating service is unavailable, choose a fallback difficulty to continue. The recommender is rule-based and samples questions near the selected rating; it is separate from the placement package-regression model. The current LeetCode catalog has no topic tags, so the plan is not personalized by weak topics. Each item includes a direct question URL.

### Topic questions and saved progress

Available Codeforces topic tags:

```http
GET /api/platforms/preparation-topics
```

Generate five questions that match one exact topic tag:

```http
POST /api/platforms/preparation-plan/topic
Content-Type: application/json

{
  "topic": "dp"
}
```

The topic generator uses Codeforces because those catalog entries include tags; current LeetCode entries do not. It returns matching Codeforces questions with direct URLs.

Get the signed-in user's solved-question IDs:

```http
GET /api/platforms/preparation-progress
```

Mark a question solved or remove it from that user's solved list:

```http
PUT /api/platforms/preparation-progress
Content-Type: application/json

{
  "problemId": "CF_2264_E2",
  "platform": "Codeforces",
  "title": "A Prime Flood (Hard Version)",
  "url": "https://codeforces.com/problemset/problem/2264/E2",
  "difficulty": 2700,
  "topic": "dp",
  "solved": true
}
```

The database record is scoped to the verified Firebase UID and uniquely keyed by user and problem ID. Send `"solved": false` to delete it. Question URLs are validated against the platform's HTTPS domain.

Active plans are persisted separately and restored after refresh:

```http
GET /api/platforms/preparation-plans
```

The response contains the user's current `levelPlan` and `topicPlan` (either can be `null`). A user has at most one active plan of each type. Generators stay disabled while their plan is active, and repeated API requests return the active plan rather than replacing it. Checking an individual question only marks it solved—the plan stays visible until every question in it is marked solved. The final check removes the active plan while preserving the user's solved-question history.

### LeetCode Profile

Returns the full LeetCode profile from the configured `alfa-leetcode-api` service.

```http
GET /api/platforms/leetcode/:username
```

Authentication: required.

Headers:

```http
Authorization: Bearer <FIREBASE_ID_TOKEN>
```

Example:

```bash
curl http://localhost:4000/api/platforms/leetcode/leetcode \
  -H "Authorization: Bearer FIREBASE_ID_TOKEN"
```

Success response:

```json
{
  "success": true,
  "platform": "leetcode",
  "username": "leetcode",
  "data": {}
}
```

The `data` object is the payload returned by `/:username/profile`. The service also exposes a modular solved-questions method for future use without making a second request during profile retrieval.

Handled responses include `400` for an invalid username, `401` for missing or invalid Firebase credentials, `404` for an unknown LeetCode user, `429` for upstream rate limiting, `502` for upstream failures, and `504` for an upstream timeout.

The upstream URL is configured with:

```env
LEETCODE_API_BASE_URL=https://alfa-leetcode-api.onrender.com
```

### 1. Health Check

Checks whether the API server is running.

```http
GET /api/health
```

Authentication: not required.

Example:

```bash
curl http://localhost:4000/api/health
```

Success response:

```json
{
  "success": true,
  "message": "Server is running"
}
```

Status: `200 OK`

---

### 2. Login or Synchronize User

Verifies the Firebase ID token and creates or updates the user in MongoDB.

```http
POST /api/auth/login
```

Authentication: required.

Headers:

```http
Authorization: Bearer <FIREBASE_ID_TOKEN>
Content-Type: application/json
```

The request body is empty. User details are read from the verified Firebase token.

Example:

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Authorization: Bearer FIREBASE_ID_TOKEN" \
  -H "Content-Type: application/json"
```

Success response:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "65f123456789abcdef123456",
      "firebaseUid": "firebase-user-id",
      "email": "user@example.com",
      "displayName": "User Name",
      "photoURL": null,
      "phoneNumber": null,
      "provider": "google",
      "isEmailVerified": true,
      "isPhoneVerified": false,
      "lastLogin": "2026-08-19T10:00:00.000Z"
    }
  }
}
```

Status: `200 OK`

Behavior:

- If `firebaseUid` is not in MongoDB, a new user document is created.
- If the user already exists, profile data and `lastLogin` are updated.
- `firebaseUid` is unique and is used to find the application user.
- Email login and Google login normally provide an email.
- Phone login may not provide an email, so a phone number is accepted instead.

---

### 3. Get Current User

Returns the application user associated with the Firebase token.

```http
GET /api/auth/me
```

Authentication: required.

Example:

```bash
curl http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer FIREBASE_ID_TOKEN"
```

Success response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "65f123456789abcdef123456",
      "firebaseUid": "firebase-user-id",
      "email": "user@example.com",
      "displayName": "User Name",
      "photoURL": null,
      "phoneNumber": null,
      "provider": "google",
      "isEmailVerified": true,
      "isPhoneVerified": false,
      "isActive": true,
      "lastLogin": "2026-08-19T10:00:00.000Z",
      "createdAt": "2026-08-19T09:00:00.000Z",
      "updatedAt": "2026-08-19T10:00:00.000Z"
    }
  }
}
```

Status: `200 OK`

If the Firebase token is valid but the user has not been synchronized through `/api/auth/login`, the response is:

```json
{
  "success": false,
  "message": "User not found in application database"
}
```

Status: `404 Not Found`

---

### 4. Logout

Acknowledges logout on the backend.

```http
POST /api/auth/logout
```

Authentication: required.

Example:

```bash
curl -X POST http://localhost:4000/api/auth/logout \
  -H "Authorization: Bearer FIREBASE_ID_TOKEN"
```

Success response:

```json
{
  "success": true,
  "message": "Logged out successfully. Please sign out from Firebase on the client."
}
```

Status: `200 OK`

The frontend must still call Firebase sign-out. The backend currently does not revoke Firebase refresh tokens.

## Authentication Errors

All protected routes require a valid header:

```http
Authorization: Bearer <FIREBASE_ID_TOKEN>
```

Common responses:

| Status | Message | Cause |
|---|---|---|
| `401` | `Missing Authorization header` | The header was not sent. |
| `401` | `Invalid Authorization header format. Expected: Bearer <token>` | The header is not in Bearer format. |
| `401` | `Invalid or expired token` | Firebase rejected the token. |
| `401` | `ID token has expired` | The Firebase ID token has expired. |
| `401` | `ID token has been revoked` | The token has been revoked. |
| `503` | `Firebase authentication is not configured on the server` | Firebase Admin credentials are missing or invalid on the server. |

## MongoDB User Document

The Mongoose `User` model creates the `users` collection. One document is stored for each Firebase user.

```json
{
  "firebaseUid": "firebase-user-id",
  "email": "user@example.com",
  "phoneNumber": null,
  "displayName": "User Name",
  "photoURL": null,
  "provider": "google",
  "isEmailVerified": true,
  "isPhoneVerified": false,
  "isActive": true,
  "lastLogin": "2026-08-19T10:00:00.000Z",
  "createdAt": "2026-08-19T09:00:00.000Z",
  "updatedAt": "2026-08-19T10:00:00.000Z"
}
```

`firebaseUid` is required, unique, and indexed. Email is optional to support phone authentication. `createdAt` and `updatedAt` are generated automatically by Mongoose.

## Environment Setup

Create `backend/.env` using `.env.example` as a reference. Required values:

```env
PORT=4000
MONGODB_URL=mongodb+srv://<username>:<password>@<cluster-host>/solvesphere
FIREBASE_TYPE=service_account
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY=your-service-account-private-key-with-escaped-newlinesFIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project-id.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
NODE_ENV=development
```

If the MongoDB password contains special characters, URL-encode them. For example:

```text
@ becomes %40
# becomes %23
/ becomes %2F
```

Never commit `.env` or expose Firebase service-account private keys. If a private key is exposed, revoke it in Firebase/Google Cloud and generate a replacement.

The preparation-plan endpoint also requires Python and pandas in the environment used by the backend. Install pandas with `python -m pip install pandas`, or point `PYTHON_EXECUTABLE` in `backend/.env` to the required Python executable. The recommender reads `ML/recommendation/data/problem_database.csv`; create or refresh it using the recommendation scripts in the root README if it is missing or outdated.

## Running the Backend

From the repository root:

```powershell
cd backend
npm install
npm start
```

Development mode with Node watch mode:

```powershell
cd backend
npm run dev
```

Expected startup output:

```text
Database Connected
Server is running on port 4000
```

## Implementation Overview

- `index.js`: creates the Express app, configures CORS/JSON/cookies, registers routes, connects MongoDB, and starts the server.
- `config/firebase.js`: initializes Firebase Admin SDK from environment variables.
- `config/connectDb.js`: connects Mongoose to MongoDB.
- `middlewares/auth.middleware.js`: validates the Bearer token and verifies it with Firebase Admin SDK.
- `routes/auth.routes.js`: registers login, current-user, and logout routes.
- `controllers/auth.controller.js`: synchronizes users and returns user data.
- `models/User.js`: defines the MongoDB user schema.
- `routes/platform.routes.js` and `controllers/platform-profile.controller.js`: manage saved coding-platform profiles, dashboard data, and preparation-plan requests.
- `controllers/preparation.controller.js` and `models/SolvedProblem.js`: serve topic recommendations and persist user-specific solved-question progress.
- `models/PreparationPlan.js`: persists active generated plans until all questions are marked solved.
- `services/preparation-plan.service.js`: runs the Python recommendation CLI and validates its JSON result.

## Frontend Request Example

After Firebase sign-in, obtain the current user's ID token and send it to the backend:

```javascript
const token = await firebaseUser.getIdToken();

const response = await fetch("http://localhost:4000/api/auth/login", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
});

const result = await response.json();
```

Use a fresh ID token when needed. Do not send the Firebase service-account private key to the frontend.
