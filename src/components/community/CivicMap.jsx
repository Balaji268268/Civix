import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import L from 'leaflet';

// Fix Leaflet Default Icon Issue in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const CivicMap = ({ issues = [] }) => {
    // Default Center: Bangalore? Or calculated from issues.
    // Let's default to a generic city center or the first issue's location.
    const [center, setCenter] = useState([12.9716, 77.5946]); // Bangalore
    const [mapIssues, setMapIssues] = useState(issues);

    useEffect(() => {
        // If issues provided via props, use them
        if (issues.length > 0) {
            setMapIssues(issues);
        } else {
            // Fetch if not provided (Standalone Mode)
            const fetchIssues = async () => {
                try {
                    // We need a public endpoint or secure with token if available. 
                    // Assuming public read for map is okay or using csrfManager if we had context.
                    // For now, let's try a safe fetch if we are in component context.
                    // Ideally pass down from parent, but for standalone map page support:
                    // This file might not have auth context easily without hook.
                } catch (e) {
                    console.error("Map fetch error", e);
                }
            };
            // fetchIssues(); 
            // Actually, best to rely on parent. But if parent passes empty array initially and then loads, we update.
        }
    }, [issues]);

    useEffect(() => {
        if (mapIssues.length > 0) {
            const validIssues = mapIssues.filter(i => i.coordinates && i.coordinates.lat);
            if (validIssues.length > 0) {
                setCenter([validIssues[0].coordinates.lat, validIssues[0].coordinates.lng]);
            }
        }
    }, [mapIssues]);

    return (
        <div className="w-full h-[400px] rounded-2xl overflow-hidden shadow-lg border border-emerald-100 dark:border-gray-700 relative z-0">
            {/* z-0 important for Leaflet */}
            <MapContainer center={center} zoom={13} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />

                {issues.map((issue) => (
                    issue.coordinates?.lat && (
                        <Marker
                            key={issue._id}
                            position={[issue.coordinates.lat, issue.coordinates.lng]}
                        >
                            <Popup>
                                <div className="min-w-[150px]">
                                    <h3 className="font-bold text-gray-800">{issue.title}</h3>
                                    <p className="text-xs text-gray-500">{issue.location}</p>
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase
                                            ${issue.status === 'Resolved' ? 'bg-green-100 text-green-700' :
                                                issue.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}
                                        `}>
                                            {issue.status}
                                        </span>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    )
                ))}
            </MapContainer>

            <div className="absolute bottom-4 right-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur px-3 py-2 rounded-lg shadow border border-gray-200 dark:border-gray-600 z-[400] text-xs">
                <p className="font-bold mb-1">Live Issue Tracker</p>
                <div className="flex items-center gap-2 text-yellow-600"><div className="w-2 h-2 rounded-full bg-yellow-400"></div> Pending</div>
                <div className="flex items-center gap-2 text-blue-600"><div className="w-2 h-2 rounded-full bg-blue-400"></div> In Progress</div>
                <div className="flex items-center gap-2 text-green-600"><div className="w-2 h-2 rounded-full bg-green-400"></div> Resolved</div>
            </div>
        </div>
    );
};

export default CivicMap;
