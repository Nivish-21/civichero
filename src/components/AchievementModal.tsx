import React from "react";
import { useApp } from "../context/AppContext";
import { ACHIEVEMENT_DEFS } from "../lib/achievements";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles } from "lucide-react";

export const AchievementModal: React.FC = () => {
  const { pendingAchievement, clearPendingAchievement } = useApp();

  const def = pendingAchievement ? ACHIEVEMENT_DEFS[pendingAchievement.id] : null;

  return (
    <AnimatePresence>
      {pendingAchievement && def && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
          onClick={clearPendingAchievement}
        >
          <motion.div
            initial={{ scale: 0.75, y: 32 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-slate-900 border border-slate-700/60 rounded-3xl p-8 max-w-sm w-full text-center space-y-5 shadow-2xl overflow-hidden"
          >
            {/* Ambient glow */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-emerald-500/10 via-transparent to-transparent pointer-events-none" />

            {/* Emoji */}
            <div className="relative">
              <div className="text-8xl mb-1 leading-none select-none">{def.emoji}</div>
              <div className="flex items-center justify-center gap-1.5 text-emerald-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Achievement Unlocked</span>
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Info */}
            <div className="space-y-1.5 relative">
              <h2 className="text-2xl font-display font-extrabold text-white leading-none">
                {def.name}
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">{def.description}</p>
            </div>

            {/* XP pill */}
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/25">
              <span className="text-xl font-display font-extrabold text-emerald-400">
                +{def.xpReward} XP
              </span>
            </div>

            <button
              type="button"
              onClick={clearPendingAchievement}
              className="relative block w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
            >
              Tap to continue
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
