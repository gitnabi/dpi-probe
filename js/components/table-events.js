/**
 * Обработчик событий таблицы
 * Отвечает за привязку и обработку пользовательских действий
 */
class TableEvents {
    constructor(tableElement) {
        this.table = tableElement;
        this.tbody = this.table.querySelector('.table-body');
        this.handlers = {};
    }
    
    /**
     * Привязать все события
     */
    bindEvents() {
        // Делегирование событий для кнопок проверки
        Events.delegate(this.tbody, '[data-action="check-row"]', 'click', (e) => {
            const row = e.target.closest('tr');
            const index = parseInt(row.dataset.index);
            this.triggerHandler('check-row', index, e);
        });
        
        // Делегирование событий для кнопки подробностей
        Events.delegate(this.tbody, '[data-action="view-details"]', 'click', (e) => {
            const row = e.target.closest('tr');
            const index = parseInt(row.dataset.index);
            this.triggerHandler('view-details', index, e);
        });
        
        // Делегирование событий для кнопки удаления
        Events.delegate(this.tbody, '[data-action="delete-row"]', 'click', (e) => {
            const row = e.target.closest('tr');
            const index = parseInt(row.dataset.index);
            this.triggerHandler('delete-row', index, e);
        });
    }
    
    /**
     * Установить обработчик для действия
     */
    on(action, handler) {
        this.handlers[action] = handler;
    }
    
    /**
     * Удалить обработчик для действия
     */
    off(action) {
        delete this.handlers[action];
    }
    
    /**
     * Вызвать обработчик
     */
    triggerHandler(action, ...args) {
        if (this.handlers[action]) {
            try {
                this.handlers[action](...args);
            } catch (error) {
                console.error(`Ошибка в обработчике ${action}:`, error);
            }
        }
    }
    
    /**
     * Отвязать все события
     */
    unbindEvents() {
        // Удаляем все делегированные события
        Events.off(this.tbody, '[data-action="check-row"]', 'click');
        Events.off(this.tbody, '[data-action="view-details"]', 'click');
        Events.off(this.tbody, '[data-action="delete-row"]', 'click');
        
        // Очищаем обработчики
        this.handlers = {};
    }
    
    /**
     * Получить элемент строки по событию
     */
    getRowFromEvent(event) {
        return event.target.closest('tr');
    }
    
    /**
     * Получить индекс строки по событию
     */
    getRowIndexFromEvent(event) {
        const row = this.getRowFromEvent(event);
        return row ? parseInt(row.dataset.index) : -1;
    }
    
    /**
     * Получить ID строки по событию
     */
    getRowIdFromEvent(event) {
        const row = this.getRowFromEvent(event);
        return row ? row.dataset.rowId : null;
    }
}

// Экспорт в глобальную область
window.TableEvents = TableEvents;
