const defaultDevelopmentOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

export const createCorsOptions = (environment = process.env) => {
  const configuredOrigins = environment.CORS_ORIGINS || (
    environment.NODE_ENV === "production"
      ? ""
      : defaultDevelopmentOrigins.join(",")
  );
  const allowedOrigins = configuredOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (environment.NODE_ENV === "production" && allowedOrigins.length === 0) {
    throw new Error("CORS_ORIGINS must contain the deployed frontend origin in production");
  }

  return {
    origin: (origin, callback) => {
      callback(null, !origin || allowedOrigins.includes(origin));
    },
    credentials: true,
  };
};
