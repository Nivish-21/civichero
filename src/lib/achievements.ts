import { Achievement, AchievementId, UserProfile } from "../types";

export interface AchievementDef {
  id: AchievementId;
  name: string;
  emoji: string;
  description: string;
  xpReward: number;
}

export const ACHIEVEMENT_DEFS: Record<AchievementId, AchievementDef> = {
  first_report: {
    id: "first_report",
    name: "First Step",
    emoji: "🚀",
    description: "Submit your first civic report",
    xpReward: 50,
  },
  newcomer: {
    id: "newcomer",
    name: "Newcomer",
    emoji: "⭐",
    description: "One of your reports gets fully resolved",
    xpReward: 75,
  },
  neighborhood_watch: {
    id: "neighborhood_watch",
    name: "Neighborhood Watch",
    emoji: "👀",
    description: "Submit 5 civic reports",
    xpReward: 100,
  },
  community_guardian: {
    id: "community_guardian",
    name: "Community Guardian",
    emoji: "🛡️",
    description: "Submit 10 civic reports",
    xpReward: 200,
  },
  verified_voice: {
    id: "verified_voice",
    name: "Verified Voice",
    emoji: "✅",
    description: "Verify 3 community resolutions",
    xpReward: 80,
  },
  quality_reporter: {
    id: "quality_reporter",
    name: "Quality Reporter",
    emoji: "🎯",
    description: "3 of your reports get resolved",
    xpReward: 150,
  },
  first_fix: {
    id: "first_fix",
    name: "First Fix",
    emoji: "🔧",
    description: "Resolve your first civic issue as a cleaner",
    xpReward: 100,
  },
  quick_responder: {
    id: "quick_responder",
    name: "Quick Responder",
    emoji: "⚡",
    description: "Claim and resolve an issue within 24 hours",
    xpReward: 75,
  },
  cleanup_crew: {
    id: "cleanup_crew",
    name: "Cleanup Crew",
    emoji: "🧹",
    description: "Resolve 5 civic issues as a cleaner",
    xpReward: 200,
  },
  city_cleaner: {
    id: "city_cleaner",
    name: "City Cleaner",
    emoji: "🏙️",
    description: "Resolve 10 civic issues as a cleaner",
    xpReward: 400,
  },
};

export function hasAchievement(
  profile: Pick<UserProfile, "achievements">,
  id: AchievementId,
): boolean {
  return profile.achievements.some((a) => a.id === id);
}

export function checkNewAchievements(
  profile: UserProfile,
  claimedAt?: number,
): Achievement[] {
  const now = Date.now();
  const newly: Achievement[] = [];

  function award(id: AchievementId) {
    if (!hasAchievement(profile, id)) {
      newly.push({ id, unlockedAt: now });
    }
  }

  // Citizen achievements
  if (profile.reportCount >= 1) award("first_report");
  if (profile.reportCount >= 5) award("neighborhood_watch");
  if (profile.reportCount >= 10) award("community_guardian");
  if (profile.verifyCount >= 3) award("verified_voice");
  if (profile.resolvedReportCount >= 1) award("newcomer");
  if (profile.resolvedReportCount >= 3) award("quality_reporter");

  // Cleaner achievements
  if (profile.cleanedCount >= 1) award("first_fix");
  if (profile.cleanedCount >= 5) award("cleanup_crew");
  if (profile.cleanedCount >= 10) award("city_cleaner");

  // Quick responder: claimed and resolved within 24h of claim
  if (
    profile.cleanedCount >= 1 &&
    claimedAt !== undefined &&
    now - claimedAt < 24 * 60 * 60 * 1000
  ) {
    award("quick_responder");
  }

  return newly;
}

export function totalXpForAchievements(achievements: Achievement[]): number {
  return achievements.reduce((sum, a) => {
    const def = ACHIEVEMENT_DEFS[a.id];
    return sum + (def ? def.xpReward : 0);
  }, 0);
}
