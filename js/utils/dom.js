/**
 * Утилиты для работы с DOM
 */

const DOM = {
    /**
     * Получить элемент по ID
     */
    get: (id) => document.getElementById(id),
    
    /**
     * Получить элементы по селектору
     */
    getAll: (selector) => document.querySelectorAll(selector),
    
    /**
     * Создать элемент с атрибутами и содержимым
     */
    create: (tag, attributes = {}, content = '') => {
        const element = document.createElement(tag);
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'innerHTML') {
                element.innerHTML = value;
            } else if (key === 'textContent') {
                element.textContent = value;
            } else if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else if (key.startsWith('data-') || key.startsWith('aria-')) {
                element.setAttribute(key, value);
            } else if (key in element) {
                // Устанавливаем как свойство если оно существует в элементе
                element[key] = value;
            } else {
                element.setAttribute(key, value);
            }
        });
        
        // Контент устанавливается только если не был установлен innerHTML
        if (content && !attributes.innerHTML) {
            element.textContent = content;
        }
        
        return element;
    },
    
    /**
     * Показать элемент
     */
    show: (element) => {
        if (typeof element === 'string') {
            element = DOM.get(element);
        }
        if (element) {
            element.style.display = '';
            element.classList.remove('hidden');
        }
    },
    
    /**
     * Скрыть элемент
     */
    hide: (element) => {
        if (typeof element === 'string') {
            element = DOM.get(element);
        }
        if (element) {
            element.style.display = 'none';
            element.classList.add('hidden');
        }
    }
};

// Экспорт в глобальную область для обратной совместимости
window.DOM = DOM;

