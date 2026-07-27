"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import {
  ACTIVE_ORGANIZATION_COOKIE,
  getActiveOrganization,
  requireUser,
  slugifyOrganizationName,
} from "@/lib/organizations/get-active-organization";
import { ensureDefaultCompanyCategories } from "@/lib/companies/categories/bootstrap";
import {
  recordLoginAttemptAction,
  registerSessionAfterLoginAction,
} from "@/lib/security/actions";
import { createClient } from "@/lib/supabase/server";
import { logSecurityAudit } from "@/lib/security/audit";

const loginSchema = z.object({
  email: z.email("Voer een geldig e-mailadres in"),
  password: z.string().min(8, "Wachtwoord moet minimaal 8 tekens bevatten"),
});

const createOrganizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Organisatienaam is te kort")
    .max(100, "Organisatienaam is te lang"),
});

export type ActionResult = {
  success: boolean;
  message: string;
};

export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Ongeldige invoer",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    await recordLoginAttemptAction({
      email: parsed.data.email,
      success: false,
      failureReason: error?.message ?? "invalid_credentials",
    }).catch(() => undefined);
    return {
      success: false,
      message: "Inloggen mislukt. Controleer e-mailadres en wachtwoord.",
    };
  }

  await recordLoginAttemptAction({
    email: parsed.data.email,
    success: true,
    userId: data.user.id,
  }).catch(() => undefined);

  await registerSessionAfterLoginAction({
    userId: data.user.id,
    email: parsed.data.email,
  }).catch(() => undefined);

  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    try {
      await supabase
        .from("security_sessions")
        .update({
          revoked_at: new Date().toISOString(),
          revoke_reason: "logout",
          is_current: false,
        })
        .eq("user_id", user.id)
        .eq("is_current", true)
        .is("revoked_at", null);
      await logSecurityAudit(supabase, {
        actorUserId: user.id,
        action: "logout",
        description: "User logged out",
      });
    } catch {
      /* best-effort */
    }
  }
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createOrganizationAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = createOrganizationSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Ongeldige invoer",
    };
  }

  const existing = await getActiveOrganization();
  if (existing) {
    return {
      success: false,
      message: "Je bent al lid van een organisatie.",
    };
  }

  const { supabase, user } = await requireUser();
  const baseSlug = slugifyOrganizationName(parsed.data.name) || "organisatie";
  const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;

  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .insert({
      name: parsed.data.name,
      slug,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (orgError || !organization) {
    return {
      success: false,
      message: orgError?.message ?? "Organisatie aanmaken mislukt",
    };
  }

  const { error: memberError } = await supabase.from("organization_members").insert({
    organization_id: organization.id,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) {
    return {
      success: false,
      message: memberError.message,
    };
  }

  const { error: settingsError } = await supabase
    .from("organization_settings")
    .insert({
      organization_id: organization.id,
    });

  if (settingsError) {
    return {
      success: false,
      message: settingsError.message,
    };
  }

  await ensureDefaultCompanyCategories(supabase, organization.id, user.id).catch(
    () => undefined,
  );

  await supabase.from("activity_events").insert({
    organization_id: organization.id,
    user_id: user.id,
    event_type: "organization.created",
    entity_type: "organization",
    entity_id: organization.id,
    description: `Organisatie “${organization.name}” aangemaakt`,
  });

  redirect("/dashboard");
}

export async function setActiveOrganizationAction(
  organizationId: string,
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { data: membership, error } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !membership) {
    return {
      success: false,
      message: "Je hebt geen toegang tot deze organisatie.",
    };
  }

  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORGANIZATION_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect("/dashboard");
}
