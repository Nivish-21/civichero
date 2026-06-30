import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CivicIssue, IssueCategory, IssueStatus, IssueSeverity } from '../types';
import { 
  Search, 
  Filter, 
  MapPin, 
  ThumbsUp, 
  Calendar, 
  MessageSquare, 
  Activity, 
  ArrowRight,
  Eye,
  SlidersHorizontal,
  X,
  FileSpreadsheet,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CommunityFeedProps {
  onSelectIssue: (issue: CivicIssue) => void;
  onOpenReportForm: () => void;
}

export const getRelativeTime = (timestamp: number): string => {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export const getCategoryBadgeColors = (category: IssueCategory) => {
  switch (category) {
    case 'Pothole':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'Water Leak':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Streetlight':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'Garbage/Waste':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'Drainage':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case 'Road Damage':
      return 'bg-rose-100 text-rose-800 border-rose-200';
    case 'Public Safety':
      return 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200';
  }
};

export const getStatusBadgeColors = (status: IssueStatus) => {
  switch (status) {
    case 'Reported':
      return 'bg-blue-500 text-white';
    case 'Acknowledged':
      return 'bg-amber-500 text-white';
    case 'In Progress':
      return 'bg-indigo-600 text-white';
    case 'Resolved':
      return 'bg-emerald-600 text-white';
  }
};

export const CommunityFeed: React.FC<CommunityFeedProps> = ({ onSelectIssue, onOpenReportForm }) => {
  const { issues, upvoteIssue, user } = useApp();

  // Search & Filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  
  const [showFilters, setShowFilters] = useState(false);

  // Filter issues based on search and selected attributes
  const filteredIssues = issues.filter((issue) => {
    const matchesSearch = 
      issue.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.userNote.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (issue.address && issue.address.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'All' || issue.category === selectedCategory;
    const matchesSeverity = selectedSeverity === 'All' || issue.severity === selectedSeverity;
    const matchesStatus = selectedStatus === 'All' || issue.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesSeverity && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Upper action bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search reports by description or street..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-emerald-500 focus:bg-white transition-all"
          />
          {searchQuery && (
            <button 
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-semibold"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-medium border transition-colors ${
              showFilters || selectedCategory !== 'All' || selectedSeverity !== 'All' || selectedStatus !== 'All'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters</span>
            {(selectedCategory !== 'All' || selectedSeverity !== 'All' || selectedStatus !== 'All') && (
              <span className="ml-1 w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            )}
          </button>

          <button
            type="button"
            onClick={onOpenReportForm}
            className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-display font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md shadow-emerald-600/15 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
          >
            <span>Report Civic Issue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expandable filters drawer */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-white rounded-2xl border border-slate-100 p-4 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-50 pb-2">
              <h4 className="text-xs font-display font-bold text-slate-800 tracking-wide uppercase">Refine Civic Reports</h4>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('All');
                  setSelectedSeverity('All');
                  setSelectedStatus('All');
                }}
                className="text-[10px] text-slate-400 hover:text-emerald-600 font-semibold uppercase"
              >
                Reset All
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-emerald-500"
                >
                  <option value="All">All Categories</option>
                  <option value="Pothole">Pothole</option>
                  <option value="Water Leak">Water Leak</option>
                  <option value="Streetlight">Streetlight</option>
                  <option value="Garbage/Waste">Garbage/Waste</option>
                  <option value="Drainage">Drainage</option>
                  <option value="Road Damage">Road Damage</option>
                  <option value="Public Safety">Public Safety</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Severity Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Severity Hazard
                </label>
                <select
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-emerald-500"
                >
                  <option value="All">All Severities</option>
                  <option value="High">High Hazard</option>
                  <option value="Medium">Medium Hazard</option>
                  <option value="Low">Low Hazard</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Resolution Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-emerald-500"
                >
                  <option value="All">All Statuses</option>
                  <option value="Reported">Reported</option>
                  <option value="Acknowledged">Acknowledged</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid Feed */}
      {filteredIssues.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 flex flex-col items-center justify-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            <Filter className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">No matching issues found</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              Try adjusting your active filter tags or report a new local civic issue to add it to the platform catalog.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
              setSelectedSeverity('All');
              setSelectedStatus('All');
            }}
            className="px-4 py-2 bg-slate-950 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            Clear Active Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredIssues.map((issue) => {
            const hasUpvoted = user && issue.upvotedByUserIds.includes(user.uid);
            
            return (
              <motion.div
                key={issue.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="group bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow"
              >
                {/* Image Section */}
                <div className="relative h-48 bg-slate-900 overflow-hidden shrink-0">
                  {issue.photoUrl ? (
                    <img
                      src={issue.photoUrl}
                      alt={issue.category}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-900 flex items-center justify-center text-slate-600">
                      <ImageIcon className="w-10 h-10" />
                    </div>
                  )}

                  {/* Absolute badging overlays */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[85%]">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-sm ${getCategoryBadgeColors(issue.category)}`}>
                      {issue.category}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border text-white ${
                      issue.severity === 'High' ? 'bg-rose-600 border-rose-500' :
                      issue.severity === 'Medium' ? 'bg-amber-600 border-amber-500' :
                      'bg-emerald-600 border-emerald-500'
                    }`}>
                      {issue.severity}
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3">
                    <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-md shadow-md ${getStatusBadgeColors(issue.status)}`}>
                      {issue.status}
                    </span>
                  </div>

                  <div className="absolute bottom-3 right-3 bg-slate-950/70 backdrop-blur-md text-white text-[10px] font-mono px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{getRelativeTime(issue.timestamp)}</span>
                  </div>
                </div>

                {/* Info details */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors line-clamp-2">
                      {issue.summary}
                    </h3>
                    
                    <p className="text-xs text-slate-400 line-clamp-2 italic leading-relaxed">
                      "{issue.userNote || 'No additional note description provided by the citizen.'}"
                    </p>
                  </div>

                  {/* Location & interactive triggers */}
                  <div className="space-y-3 pt-3 border-t border-slate-50">
                    <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium truncate">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{issue.address}</span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      {/* Upvote/"I see this too" button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          upvoteIssue(issue.id);
                        }}
                        className={`w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          hasUpvoted
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <ThumbsUp className={`w-3.5 h-3.5 ${hasUpvoted ? 'fill-current' : ''}`} />
                        <span>{issue.upvotes} {hasUpvoted ? 'Upvoted' : 'I see this'}</span>
                      </button>

                      {/* View details trigger */}
                      <button
                        type="button"
                        onClick={() => onSelectIssue(issue)}
                        className="w-full sm:w-auto flex items-center justify-center gap-1 text-xs font-semibold text-slate-700 hover:text-emerald-600 transition-colors"
                      >
                        <span>Details</span>
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
