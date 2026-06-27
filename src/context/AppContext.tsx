import React, { createContext, useContext, useState, useEffect } from "react";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  arrayUnion,
  arrayRemove,
  increment,
} from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "../lib/firebase";
import {
  CivicIssue,
  UserProfile,
  IssueStatus,
  IssueCategory,
  IssueSeverity,
  AgentPlan,
  UserRole,
  Achievement,
} from "../types";
import { checkNewAchievements, ACHIEVEMENT_DEFS } from "../lib/achievements";

export interface VerifyResult {
  isResolved: boolean;
  confidence: "high" | "medium" | "low";
  summary: string;
  isSimulated: boolean;
}

function distanceMeters(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const VERIFY_THRESHOLD = Number(
  (import.meta.env.VITE_VERIFY_THRESHOLD as string | undefined) ?? 2,
);
const ADMIN_UID = import.meta.env.VITE_ADMIN_UID as string | undefined;
const CLEANER_CODE = import.meta.env.VITE_CLEANER_CODE as string | undefined;

interface AppContextType {
  user: UserProfile | null;
  loadingUser: boolean;
  issues: CivicIssue[];
  loadingIssues: boolean;
  leaderboard: UserProfile[];
  pendingAchievement: Achievement | null;
  clearPendingAchievement: () => void;
  mapsKeyAvailable: boolean;
  createIssueReport: (data: {
    category: IssueCategory;
    severity: IssueSeverity;
    summary: string;
    userNote: string;
    photoBase64: string;
    videoBase64?: string;
    latitude: number;
    longitude: number;
    address?: string;
  }) => Promise<string>;
  upvoteIssue: (issueId: string) => Promise<void>;
  updateIssueStatus: (
    issueId: string,
    status: IssueStatus,
    notes: string,
  ) => Promise<void>;
  resolveIssuePlan: (issueId: string) => Promise<void>;
  claimIssue: (issueId: string) => Promise<void>;
  submitCompletionPhoto: (
    issueId: string,
    photoBase64: string,
  ) => Promise<VerifyResult>;
  verifyResolution: (
    issueId: string,
    vote: "clean" | "dirty",
  ) => Promise<void>;
  upgradeToCleanerRole: (code: string) => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [issues, setIssues] = useState<CivicIssue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [pendingAchievement, setPendingAchievement] =
    useState<Achievement | null>(null);
  const [mapsKeyAvailable, setMapsKeyAvailable] = useState(false);

  useEffect(() => {
    fetch("/api/maps-config")
      .then((r) => r.json())
      .then((d) => setMapsKeyAvailable(d.hasKey))
      .catch(() => setMapsKeyAvailable(false));
  }, []);

  // ---------------------------------------------------------------------------
  // Internal helpers — defined before any function that calls them
  // ---------------------------------------------------------------------------

  const awardXP = async (uid: string, amount: number): Promise<void> => {
    try {
      await updateDoc(doc(db, "users", uid), {
        xp: increment(amount),
        points: increment(amount),
      });
      setUser((prev) =>
        prev && prev.uid === uid
          ? { ...prev, xp: prev.xp + amount, points: prev.points + amount }
          : prev,
      );
    } catch {
      // Non-fatal: target user doc may not exist yet
    }
  };

  const applyAchievements = async (
    profile: UserProfile,
    claimedAt?: number,
  ): Promise<void> => {
    const newOnes = checkNewAchievements(profile, claimedAt);
    if (newOnes.length === 0) return;

    const bonusXp = newOnes.reduce(
      (sum, a) => sum + ACHIEVEMENT_DEFS[a.id].xpReward,
      0,
    );
    try {
      await updateDoc(doc(db, "users", profile.uid), {
        achievements: arrayUnion(...newOnes),
        xp: increment(bonusXp),
        points: increment(bonusXp),
      });
    } catch {
      // Non-fatal
    }

    if (user && profile.uid === user.uid) {
      setUser((prev) =>
        prev
          ? {
              ...prev,
              achievements: [...prev.achievements, ...newOnes],
              xp: prev.xp + bonusXp,
              points: prev.points + bonusXp,
            }
          : null,
      );
      setPendingAchievement(newOnes[0]);
    }
  };

  // ---------------------------------------------------------------------------
  // 1. Auth + Firestore profile init
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userRef = doc(db, "users", firebaseUser.uid);
          const snap = await getDoc(userRef);

          let profile: UserProfile;
          if (snap.exists()) {
            profile = snap.data() as UserProfile;
            if (
              ADMIN_UID &&
              firebaseUser.uid === ADMIN_UID &&
              profile.role !== "admin"
            ) {
              profile = { ...profile, role: "admin" };
              await updateDoc(userRef, { role: "admin" });
            }
          } else {
            const storedName = localStorage.getItem(
              `civichero_name_${firebaseUser.uid}`,
            );
            const storedAvatar = localStorage.getItem(
              `civichero_avatar_${firebaseUser.uid}`,
            );
            const storedPoints = localStorage.getItem(
              `civichero_points_${firebaseUser.uid}`,
            );
            const initXp = storedPoints ? parseInt(storedPoints, 10) : 10;
            const role: UserRole =
              ADMIN_UID && firebaseUser.uid === ADMIN_UID ? "admin" : "citizen";

            profile = {
              uid: firebaseUser.uid,
              displayName:
                storedName ||
                `Citizen-${Math.floor(1000 + Math.random() * 9000)}`,
              avatarUrl:
                storedAvatar ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${firebaseUser.uid}`,
              role,
              xp: initXp,
              achievements: [],
              reportCount: 0,
              resolvedReportCount: 0,
              cleanedCount: 0,
              verifyCount: 0,
              points: initXp,
            };
            await setDoc(userRef, profile);
          }

          setUser(profile);
        } catch (error) {
          console.error("Profile init failed:", error);
        }
        setLoadingUser(false);
      } else {
        try {
          await signInAnonymously(auth);
        } catch (error) {
          console.error("Anonymous auth failed:", error);
          setLoadingUser(false);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // ---------------------------------------------------------------------------
  // 2. Real-time issues sync
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const issuesQuery = query(
      collection(db, "issues"),
      orderBy("timestamp", "desc"),
    );
    const unsubscribe = onSnapshot(
      issuesQuery,
      (snapshot) => {
        const fetched: CivicIssue[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            category: data.category,
            severity: data.severity,
            summary: data.summary,
            userNote: data.userNote,
            photoUrl: data.photoUrl,
            videoUrl: data.videoUrl,
            latitude: data.latitude,
            longitude: data.longitude,
            address: data.address,
            status: data.status,
            upvotes: data.upvotes ?? 0,
            upvotedByUserIds: data.upvotedByUserIds ?? [],
            userId: data.userId,
            timestamp: data.timestamp,
            history: data.history ?? [],
            agentPlan: data.agentPlan,
            claimedByUid: data.claimedByUid ?? undefined,
            claimedAt: data.claimedAt ?? undefined,
            completionPhotoUrl: data.completionPhotoUrl ?? undefined,
            aiCompletionVerified: data.aiCompletionVerified ?? undefined,
            aiCompletionSummary: data.aiCompletionSummary ?? undefined,
            verificationVotes: data.verificationVotes ?? {
              clean: [],
              dirty: [],
            },
            verificationThreshold:
              data.verificationThreshold ?? VERIFY_THRESHOLD,
          } as CivicIssue;
        });
        setIssues(fetched);
        setLoadingIssues(false);
      },
      (error) => {
        console.error("Error syncing issues:", error);
        setLoadingIssues(false);
      },
    );
    return () => unsubscribe();
  }, []);

  // ---------------------------------------------------------------------------
  // 3. Real-time leaderboard (top 20 by XP)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const lbQuery = query(
      collection(db, "users"),
      orderBy("xp", "desc"),
      limit(20),
    );
    const unsubscribe = onSnapshot(
      lbQuery,
      (snapshot) => {
        setLeaderboard(snapshot.docs.map((d) => d.data() as UserProfile));
      },
      (error) => {
        console.error("Leaderboard sync error:", error);
      },
    );
    return () => unsubscribe();
  }, []);

  // ---------------------------------------------------------------------------
  // 4. Create issue report
  // ---------------------------------------------------------------------------
  const createIssueReport = async (data: {
    category: IssueCategory;
    severity: IssueSeverity;
    summary: string;
    userNote: string;
    photoBase64: string;
    videoBase64?: string;
    latitude: number;
    longitude: number;
    address?: string;
  }): Promise<string> => {
    if (!user) throw new Error("Must be logged in");

    const issueRef = doc(collection(db, "issues"));
    const issueId = issueRef.id;
    let photoUrl = "";
    let videoUrl = "";

    try {
      const photoRef = ref(storage, `issues/${issueId}/photo.jpg`);
      await uploadString(photoRef, data.photoBase64, "data_url");
      photoUrl = await getDownloadURL(photoRef);
    } catch {
      photoUrl = data.photoBase64;
    }

    if (data.videoBase64) {
      try {
        const videoRef = ref(storage, `issues/${issueId}/video.mp4`);
        await uploadString(videoRef, data.videoBase64, "data_url");
        videoUrl = await getDownloadURL(videoRef);
      } catch {
        videoUrl = data.videoBase64;
      }
    }

    const newIssue: CivicIssue = {
      id: issueId,
      category: data.category,
      severity: data.severity,
      summary: data.summary,
      userNote: data.userNote,
      photoUrl,
      videoUrl: videoUrl || undefined,
      latitude: data.latitude,
      longitude: data.longitude,
      address: data.address || "Hyperlocal Area",
      status: "Reported",
      upvotes: 0,
      upvotedByUserIds: [],
      userId: user.uid,
      timestamp: Date.now(),
      history: [
        {
          status: "Reported",
          notes: "Issue reported. AI triage completed.",
          timestamp: Date.now(),
        },
      ],
      verificationVotes: { clean: [], dirty: [] },
      verificationThreshold: VERIFY_THRESHOLD,
    };

    await setDoc(issueRef, newIssue);

    const xpGain = 20;
    const newReportCount = user.reportCount + 1;
    await updateDoc(doc(db, "users", user.uid), {
      xp: increment(xpGain),
      points: increment(xpGain),
      reportCount: increment(1),
    });
    const updatedProfile: UserProfile = {
      ...user,
      xp: user.xp + xpGain,
      points: user.points + xpGain,
      reportCount: newReportCount,
    };
    setUser(updatedProfile);
    await applyAchievements(updatedProfile);

    return issueId;
  };

  // ---------------------------------------------------------------------------
  // 5. Upvote
  // ---------------------------------------------------------------------------
  const upvoteIssue = async (issueId: string): Promise<void> => {
    if (!user) throw new Error("Must be logged in");
    const target = issues.find((i) => i.id === issueId);
    if (!target) return;

    const issueRef = doc(db, "issues", issueId);
    const hasUpvoted = target.upvotedByUserIds.includes(user.uid);

    if (hasUpvoted) {
      await updateDoc(issueRef, {
        upvotes: increment(-1),
        upvotedByUserIds: arrayRemove(user.uid),
      });
    } else {
      await updateDoc(issueRef, {
        upvotes: increment(1),
        upvotedByUserIds: arrayUnion(user.uid),
      });
      await awardXP(user.uid, 5);
    }
  };

  // ---------------------------------------------------------------------------
  // 6. Admin: status override
  // ---------------------------------------------------------------------------
  const updateIssueStatus = async (
    issueId: string,
    status: IssueStatus,
    notes: string,
  ): Promise<void> => {
    if (!user || user.role !== "admin")
      throw new Error("Admin access required");
    await updateDoc(doc(db, "issues", issueId), {
      status,
      history: arrayUnion({ status, notes, timestamp: Date.now() }),
    });
  };

  // ---------------------------------------------------------------------------
  // 7. Agent resolution plan
  // ---------------------------------------------------------------------------
  const resolveIssuePlan = async (issueId: string): Promise<void> => {
    const target = issues.find((i) => i.id === issueId);
    if (!target) throw new Error("Issue not found");

    const nearbyIssues = issues
      .filter((i) => i.id !== issueId)
      .map((i) => ({
        ...i,
        distanceMeters: Math.round(
          distanceMeters(
            target.latitude,
            target.longitude,
            i.latitude,
            i.longitude,
          ),
        ),
      }))
      .filter((i) => i.distanceMeters <= 500)
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, 10)
      .map((i) => ({
        id: i.id,
        category: i.category,
        summary: i.summary,
        status: i.status,
        distanceMeters: i.distanceMeters,
      }));

    const res = await fetch("/api/agent/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        issue: {
          id: target.id,
          category: target.category,
          severity: target.severity,
          summary: target.summary,
          userNote: target.userNote,
          address: target.address,
          upvotes: target.upvotes,
        },
        nearbyIssues,
      }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(
        (d as { error?: string }).error || "Agent planning failed",
      );
    }
    const plan = (await res.json()) as Omit<AgentPlan, "generatedAt">;
    await updateDoc(doc(db, "issues", issueId), {
      agentPlan: { ...plan, generatedAt: Date.now() },
    });
  };

  // ---------------------------------------------------------------------------
  // 8. Cleaner: claim issue
  // ---------------------------------------------------------------------------
  const claimIssue = async (issueId: string): Promise<void> => {
    if (!user || user.role !== "cleaner")
      throw new Error("Cleaner access required");
    const target = issues.find((i) => i.id === issueId);
    if (!target || target.status !== "Acknowledged")
      throw new Error("Issue is not in claimable state");

    const now = Date.now();
    await updateDoc(doc(db, "issues", issueId), {
      status: "Claimed",
      claimedByUid: user.uid,
      claimedAt: now,
      history: arrayUnion({
        status: "Claimed",
        notes: "Claimed by a cleaner. Heading to the location.",
        timestamp: now,
      }),
    });
    await awardXP(user.uid, 10);
  };

  // ---------------------------------------------------------------------------
  // 9. Cleaner: submit completion photo
  // ---------------------------------------------------------------------------
  const submitCompletionPhoto = async (
    issueId: string,
    photoBase64: string,
  ): Promise<VerifyResult> => {
    if (!user || user.role !== "cleaner")
      throw new Error("Cleaner access required");
    const target = issues.find((i) => i.id === issueId);
    if (!target || target.claimedByUid !== user.uid)
      throw new Error("You have not claimed this issue");

    let completionPhotoUrl = photoBase64;
    try {
      const photoRef = ref(storage, `issues/${issueId}/completion.jpg`);
      await uploadString(photoRef, photoBase64, "data_url");
      completionPhotoUrl = await getDownloadURL(photoRef);
    } catch {
      // Use inline base64 fallback
    }

    const res = await fetch("/api/verify-completion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        completionPhoto: photoBase64,
        issueContext: { category: target.category, summary: target.summary },
      }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(
        (d as { error?: string }).error || "Verification request failed",
      );
    }
    const result = (await res.json()) as VerifyResult;

    if (result.isResolved) {
      const now = Date.now();
      await updateDoc(doc(db, "issues", issueId), {
        status: "Pending Verification",
        completionPhotoUrl,
        aiCompletionVerified: true,
        aiCompletionSummary: result.summary,
        history: arrayUnion({
          status: "Pending Verification",
          notes: `AI verified the area looks clean. Awaiting citizen confirmation.`,
          timestamp: now,
        }),
      });
      await awardXP(user.uid, 30);
    }

    return result;
  };

  // ---------------------------------------------------------------------------
  // 10. Citizen: verify resolution
  // ---------------------------------------------------------------------------
  const verifyResolution = async (
    issueId: string,
    vote: "clean" | "dirty",
  ): Promise<void> => {
    if (!user) throw new Error("Must be logged in");
    const target = issues.find((i) => i.id === issueId);
    if (!target || target.status !== "Pending Verification") return;

    const alreadyVoted = [
      ...target.verificationVotes.clean,
      ...target.verificationVotes.dirty,
    ].includes(user.uid);
    if (alreadyVoted) return;

    const newClean =
      vote === "clean"
        ? [...target.verificationVotes.clean, user.uid]
        : [...target.verificationVotes.clean];
    const newDirty =
      vote === "dirty"
        ? [...target.verificationVotes.dirty, user.uid]
        : [...target.verificationVotes.dirty];
    const threshold = target.verificationThreshold;
    const now = Date.now();
    const issueRef = doc(db, "issues", issueId);

    if (newClean.length >= threshold) {
      // Fully resolved
      await updateDoc(issueRef, {
        status: "Resolved",
        verificationVotes: { clean: newClean, dirty: newDirty },
        history: arrayUnion({
          status: "Resolved",
          notes: `${threshold} citizen${threshold > 1 ? "s" : ""} confirmed the issue is resolved. 🎉`,
          timestamp: now,
        }),
      });

      try {
        await updateDoc(doc(db, "users", target.userId), {
          xp: increment(50),
          points: increment(50),
          resolvedReportCount: increment(1),
        });
      } catch {
        /* reporter doc may not exist */
      }

      if (target.claimedByUid) {
        try {
          await updateDoc(doc(db, "users", target.claimedByUid), {
            xp: increment(150),
            points: increment(150),
            cleanedCount: increment(1),
          });
        } catch {
          /* cleaner doc may not exist */
        }
      }

      const newVerifyCount = user.verifyCount + 1;
      await updateDoc(doc(db, "users", user.uid), {
        xp: increment(15),
        points: increment(15),
        verifyCount: increment(1),
      });
      const updatedProfile: UserProfile = {
        ...user,
        xp: user.xp + 15,
        points: user.points + 15,
        verifyCount: newVerifyCount,
      };
      setUser(updatedProfile);
      await applyAchievements(updatedProfile);
    } else if (newDirty.length >= threshold) {
      // Rejected — reopen for reclaim
      await updateDoc(issueRef, {
        status: "Acknowledged",
        claimedByUid: null,
        claimedAt: null,
        completionPhotoUrl: null,
        aiCompletionVerified: null,
        aiCompletionSummary: null,
        verificationVotes: { clean: [], dirty: [] },
        history: arrayUnion({
          status: "Acknowledged",
          notes: `${threshold} citizen${threshold > 1 ? "s" : ""} reported the issue as still present. Reopened for any cleaner to reclaim.`,
          timestamp: now,
        }),
      });

      const newVerifyCount = user.verifyCount + 1;
      await updateDoc(doc(db, "users", user.uid), {
        xp: increment(10),
        points: increment(10),
        verifyCount: increment(1),
      });
      const updatedProfile: UserProfile = {
        ...user,
        xp: user.xp + 10,
        points: user.points + 10,
        verifyCount: newVerifyCount,
      };
      setUser(updatedProfile);
      await applyAchievements(updatedProfile);
    } else {
      // Vote recorded, threshold not yet met
      await updateDoc(issueRef, {
        verificationVotes: { clean: newClean, dirty: newDirty },
      });

      const newVerifyCount = user.verifyCount + 1;
      await updateDoc(doc(db, "users", user.uid), {
        xp: increment(10),
        points: increment(10),
        verifyCount: increment(1),
      });
      const updatedProfile: UserProfile = {
        ...user,
        xp: user.xp + 10,
        points: user.points + 10,
        verifyCount: newVerifyCount,
      };
      setUser(updatedProfile);
      await applyAchievements(updatedProfile);
    }
  };

  // ---------------------------------------------------------------------------
  // 11. Upgrade to cleaner via secret code
  // ---------------------------------------------------------------------------
  const upgradeToCleanerRole = async (code: string): Promise<boolean> => {
    if (!user || !CLEANER_CODE || code !== CLEANER_CODE) return false;
    await updateDoc(doc(db, "users", user.uid), { role: "cleaner" });
    setUser((prev) => (prev ? { ...prev, role: "cleaner" } : null));
    return true;
  };

  const clearPendingAchievement = () => setPendingAchievement(null);

  return (
    <AppContext.Provider
      value={{
        user,
        loadingUser,
        issues,
        loadingIssues,
        leaderboard,
        pendingAchievement,
        clearPendingAchievement,
        mapsKeyAvailable,
        createIssueReport,
        upvoteIssue,
        updateIssueStatus,
        resolveIssuePlan,
        claimIssue,
        submitCompletionPhoto,
        verifyResolution,
        upgradeToCleanerRole,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within an AppProvider");
  return context;
};
