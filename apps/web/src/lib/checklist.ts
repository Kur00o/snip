export type ChecklistInput = {
  brandKit: {
    secondary_color: string | null;
    accent_color: string | null;
    heading_font: string | null;
    body_font: string | null;
    logo_path: string | null;
  } | null;
  connectedAccounts: number;
};

export type ChecklistItem = {
  id: "colours" | "fonts" | "logo" | "accounts";
  label: string;
  hint: string;
  href: string;
  done: boolean;
};

/** The home-page setup checklist. Pure, so it is easy to test. */
export function buildChecklist({ brandKit, connectedAccounts }: ChecklistInput): ChecklistItem[] {
  return [
    {
      id: "colours",
      label: "Pick your brand colours",
      hint: "So every slide looks like you",
      href: "/brand#colours",
      done: Boolean(brandKit?.secondary_color || brandKit?.accent_color),
    },
    {
      id: "fonts",
      label: "Choose your fonts",
      hint: "One for headlines, one for text",
      href: "/brand#fonts",
      done: Boolean(brandKit?.heading_font && brandKit?.body_font),
    },
    {
      id: "logo",
      label: "Upload your logo",
      hint: "PNG with a transparent background works best",
      href: "/brand#logo",
      done: Boolean(brandKit?.logo_path),
    },
    {
      id: "accounts",
      label: "Connect Instagram, Facebook or YouTube",
      hint: "So Snip can post for you",
      href: "/accounts",
      done: connectedAccounts > 0,
    },
  ];
}

export function checklistProgress(items: readonly ChecklistItem[]): number {
  if (items.length === 0) return 1;
  return items.filter((i) => i.done).length / items.length;
}
