import React, { useState } from 'react';
import { Calendar, MapPin, Users, Clock, ArrowRight } from 'lucide-react';
import API_BASE_URL from '../../config';
import { motion } from 'framer-motion';

const EventsPage = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [interested, setInterested] = useState([]);

    React.useEffect(() => {
        const fetchEvents = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/posts?filter=events`);
                if (res.ok) {
                    const data = await res.json();
                    setEvents(data);
                }
            } catch (err) {
                console.error("Failed to fetch events", err);
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, []);

    const toggleInterest = (id) => {
        // TODO: Implement backend toggle
        if (interested.includes(id)) {
            setInterested(interested.filter(i => i !== id));
        } else {
            setInterested([...interested, id]);
        }
    };



    return (
        <div className="pb-20">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-[60px] z-10">
                <h2 className="text-xl font-bold mb-2">Upcoming Events in CityName</h2>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {['All', 'Today', 'Weekend', 'Online'].map(filter => (
                        <button key={filter} className="px-4 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 whitespace-nowrap">
                            {filter}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-4 p-4">
                {events.length === 0 && !loading && <p className="text-gray-500 text-center">No upcoming events.</p>}
                {events.map((event) => (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={event._id}
                        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow group cursor-pointer"
                    >
                        <div className="h-40 overflow-hidden relative">
                            <img src={event.image || "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&q=80"} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur text-black font-bold text-xs px-2 py-1 rounded">
                                {event.eventCategory || 'Community'}
                            </div>
                        </div>
                        <div className="p-4">
                            <div className="text-emerald-600 font-bold text-sm mb-1 uppercase tracking-wide">
                                {event.eventDate ? new Date(event.eventDate).toLocaleDateString() : 'Upcoming'}
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{event.title || event.content?.substring(0, 30)}</h3>

                            <div className="flex flex-col gap-2 text-sm text-gray-500 mb-4">
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-gray-400" />
                                    {event.location || 'Online'}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-gray-400" />
                                    {interested.includes(event._id) ? (event.attendees?.length || 0) + 1 : (event.attendees?.length || 0)} going
                                </div>
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleInterest(event._id);
                                }}
                                className={`w-full py-2 rounded-xl font-medium text-sm transition-colors ${interested.includes(event._id)
                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                {interested.includes(event._id) ? '✓ Going' : 'Interested'}
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default EventsPage;
