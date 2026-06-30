import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import type { MapMouseEvent } from '@vis.gl/react-google-maps';
import { useApp } from '../context/AppContext';
import { CivicIssue, IssueCategory } from '../types';
import { MapPin, Navigation, Layers, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CivicMapProps {
  onSelectIssue?: (issue: CivicIssue) => void;
  selectedIssueId?: string | null;
  interactive?: boolean;
  initialCoords?: { lat: number; lng: number };
  onCoordsChange?: (coords: { lat: number; lng: number; address: string }) => void;
  heightClass?: string;
}

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 };
const DEFAULT_ZOOM = 14;

function getCategoryBg(category: IssueCategory): string {
  switch (category) {
    case 'Pothole': return 'bg-amber-500';
    case 'Water Leak': return 'bg-blue-500';
    case 'Streetlight': return 'bg-emerald-500';
    case 'Garbage/Waste': return 'bg-orange-500';
    case 'Drainage': return 'bg-indigo-500';
    case 'Road Damage': return 'bg-red-500';
    case 'Public Safety': return 'bg-fuchsia-500';
    default: return 'bg-slate-500';
  }
}

function MapKeyFallback({ heightClass = 'h-[400px]' }: { heightClass?: string }) {
  return (
    <div className="relative flex flex-col w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-xl">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white border-b border-slate-700">
        <Layers className="w-4 h-4 text-emerald-400" />
        <span className="text-xs font-display font-semibold tracking-wide uppercase">Civic Map</span>
      </div>
      <div className={`flex items-center justify-center ${heightClass} bg-slate-950`}>
        <div className="text-center space-y-3 px-6">
          <AlertCircle className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-slate-400 text-sm font-medium">Map unavailable</p>
          <p className="text-slate-600 text-xs">
            Set <code className="bg-slate-800 px-1 rounded text-slate-400">VITE_GOOGLE_MAPS_API_KEY</code> to enable live maps.
          </p>
        </div>
      </div>
    </div>
  );
}

// Must render inside <Map> to access the map instance for programmatic panning
function MapController({ target }: { target: { lat: number; lng: number } | null }) {
  const map = useMap();
  const prev = useRef<typeof target>(null);

  useEffect(() => {
    if (!map || !target) return;
    if (prev.current?.lat === target.lat && prev.current?.lng === target.lng) return;
    prev.current = target;
    map.panTo(target);
  }, [map, target]);

  return null;
}

