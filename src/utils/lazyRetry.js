import { lazy } from 'react';

/**
 * A wrapper around React.lazy that attempts to reload the page if the import fails.
 * This handles the "Failed to fetch dynamically imported module" error typical in SPAs after a new deployment.
 * 
 * @param {Function} importFn - The dynamic import function i.e. () => import('./MyComponent')
 * @returns {React.LazyExoticComponent}
 */
const lazyRetry = (importFn) => {
    return lazy(async () => {
        try {
            return await importFn();
        } catch (error) {
            const isChunkError = error.message && (
                error.message.includes('Failed to fetch dynamically imported module') ||
                error.message.includes('Importing a module script failed')
            );

            // Check if we've already reloaded to avoid infinite loops
            const hasReloaded = window.sessionStorage.getItem('retry-lazy-refreshed');

            if (isChunkError && !hasReloaded) {
                console.warn('Chunk load error detected. Reloading page to fetch new chunks...');
                window.sessionStorage.setItem('retry-lazy-refreshed', 'true');
                window.location.reload();
                // Return a never-resolving promise to pause rendering while reloading
                return new Promise(() => { });
            }

            // If we reloaded and it still failed, just throw the error
            if (hasReloaded) {
                window.sessionStorage.removeItem('retry-lazy-refreshed'); // cleanup
            }

            throw error;
        }
    });
};

export default lazyRetry;
