import { AccountsView } from "@/components/accounts/accounts-view";
import { PageHeader } from "@/components/page-header";

export default function DevAccounts() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        title="Accounts"
        lead="Connect the places Snip posts to. You approve every post before it goes out."
      />
      <AccountsView accounts={[]} />
    </div>
  );
}
