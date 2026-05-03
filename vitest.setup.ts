// Vitest global setup. Stub the env vars that supabase clients read at
// import time so modules don't blow up just by being loaded under test.
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://test.supabase.co"
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key"
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-role"
process.env.NEXT_PUBLIC_APP_URL ??= "http://localhost:3000"
