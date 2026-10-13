/** The 13 skin-problem keys published by face-age 2.4.13. */
export const PROBLEM_KEYS = [
  "fineWrinkles",
  "eyeWrinkles",
  "deepWrinkles",
  "darkCircle",
  "eyeBag",
  "pores",
  "pigment",
  "redness",
  "oiliness",
  "dryness",
  "sagginess",
  "dullness",
  "acne",
] as const;

export type ProblemKey = (typeof PROBLEM_KEYS)[number];

export const PROBLEM_LABELS: Record<ProblemKey, string> = {
  acne: "Acne",
  pores: "Pores",
  oiliness: "Oiliness",
  darkCircle: "Dark circles",
  pigment: "Pigmentation",
  dryness: "Dryness",
  fineWrinkles: "Fine wrinkles",
  redness: "Redness",
  eyeWrinkles: "Eye wrinkles",
  dullness: "Dullness",
  eyeBag: "Eye bags",
  deepWrinkles: "Deep wrinkles",
  sagginess: "Sagging",
};

/** Plain-language product ideas for the top concerns a brand might promote. */
export const PROMOTION_HINTS: Record<ProblemKey, string> = {
  acne: "Spot treatments, salicylic acid cleansers, and oil-control moisturizers.",
  pores: "Niacinamide serums and gentle clay masks.",
  oiliness: "Lightweight gel moisturizers and balancing toners.",
  darkCircle: "Eye creams with caffeine and brightening peptides.",
  pigment: "Vitamin C serums and daily broad-spectrum SPF.",
  dryness: "Ceramide moisturizers and hydrating essences.",
  fineWrinkles: "Retinoid night creams and peptide moisturizers.",
  redness: "Centella creams and fragrance-free calming mists.",
  eyeWrinkles: "Peptide eye creams and daily SPF around the eye.",
  dullness: "Gentle exfoliating acids and brightening serums.",
  eyeBag: "Cooling eye gels and caffeine concentrates.",
  deepWrinkles: "Richer retinoid treatments and barrier-repair creams.",
  sagginess: "Firming creams with peptides and consistent SPF.",
};

export function isProblemKey(value: string): value is ProblemKey {
  return (PROBLEM_KEYS as readonly string[]).includes(value);
}

export function problemLabel(key: string): string {
  return isProblemKey(key) ? PROBLEM_LABELS[key] : key;
}
