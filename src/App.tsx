import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { CommunityFeed } from './components/CommunityFeed';
import { ReportIssueForm } from './components/ReportIssueForm';
import { IssueDetailPage } from './components/IssueDetailPage';
import { CivicMap } from './components/CivicMap';
import { CivicIssue } from './types';
import { 
  Building, 
  Map as MapIcon, 
  ListFilter, 
  PlusCircle, 
  ShieldAlert, 
  Trophy, 
  Award,
  Loader2,
  Sparkles,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function DashboardContent() {
  const { user, loadingUser, issues, loadingIssues } = useApp();
  
  // Navigation tabs: 'feed' | 'map' | 'report' | 'detail'
  const [activeTab, setActiveTab] = useState<'feed' | 'map' | 'report'>('feed');
  const [selectedIssue, setSelectedIssue] = useState<CivicIssue | null>(null);

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-400" />
        <p className="text-sm font-display font-medium tracking-wide">Initializing Civic Credentials...</p>
      </div>
    );
  }

  // Header banner displaying points & level
  const getCitizenLevel = (points: number) => {
    if (points >= 150) return { title: 'Civic Guardian', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' };
    if (points >= 70) return { title: 'Active Patrol', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' };
    return { title: 'Local Neighbor', color: 'text-slate-400 border-slate-700 bg-slate-800' };
  };

  const citizenLevel = user ? getCitizenLevel(user.points) : { title: 'Local Neighbor', color: 'text-slate-400' };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Dynamic Navigation Header */}
      <header className="sticky top-0 z-50 bg-slate-950 text-white shadow-lg border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Title / Logo */}
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

            {/* Profile Credentials with Points tracker */}
            {user && (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-slate-100">{user.displayName}</p>
                  <div className="flex items-center gap-1.5 justify-end mt-0.5">
                    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded border ${citizenLevel.color}`}>
                      {citizenLevel.title}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-0.5">
                      <Award className="w-3.5 h-3.5 fill-current" />
                      {user.points} pts
                    </span>
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
          /* Render Detail Page */
          <IssueDetailPage 
            issue={selectedIssue} 
            onBack={() => setSelectedIssue(null)} 
          />
        ) : (
          /* Main Tab-based dashboard */
          <div className="space-y-6">
            {/* Tab Selection buttons (Inspired by Bento design patterns) */}
            <div className="flex p-1.5 bg-slate-900/5 rounded-2xl max-w-md border border-slate-200/50">
              <button
                type="button"
                onClick={() => setActiveTab('feed')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
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
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'map'
                    ? 'bg-slate-950 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                <MapIcon className="w-4 h-4" />
                <span>Interactive Map</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('report')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'report'
                    ? 'bg-slate-950 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                <PlusCircle className="w-4 h-4 text-emerald-500" />
                <span>Submit Report</span>
              </button>
            </div>

            {/* Render Dashboard content */}
            <div className="min-h-[450px]">
              {activeTab === 'feed' && (
                <div className="space-y-6">
                  {/* Brief introduction headline */}
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
            </div>
          </div>
        )}
      </main>

      {/* Footer info banner */}
      <footer className="bg-slate-950 text-slate-500 text-xs py-8 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-2">
          <p className="font-medium text-slate-400">Community Hero — Hypelocal Civic Resolution Dashboard</p>
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
