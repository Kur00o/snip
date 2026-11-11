import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShowcase } from "@/components/auth-showcase";
import { BrandMark } from "@/components/brand-mark";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="grid min-h-svh flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section className="hidden lg:block" aria-label="What Snip does">
        <AuthShowcase />
      </section>
      <section className="flex flex-col px-6 py-8 sm:px-10">
        <BrandMark className="lg:hidden" />
        <div className="flex flex-1 items-center justify-center py-10">
          <Suspense fallback={<div className="h-[28rem] w-full max-w-sm" />}>
            <LoginForm />
          </Suspense>
        </div>
        <p className="text-center text-xs text-muted">
          Free while in beta. We never post without your approval.
        </p>
      </section>
    </main>
  );
}
