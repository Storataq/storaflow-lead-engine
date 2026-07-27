import type { Database } from "@/types/supabase";

export type PlatformApiKeyPublic = Omit<
  Database["public"]["Tables"]["platform_api_keys"]["Row"],
  "key_hash"
>;

export type PlatformWebhookPublic = Omit<
  Database["public"]["Tables"]["platform_webhooks"]["Row"],
  | "secret_ciphertext_base64"
  | "secret_iv_base64"
  | "secret_auth_tag_base64"
  | "secret_key_version"
>;
