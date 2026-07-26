"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import {
  getActiveOrganization,
  requireUser,
  slugifyOrganizationName,
} from "@/lib/organizations/get-active-organization";
import { createClient } from "@/lib/supabase/server";

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
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return {
      success: false,
      message: "Inloggen mislukt. Controleer e-mailadres en wachtwoord.",
    };
  }

  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
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
