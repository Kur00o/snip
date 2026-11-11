import { z } from "zod";

export const CATEGORIES = [
  "Café",
  "Restaurant",
  "Bakery",
  "Salon & spa",
  "Boutique",
  "Gym & fitness",
  "Creator",
  "Studio & classes",
] as const;

export const AUDIENCE_SUGGESTIONS = [
  "College students nearby",
  "Young working professionals",
  "Families on weekends",
  "Fitness-focused locals",
  "Tourists and weekend visitors",
] as const;

export const GOALS = [
  { id: "footfall", label: "More people walking in" },
  { id: "followers", label: "Grow followers" },
  { id: "offers", label: "Promote offers and launches" },
  { id: "brand", label: "Look more premium" },
  { id: "sales", label: "Sell more online" },
] as const;

export const TONES = [
  {
    id: "friendly",
    label: "Friendly",
    sample: "Rainy day? Your usual corner and a hot cutting chai are waiting ☕",
  },
  {
    id: "bold",
    label: "Bold",
    sample: "New menu. Zero filler. Come hungry.",
  },
  {
    id: "premium",
    label: "Premium",
    sample: "Single-origin beans, slow-brewed. An unhurried cup for an unhurried evening.",
  },
  {
    id: "playful",
    label: "Playful",
    sample: "Warning: our new brownie may cause spontaneous happy dances 🍫",
  },
  {
    id: "informative",
    label: "Informative",
    sample: "3 ways to pick the right shampoo for monsoon frizz, explained by our stylists.",
  },
] as const;

export type ToneId = (typeof TONES)[number]["id"];
const TONE_IDS = TONES.map((t) => t.id) as [ToneId, ...ToneId[]];

const text = (min: number, max: number, message: string) =>
  z.string().trim().min(min, message).max(max, `Keep it under ${max} characters`);

/** The onboarding answers. Shared by the wizard (client) and the server action. */
export const BusinessProfile = z.object({
  name: text(1, 120, "What's your business called?"),
  category: text(1, 40, "Pick a category or type your own"),
  city: z.string().trim().max(60, "Keep it under 60 characters"),
  targetAudience: text(3, 300, "Tell us who you want to reach"),
  goals: z
    .array(z.string().trim().min(1).max(60))
    .min(1, "Pick at least one goal")
    .max(5, "Pick up to 5 goals"),
  tone: z.enum(TONE_IDS, { message: "Pick a tone" }),
});
export type BusinessProfile = z.infer<typeof BusinessProfile>;

/** Per-step field groups, so the wizard can validate one screen at a time. */
export const STEP_FIELDS = [
  ["name", "category", "city"],
  ["targetAudience"],
  ["goals"],
  ["tone"],
] as const satisfies readonly (readonly (keyof BusinessProfile)[])[];

const GOAL_SEPARATOR = "; ";

/** businesses.goals is a text column: store goals as a readable "a; b; c" list. */
export function goalsToText(goals: readonly string[]): string {
  return goals.map((g) => g.replaceAll(";", ",").trim()).join(GOAL_SEPARATOR);
}

export function goalsFromText(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(";")
    .map((g) => g.trim())
    .filter(Boolean);
}
