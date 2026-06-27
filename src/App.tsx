import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { CommunityFeed } from './components/CommunityFeed';
import { ReportIssueForm } from './components/ReportIssueForm';
import { IssueDetailPage } from './components/IssueDetailPage';
import { CivicMap } from './components/CivicMap';
import { Leaderboard } from './components/Leaderboard';
import { AchievementModal } from './components/AchievementModal';
import { RoleSelector } from './components/RoleSelector';
import { CivicIssue } from './types';
import {
  Map as MapIcon,
  ListFilter,
  PlusCircle,
  ShieldAlert,
  Trophy,
  Award,
  Loader2,
  Wrench,
  Shield,
  Copy,
  Check,
} from 'lucide-react';
type ActiveTab = 'feed' | 'map' | 'report' | 'leaderboard';

function DashboardContent() {
  const { user, loadingUser, loadingIssues } = useApp();

  const [activeTab, setActiveTab] = useState<ActiveTab>('feed');
  const [selectedIssue, setSelectedIssue] = useState<CivicIssue | null>(null);
  const [copiedUid, setCopiedUid] = useState(false);

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-400" />
        <p className="text-sm font-display font-medium tracking-wide">Initializing Civic Credentials...</p>
      </div>
    );
  }

  const getCitizenLevel = (xp: number) => {
    if (xp >= 500) return { title: 'Civic Legend', color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' };
    if (xp >= 200) return { title: 'Civic Guardian', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' };
    if (xp >= 75) return { title: 'Active Patrol', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' };
    return { title: 'Local Neighbor', color: 'text-slate-400 border-slate-700 bg-slate-800' };
  };

  const citizenLevel = user ? getCitizenLevel(user.xp) : { title: 'Local Neighbor', color: 'text-slate-400 border-slate-700 bg-slate-800' };

  const roleBadge =
    user?.role === 'admin'
      ? { label: 'Admin', style: 'text-rose-400 bg-rose-500/10 border-rose-500/20' }
      : user?.role === 'cleaner'
        ? { label: 'Cleaner', style: 'text-amber-400 bg-amber-500/10 border-amber-500/20' }
        : null;

  const copyUid = async () => {
    if (!user) return;
    try {
      await navigator.clipboard.writeText(user.uid);
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 1500);
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Achievement unlock overlay */}
      <AchievementModal />

      {/* Dynamic Navigation Header */}
      <header className="sticky top-0 z-50 bg-slate-950 text-white shadow-lg border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => {
                setSelectedIssue(null);
                setActiveTab('feed');
              }}
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <ShieldAlert className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-display font-black tracking-tight flex items-center gap-1 leading-none">
                  <span>Community</span>
                  <span className="text-emerald-400">Hero</span>
                </h1>
                <p className="text-[9px] font-mono tracking-widest uppercase text-slate-400">Hyperlocal Triage</p>
              </div>
            </div>

            {/* Profile block */}
            {user && (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="flex items-center gap-1.5 justify-end">
                    <p className="text-xs font-bold text-slate-100">{user.displayName}</p>
                    {roleBadge && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${roleBadge.style}`}>
                        {roleBadge.label === 'Admin' ? <Shield className="w-2.5 h-2.5 inline" /> : <Wrench className="w-2.5 h-2.5 inline" />}
                        {' '}{roleBadge.label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 justify-end mt-0.5">
                    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded border ${citizenLevel.color}`}>
                      {citizenLevel.title}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-0.5">
                      <Award className="w-3.5 h-3.5 fill-current" />
                      {user.xp} XP
                    </span>
                    {/* UID copy helper for admin setup */}
                    <button
                      type="button"
                      onClick={copyUid}
                      title="Copy UID (admin setup)"
                      className="text-slate-600 hover:text-slate-400 transition-colors"
                    >
                      {copiedUid ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="w-10 h-10 rounded-xl bg-slate-800 border-2 border-slate-700 shadow-md p-1.5 object-contain"
                />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {selectedIssue ? (
          <IssueDetailPage
            issue={selectedIssue}
            onBack={() => setSelectedIssue(null)}
          />
        ) : (
          <div className="space-y-6">
            {/* Tab bar */}
            <div className="flex p-1.5 bg-slate-900/5 rounded-2xl border border-slate-200/50 overflow-x-auto gap-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('feed')}
                className={`flex-1 min-w-max flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'feed'
                    ? 'bg-slate-950 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                <ListFilter className="w-4 h-4" />
                <span>Issues Feed</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('map')}
                className={`flex-1 min-w-max flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'map'
                    ? 'bg-slate-950 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                <MapIcon className="w-4 h-4" />
                <span>Map</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('report')}
                className={`flex-1 min-w-max flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'report'
                    ? 'bg-slate-950 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                <PlusCircle className="w-4 h-4 text-emerald-500" />
                <span>Report</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('leaderboard')}
                className={`flex-1 min-w-max flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'leaderboard'
                    ? 'bg-slate-950 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Leaderboard</span>
              </button>
            </div>

            {/* Tab content */}
            <div className="min-h-[450px]">
              {activeTab === 'feed' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-display font-extrabold text-slate-900 tracking-tight">Active Community Hazards</h2>
                      <p className="text-slate-500 text-xs mt-0.5">Real-time reports triaged automatically by Gemini AI</p>
                    </div>
                  </div>

                  {loadingIssues ? (
                    <div className="py-24 flex flex-col items-center justify-center text-slate-400 space-y-2">
                      <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
                      <p className="text-xs">Loading active civic issues...</p>
                    </div>
                  ) : (
                    <CommunityFeed
                      onSelectIssue={(issue) => setSelectedIssue(issue)}
                      onOpenReportForm={() => setActiveTab('report')}
                    />
                  )}
                </div>
              )}

              {activeTab === 'map' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-display font-extrabold text-slate-900 tracking-tight">Local Civic Map</h2>
                    <p className="text-slate-500 text-xs mt-0.5">Explore hot spots and hazard clusters in Metro District</p>
                  </div>
                  <CivicMap
                    onSelectIssue={(issue) => setSelectedIssue(issue)}
                    heightClass="h-[480px]"
                  />
                </div>
              )}

              {activeTab === 'report' && (
                <ReportIssueForm
                  onSuccess={() => {
                    setActiveTab('feed');
                  }}
                />
              )}

              {activeTab === 'leaderboard' && (
                <div className="space-y-6">
                  <Leaderboard />
                  {/* Cleaner code entry — only visible to citizens */}
                  <div className="max-w-md">
                    <RoleSelector />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-500 text-xs py-8 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-2">
          <p className="font-medium text-slate-400">Community Hero — Hyperlocal Civic Resolution Dashboard</p>
          <p className="text-[10px] text-slate-600">
            Powered by Gemini 2.5 Flash Multimodal Vision • Securely Persisted with Firebase Firestore & Anonymous Authentication
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <DashboardContent />
    </AppProvider>
  );
}
