import type { Platform } from "@snip/db";

export type PlatformInfo = {
  id: Platform;
  label: string;
  posts: string;
  needs: string;
};

/** What each connection is for, and what the user needs before connecting. */
export const PLATFORMS: readonly PlatformInfo[] = [
  {
    id: "instagram",
    label: "Instagram",
    posts: "Carousels and Reels",
    needs: "A Business or Creator account linked to a Facebook Page",
  },
  {
    id: "facebook",
    label: "Facebook Page",
    posts: "Carousels and Reels",
    needs: "A Facebook Page you manage",
  },
  {
    id: "youtube",
    label: "YouTube",
    posts: "Shorts",
    needs: "A YouTube channel",
  },
];
