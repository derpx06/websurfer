import { useState, useEffect } from 'react';

export const useTheme = () => {
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setIsDarkMode(darkModeMediaQuery.matches);

        const handleChange = (e: MediaQueryListEvent) => {
            setIsDarkMode(e.matches);
        };

        darkModeMediaQuery.addEventListener('change', handleChange);
        return () => darkModeMediaQuery.removeEventListener('change', handleChange);
    }, []);

    return { isDarkMode };
};
