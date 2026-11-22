import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const normalizePrivateKey = (value) => value?.replace(/\\n/g, "\n").trim();
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
const projectId = process.env.FIREBASE_PROJECT_ID?.trim();

let serviceAccount;
if (serviceAccountJson) {
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON must contain valid JSON");
  }
  if (!serviceAccount || typeof serviceAccount !== "object" || Array.isArray(serviceAccount)) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON must contain a service-account object");
  }
} else {
  serviceAccount = {
    type: process.env.FIREBASE_TYPE,
    project_id: projectId,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
  };
}

serviceAccount.project_id = serviceAccount.project_id || projectId;
serviceAccount.private_key = normalizePrivateKey(serviceAccount.private_key);
const missingCredentialFields = ["project_id", "client_email", "private_key"]
  .filter((field) => !serviceAccount[field]);

if (serviceAccountJson && missingCredentialFields.length) {
  throw new Error(
    `FIREBASE_SERVICE_ACCOUNT_JSON is missing required fields: ${missingCredentialFields.join(", ")}`
  );
}

if (!getApps().length && !missingCredentialFields.length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
} else if (!getApps().length) {
  const missingVariables = missingCredentialFields.map((field) => ({
    project_id: "FIREBASE_PROJECT_ID",
    client_email: "FIREBASE_CLIENT_EMAIL",
    private_key: "FIREBASE_PRIVATE_KEY",
  })[field]);
  console.warn(
    `Firebase Admin is not configured. Set ${missingVariables.join(", ")} in the backend environment.`
  );
}

const admin = {
  apps: getApps(),
  auth: () => getAuth(),
};

export default admin;
