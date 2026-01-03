import React from 'react';
import PostFeed from './PostFeed';

const DiscussionFeed = () => {
    return (
        <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 mb-4">
                <h3 className="font-bold text-lg mb-1">Community Discussions</h3>
                <p className="text-sm text-gray-500">Engage in open dialogue about civic issues.</p>
            </div>
            {/* Reuse PostFeed but filter for discussions */}
            <PostFeed activeTab="discussions" />
        </div>
    );
};

export default DiscussionFeed;
