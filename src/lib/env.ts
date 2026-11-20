// Loads .env (when there is one) into process.env, once, for server code:
// the database address, the admin password hash and the session secret.
// Values already set (by PM2 or the shell) win over the file.
try {
  process.loadEnvFile();
} catch {
  // No .env: settings come from the environment, or aren't set.
}

export {};
