/**
 * Утилиты для работы с событиями
 */

const Events = {
    /**
     * Добавить обработчик события с возможностью удаления
     */
    on: (element, event, handler, options = {}) => {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        
        if (!element) {
            console.warn(`Events.on: элемент не найден`);
            return () => {};
        }
        
        if (typeof handler !== 'function') {
            console.warn(`Events.on: обработчик должен быть функцией`);
            return () => {};
        }
        
        try {
            element.addEventListener(event, handler, options);
            
            // Возвращаем функцию для удаления обработчика
            return () => {
                try {
                    element.removeEventListener(event, handler, options);
                } catch (error) {
                    console.warn('Ошибка при удалении обработчика события:', error);
                }
            };
        } catch (error) {
            console.warn('Ошибка при добавлении обработчика события:', error);
            return () => {};
        }
    },
    
    /**
     * Делегирование событий
     */
    delegate: (parent, selector, event, handler) => {
        return Events.on(parent, event, (e) => {
            // Проверяем сам элемент и его родителей до parent
            let target = e.target;
            
            while (target && target !== parent) {
                if (target.matches && target.matches(selector)) {
                    // Вызываем обработчик с правильным контекстом
                    e.delegateTarget = target;
                    handler.call(target, e);
                    return;
                }
                target = target.parentElement;
            }
        });
    },
    
    /**
     * Вызвать пользовательское событие на document
     */
    emit: (eventName, detail = {}) => {
        try {
            const event = new CustomEvent(eventName, { detail });
            document.dispatchEvent(event);
        } catch (error) {
            console.error(`Ошибка при отправке события "${eventName}":`, error);
        }
    },

    /**
     * Прослушивать пользовательское событие на document
     */
    listen: (eventName, handler) => {
        document.addEventListener(eventName, (event) => {
            handler(event.detail);
        });
    },

    /**
     * Удалить все обработчики событий с элемента
     */
    off: (element, event, handler) => {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        
        if (element && typeof handler === 'function') {
            element.removeEventListener(event, handler);
        }
    },
    
    /**
     * Вызвать пользовательское событие
     */
    trigger: (element, eventName, detail = null) => {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        
        if (!element) return false;
        
        try {
            const event = new CustomEvent(eventName, {
                detail,
                bubbles: true,
                cancelable: true
            });
            
            return element.dispatchEvent(event);
        } catch (error) {
            console.warn('Ошибка при вызове события:', error);
            return false;
        }
    }
};

// Экспорт в глобальную область для обратной совместимости
window.Events = Events;