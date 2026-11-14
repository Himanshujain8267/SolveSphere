import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();

// Initialize Firebase Admin SDK
// Service account credentials should be stored in environment variables
const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: projectId,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: privateKey,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
};

// Only initialize once and only when the required service-account values are available.
if (
  !getApps().length &&
  projectId &&
  serviceAccount.private_key &&
  serviceAccount.client_email &&
  serviceAccount.private_key_id
) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const admin = {
  apps: getApps(),
  auth: () => getAuth(),
};

export default admin;
