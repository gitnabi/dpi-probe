/**
 * Утилиты для работы с состоянием
 */

const State = {
    /**
     * Сохранить данные в localStorage
     */
    save: (key, data) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Ошибка сохранения в localStorage:', error);
            return false;
        }
    },
    
    /**
     * Загрузить данные из localStorage
     */
    load: (key, defaultValue = null) => {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error('Ошибка загрузки из localStorage:', error);
            return defaultValue;
        }
    },
    
    /**
     * Удалить данные из localStorage
     */
    remove: (key) => {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Ошибка удаления из localStorage:', error);
            return false;
        }
    }
};

// Экспорт в глобальную область для обратной совместимости
window.State = State;

