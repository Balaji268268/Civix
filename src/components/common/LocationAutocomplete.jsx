import React, { useState, useEffect, useRef } from 'react';

const LocationAutocomplete = ({ value, onChange, placeholder, className, required }) => {
    const [query, setQuery] = useState(value || '');
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const containerRef = useRef(null);
    const debounceRef = useRef(null);

    // Sync internal query if external value changes (e.g. via geolocation button)
    useEffect(() => {
        if (value !== query) {
            setQuery(value);
        }
    }, [value]);

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

    const fetchSuggestions = async (input) => {
        if (!input || input.length < 3) {
            setSuggestions([]);
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(input)}&limit=5&addressdetails=1`
            );
            if (response.ok) {
                const data = await response.json();
                setSuggestions(data);
                setShowSuggestions(true);
            }
        } catch (error) {
            console.error("Autocomplete fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const newVal = e.target.value;
        setQuery(newVal);
        onChange({ target: { name: 'location', value: newVal } }); // Simulate event for parent

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            fetchSuggestions(newVal);
        }, 400); // 400ms debounce
    };

    const handleSelect = (addr) => {
        const formatted = addr.display_name;
        setQuery(formatted);
        setSuggestions([]);
        setShowSuggestions(false);
        onChange({ target: { name: 'location', value: formatted } }); // Update parent form
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
                {loading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
            </div>

            {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-50 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl mt-2 shadow-2xl max-h-60 overflow-y-auto overflow-x-hidden">
                    {suggestions.map((item, index) => (
                        <li
                            key={`${item.place_id}-${index}`}
                            onClick={() => handleSelect(item)}
                            className="px-4 py-3 hover:bg-emerald-50 dark:hover:bg-gray-700 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0 flex items-start gap-2 group"
                        >
                            {/* MapPin SVG Icon */}
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 mt-1 flex-shrink-0"
                            >
                                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                                <circle cx="12" cy="10" r="3" />
                            </svg>
                            <span className="text-sm text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white line-clamp-2">
                                {item.display_name}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default LocationAutocomplete;
