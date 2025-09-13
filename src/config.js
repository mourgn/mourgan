// Crash distribution controls the house edge.
// Adjust these values to tune crash difficulty.
// - low: chance the game crashes below 1.0x (house wins easily)
// - mid: chance the game crashes between 1.0x–3.0x
// - high: chance the game goes above 3.0x (rare big wins)
//
// IMPORTANT: Values must add up to 1.0 (100% total).
export const crashDistribution = {
  low: 0.6,   // 60% chance <1.0x
  mid: 0.3,   // 30% chance 1.0–3.0x
  high: 0.1   // 10% chance >3.0x
};
