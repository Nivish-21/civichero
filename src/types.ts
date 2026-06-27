export type IssueCategory =
  | "Pothole"
  | "Water Leak"
  | "Streetlight"
  | "Garbage/Waste"
  | "Drainage"
  | "Road Damage"
  | "Public Safety"
  | "Other";

export type IssueSeverity = "Low" | "Medium" | "High";

export type IssueStatus =
  | "Reported"
  | "Acknowledged"
  | "In Progress"
  | "Claimed"
  | "Pending Verification"
  | "Resolved";

export type UserRole = "citizen" | "cleaner" | "admin";

export type AchievementId =
  | "first_report"
  | "newcomer"
  | "neighborhood_watch"
  | "community_guardian"
  | "verified_voice"
  | "quality_reporter"
  | "first_fix"
  | "quick_responder"
  | "cleanup_crew"
  | "city_cleaner";

export interface Achievement {
  id: AchievementId;
  unlockedAt: number;
}

export interface StatusTimelineEvent {
  status: IssueStatus;
  notes: string;
  timestamp: number;
}

export interface CivicIssue {
  id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  summary: string;
  userNote: string;
  photoUrl: string;
  videoUrl?: string;
  latitude: number;
  longitude: number;
  address?: string;
  status: IssueStatus;
  upvotes: number;
  upvotedByUserIds: string[];
  userId: string;
  timestamp: number;
  history: StatusTimelineEvent[];
  agentPlan?: AgentPlan;
  // 3-role system fields
  claimedByUid?: string;
  claimedAt?: number;
  completionPhotoUrl?: string;
  aiCompletionVerified?: boolean;
  aiCompletionSummary?: string;
  verificationVotes: { clean: string[]; dirty: string[] };
  verificationThreshold: number;
}

export interface AgentPlan {
  authority: string;
  authorityReason: string;
  duplicateOfId: string | null;
  duplicateReason: string;
  priorityScore: number;
  slaDays: number;
  draftReport: string;
  recommendedActions: string[];
  isSimulated: boolean;
  generatedAt: number;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  avatarUrl: string;
  role: UserRole;
  xp: number;
  achievements: Achievement[];
  reportCount: number;
  resolvedReportCount: number;
  cleanedCount: number;
  verifyCount: number;
  points: number; // legacy display alias for xp
}
