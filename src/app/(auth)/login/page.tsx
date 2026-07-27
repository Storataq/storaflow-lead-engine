import { headers } from "next/headers";

import { LoginForm } from "@/components/auth/login-form";
import { BrandMark } from "@/components/brand/brand-mark";
import { WhiteLabelThemeStyle } from "@/components/white-label/white-label-theme-style";
import { APP_NAME } from "@/lib/constants";
import { resolveWhiteLabelForHostname } from "@/lib/white-label/host-branding";

export default async function LoginPage() {
  const headerStore = await headers();
  const host =
    headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? null;
  const branding = await resolveWhiteLabelForHostname(host);

  const productName = branding?.config.applicationName ?? APP_NAME;
  const welcome =
    branding?.config.login.welcomeMessage?.trim() ||
    `Welcome to ${productName}`;
  const logoUrl =
    branding?.config.logos.login_logo ||
    branding?.config.logos.primary_logo ||
    null;
  const backgroundUrl =
    branding?.config.login.backgroundUrl ||
    branding?.config.logos.login_background ||
    null;
  const footerText = branding?.config.login.footerText?.trim() || null;
  const supportLinks = branding?.config.login.supportLinks ?? [];

  return (
    <div
      className="flex min-h-full flex-1 items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-100 via-white to-slate-50 px-4 py-10"
      style={
        backgroundUrl
          ? {
              backgroundImage: `linear-gradient(rgba(255,255,255,0.88), rgba(255,255,255,0.92)), url(${backgroundUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      {branding?.themeCss ? (
        <WhiteLabelThemeStyle cssText={branding.themeCss} />
      ) : null}
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <BrandMark
            href="/"
            size="md"
            productName={productName}
            logoUrl={logoUrl}
          />
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">
            {welcome}
          </h1>
          {branding?.config.tagline ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {branding.config.tagline}
            </p>
          ) : null}
        </div>
        <LoginForm />
        {supportLinks.length > 0 ? (
          <ul className="flex flex-wrap justify-center gap-3 text-sm text-muted-foreground">
            {supportLinks.map((link) => (
              <li key={`${link.href}-${link.label}`}>
                <a
                  href={link.href}
                  className="underline-offset-4 hover:underline"
                  rel="noopener noreferrer"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
        {footerText ? (
          <p className="text-center text-xs text-muted-foreground">
            {footerText}
          </p>
        ) : null}
      </div>
    </div>
  );
}
