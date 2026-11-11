import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountsView, type ConnectedAccount } from "@/components/accounts/accounts-view";
import { PageHeader } from "@/components/page-header";
import { requireBusiness } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Accounts" };

export default function AccountsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        title="Accounts"
        lead="Connect the places Snip posts to. You approve every post before it goes out."
      />
      <Suspense
        fallback={<div className="h-64 animate-pulse rounded-2xl bg-ink/5" aria-busy="true" />}
      >
        <Accounts />
      </Suspense>
    </div>
  );
}

async function Accounts() {
  const business = await requireBusiness();
  const supabase = await createClient();
  const { data } = await supabase
    .from("social_accounts")
    .select("id, platform, handle, status")
    .eq("business_id", business.id);
  return <AccountsView accounts={(data ?? []) as ConnectedAccount[]} />;
}
