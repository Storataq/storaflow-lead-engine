import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/supabase";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const pathname = request.nextUrl.pathname;
  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/auth");
  const isPublicAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".");

  // Fail closed: never skip auth when Supabase env is missing.
  if (!url || !publishableKey) {
    if (isAuthRoute || isPublicAsset) {
      return supabaseResponse;
    }
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    redirectUrl.searchParams.set("config", "missing");
    return NextResponse.redirect(redirectUrl);
  }

  // Middleware gebruikt alleen de publishable key (geen service role).
  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Phase 21L — public email surfaces must not require a session.
  // Phase 26H — offline fallback must be reachable without auth for SW cache.
  const isPublicEmailRoute =
    pathname.startsWith("/api/webhooks/email/") ||
    pathname.startsWith("/api/email/open/") ||
    pathname.startsWith("/api/email/click/") ||
    pathname.startsWith("/api/email/unsubscribe/") ||
    pathname.startsWith("/api/internal/health") ||
    pathname.startsWith("/api/internal/email/") ||
    pathname.startsWith("/preferences/") ||
    pathname.startsWith("/unsubscribe/") ||
    pathname === "/offline" ||
    pathname.startsWith("/sw.js") ||
    pathname.startsWith("/icons/") ||
    pathname === "/manifest.webmanifest";

  if (!user && !isAuthRoute && !isPublicAsset && !isPublicEmailRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && pathname === "/login") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
