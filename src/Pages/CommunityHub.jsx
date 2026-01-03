import React, { useState, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Users, Newspaper, MessageSquare, Map, Flame, Hash, Bell } from 'lucide-react';
import TrendingFeed from './TrendingFeed'; // Direct import or lazy
import PostFeed from '../components/community/PostFeed';
import PollWidget from '../components/community/PollWidget';
import EventsPage from '../components/community/EventsPage';
import CommunitiesPage from '../components/community/CommunitiesPage';
import DiscussionFeed from '../components/community/DiscussionFeed';
import ExplorePage from '../components/community/ExplorePage';
import NotificationPanel from '../components/community/NotificationPanel';
import PageLoader from '../components/PageLoader';
import CivicMap from '../components/community/CivicMap';

// Green Papers Animation Variants
const floatingVariant = {
    animate: {
        y: [0, -10, 0],
        rotate: [0, 5, -5, 0],
        transition: {
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut"
        }
    }
};

const CommunityHub = () => {
    const [activeTab, setActiveTab] = useState('feed');
    const [showNotifications, setShowNotifications] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans">
            {/* Hero / Header Area - Green Papers Style */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20 shadow-sm backdrop-blur-md bg-white/80 supports-[backdrop-filter]:bg-white/60 overflow-hidden">
                {/* Floating Elements Animation */}
                <div className="absolute inset-0 pointer-events-none opacity-10">
                    <motion.div variants={floatingVariant} animate="animate" className="absolute top-2 left-10 text-emerald-500"><Newspaper className="w-12 h-12" /></motion.div>
                    <motion.div variants={floatingVariant} animate="animate" transition={{ delay: 1 }} className="absolute bottom-2 right-20 text-blue-500"><Users className="w-8 h-8" /></motion.div>
                    <motion.div variants={floatingVariant} animate="animate" transition={{ delay: 2 }} className="absolute top-5 right-10 text-purple-500"><MessageSquare className="w-6 h-6" /></motion.div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-2">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="w-8 h-8 bg-gradient-to-tr from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-emerald-500/30"
                            >
                                <Users className="w-5 h-5" />
                            </motion.div>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-800 to-teal-600 dark:from-emerald-400 dark:to-teal-200 bg-clip-text text-transparent">
                                Community Hub
                            </h1>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* LEFT COLUMN (Navigation/Filters) - Hidden on mobile, visible on LG */}
                    <div className="hidden lg:block lg:col-span-3 space-y-6">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 sticky top-24">
                            <h3 className="font-bold text-gray-500 uppercase text-xs tracking-wider mb-4 px-2">Menu</h3>
                            <nav className="space-y-1">
                                <NavButton icon={Newspaper} label="Home Feed" active={activeTab === 'feed'} onClick={() => setActiveTab('feed')} />
                                <NavButton icon={Hash} label="Explore" active={activeTab === 'explore'} onClick={() => setActiveTab('explore')} />
                                <NavButton
                                    icon={Bell}
                                    label="Notifications"
                                    badge="3" // TODO: Real count
                                    active={showNotifications}
                                    onClick={() => setShowNotifications(!showNotifications)}
                                />
                                <NavButton icon={MessageSquare} label="Discussions" active={activeTab === 'discussions'} onClick={() => setActiveTab('discussions')} />
                                <NavButton icon={Flame} label="Events" active={activeTab === 'events'} onClick={() => setActiveTab('events')} />
                                <NavButton icon={Users} label="Communities" active={activeTab === 'communities'} onClick={() => setActiveTab('communities')} />
                                <NavButton icon={Map} label="Civic Map" active={activeTab === 'map'} onClick={() => setActiveTab('map')} />
                            </nav>

                            <div className="mt-8">
                                <h3 className="font-bold text-gray-500 uppercase text-xs tracking-wider mb-4 px-2">Popular Topics</h3>
                                <div className="flex flex-wrap gap-2 px-2">
                                    {['#RoadSafety', '#WaterSupply', '#Events', '#Traffic'].map(tag => (
                                        <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md cursor-pointer hover:bg-gray-200">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CENTER COLUMN (Main Feed) */}
                    <div className="lg:col-span-6 space-y-6">
                        {/* Feed Content */}
                        <div className="mt-0">
                            {activeTab === 'events' ? (
                                <EventsPage />
                            ) : activeTab === 'communities' ? (
                                <CommunitiesPage />
                            ) : activeTab === 'discussions' ? (
                                <DiscussionFeed />
                            ) : activeTab === 'explore' ? (
                                <ExplorePage />
                            ) : activeTab === 'map' ? (
                                <div className="space-y-4">
                                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Live Civic Map</h2>
                                    <p className="text-gray-600 dark:text-gray-400">Real-time view of issues reported by the community.</p>
                                    <CivicMap issues={[]} />
                                    {/* Note: In a real app we would pass 'activeIssues' fetched from API here */}
                                </div>
                            ) : (
                                <PostFeed limit={20} activeTab={activeTab} />
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN (Widgets) */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Live Feed Widget */}
                        <div className="sticky top-24 space-y-6">
                            <TrendingFeed />
                            <PollWidget />
                        </div>
                    </div>

                </div>
            </main>

            <NotificationPanel isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
        </div>
    );
};

const NavButton = ({ icon: Icon, label, active, onClick, href, badge }) => {
    const Component = href ? 'a' : 'button';
    return (
        <Component
            href={href}
            onClick={onClick}
            className={`flex items-center gap-4 px-4 py-3 rounded-full text-lg w-full transition-all group ${active ? 'font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800' : 'font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
        >
            <div className="relative">
                <Icon className={`w-6 h-6 ${active ? 'fill-current text-emerald-600' : ''}`} />
                {badge && <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full border-2 border-white dark:border-gray-900">{badge}</span>}
            </div>
            <span className={`${active ? 'text-emerald-600' : ''}`}>{label}</span>
        </Component>
    );
};

export default CommunityHub;
