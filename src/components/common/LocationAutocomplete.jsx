import React, { useState, useEffect, useRef } from 'react';
import { MapPin, AlertCircle } from 'lucide-react';

const LocationAutocomplete = ({ value, onChange, placeholder, className, required, onCoordinatesChange }) => {
    const [query, setQuery] = useState(value || '');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [usingGoogle, setUsingGoogle] = useState(false);
    const containerRef = useRef(null);
    const autocompleteService = useRef(null);
    const placesService = useRef(null);
    const debounceRef = useRef(null);

    // Sync internal query if external value changes (e.g. via geolocation button or hydration)
    useEffect(() => {
        if (value !== undefined && value !== query) {
            setQuery(value || '');
        }
    }, [value]);

    useEffect(() => {
        // Initialize Google Services
        if (window.google && window.google.maps && window.google.maps.places) {
            autocompleteService.current = new window.google.maps.places.AutocompleteService();
            placesService.current = new window.google.maps.places.PlacesService(document.createElement('div'));
            setUsingGoogle(true);
        } else {
            // console.log("Google Maps API not loaded. Using OpenStreetMap.");
            setUsingGoogle(false);
        }
    }, []);

    // Handle outside click to close suggestions
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const [isLoading, setIsLoading] = useState(false);

    // ... (rest of useEffects)

    const fetchSuggestions = (input) => {
        if (!input || input.length < 3) {
            setSuggestions([]);
            return;
        }

        setIsLoading(true);

        if (usingGoogle && autocompleteService.current) {
            // GOOGLE MAPS STRATEGY
            const request = {
                input: input,
                // componentRestrictions: { country: 'in' }, 
            };
            autocompleteService.current.getPlacePredictions(request, (predictions, status) => {
                setIsLoading(false);
                if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
                    setSuggestions(predictions.map(p => ({
                        id: p.place_id,
                        label: p.description,
                        source: 'google',
                        raw: p
                    })));
                    setShowSuggestions(true);
                } else {
                    setSuggestions([]);
                }
            });
        } else {
            // OPENSTREETMAP FALLBACK STRATEGY
            // Debounce for OSM API to avoid spamming
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(async ({ input }) => {
                try {
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(input)}&limit=5&addressdetails=1`
                    );
                    if (response.ok) {
                        const data = await response.json();
                        setSuggestions(data.map(item => ({
                            id: item.place_id,
                            label: item.display_name,
                            source: 'osm',
                            raw: item
                        })));
                        setShowSuggestions(true);
                    }
                } catch (error) {
                    console.error("OSM/Autocomplete fetch error:", error);
                } finally {
                    setIsLoading(false);
                }
            }, 500, { input }); // 500ms debounce for OSM
        }
    };

    // Wrapper for OSM debounce
    const triggerFetch = (input) => {
        if (usingGoogle) {
            fetchSuggestions(input);
        } else {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            setIsLoading(true); // Show loading immediately on typing for OSM feel
            debounceRef.current = setTimeout(() => {
                const performOSMFetch = async () => {
                    try {
                        const response = await fetch(
                            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(input)}&limit=5&addressdetails=1`
                        );
                        if (response.ok) {
                            const data = await response.json();
                            setSuggestions(data.map(item => ({
                                id: item.place_id,
                                label: item.display_name,
                                source: 'osm',
                                raw: item
                            })));
                            setShowSuggestions(true);
                        }
                    } catch (e) { console.error(e); } finally {
                        setIsLoading(false);
                    }
                };
                performOSMFetch();
            }, 500);
        }
    }

    const handleInputChange = (e) => {
        const newVal = e.target.value;
        setQuery(newVal);
        onChange({ target: { name: 'location', value: newVal } });

        if (newVal.length >= 3) {
            triggerFetch(newVal);
        } else {
            setSuggestions([]);
            setIsLoading(false);
        }
    };

    const handleSelect = (item) => {
        const formatted = item.label;
        setQuery(formatted);
        setSuggestions([]);
        setShowSuggestions(false);
        onChange({ target: { name: 'location', value: formatted } });

        // Get Coordinates
        if (item.source === 'google') {
            if (placesService.current && item.id) {
                placesService.current.getDetails({
                    placeId: item.id,
                    fields: ['geometry', 'formatted_address']
                }, (result, status) => {
                    if (status === window.google.maps.places.PlacesServiceStatus.OK && result.geometry) {
                        const lat = result.geometry.location.lat();
                        const lng = result.geometry.location.lng();
                        if (onCoordinatesChange) onCoordinatesChange({ lat, lng });
                    }
                });
            }
        } else if (item.source === 'osm') {
            // OSM data already has lat/lon
            const lat = parseFloat(item.raw.lat);
            const lng = parseFloat(item.raw.lon);
            if (onCoordinatesChange) onCoordinatesChange({ lat, lng });
        }
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            <div className="relative">
                <input
                    type="text"
                    id="location"
                    name="location"
                    value={query}
                    onChange={handleInputChange}
                    placeholder={placeholder}
                    required={required}
                    className={className}
                    autoComplete="off"
                />
                {!usingGoogle && query.length > 2 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        {isLoading ? (
                            <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                                Free Search
                            </span>
                        )}
                    </div>
                )}
            </div>

            {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-50 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl mt-2 shadow-2xl max-h-60 overflow-y-auto overflow-x-hidden">
                    {suggestions.map((item, index) => (
                        <li
                            key={`${item.id}-${index}`}
                            onClick={() => handleSelect(item)}
                            className="px-4 py-3 hover:bg-emerald-50 dark:hover:bg-gray-700 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0 flex items-start gap-2 group"
                        >
                            <MapPin className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 mt-1 flex-shrink-0" />
                            <span className="text-sm text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white line-clamp-2">
                                {item.label}
                            </span>
                            {item.source === 'osm' && <span className="text-[10px] bg-gray-100 text-gray-500 px-1 rounded ml-auto self-center">Basic</span>}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default LocationAutocomplete;
