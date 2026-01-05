import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/layout/AdminLayout';
import { useAuth } from '@clerk/clerk-react';
import csrfManager from '../utils/csrfManager';
import { toast } from 'react-hot-toast';
import { Plus, Trash2, Calendar, MapPin, Clock } from 'lucide-react';
import API_BASE_URL from '../config';

const AdminEvents = () => {
    const { getToken } = useAuth();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [newEvent, setNewEvent] = useState({
        title: '',
        content: '',
        eventDate: '',
        location: '',
        eventCategory: 'General',
        image: ''
    });

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/posts?filter=events`);
            if (res.ok) {
                const data = await res.json();
                setEvents(data);
            }
        } catch (error) {
            console.error("Error fetching events", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const token = await getToken();
            const res = await csrfManager.secureFetch(`${API_BASE_URL}/api/posts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...newEvent,
                    type: 'event'
                })
            });

            if (res.ok) {
                const created = await res.json();
                setEvents([created, ...events]);
                setShowModal(false);
                toast.success("Event Created");
                setNewEvent({ title: '', content: '', eventDate: '', location: '', eventCategory: 'General', image: '' });
            } else {
                toast.error("Failed to create event");
            }
        } catch (error) {
            toast.error("Error creating event");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this event?")) return;
        try {
            const token = await getToken();
            const res = await csrfManager.secureFetch(`${API_BASE_URL}/api/posts/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                setEvents(events.filter(e => e._id !== id));
                toast.success("Event deleted");
            } else {
                toast.error("Failed to delete");
            }
        } catch (error) {
            toast.error("Error deleting");
        }
    };

    return (
        <AdminLayout title="Event Management" subtitle="Create and manage community events">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Upcoming Events</h2>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Add Event
                </button>
            </div>

            {loading ? <p>Loading events...</p> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map(event => (
                        <div key={event._id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                            <div className="h-40 bg-gray-200 relative">
                                {event.image && <img src={event.image} className="w-full h-full object-cover" />}
                                <div className="absolute top-2 right-2">
                                    <button onClick={() => handleDelete(event._id)} className="bg-white/90 p-1.5 rounded-full text-red-500 hover:bg-red-50">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-4">
                                <div className="text-xs uppercase font-bold text-emerald-600 mb-1">{event.eventCategory}</div>
                                <h3 className="font-bold text-lg mb-2">{event.title}</h3>
                                <div className="space-y-1 text-sm text-gray-500">
                                    <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {new Date(event.eventDate).toLocaleDateString()}</div>
                                    <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> {new Date(event.eventDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                    <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {event.location}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {events.length === 0 && <p className="col-span-3 text-center text-gray-500 py-10">No events found.</p>}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-lg w-full p-6">
                        <h3 className="text-lg font-bold mb-4">Create Event</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Title</label>
                                    <input required type="text" className="w-full rounded-lg border-gray-300 dark:bg-gray-800"
                                        value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Category</label>
                                    <select className="w-full rounded-lg border-gray-300 dark:bg-gray-800"
                                        value={newEvent.eventCategory} onChange={e => setNewEvent({ ...newEvent, eventCategory: e.target.value })}>
                                        <option>General</option>
                                        <option>Volunteering</option>
                                        <option>Health</option>
                                        <option>Government</option>
                                        <option>Social</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Date & Time</label>
                                <input required type="datetime-local" className="w-full rounded-lg border-gray-300 dark:bg-gray-800"
                                    value={newEvent.eventDate} onChange={e => setNewEvent({ ...newEvent, eventDate: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Location</label>
                                <input required type="text" className="w-full rounded-lg border-gray-300 dark:bg-gray-800"
                                    value={newEvent.location} onChange={e => setNewEvent({ ...newEvent, location: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <textarea required className="w-full rounded-lg border-gray-300 dark:bg-gray-800"
                                    value={newEvent.content} onChange={e => setNewEvent({ ...newEvent, content: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Image URL (Optional)</label>
                                <input type="text" className="w-full rounded-lg border-gray-300 dark:bg-gray-800"
                                    value={newEvent.image} onChange={e => setNewEvent({ ...newEvent, image: e.target.value })} />
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 rounded-lg border border-gray-300">Cancel</button>
                                <button disabled={submitting} type="submit" className="flex-1 bg-emerald-500 text-white py-2 rounded-lg font-bold">
                                    {submitting ? 'Creating...' : 'Create Event'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default AdminEvents;
