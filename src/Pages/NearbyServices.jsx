import React, { useState, useEffect, useRef } from "react";
import { Loader2, Navigation, Search, MapPin, Phone, Star } from "lucide-react";

export default function NearbyServices() {
  const [coords, setCoords] = useState(null);
  const [places, setPlaces] = useState([]);
  const [status, setStatus] = useState("idle");
  const [filter, setFilter] = useState("hospital");
  const [mapInstance, setMapInstance] = useState(null);
  const [markers, setMarkers] = useState([]);

  /* Ref for PlacesService Attributions (Hidden) to fix IntersectionObserver error */
  const placesRef = useRef(null);
  const mapRef = useRef(null);

  // 1. Get User Location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCoords(userPos);
        },
        (err) => {
          console.error(err);
          setStatus("error");
        }
      );
    } else {
      setStatus("error");
    }
  }, []);

  // 2. Initialize Map when Coords are ready & Google is loaded
  useEffect(() => {
    if (coords && !mapInstance && window.google && window.google.maps) {
      const map = new window.google.maps.Map(mapRef.current, {
        center: coords,
        zoom: 14,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
        ],
        disableDefaultUI: false,
        zoomControl: true,
      });

      // User Marker
      new window.google.maps.Marker({
        position: coords,
        map: map,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#4285F4",
          fillOpacity: 1,
          strokeColor: "white",
          strokeWeight: 2,
        },
        title: "You are here",
      });

      setMapInstance(map);
    }
  }, [coords, mapInstance]);

  // 3. Search Places when Filter/Map changes
  useEffect(() => {
    if (mapInstance && coords && placesRef.current && window.google && window.google.maps) {
      performSearch(filter);
    }
  }, [filter, mapInstance]);

  const performSearch = (type) => {
    setStatus("loading");
    // Use a dedicated div for attributions to avoid Map observer conflicts
    const service = new window.google.maps.places.PlacesService(placesRef.current);

    // Clear old markers
    markers.forEach(m => m.setMap(null));
    setMarkers([]);

    const request = {
      location: coords,
      radius: '5000', // 5km
      type: type
    };

    service.nearbySearch(request, (results, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK) {
        setPlaces(results);

        // Add Markers
        const newMarkers = results.map(place => {
          const marker = new window.google.maps.Marker({
            position: place.geometry.location,
            map: mapInstance,
            title: place.name,
            animation: window.google.maps.Animation.DROP
          });

          // Add info window on click
          const infoWindow = new window.google.maps.InfoWindow({
            content: `<div style="padding:5px"><strong>${place.name}</strong><br/>${place.vicinity}</div>`
          });

          marker.addListener("click", () => {
            infoWindow.open(mapInstance, marker);
          });

          return marker;
        });

        setMarkers(newMarkers);
        setStatus("success");
      } else {
        setPlaces([]);
        setStatus("success"); // Empty but success
      }
    });
  };

  const getIconColor = (type) => {
    switch (type) {
      case "hospital": return "text-red-500 bg-red-50 border-red-200";
      case "police": return "text-blue-500 bg-blue-50 border-blue-200";
      case "fire_station": return "text-orange-500 bg-orange-50 border-orange-200";
      default: return "text-gray-500 bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col relative overflow-hidden">
      {/* Search Bar / Header Floating */}
      <div className="absolute top-5 left-1/2 transform -translate-x-1/2 z-10 w-full max-w-2xl px-4">
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-2 flex flex-col sm:flex-row gap-2">

          {/* Filter Select */}
          <div className="flex-1 relative">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full h-12 pl-4 pr-10 rounded-xl bg-gray-100 dark:bg-gray-700 border-none font-semibold text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer"
            >
              <option value="hospital">🏥 Hospitals & Clinics</option>
              <option value="police">👮 Police Stations</option>
              <option value="fire_station">🔥 Fire Stations</option>
              <option value="pharmacy">💊 Pharmacies</option>
              <option value="supermarket">🛒 Supermarkets</option>
              <option value="gas_station">⛽ Gas Stations</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <Search className="w-5 h-5 text-gray-400" />
            </div>
          </div>

          <div className="flex items-center justify-center px-4 bg-green-100 dark:bg-green-900/30 rounded-xl text-green-700 dark:text-green-300 font-bold">
            {status === "loading" ? <Loader2 className="w-5 h-5 animate-spin" /> : `${places.length} Found`}
          </div>

        </div>
      </div>

      {/* Main Map Area */}
      <div className="flex-1 relative">
        {!coords && status !== "error" && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900 z-0">
            <div className="text-center animate-pulse">
              <Navigation className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-xl font-semibold text-gray-600">Locating you...</p>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-0">
            <div className="text-center max-w-md p-8 bg-white border border-red-100 rounded-3xl shadow-xl">
              <p className="text-red-500 font-bold text-xl mb-2">Location Access Denied</p>
              <p className="text-gray-500">Please enable location access to see nearby services.</p>
            </div>
          </div>
        )}

        {/* Hidden Attribution Container */}
        <div ref={placesRef} style={{ position: 'absolute', right: 0, bottom: 0, width: '100px', height: '20px', overflow: 'hidden', opacity: 0.01, pointerEvents: 'none', zIndex: 0 }} />
        <div ref={mapRef} className="w-full h-full" />
      </div>

      {/* Place Details Cards (Horizontal Scroll at Bottom) */}
      <div className="h-64 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4 ml-2">Nearby Results</h3>

        {places.length === 0 && status === "success" && (
          <p className="text-center text-gray-400 mt-10">No results found in this area.</p>
        )}

        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {places.map((place) => (
            <div
              key={place.place_id}
              className="min-w-[300px] bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {
                mapInstance?.panTo(place.geometry.location);
                mapInstance?.setZoom(16);
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className={`p-2 rounded-xl ${getIconColor(filter)}`}>
                  <MapPin className="w-5 h-5" />
                </div>
                {place.rating && (
                  <div className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-2 py-1 rounded-lg text-xs font-bold">
                    <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                    {place.rating}
                  </div>
                )}
              </div>

              <h4 className="font-bold text-gray-800 dark:text-gray-100 truncate mb-1">{place.name}</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 h-10 mb-3">{place.vicinity}</p>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`https://www.google.com/maps/dir/?api=1&destination=${place.geometry.location.lat()},${place.geometry.location.lng()}`, '_blank');
                }}
                className="w-full py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Get Directions
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}