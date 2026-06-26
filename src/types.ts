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
  | "Resolved";

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
  photoUrl: string; // Firebase Storage URL or base64 fallback
  videoUrl?: string; // Firebase Storage URL or base64 fallback
  latitude: number;
  longitude: number;
  address?: string;
  status: IssueStatus;
  upvotes: number;
  upvotedByUserIds: string[];
  userId: string;
  timestamp: number;
  history: StatusTimelineEvent[];
  agentPlan?: AgentPlan; // populated on-demand by the Agentic Resolution Layer
}

// Output of the Agentic Resolution Layer (/api/agent/resolve).
export interface AgentPlan {
  authority: string;
  authorityReason: string;
  duplicateOfId: string | null;
  duplicateReason: string;
  priorityScore: number; // 0-100
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
  points: number;
}
