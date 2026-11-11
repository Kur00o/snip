export type Starter = {
  id: string;
  title: string;
  format: "Carousel" | "Reel" | "Post";
  prompt: string;
  /** Thumbnail art: background + text colour classes and a short line. */
  art: { bg: string; fg: string; line: string };
};

/** Starter cards under the prompt box. An empty input box loses new users; these don't. */
export function starterTemplates(businessName: string): Starter[] {
  return [
    {
      id: "launch",
      title: "Announce something new",
      format: "Carousel",
      prompt: `Make a 5-slide Instagram carousel announcing a new item at ${businessName}. Hook on slide 1, details in the middle, a clear call to visit on the last slide.`,
      art: { bg: "bg-teal-500", fg: "text-ink", line: "It's here." },
    },
    {
      id: "offer",
      title: "Weekend offer",
      format: "Carousel",
      prompt: `Make a carousel for a weekend offer at ${businessName}. Keep it short and punchy, with the offer on slide 1 and the timing on the last slide.`,
      art: { bg: "bg-lime", fg: "text-ink", line: "Sat + Sun only" },
    },
    {
      id: "tips",
      title: "3 tips from the experts",
      format: "Carousel",
      prompt: `Make a "3 tips" carousel where ${businessName} shares useful advice our customers will want to save.`,
      art: { bg: "bg-ink", fg: "text-paper", line: "3 things nobody tells you" },
    },
    {
      id: "review",
      title: "Show off a review",
      format: "Post",
      prompt: `Turn a happy customer review into a single post for ${businessName}, with a short caption thanking them.`,
      art: { bg: "bg-white", fg: "text-ink", line: "“Best chai in town.”" },
    },
    {
      id: "bts",
      title: "Behind the scenes",
      format: "Reel",
      prompt: `Plan a 20-second behind-the-scenes Reel for ${businessName}: give me a script and a shot list I can film on my phone.`,
      art: { bg: "bg-ink-800", fg: "text-lime", line: "▶ 0:20" },
    },
    {
      id: "festive",
      title: "Festival greeting",
      format: "Carousel",
      prompt: `Make a festive greeting carousel from ${businessName} for the next upcoming Indian festival, warm and on-brand, with any special offer on the last slide.`,
      art: { bg: "bg-teal-700", fg: "text-paper", line: "Happy festivities!" },
    },
  ];
}
