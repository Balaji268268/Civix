import React, { useState, useEffect, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  Layers,
  Filter,
  ArrowLeft,
  Search,
  ThumbsUp,
  MapPin,
  RefreshCw,
  ExternalLink,
  Flame,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import StatusBadge from "../components/ui/StatusBadge";
import Button from "../components/ui/Button";
import Drawer from "../components/ui/Drawer";
import Card from "../components/ui/Card";
import Select from "../components/ui/Select";
import { PUBLIC_CATEGORIES, getCategoryMeta } from "../constants/categories";
import io from "socket.io-client";
import API_BASE_URL from "../config";
import csrfManager from "../utils/csrfManager";

// Color mapping for SVG pins based on status tokens
const STATUS_PIN_COLORS = {
  'Received': '#d97706',
  'Pending': '#d97706',
  'Assigned': '#4f46e5',
  'In Progress': '#0284c7',
  'Pending Review': '#0d9488',
  'Resolved': '#16a34a',
  'Closed': '#64748b',
  'Rejected': '#6b7280',
  'Spam': '#a855f7'
};

// Create custom SVG marker
const createSvgPin = (status = 'Pending', isMine = false) => {
  const color = STATUS_PIN_COLORS[status] || '#d97706';
  const size = isMine ? 36 : 28;
  const strokeColor = isMine ? '#2563eb' : '#ffffff';
  const strokeWidth = isMine ? 3 : 2;

  const svgHtml = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" width="${size}" height="${size * 1.33}" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); cursor: pointer;">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20s12-11 12-20c0-6.627-5.373-12-12-12z" fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
      <circle cx="12" cy="11" r="4.5" fill="#ffffff" />
    </svg>
  `;

  return L.divIcon({
    html: svgHtml,
    className: "custom-svg-pin",
    iconSize: [size, size * 1.33],
    iconAnchor: [size / 2, size * 1.33],
    popupAnchor: [0, -size * 1.33]
  });
};

// Map Viewport Event Listener
function MapViewportTracker({ onViewportChange }) {
  const map = useMapEvents({
    moveend: () => {
      const bounds = map.getBounds();
      const bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;
      onViewportChange(bbox);
    }
  });
  return null;
}

export default function UserMap() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [isHeatmapActive, setIsHeatmapActive] = useState(false);
  const [currentBbox, setCurrentBbox] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const socketRef = useRef(null);

  // Check Dark Mode
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setIsDarkMode(isDark);
  }, []);

  // Fetch Issues from Server-Side Bbox Endpoint
  const fetchMapIssues = useCallback(async (bbox = currentBbox) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (bbox) params.append("bbox", bbox);
      if (statusFilter !== "All") params.append("status", statusFilter);
      if (categoryFilter !== "All") params.append("category", categoryFilter);
      if (user?.primaryEmailAddress?.emailAddress) {
        params.append("userEmail", user.primaryEmailAddress.emailAddress);
      }

      const res = await csrfManager.secureFetch(`/api/v1/map/issues?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setIssues(data.issues || []);
      }
    } catch (err) {
      console.error("[UserMap] Failed to fetch map issues:", err);
    } finally {
      setLoading(false);
    }
  }, [currentBbox, statusFilter, categoryFilter, user]);

  // Initial Fetch & Realtime Socket Setup
  useEffect(() => {
    fetchMapIssues();

    // Socket.io Real-time Bus
    const socket = io(API_BASE_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnectionAttempts: 5
    });
    socketRef.current = socket;

    socket.on("issue:status", (event) => {
      setIssues(prev => prev.map(iss => {
        if (iss.id === event.issueId || iss.complaintId === event.complaintId) {
          return { ...iss, status: event.status, closeReason: event.closeReason || iss.closeReason };
        }
        return iss;
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchMapIssues]);

  const handleViewportChange = (bbox) => {
    setCurrentBbox(bbox);
    fetchMapIssues(bbox);
  };

  const statusOptions = [
    { value: "All", label: "All Statuses" },
    { value: "Received", label: "Received" },
    { value: "Assigned", label: "Assigned" },
    { value: "In Progress", label: "In Progress" },
    { value: "Pending Review", label: "Pending Review" },
    { value: "Resolved", label: "Resolved" },
    { value: "Rejected", label: "Rejected" },
    { value: "Closed", label: "Closed" }
  ];

  const categoryOptions = [
    { value: "All", label: "All Categories" },
    ...PUBLIC_CATEGORIES.map(c => ({ value: c.id, label: c.label }))
  ];

  const tileUrl = isDarkMode
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  return (
    <div className="relative w-full h-[calc(100vh-64px)] overflow-hidden bg-slate-100 dark:bg-slate-900 font-sans">
      
      {/* Floating Control Bar */}
      <div className="absolute top-4 left-4 right-4 z-[400] flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        
        {/* Left: Back & Filter Bar */}
        <div className="flex items-center gap-2 pointer-events-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 shadow-md">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/user/dashboard")}
            iconLeft={<ArrowLeft className="w-4 h-4" />}
            className="text-slate-700 dark:text-slate-200"
          >
            Dashboard
          </Button>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

          {/* Status Filter */}
          <div className="w-36 sm:w-44">
            <Select
              options={statusOptions}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1 text-xs"
            />
          </div>

          {/* Category Filter */}
          <div className="w-40 sm:w-48 hidden sm:block">
            <Select
              options={categoryOptions}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="py-1 text-xs"
            />
          </div>

          <button
            type="button"
            onClick={() => fetchMapIssues()}
            disabled={loading}
            className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            title="Refresh issues in view"
            aria-label="Refresh map"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-600' : ''}`} />
          </button>
        </div>

        {/* Right: Legend & Layer Toggles */}
        <div className="flex items-center gap-2 pointer-events-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 shadow-md text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {issues.length} {issues.length === 1 ? 'Report' : 'Reports'}
          </span>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
          <button
            type="button"
            onClick={() => setIsHeatmapActive(!isHeatmapActive)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded font-medium transition-colors ${
              isHeatmapActive
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Density Heat</span>
          </button>
        </div>
      </div>

      {/* Leaflet Map Engine */}
      <MapContainer
        center={[16.5062, 80.6480]}
        zoom={13}
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> & <a href="https://openstreetmap.org">OSM</a>'
          url={tileUrl}
        />

        <MapViewportTracker onViewportChange={handleViewportChange} />

        {/* Map Markers */}
        {issues.map((issue) => (
          <Marker
            key={issue.id}
            position={[issue.lat, issue.lng]}
            icon={createSvgPin(issue.status, issue.isMine)}
            eventHandlers={{
              click: () => setSelectedIssue(issue)
            }}
          />
        ))}
      </MapContainer>

      {/* Status Legend Overlay (Bottom Left) */}
      <div className="absolute bottom-6 left-4 z-[400] bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 shadow-lg flex flex-wrap gap-3 text-[11px] font-medium text-slate-700 dark:text-slate-300 pointer-events-auto">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>Pending</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
          <span>In Progress</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Resolved</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
          <span>Rejected / Closed</span>
        </div>
      </div>

      {/* Side Slide-Over Inspection Drawer */}
      <Drawer
        isOpen={!!selectedIssue}
        onClose={() => setSelectedIssue(null)}
        title={selectedIssue?.title}
        subtitle={`Complaint ID: ${selectedIssue?.complaintId}`}
        footer={
          <div className="w-full flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {selectedIssue?.createdAt ? new Date(selectedIssue.createdAt).toLocaleDateString() : ''}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedIssue(null)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(`/user/issue/${selectedIssue?.id}`)}
                iconRight={<ExternalLink className="w-3.5 h-3.5" />}
              >
                Full Details
              </Button>
            </div>
          </div>
        }
      >
        {selectedIssue && (
          <div className="space-y-4">
            {/* Status & Category */}
            <div className="flex items-center justify-between">
              <StatusBadge
                status={selectedIssue.status}
                size="md"
                reasonCode={selectedIssue.closeReason}
              />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded">
                {getCategoryMeta(selectedIssue.category)?.label || selectedIssue.category}
              </span>
            </div>

            {/* Rejection / Status Reason notice */}
            {selectedIssue.status === 'Rejected' && (
              <div className="p-3 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                <span className="font-semibold block mb-0.5">Rejection Reason:</span>
                <span>{selectedIssue.closeReason ? `Code: ${selectedIssue.closeReason}` : 'Report did not meet municipal action criteria.'}</span>
              </div>
            )}

            {/* Coordinates & Proximity */}
            <Card padding="tight" className="text-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-teal-600" />
                  <span>Coordinates</span>
                </span>
                <span className="font-mono">{selectedIssue.lat.toFixed(5)}, {selectedIssue.lng.toFixed(5)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span>Priority</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedIssue.priority || 'Medium'}</span>
              </div>
            </Card>

            {/* Confirmation & Upvote CTA */}
            <div className="p-3.5 rounded-lg border border-teal-200 dark:border-teal-900 bg-teal-50/50 dark:bg-teal-950/30">
              <h4 className="text-xs font-bold text-teal-900 dark:text-teal-200 mb-1">
                Affected by this issue too?
              </h4>
              <p className="text-[11px] text-teal-700 dark:text-teal-400 mb-3">
                Confirm this existing report to increase priority rather than filing a duplicate.
              </p>
              <Button
                variant="primary"
                size="sm"
                block
                iconLeft={<ThumbsUp className="w-3.5 h-3.5" />}
                onClick={() => {
                  csrfManager.secureFetch(`/api/issues/${selectedIssue.id}/upvote`, { method: 'POST' }).catch(() => {});
                  setSelectedIssue(prev => prev ? { ...prev, upvoted: true } : null);
                }}
              >
                Confirm This Issue
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}