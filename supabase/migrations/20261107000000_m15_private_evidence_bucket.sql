-- Private persistent evidence storage for Vercel/serverless deployments.
-- All reads/writes are mediated by server routes using the service-role client
-- after checking the authenticated issuer/verifier/admin role and ownership.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'evidence-vault',
  'evidence-vault',
  false,
  15728640,
  ARRAY['application/pdf', 'image/png', 'image/jpeg']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
