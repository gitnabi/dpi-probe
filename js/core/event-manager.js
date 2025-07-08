/**
 * Модуль управления событиями и горячими клавишами DPI Probe
 */

class EventManager {
    constructor() {
        this.boundEvents = new Map();
    }
    
    /**
     * Привязать все события приложения
     */
    bindEvents(app) {
        // Кнопка "Запустить все тесты"
        this.bind(app.uiController.getElement('runAllTestsBtn'), 'click', () => app.runAllTests());
        
        // Кнопка "Очистить кэш"
        this.bind(app.uiController.getElement('clearCacheBtn'), 'click', () => app.clearCache());
        
        // Кнопка "Проверить URL"
        this.bind(app.uiController.getElement('checkUrlBtn'), 'click', () => app.checkSingleUrl());
        
        // Поле ввода URL
        const urlInput = app.uiController.getElement('urlInput');
        this.bind(urlInput, 'input', (e) => app.uiController.validateUrlInput(e.target));
        this.bind(urlInput, 'keypress', (e) => {
            if (e.key === 'Enter') {
                app.checkSingleUrl();
            }
        });
        
        // Модальное окно
        const modalOverlay = app.uiController.getElement('modalOverlay');
        const modalClose = app.uiController.getElement('modalClose');
        this.bind(modalOverlay, 'click', (e) => {
            if (e.target === modalOverlay) {
                app.closeModal();
            }
        });
        this.bind(modalClose, 'click', () => app.closeModal());
        
        // Глобальные события
        this.bind(document, 'keydown', (e) => {
            if (e.key === 'Escape' && app.modalManager.isModalOpen()) {
                app.closeModal();
            }
        });

        // Информер
        const infoWidget = app.uiController.getElement('infoWidget');
        this.bind(infoWidget, 'click', () => app.modalManager.showInfoModal());
    }

    /**
     * Привязать событие к элементу
     */
    bind(element, eventType, handler) {
        if (!element) return;
        
        element.addEventListener(eventType, handler);
        
        // Сохраняем информацию о привязанном событии для последующей отвязки
        if (!this.boundEvents.has(element)) {
            this.boundEvents.set(element, []);
        }
        this.boundEvents.get(element).push({ eventType, handler });
    }
    
    /**
     * Отвязать все события
     */
    unbindAll() {
        this.boundEvents.forEach((events, element) => {
            events.forEach(({ eventType, handler }) => {
                element.removeEventListener(eventType, handler);
            });
        });
        
        this.boundEvents.clear();
    }
    
    /**
     * Получить количество привязанных событий
     */
    getBoundEventsCount() {
        let count = 0;
        this.boundEvents.forEach(events => {
            count += events.length;
        });
        return count;
    }
}

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
    window.EventManager = EventManager;
}
