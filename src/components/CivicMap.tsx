import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { CivicIssue, IssueCategory } from '../types';
import { MapPin, Navigation, Info, AlertTriangle, Layers, ZoomIn, ZoomOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CivicMapProps {
  onSelectIssue?: (issue: CivicIssue) => void;
  selectedIssueId?: string | null;
  interactive?: boolean; // If true, allows dropping/dragging a pin to select coordinates
  initialCoords?: { lat: number; lng: number };
  onCoordsChange?: (coords: { lat: number; lng: number; address: string }) => void;
  heightClass?: string;
}

// Fixed bounds for our high-fidelity virtual local neighborhood "Metro District"
// Base center: Latitude 37.7749, Longitude -122.4194 (San Francisco-esque coordinates)
const CENTER_LAT = 37.7749;
const CENTER_LNG = -122.4194;
const LAT_SPAN = 0.04;
const LNG_SPAN = 0.06;

export const CivicMap: React.FC<CivicMapProps> = ({
  onSelectIssue,
  selectedIssueId,
  interactive = false,
  initialCoords,
  onCoordsChange,
  heightClass = 'h-[400px]'
}) => {
  const { issues } = useApp();
  
  // Current coordinates (either user reported location, selected issue, or center)
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>(
    initialCoords || { lat: CENTER_LAT, lng: CENTER_LNG }
  );

  // Address lookup state
  const [address, setAddress] = useState('Metro District Center');

  // Zoom level state (virtual)
  const [zoom, setZoom] = useState(14);

  // For interactive dragging / positioning of reporter pin
  const [draggingPin, setDraggingPin] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Filter issues in current map bounds (virtual check)
  const [selectedPin, setSelectedPin] = useState<CivicIssue | null>(null);

  useEffect(() => {
    if (initialCoords) {
      setCurrentCoords(initialCoords);
      updateAddress(initialCoords.lat, initialCoords.lng);
    }
  }, [initialCoords]);

  useEffect(() => {
    if (selectedIssueId) {
      const matched = issues.find(i => i.id === selectedIssueId);
      if (matched) {
        setCurrentCoords({ lat: matched.latitude, lng: matched.longitude });
        setSelectedPin(matched);
      }
    }
  }, [selectedIssueId, issues]);

  // Helper to generate a realistic sounding local neighborhood address based on lat/lng
  const updateAddress = (lat: number, lng: number) => {
    const latOffset = Math.abs(lat - CENTER_LAT) * 1000;
    const lngOffset = Math.abs(lng - CENTER_LNG) * 1000;
    const blockNum = Math.floor((latOffset + lngOffset) * 12) + 100;
    
    const streets = [
      'Oak Boulevard', 'Pine Street', 'Broadway Avenue', 'Eldridge Expressway', 
      'Cedar Lane', 'Mission District Road', 'Valencia Street', 'Market Street',
      'Emerald Parkway', 'Franklin Street', 'Marina Boulevard', 'Lakeside Drive'
    ];
    
    const street = streets[Math.floor((latOffset * 3 + lngOffset * 7) % streets.length)];
    const calculatedAddress = `${blockNum} ${street}, Metro District`;
    setAddress(calculatedAddress);
    return calculatedAddress;
  };

  // Convert lat/lng to percentage coordinates on our 100x100 grid map
  const getXYFromLatLng = (lat: number, lng: number) => {
    // Center-normalize and scale
    const x = 50 + ((lng - CENTER_LNG) / LNG_SPAN) * 100;
    const y = 50 - ((lat - CENTER_LAT) / LAT_SPAN) * 100; // Invert Y for screen coordinates
    
    // Clamp to ensure it stays in bounds [5, 95] so pins aren't cut off at edges
    const clamp = (val: number) => Math.max(5, Math.min(95, val));
    return { x: clamp(x), y: clamp(y) };
  };

  // Convert screen percentage coordinates back to virtual lat/lng
  const getLatLngFromXY = (pctX: number, pctY: number) => {
    const lng = CENTER_LNG + ((pctX - 50) / 100) * LNG_SPAN;
    const lat = CENTER_LAT - ((pctY - 50) / 100) * LAT_SPAN;
    return { lat, lng };
  };

  // Category Color Map helper
  const getCategoryTheme = (category: IssueCategory) => {
    switch (category) {
      case 'Pothole':
        return { color: 'bg-amber-500', border: 'border-amber-400', text: 'text-amber-500', hex: '#f59e0b' };
      case 'Water Leak':
        return { color: 'bg-blue-500', border: 'border-blue-400', text: 'text-blue-500', hex: '#3b82f6' };
      case 'Streetlight':
        return { color: 'bg-emerald-500', border: 'border-emerald-400', text: 'text-emerald-500', hex: '#10b981' };
      case 'Garbage/Waste':
        return { color: 'bg-orange-500', border: 'border-orange-400', text: 'text-orange-500', hex: '#f97316' };
      case 'Drainage':
        return { color: 'bg-indigo-500', border: 'border-indigo-400', text: 'text-indigo-500', hex: '#6366f1' };
      case 'Road Damage':
        return { color: 'bg-red-500', border: 'border-red-400', text: 'text-red-500', hex: '#ef4444' };
      case 'Public Safety':
        return { color: 'bg-fuchsia-500', border: 'border-fuchsia-400', text: 'text-fuchsia-500', hex: '#d946ef' };
      default:
        return { color: 'bg-slate-500', border: 'border-slate-400', text: 'text-slate-500', hex: '#64748b' };
    }
  };

  // Handle click on map container to reposition target reporter pin
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !mapContainerRef.current) return;

    const rect = mapContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const coords = getLatLngFromXY(x, y);
    setCurrentCoords(coords);
    const resolvedAddress = updateAddress(coords.lat, coords.lng);

    if (onCoordsChange) {
      onCoordsChange({
        lat: coords.lat,
        lng: coords.lng,
        address: resolvedAddress
      });
    }
  };

  // Handle GPS Locate Me action
  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // In real devices, this is real lat/lng. 
          // If real coords are far from our "Metro District" simulator, let's keep them proportional or map them smoothly.
          const realLat = position.coords.latitude;
          const realLng = position.coords.longitude;
          
          // Seed local coordinates
          const simLat = CENTER_LAT + (Math.random() - 0.5) * 0.02;
          const simLng = CENTER_LNG + (Math.random() - 0.5) * 0.02;
          
          setCurrentCoords({ lat: simLat, lng: simLng });
          const resAddress = updateAddress(simLat, simLng);
          
          if (onCoordsChange) {
            onCoordsChange({ lat: simLat, lng: simLng, address: resAddress });
          }
        },
        (error) => {
          console.warn("Geolocation permission error, using random local seed:", error);
          const simLat = CENTER_LAT + (Math.random() - 0.5) * 0.015;
          const simLng = CENTER_LNG + (Math.random() - 0.5) * 0.015;
          setCurrentCoords({ lat: simLat, lng: simLng });
          const resAddress = updateAddress(simLat, simLng);
          if (onCoordsChange) {
            onCoordsChange({ lat: simLat, lng: simLng, address: resAddress });
          }
        }
      );
    }
  };

  return (
    <div className="relative flex flex-col w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-xl">
      {/* Map Control Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800 text-white border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-display font-semibold tracking-wide uppercase">Metro Civic Tactical Grid</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={() => setZoom(z => Math.min(18, z + 1))}
            className="p-1 rounded hover:bg-slate-700 text-slate-300 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button 
            type="button"
            onClick={() => setZoom(z => Math.max(12, z - 1))}
            className="p-1 rounded hover:bg-slate-700 text-slate-300 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleLocateMe}
            className="flex items-center gap-1.5 px-2 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 font-medium rounded-lg text-white transition-colors"
          >
            <Navigation className="w-3.5 h-3.5 fill-current" />
            <span>Locate GPS</span>
          </button>
        </div>
      </div>

      {/* Map Canvas Frame */}
      <div 
        ref={mapContainerRef}
        onClick={handleMapClick}
        className={`relative w-full ${heightClass} bg-[#1a2333] overflow-hidden cursor-crosshair select-none`}
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1.5px, transparent 1.5px)',
          backgroundSize: '24px 24px',
        }}
      >
        {/* Virtual Neighborhood Roads & Landmarks (SVG Vector Render) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
          {/* Main Diagonal Roads */}
          <line x1="0" y1="20%" x2="100%" y2="80%" stroke="#475569" strokeWidth="4" strokeDasharray="4 6" />
          <line x1="20%" y1="0" x2="80%" y2="100%" stroke="#475569" strokeWidth="3" />
          <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#334155" strokeWidth="6" />
          <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#334155" strokeWidth="6" />
          
          {/* Circular River/Greenway accent */}
          <circle cx="50%" cy="50%" r="35%" fill="none" stroke="#0284c7" strokeWidth="2" strokeDasharray="2 12" />
          <circle cx="50%" cy="50%" r="18%" fill="none" stroke="#10b981" strokeWidth="1" strokeDasharray="1 8" />

          {/* Landmarks */}
          <text x="52%" y="15%" fill="#94a3b8" fontSize="10" className="font-mono tracking-widest opacity-80 uppercase">North Plaza</text>
          <text x="52%" y="85%" fill="#94a3b8" fontSize="10" className="font-mono tracking-widest opacity-80 uppercase">District South</text>
          <text x="12%" y="45%" fill="#94a3b8" fontSize="10" className="font-mono tracking-widest opacity-80 uppercase">Residential West</text>
          <text x="75%" y="45%" fill="#94a3b8" fontSize="10" className="font-mono tracking-widest opacity-80 uppercase">Tech Hub East</text>
        </svg>

        {/* Existing Issues Pins on Map */}
        {!interactive && issues.map((issue) => {
          const { x, y } = getXYFromLatLng(issue.latitude, issue.longitude);
          const isSelected = selectedPin?.id === issue.id;
          const theme = getCategoryTheme(issue.category);

          return (
            <div
              key={issue.id}
              className="absolute pointer-events-auto transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 group"
              style={{ left: `${x}%`, top: `${y}%` }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPin(issue);
                if (onSelectIssue) onSelectIssue(issue);
              }}
            >
              {/* Radial Glowing Pulse */}
              <div className={`absolute -inset-2.5 rounded-full ${theme.color} opacity-20 animate-ping pointer-events-none duration-1000`} />
              
              {/* Custom Marker Pin */}
              <div className={`relative flex items-center justify-center w-7 h-7 rounded-full ${theme.color} border-2 border-white shadow-lg text-white hover:scale-115 transition-transform duration-200`}>
                <MapPin className="w-4 h-4 fill-current" />
              </div>

              {/* Quick-tooltip name */}
              <div className="absolute top-8 left-1/2 transform -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-[10px] text-slate-100 px-1.5 py-0.5 rounded font-medium whitespace-nowrap border border-slate-700 z-30 shadow-md">
                {issue.category}
              </div>
            </div>
          );
        })}

        {/* DRAGGABLE / SELECTABLE REPORTING PIN (Only when Interactive) */}
        {interactive && (
          <div
            className="absolute transform -translate-x-1/2 -translate-y-[90%] z-40 pointer-events-none"
            style={{ 
              left: `${getXYFromLatLng(currentCoords.lat, currentCoords.lng).x}%`, 
              top: `${getXYFromLatLng(currentCoords.lat, currentCoords.lng).y}%` 
            }}
          >
            {/* Concentric ripple */}
            <div className="absolute -left-4 -bottom-4 w-12 h-12 rounded-full border-2 border-emerald-400 bg-emerald-500/10 animate-pulse pointer-events-none" />
            
            {/* The reporter pin indicator */}
            <div className="relative flex flex-col items-center">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500 border-2 border-white shadow-2xl text-white">
                <Navigation className="w-5 h-5 fill-current rotate-45 transform" />
              </div>
              <div className="w-3 h-3 bg-emerald-500 transform rotate-45 -mt-1.5 border-r border-b border-white" />
            </div>
          </div>
        )}

        {/* Floating selected issue micro-card */}
        <AnimatePresence>
          {!interactive && selectedPin && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="absolute bottom-4 left-4 right-4 bg-slate-900/95 backdrop-blur-md border border-slate-700 p-3 rounded-xl shadow-2xl z-30 flex gap-3 text-white pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {selectedPin.photoUrl && (
                <img 
                  src={selectedPin.photoUrl} 
                  alt={selectedPin.category} 
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 object-cover rounded-lg border border-slate-700 bg-slate-800 shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${getCategoryTheme(selectedPin.category).color} text-white`}>
                    {selectedPin.category}
                  </span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border border-slate-700 text-slate-300`}>
                    {selectedPin.severity} Severity
                  </span>
                  <span className="text-[10px] ml-auto text-slate-400 font-mono">
                    {selectedPin.status}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-100 truncate">{selectedPin.summary}</p>
                <p className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3 shrink-0 text-slate-500" />
                  {selectedPin.address}
                </p>
                
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPin(null)}
                    className="px-2 py-0.5 text-[10px] font-medium text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onSelectIssue) onSelectIssue(selectedPin);
                    }}
                    className="px-3 py-1 text-[10px] font-medium bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Map Footer Bar with current selected address details */}
      <div className="bg-slate-950 p-3 text-slate-300 text-xs flex items-center gap-2">
        <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-slate-100 truncate">{address}</p>
          <p className="text-[10px] text-slate-500 font-mono">
            Lat: {currentCoords.lat.toFixed(5)} | Lng: {currentCoords.lng.toFixed(5)}
          </p>
        </div>
        {interactive && (
          <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-1 rounded font-medium border border-slate-700 animate-pulse">
            Tap map to pin location
          </span>
        )}
      </div>
    </div>
  );
};
