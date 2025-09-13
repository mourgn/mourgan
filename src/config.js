
export function crashDistribution(){
  // Simple house edge implementation: 90% chance to crash under 2x
  const r = Math.random()
  if(r < 0.9) return 0.2 + r*1.5
  return 2 + (Math.random() * 8)
}
