import crypto from "crypto"

const ADJECTIVES = [
  "Quick", "Bright", "Clever", "Brave", "Calm", "Sharp", "Swift",
  "Bold", "Keen", "Wise", "Strong", "Steady", "Eager", "Loyal",
  "Lucky", "Mighty", "Noble", "Quiet", "Royal", "Valiant",
]

const NOUNS = [
  "Falcon", "River", "Mountain", "Forest", "Harbor", "Compass",
  "Anchor", "Beacon", "Lantern", "Summit", "Voyage", "Meadow",
  "Canyon", "Tundra", "Glacier", "Horizon", "Quill", "Cipher",
  "Trident", "Ember",
]

function rand(n: number): number {
  return crypto.randomInt(0, n)
}

/**
 * Generate a memorable temporary password the admin can dictate to a
 * teammate over the phone. Format:
 *   `Adj-Noun-NNNN`  (e.g. `Bright-Falcon-7421`)
 * Always 12+ characters, mixed case, includes digits — comfortably above
 * Supabase's 8-char minimum and easy to type.
 */
export function generateTempPassword(): string {
  const adj = ADJECTIVES[rand(ADJECTIVES.length)]
  const noun = NOUNS[rand(NOUNS.length)]
  const num = String(1000 + rand(9000))
  return `${adj}-${noun}-${num}`
}
