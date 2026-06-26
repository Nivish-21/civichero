import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { CivicMap } from './CivicMap';
import { IssueCategory, IssueSeverity } from '../types';
import { 
  Upload, 
  Image as ImageIcon, 
  Film, 
  Sparkles, 
  Loader2, 
  AlertCircle, 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  ArrowRight,
  Gift,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ReportIssueFormProps {
  onSuccess: () => void;
}

export const ReportIssueForm: React.FC<ReportIssueFormProps> = ({ onSuccess }) => {
  const { createIssueReport } = useApp();

  // Step state: 'media' | 'location' | 'triage' | 'success'
  const [step, setStep] = useState<'media' | 'location' | 'triage' | 'success'>('media');

  // Media state
  const [photoBase64, setPhotoBase64] = useState<string>('');
  const [videoBase64, setVideoBase64] = useState<string>('');
  const [userNote, setUserNote] = useState<string>('');
  const [dragActive, setDragActive] = useState<boolean>(false);

  // File size checks
  const [mediaError, setMediaError] = useState<string | null>(null);

  // Geolocation state
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: 37.7749, lng: -122.4194 });
  const [address, setAddress] = useState<string>('Metro District Center');

  // AI Triage results state (populated by Gemini response)
  const [triageLoading, setTriageLoading] = useState<boolean>(false);
  const [triageError, setTriageError] = useState<string | null>(null);
  const [isSimulated, setIsSimulated] = useState<boolean>(false);
  
  const [category, setCategory] = useState<IssueCategory>('Other');
  const [severity, setSeverity] = useState<IssueSeverity>('Medium');
  const [summary, setSummary] = useState<string>('');

  // Submission state
  const [submitting, setSubmitting] = useState<boolean>(false);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // File to base64 converter helper
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  // Handle photo file selection
  const handlePhotoFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setMediaError('Selected file must be an image.');
      return;
    }
    
    // Check if image size is extremely large (limit to 6MB)
    if (file.size > 6 * 1024 * 1024) {
      setMediaError('Image size is too large (max 6MB). Please upload a smaller image.');
      return;
    }

    setMediaError(null);
    try {
      const base64 = await convertFileToBase64(file);
      setPhotoBase64(base64);
      // Trigger Gemini API pre-triage in background so it's loaded when they hit next
      triggerPreTriage(base64);
    } catch (err) {
      setMediaError('Failed to read image file.');
    }
  };

  // Handle optional video file selection
  const handleVideoFile = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      setMediaError('Selected file must be a video.');
      return;
    }

    // Limit video size (max 4MB for high performance storage saving)
    if (file.size > 4 * 1024 * 1024) {
      setMediaError('Video size exceeds limit (max 4MB). Keep videos short (3-5 seconds).');
      return;
    }

    setMediaError(null);
    try {
      const base64 = await convertFileToBase64(file);
      setVideoBase64(base64);
    } catch (err) {
      setMediaError('Failed to read video file.');
    }
  };

  // Drag and Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handlePhotoFile(e.dataTransfer.files[0]);
    }
  };

  // Run server-side Gemini triage
  const triggerPreTriage = async (imgBase64: string) => {
    setTriageLoading(true);
    setTriageError(null);
    try {
      const res = await fetch('/api/triage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ image: imgBase64 })
      });

      if (!res.ok) {
        throw new Error('AI server classification returned an error.');
      }

      const result = await res.json();
      setCategory(result.category);
      setSeverity(result.severity);
      setSummary(result.summary);
      setIsSimulated(result.isSimulated);
    } catch (err: any) {
      console.warn('Gemini triage failed, setting default state for user selection:', err);
      setTriageError(err.message || 'AI Triage service temporarily unavailable. Please select category manually.');
      // Keep defaults
      setCategory('Other');
      setSeverity('Medium');
      setSummary(userNote ? userNote.slice(0, 50) : 'Civic issue report');
    } finally {
      setTriageLoading(false);
    }
  };

  // Location configuration handler
  const handleCoordsChange = (data: { lat: number; lng: number; address: string }) => {
    setCoords({ lat: data.lat, lng: data.lng });
    setAddress(data.address);
  };

  // Submit report to database
  const handleSubmitReport = async () => {
    setSubmitting(true);
    try {
      await createIssueReport({
        category,
        severity,
        summary,
        userNote,
        photoBase64,
        videoBase64: videoBase64 || undefined,
        latitude: coords.lat,
        longitude: coords.lng,
        address
      });
      setStep('success');
    } catch (err) {
      console.error('Submission failed:', err);
      alert('Failed to save issue report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
      {/* Header bar */}
      <div className="bg-slate-900 px-6 py-5 text-white flex items-center justify-between">
        <div>
          <h2 className="text-lg font-display font-bold tracking-tight">Report Local Issue</h2>
          <p className="text-slate-400 text-xs">Help restore civic order in your street</p>
        </div>
        <div className="flex gap-1.5 items-center bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="text-[10px] font-mono font-bold tracking-wider text-emerald-400">GEMINI POWERED</span>
        </div>
      </div>

      {/* Form step navigation indicator */}
      <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-100 text-[11px] font-medium text-center text-slate-400">
        <div className={`py-2.5 border-r border-slate-100 ${step === 'media' ? 'text-emerald-600 bg-emerald-50/40 font-bold' : ''}`}>
          1. Upload Media
        </div>
        <div className={`py-2.5 border-r border-slate-100 ${step === 'location' ? 'text-emerald-600 bg-emerald-50/40 font-bold' : ''}`}>
          2. Pin Location
        </div>
        <div className={`py-2.5 ${step === 'triage' ? 'text-emerald-600 bg-emerald-50/40 font-bold' : ''}`}>
          3. AI Verification
        </div>
      </div>

      <div className="p-6">
        <AnimatePresence mode="wait">
          {/* STEP 1: MEDIA UPLOAD */}
          {step === 'media' && (
            <motion.div
              key="media-step"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              className="space-y-5"
            >
              {/* Photo upload zone (with Drag-and-drop) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Photo of the Issue <span className="text-rose-500">*</span>
                </label>
                
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => photoInputRef.current?.click()}
                  className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-6 cursor-pointer transition-all ${
                    dragActive 
                      ? 'border-emerald-500 bg-emerald-50/30' 
                      : photoBase64 
                        ? 'border-emerald-300 bg-slate-50' 
                        : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50'
                  }`}
                >
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handlePhotoFile(e.target.files[0])}
                  />

                  {photoBase64 ? (
                    <div className="relative w-full max-h-[180px] overflow-hidden rounded-xl">
                      <img 
                        src={photoBase64} 
                        alt="Preview" 
                        referrerPolicy="no-referrer"
                        className="w-full h-[180px] object-cover"
                      />
                      <div className="absolute top-2 right-2 bg-emerald-500 text-white p-1 rounded-full shadow-lg">
                        <Check className="w-4 h-4" />
                      </div>
                      <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <p className="text-white text-xs font-medium">Click to replace photo</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-2 py-4">
                      <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                        <Upload className="w-5 h-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Drag & drop photo here</p>
                        <p className="text-xs text-slate-400">or click to browse from device</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Optional short video */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Optional Video Clips</span>
                  <span className="text-[10px] text-slate-400 font-normal">Max 4MB (approx. 5s)</span>
                </label>
                
                <div 
                  onClick={() => videoInputRef.current?.click()}
                  className={`flex items-center gap-3 p-3.5 border rounded-xl cursor-pointer transition-all ${
                    videoBase64 
                      ? 'bg-emerald-50/50 border-emerald-300 text-emerald-800' 
                      : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                  }`}
                >
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleVideoFile(e.target.files[0])}
                  />
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${videoBase64 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                    <Film className="w-4 h-4" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="text-xs font-semibold">
                      {videoBase64 ? 'Video clip uploaded!' : 'Include quick video clip'}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {videoBase64 ? 'Click to replace video clip' : 'Shows the surrounding perspective or context'}
                    </p>
                  </div>
                  {videoBase64 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setVideoBase64('');
                      }}
                      className="text-xs font-semibold text-slate-400 hover:text-rose-500 px-2 py-1"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {/* Notes input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Additional Citizen Notes <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  value={userNote}
                  onChange={(e) => setUserNote(e.target.value)}
                  placeholder="Provide any helpful instructions, references, or context (e.g. 'In front of the grocery store, blocking bicycle lane')."
                  className="w-full text-xs border border-slate-200 rounded-xl p-3 focus:outline-emerald-500 bg-slate-50/30"
                  rows={3}
                />
              </div>

              {mediaError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                  <span>{mediaError}</span>
                </div>
              )}

              {/* Actions */}
              <button
                type="button"
                disabled={!photoBase64}
                onClick={() => setStep('location')}
                className="w-full py-3 px-4 font-display font-semibold rounded-xl text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-1.5"
              >
                <span>Continue to Location</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* STEP 2: PIN LOCATION */}
          {step === 'location' && (
            <motion.div
              key="location-step"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              className="space-y-5"
            >
              <div>
                <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                  We use your browser's GPS coordinate mapping by default. Please verify or drag the map to pinpoint the exact location of the issue.
                </p>
                <CivicMap 
                  interactive={true} 
                  initialCoords={coords}
                  onCoordsChange={handleCoordsChange}
                  heightClass="h-[280px]"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('media')}
                  className="flex-1 py-3 px-4 font-display font-semibold rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep('triage')}
                  className="flex-1 py-3 px-4 font-display font-semibold rounded-xl text-white bg-slate-900 hover:bg-slate-800 transition-colors flex items-center justify-center gap-1"
                >
                  <span>Verify Report</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: AI TRIAGE & CONFIRMATION */}
          {step === 'triage' && (
            <motion.div
              key="triage-step"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              className="space-y-5"
            >
              {triageLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                  {/* High Tech scanning animation */}
                  <div className="relative w-28 h-28 border border-emerald-500/20 rounded-2xl overflow-hidden flex items-center justify-center bg-slate-950">
                    <img 
                      src={photoBase64} 
                      alt="Triage scanning" 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover opacity-60"
                    />
                    {/* The scanning line */}
                    <div className="absolute left-0 right-0 h-1 bg-emerald-400 shadow-[0_0_15px_#10b981] animate-bounce" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-800 flex items-center justify-center gap-1.5">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                      Gemini Civic Engine Triaging...
                    </p>
                    <p className="text-xs text-slate-400 max-w-xs">
                      Analyzing photo context, hazard severity, and generating an objective summary report.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* AI Warning notice if simulated */}
                  {isSimulated && (
                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-[11px] text-amber-800 flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                      <div>
                        <span className="font-bold">Offline Simulation:</span> Gemini API is currently utilizing robust local heuristic simulation to process your issue. All structured fields are customizable below.
                      </div>
                    </div>
                  )}

                  {triageError && (
                    <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-[11px] text-rose-800 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Triage Notice:</span> {triageError}
                      </div>
                    </div>
                  )}

                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <Sparkles className="w-4 h-4 shrink-0" />
                      <span className="text-xs font-display font-bold tracking-wide uppercase">AI Triage Classification</span>
                    </div>

                    {/* Category Selection */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Issue Category
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {['Pothole', 'Water Leak', 'Streetlight', 'Garbage/Waste', 'Drainage', 'Road Damage', 'Public Safety', 'Other'].map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setCategory(cat as IssueCategory)}
                            className={`px-3 py-2 text-left text-xs rounded-xl font-medium border transition-all ${
                              category === cat 
                                ? 'bg-slate-900 border-slate-900 text-white font-semibold' 
                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Severity Selection */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Assessed Severity
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {['Low', 'Medium', 'High'].map((sev) => {
                          const isSel = severity === sev;
                          const colorClass = 
                            sev === 'Low' ? 'border-emerald-200 text-emerald-700 bg-emerald-50/50' :
                            sev === 'Medium' ? 'border-amber-200 text-amber-700 bg-amber-50/50' :
                            'border-rose-200 text-rose-700 bg-rose-50/50';
                          
                          const activeClass = 
                            sev === 'Low' ? 'bg-emerald-600 border-emerald-600 text-white' :
                            sev === 'Medium' ? 'bg-amber-600 border-amber-600 text-white' :
                            'bg-rose-600 border-rose-600 text-white';

                          return (
                            <button
                              key={sev}
                              type="button"
                              onClick={() => setSeverity(sev as IssueSeverity)}
                              className={`py-2 px-3 text-center text-xs rounded-xl font-semibold border transition-all ${
                                isSel ? activeClass : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                              }`}
                            >
                              {sev}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Structured AI Summary description */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        AI One-Line Summary
                      </label>
                      <input
                        type="text"
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        placeholder="Concise issue summary description"
                        className="w-full text-xs font-semibold border border-slate-200 bg-white rounded-xl px-3 py-2.5 focus:outline-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => setStep('location')}
                      className="flex-1 py-3 px-4 font-display font-semibold rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>
                    <button
                      type="button"
                      disabled={submitting || !summary.trim()}
                      onClick={handleSubmitReport}
                      className="flex-1 py-3 px-4 font-display font-semibold rounded-xl text-white bg-emerald-600 hover:bg-emerald-500 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Publishing...</span>
                        </>
                      ) : (
                        <>
                          <span>File Official Report</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 4: SUCCESS OVERVIEW */}
          {step === 'success' && (
            <motion.div
              key="success-step"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8 space-y-6"
            >
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-display font-extrabold text-slate-900 tracking-tight">Report Published Successfully!</h3>
                <p className="text-slate-500 text-xs max-w-sm mx-auto leading-relaxed">
                  Your civic report was saved to the community Firestore catalog. Our local authorities have been pinged of the issue.
                </p>
              </div>

              {/* Reward feedback widget */}
              <div className="max-w-xs mx-auto p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shrink-0">
                  <Gift className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-900">Good Citizen Points +20</h4>
                  <p className="text-[10px] text-emerald-700">Thank you for making our streets safer.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  // Reset form fields
                  setPhotoBase64('');
                  setVideoBase64('');
                  setUserNote('');
                  setSummary('');
                  setStep('media');
                  onSuccess();
                }}
                className="w-full py-3 px-4 font-display font-semibold rounded-xl text-white bg-slate-900 hover:bg-slate-800 transition-colors"
              >
                Return to Community Dashboard
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
