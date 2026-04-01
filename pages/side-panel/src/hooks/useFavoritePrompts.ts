import { useState, useCallback, useEffect } from 'react';
import favoritesStorage, { type FavoritePrompt } from '@extension/storage/lib/prompt/favorites';

export const useFavoritePrompts = () => {
    const [favoritePrompts, setFavoritePrompts] = useState<FavoritePrompt[]>([]);

    const loadFavorites = useCallback(async () => {
        try {
            const prompts = await favoritesStorage.getAllPrompts();
            setFavoritePrompts(prompts);
        } catch (error) {
            console.error('Failed to load favorite prompts:', error);
        }
    }, []);

    const handleBookmarkUpdateTitle = useCallback(async (id: number, title: string) => {
        try {
            await favoritesStorage.updatePromptTitle(id, title);
            const prompts = await favoritesStorage.getAllPrompts();
            setFavoritePrompts(prompts);
        } catch (error) {
            console.error('Failed to update favorite prompt title:', error);
        }
    }, []);

    const handleBookmarkDelete = useCallback(async (id: number) => {
        try {
            await favoritesStorage.removePrompt(id);
            const prompts = await favoritesStorage.getAllPrompts();
            setFavoritePrompts(prompts);
        } catch (error) {
            console.error('Failed to delete favorite prompt:', error);
        }
    }, []);

    const handleBookmarkReorder = useCallback(async (draggedId: number, targetId: number) => {
        try {
            await favoritesStorage.reorderPrompts(draggedId, targetId);
            const updatedPromptsFromStorage = await favoritesStorage.getAllPrompts();
            setFavoritePrompts(updatedPromptsFromStorage);
        } catch (error) {
            console.error('Failed to reorder favorite prompts:', error);
        }
    }, []);

    const addFavoritePrompt = useCallback(async (title: string, content: string) => {
        try {
            await favoritesStorage.addPrompt(title, content);
            await loadFavorites();
        } catch (error) {
            console.error('Failed to add favorite prompt:', error);
        }
    }, [loadFavorites]);

    useEffect(() => {
        loadFavorites();
    }, [loadFavorites]);

    return {
        favoritePrompts,
        handleBookmarkUpdateTitle,
        handleBookmarkDelete,
        handleBookmarkReorder,
        addFavoritePrompt,
    };
};
