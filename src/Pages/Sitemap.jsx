import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
    Home,
    Info,
    Phone,
    Shield,
    FileText,
    MapPin,
    Users,
    Download,
    AlertTriangle,
    BookOpen,
    Vote,
    LifeBuoy
} from 'lucide-react';

const SitemapSection = ({ title, links, gradient }) => (
    <div className="group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20 dark:border-slate-700/50 hover:shadow-xl dark:hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 dark:group-hover:opacity-10 rounded-2xl transition-opacity duration-500`}></div>

        <div className="relative mb-6">
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors duration-300 border-b border-gray-100 dark:border-gray-700 pb-2">
                {title}
            </h3>
        </div>

        <div className="relative">
            <ul className="space-y-3">
                {links.map((link, index) => (
                    <li key={index}>
                        <Link
                            to={link.path}
                            className="flex items-center gap-3 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors group/link"
                        >
                            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-lg flex items-center justify-center flex-shrink-0 group-hover/link:scale-110 transition-transform duration-300">
                                <span className="text-white">
                                    {React.cloneElement(link.icon, { className: "w-4 h-4" })}
                                </span>
                            </div>
                            <span className="font-medium">{link.label}</span>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>

        <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-emerald-200/50 dark:group-hover:border-emerald-700/50 transition-colors duration-300"></div>
    </div>
);

const Sitemap = () => {
    const sections = [
        {
            title: "Main",
            gradient: "from-emerald-400 to-teal-500",
            links: [
                { label: "Home", path: "/", icon: <Home /> },
                { label: "About Us", path: "/about", icon: <Info /> },
                { label: "Contact", path: "/contact", icon: <Phone /> },
                { label: "Feedback", path: "/feedback", icon: <LifeBuoy /> },
            ]
        },
        {
            title: "Services & Features",
            gradient: "from-teal-400 to-cyan-500",
            links: [
                { label: "Report Issue", path: "/report-issue", icon: <AlertTriangle /> },
                { label: "Nearby Services", path: "/nearby-services", icon: <MapPin /> },
                { label: "Community Voting", path: "/community-voting", icon: <Vote /> },
                { label: "Civic Statistics", path: "/civic-stats", icon: <FileText /> },
            ]
        },
        {
            title: "Resources",
            gradient: "from-cyan-400 to-blue-500",
            links: [
                { label: "Civic Education", path: "/civic-education", icon: <BookOpen /> },
                { label: "Resources", path: "/resources", icon: <BookOpen /> },
                { label: "Contributors", path: "/contributors", icon: <Users /> },
                { label: "Election Info", path: "/elections-info", icon: <Vote /> },
            ]
        },
        {
            title: "Legal & Support",
            gradient: "from-purple-400 to-pink-500",
            links: [
                { label: "Privacy Policy", path: "/privacy", icon: <Shield /> },
                { label: "Terms of Service", path: "/terms", icon: <FileText /> },
                { label: "Download Android", path: "/download-android", icon: <Download /> },
                { label: "Download iOS", path: "/download-ios", icon: <Download /> },
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 via-green-50/30 to-emerald-50/50 dark:from-slate-900 dark:via-slate-800/50 dark:to-emerald-900/20">
            {/* Background Decoration matching Home.jsx */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -right-32 w-64 h-64 bg-gradient-to-br from-emerald-100/40 to-teal-100/40 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-green-100/40 to-emerald-100/40 dark:from-green-900/30 dark:to-emerald-900/30 rounded-full blur-3xl"></div>
            </div>

            <div className="relative max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center px-4 py-2 rounded-full bg-emerald-100/80 dark:bg-emerald-900/50 backdrop-blur-sm border border-emerald-200/50 dark:border-emerald-700/50 mb-6">
                        <span className="text-emerald-700 dark:text-emerald-300 font-medium text-sm">Site Navigation</span>
                    </div>

                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                        <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                            Explore Civix
                        </span>
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                        Navigate through our features, resources, and services designed to improve your community.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {sections.map((section, index) => (
                        <SitemapSection key={index} title={section.title} links={section.links} gradient={section.gradient} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Sitemap;
