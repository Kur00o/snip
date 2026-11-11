import type { Metadata } from "next";
import { Suspense } from "react";
import { HomeSkeleton, HomeView } from "@/components/home/home-view";
import { getSessionUser, requireBusiness } from "@/lib/auth";
import { buildChecklist } from "@/lib/checklist";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Home" };

export default function HomePage() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <Home />
    </Suspense>
  );
}

async function Home() {
  const business = await requireBusiness();
  const user = await getSessionUser();
  const supabase = await createClient();

  const [kit, accounts] = await Promise.all([
    supabase
      .from("brand_kits")
      .select("secondary_color, accent_color, heading_font, body_font, logo_path")
      .eq("business_id", business.id)
      .maybeSingle(),
    supabase
      .from("social_accounts")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .eq("status", "active"),
  ]);

  const checklist = buildChecklist({
    brandKit: kit.data,
    connectedAccounts: accounts.count ?? 0,
  });

  return (
    <HomeView businessName={business.name} firstName={user?.name ?? null} checklist={checklist} />
  );
}
