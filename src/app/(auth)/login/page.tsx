import { LoginForm } from "@/components/auth/login-form";
import { APP_NAME } from "@/lib/constants";

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-100 via-white to-slate-50 px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <p className="text-sm font-medium tracking-wide text-muted-foreground">
            Intern hulpmiddel
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {APP_NAME}
          </h1>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
