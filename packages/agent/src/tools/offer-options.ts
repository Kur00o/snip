import { z } from "zod";
import { defineTool } from "./define";

export const OfferOptionsInput = z.object({
  question: z
    .string()
    .trim()
    .min(3)
    .max(160)
    .describe("One short question, e.g. 'Where should this go?'"),
  options: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(40).describe("Button text, 1-5 words"),
        reply: z
          .string()
          .trim()
          .min(1)
          .max(300)
          .describe("What gets sent as the user's message when they tap this option"),
      }),
    )
    .min(2)
    .max(4),
});

export type OfferOptionsInput = z.infer<typeof OfferOptionsInput>;

/**
 * Show 2-4 tappable choices instead of asking an open question. Rendered as chips in the
 * chat; tapping one sends its `reply` as the next user message.
 */
export const offerOptions = defineTool({
  name: "offer_options",
  description:
    "Ask ONE focused question by showing the user 2 to 4 tappable choices (for example which platform, which format, or which of your ideas to make). Prefer this over open questions. The user's tap becomes their next message, so end your turn after calling it.",
  input: OfferOptionsInput,
  output: OfferOptionsInput,
  endsTurn: true,
  run: (input) => input,
});