function CivicMapInner({
  onSelectIssue,
  selectedIssueId,
  interactive = false,
  initialCoords,
  onCoordsChange,
  heightClass = 'h-[400px]',
}: CivicMapProps) {
  const { issues } = useApp();
  const geocodingLib = useMapsLibrary('geocoding');

  const geocoder = useMemo(
    () => (geocodingLib ? new geocodingLib.Geocoder() : null),
    [geocodingLib],
  );

  const [currentCoords, setCurrentCoords] = useState(initialCoords ?? DEFAULT_CENTER);
  const [address, setAddress] = useState('');
  const [selectedPin, setSelectedPin] = useState<CivicIssue | null>(null);
  const [panTarget, setPanTarget] = useState<{ lat: number; lng: number } | null>(null);

  const reverseGeocode = useCallback(
    async (lat: number, lng: number): Promise<string> => {
      if (!geocoder) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      try {
        const { results } = await geocoder.geocode({ location: { lat, lng } });
        if (results[0]) return results[0].formatted_address;
      } catch {
        // fall through to coord string
      }
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    },
    [geocoder],
  );

  useEffect(() => {
    if (!initialCoords) return;
    setCurrentCoords(initialCoords);
    setPanTarget(initialCoords);
    void reverseGeocode(initialCoords.lat, initialCoords.lng).then(setAddress);
  }, [initialCoords, reverseGeocode]);

  useEffect(() => {
    if (!selectedIssueId) return;
    const matched = issues.find(i => i.id === selectedIssueId);
    if (!matched) return;
    setSelectedPin(matched);
    setPanTarget({ lat: matched.latitude, lng: matched.longitude });
  }, [selectedIssueId, issues]);

  const handleMapClick = useCallback(
    (e: MapMouseEvent) => {
      if (!interactive || !e.detail.latLng) return;
      const { lat, lng } = e.detail.latLng;
      setCurrentCoords({ lat, lng });
      void reverseGeocode(lat, lng).then(addr => {
        setAddress(addr);
        onCoordsChange?.({ lat, lng, address: addr });
      });
    },
    [interactive, onCoordsChange, reverseGeocode],
  );

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setCurrentCoords({ lat, lng });
      setPanTarget({ lat, lng });
      void reverseGeocode(lat, lng).then(addr => {
        setAddress(addr);
        if (interactive) onCoordsChange?.({ lat, lng, address: addr });
      });
    });
  }, [interactive, onCoordsChange, reverseGeocode]);

  const handleDragEnd = useCallback(
    (e: google.maps.MapMouseEvent) => {
      const lat = e.latLng?.lat();
      const lng = e.latLng?.lng();
      if (lat == null || lng == null) return;
      setCurrentCoords({ lat, lng });
      void reverseGeocode(lat, lng).then(addr => {
        setAddress(addr);
        onCoordsChange?.({ lat, lng, address: addr });
      });
    },
    [onCoordsChange, reverseGeocode],
  );

  return (
    <div className="relative flex flex-col w-full rounded-2xl overflow-hidden border border-slate-200 shadow-xl">
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800 text-white border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-display font-semibold tracking-wide uppercase">Civic Map</span>
        </div>
        <button
          type="button"
          onClick={handleLocateMe}
          className="flex items-center gap-1.5 px-2 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 font-medium rounded-lg text-white transition-colors"
        >
          <Navigation className="w-3.5 h-3.5 fill-current" />
          <span>Locate GPS</span>
        </button>
      </div>

      <div className={`relative w-full ${heightClass}`}>
        <Map
          style={{ width: '100%', height: '100%' }}
          mapId="DEMO_MAP_ID"
          defaultCenter={initialCoords ?? DEFAULT_CENTER}
          defaultZoom={DEFAULT_ZOOM}
          onClick={handleMapClick}
          gestureHandling="greedy"
          disableDefaultUI={false}
        >
          <MapController target={panTarget} />

          {!interactive &&
            issues.map(issue => (
              <AdvancedMarker
                key={issue.id}
                position={{ lat: issue.latitude, lng: issue.longitude }}
                onClick={() => {
                  setSelectedPin(issue);
                  onSelectIssue?.(issue);
                }}
              >
                <div
                  className={`
                    flex items-center justify-center w-8 h-8 rounded-full cursor-pointer
                    ${getCategoryBg(issue.category)} border-2 border-white shadow-lg text-white
                    transition-transform hover:scale-110
                    ${selectedPin?.id === issue.id ? 'scale-125 ring-2 ring-offset-1 ring-white' : ''}
                  `}
                >
                  <MapPin className="w-4 h-4 fill-current" />
                </div>
              </AdvancedMarker>
            ))}

          {interactive && (
            <AdvancedMarker
              position={currentCoords}
              draggable
              onDragEnd={handleDragEnd}
            >
              <div className="flex flex-col items-center drop-shadow-xl">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500 border-2 border-white shadow-xl text-white">
                  <Navigation className="w-5 h-5 fill-current rotate-45" />
                </div>
                <div className="w-3 h-3 bg-emerald-500 rotate-45 -mt-1.5 shadow-md" />
              </div>
            </AdvancedMarker>
          )}

          <AnimatePresence>
            {!interactive && selectedPin && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="absolute bottom-4 left-4 right-4 bg-slate-900/95 backdrop-blur-md border border-slate-700 p-3 rounded-xl shadow-2xl z-30 flex gap-3 text-white pointer-events-auto"
                onClick={e => e.stopPropagation()}
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
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${getCategoryBg(selectedPin.category)} text-white`}>
                      {selectedPin.category}
                    </span>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-slate-700 text-slate-300">
                      {selectedPin.severity} Severity
                    </span>
                    <span className="text-[10px] ml-auto text-slate-400 font-mono">{selectedPin.status}</span>
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
                      onClick={() => onSelectIssue?.(selectedPin)}
                      className="px-3 py-1 text-[10px] font-medium bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Map>
      </div>

      <div className="bg-slate-950 p-3 text-slate-300 text-xs flex items-center gap-2">
        <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-slate-100 truncate">
            {address || (interactive ? 'Tap map or drag pin to set location' : 'Select an issue to see details')}
          </p>
          <p className="text-[10px] text-slate-500 font-mono">
            Lat: {currentCoords.lat.toFixed(5)} | Lng: {currentCoords.lng.toFixed(5)}
          </p>
        </div>
        {interactive && (
          <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-1 rounded font-medium border border-slate-700 animate-pulse">
            Drag pin to move
          </span>
        )}
      </div>
    </div>
  );
}

export const CivicMap = (props: CivicMapProps) => {
  if (!MAPS_KEY) return <MapKeyFallback heightClass={props.heightClass} />;
  return (
    <APIProvider apiKey={MAPS_KEY}>
      <CivicMapInner {...props} />
    </APIProvider>
  );
};
