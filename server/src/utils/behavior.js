// Calculates a risk score based on the deviation from the user's established behavior profile.
export function scoreBehavior(profile, currentBehavior) {
  const score = { value: 0, reasons: [] };

  if (!profile || profile.samples < 5) {
    score.reasons.push('Not enough behavioral data to compare.');
    return score; // Not enough data for a reliable score
  }

  // Compare keypress latency
  const keyLatencyDiff = Math.abs(currentBehavior.keypressLatencyAvg - profile.keypressLatencyAvg) / profile.keypressLatencyAvg;
  if (keyLatencyDiff > 0.4) { // more than 40% deviation
    score.value += keyLatencyDiff * 0.5;
    score.reasons.push(`Keystroke speed differs by ${(keyLatencyDiff * 100).toFixed(0)}% from baseline.`);
  }

  // Compare mouse speed
  const mouseSpeedDiff = Math.abs(currentBehavior.mouseSpeedAvg - profile.mouseSpeedAvg) / profile.mouseSpeedAvg;
  if (mouseSpeedDiff > 0.5) { // more than 50% deviation
    score.value += mouseSpeedDiff * 0.4;
    score.reasons.push(`Mouse speed differs by ${(mouseSpeedDiff * 100).toFixed(0)}% from baseline.`);
  }

  return score;
}

// Updates the user's saved profile with the new behavior using a weighted moving average.
export function updateBehaviorProfile(user, newBehavior) {
  const profile = user.behaviorProfile;

  // Use a weighting factor to prevent single sessions from drastically changing the profile
  const weight = 0.2; // New data accounts for 20% of the new average

  profile.keypressLatencyAvg = (profile.keypressLatencyAvg * (1 - weight)) + (newBehavior.keypressLatencyAvg * weight);
  profile.mouseSpeedAvg = (profile.mouseSpeedAvg * (1 - weight)) + (newBehavior.mouseSpeedAvg * weight);
  profile.samples += 1;

  user.behaviorProfile = profile;
  // Note: The user object must be saved by the calling function after this.
}