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
MONGODB_URL=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/solvesphere
FIREBASE_TYPE=service_account
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\nFIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project-id.iam.gserviceaccount.com
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
