import { LoginForm } from "@/components/auth/login-form";
import { BrandMark } from "@/components/brand/brand-mark";
import { APP_NAME } from "@/lib/constants";

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-100 via-white to-slate-50 px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <BrandMark href="/" size="md" />
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">
            Welcome to {APP_NAME}
          </h1>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
