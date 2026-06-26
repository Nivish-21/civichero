import React, { createContext, useContext, useState, useEffect } from 'react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  arrayUnion, 
  arrayRemove, 
  increment 
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../lib/firebase';
import { CivicIssue, UserProfile, IssueStatus, IssueCategory, IssueSeverity } from '../types';

interface AppContextType {
  user: UserProfile | null;
  loadingUser: boolean;
  issues: CivicIssue[];
  loadingIssues: boolean;
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
  updateIssueStatus: (issueId: string, status: IssueStatus, notes: string) => Promise<void>;
  mapsKeyAvailable: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [issues, setIssues] = useState<CivicIssue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [mapsKeyAvailable, setMapsKeyAvailable] = useState(false);

  // Check maps key availability
  useEffect(() => {
    fetch('/api/maps-config')
      .then((res) => res.json())
      .then((data) => {
        setMapsKeyAvailable(data.hasKey);
      })
      .catch(() => {
        setMapsKeyAvailable(false);
      });
  }, []);

  // 1. Authenticate user anonymously & setup local profile
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Retrieve or generate persistent user profile details in LocalStorage
        const storedName = localStorage.getItem(`civichero_name_${firebaseUser.uid}`);
        const storedAvatar = localStorage.getItem(`civichero_avatar_${firebaseUser.uid}`);
        const storedPoints = localStorage.getItem(`civichero_points_${firebaseUser.uid}`);

        const displayName = storedName || `Citizen-${Math.floor(1000 + Math.random() * 9000)}`;
        // Use styled SVG avatars using dicebear style (shapes or bottts)
        const avatarUrl = storedAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${firebaseUser.uid}`;
        const points = storedPoints ? parseInt(storedPoints, 10) : 10; // Start with 10 goodwill points

        if (!storedName) {
          localStorage.setItem(`civichero_name_${firebaseUser.uid}`, displayName);
          localStorage.setItem(`civichero_avatar_${firebaseUser.uid}`, avatarUrl);
          localStorage.setItem(`civichero_points_${firebaseUser.uid}`, points.toString());
        }

        setUser({
          uid: firebaseUser.uid,
          displayName,
          avatarUrl,
          points,
        });
        setLoadingUser(false);
      } else {
        // Sign in anonymously
        try {
          await signInAnonymously(auth);
        } catch (error) {
          console.error('Anonymous auth failed:', error);
          setLoadingUser(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Real-time issues synchronization from Firestore
  useEffect(() => {
    const issuesQuery = query(collection(db, 'issues'), orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(issuesQuery, (snapshot) => {
      const fetchedIssues: CivicIssue[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetchedIssues.push({
          id: docSnap.id,
          ...data,
        } as CivicIssue);
      });
      setIssues(fetchedIssues);
      setLoadingIssues(false);
    }, (error) => {
      console.error('Error syncing Firestore issues:', error);
      setLoadingIssues(false);
    });

    return () => unsubscribe();
  }, []);

  // 3. Create a civic issue report with automatic media upload & fallback
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
    if (!user) throw new Error('User must be logged in to report an issue');

    // Create a new document reference to get the ID beforehand
    const issueRef = doc(collection(db, 'issues'));
    const issueId = issueRef.id;

    let photoUrl = '';
    let videoUrl = '';

    // Upload photo to Firebase Storage
    try {
      console.log('Uploading photo to Firebase Storage...');
      const photoRef = ref(storage, `issues/${issueId}/photo.jpg`);
      await uploadString(photoRef, data.photoBase64, 'data_url');
      photoUrl = await getDownloadURL(photoRef);
    } catch (err) {
      console.warn('Storage photo upload failed, using robust inline Base64 fallback:', err);
      photoUrl = data.photoBase64; // Fallback directly to inline Base64 so it never fails
    }

    // Upload video if present
    if (data.videoBase64) {
      try {
        console.log('Uploading short video to Firebase Storage...');
        const videoRef = ref(storage, `issues/${issueId}/video.mp4`);
        await uploadString(videoRef, data.videoBase64, 'data_url');
        videoUrl = await getDownloadURL(videoRef);
      } catch (err) {
        console.warn('Storage video upload failed, using robust inline Base64 fallback:', err);
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
      address: data.address || 'Hyperlocal Area',
      status: 'Reported',
      upvotes: 0,
      upvotedByUserIds: [],
      userId: user.uid,
      timestamp: Date.now(),
      history: [
        {
          status: 'Reported',
          notes: 'Issue reported to the Community Hero platform. Automated AI triage completed successfully.',
          timestamp: Date.now(),
        }
      ]
    };

    // Save to Firestore
    await setDoc(issueRef, newIssue);

    // Increase user points for contributing to the community!
    const updatedPoints = user.points + 20; // 20 points for reporting
    localStorage.setItem(`civichero_points_${user.uid}`, updatedPoints.toString());
    setUser(prev => prev ? { ...prev, points: updatedPoints } : null);

    return issueId;
  };

  // 4. Upvote / "I see this too" report handler
  const upvoteIssue = async (issueId: string) => {
    if (!user) throw new Error('User must be logged in to upvote');

    const issueRef = doc(db, 'issues', issueId);
    const targetIssue = issues.find(i => i.id === issueId);
    if (!targetIssue) return;

    const hasUpvoted = targetIssue.upvotedByUserIds.includes(user.uid);

    if (hasUpvoted) {
      // Remove upvote
      await updateDoc(issueRef, {
        upvotes: increment(-1),
        upvotedByUserIds: arrayRemove(user.uid)
      });
    } else {
      // Add upvote
      await updateDoc(issueRef, {
        upvotes: increment(1),
        upvotedByUserIds: arrayUnion(user.uid)
      });

      // Increase user score slightly for participating
      const updatedPoints = user.points + 5;
      localStorage.setItem(`civichero_points_${user.uid}`, updatedPoints.toString());
      setUser(prev => prev ? { ...prev, points: updatedPoints } : null);
    }
  };

  // 5. Update issue status & append history
  const updateIssueStatus = async (issueId: string, status: IssueStatus, notes: string) => {
    const issueRef = doc(db, 'issues', issueId);
    
    const newEvent = {
      status,
      notes,
      timestamp: Date.now()
    };

    await updateDoc(issueRef, {
      status,
      history: arrayUnion(newEvent)
    });
  };

  return (
    <AppContext.Provider value={{
      user,
      loadingUser,
      issues,
      loadingIssues,
      createIssueReport,
      upvoteIssue,
      updateIssueStatus,
      mapsKeyAvailable,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
