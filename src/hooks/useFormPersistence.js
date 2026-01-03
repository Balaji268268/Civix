import { useState, useEffect } from 'react';

/**
 * Syncs state with storage (session or local) to persist data across refreshes.
 * @param {string} key - Unique key for storage
 * @param {any} initialValue - Default value if nothing in storage
 * @param {boolean} useSession - If true, uses sessionStorage (cleared on tab close). False = localStorage.
 */
export default function useFormPersistence(key, initialValue, useSession = true) {
    const storage = useSession ? sessionStorage : localStorage;

    // Initialize state from storage or default
    const [value, setValue] = useState(() => {
        try {
            const stored = storage.getItem(key);
            return stored ? JSON.parse(stored) : initialValue;
        } catch (error) {
            console.warn(`Error reading ${key} from storage:`, error);
            return initialValue;
        }
    });

    // Update storage whenever value changes
    useEffect(() => {
        try {
            if (value === undefined || value === null) {
                storage.removeItem(key);
            } else {
                storage.setItem(key, JSON.stringify(value));
            }
        } catch (error) {
            console.warn(`Error saving ${key} to storage:`, error);
        }
    }, [key, value, storage]);

    // Helper to clear manually (e.g., after successful submit)
    const clearPersistence = () => {
        try {
            storage.removeItem(key);
            setValue(initialValue);
        } catch (e) {
            console.error(e);
        }
    };

    return [value, setValue, clearPersistence];
}
