/**
 * Основной класс таблицы данных
 * Координирует работу всех компонентов таблицы
 */
class DataTable {
    constructor(tableId, options = {}) {
        this.table = DOM.get(tableId);
        this.tbody = this.table.querySelector('.table-body');
        this.options = {
            autoSave: true,
            storageKey: 'dpi-probe-data',
            i18n: null,
            testRunner: null,
            ...options
        };
        
        if (!this.options.i18n) {
            throw new Error('DataTable requires an i18n service instance.');
        }
        if (!this.options.testRunner) {
            throw new Error('DataTable requires a TestRunner instance.');
        }
        this.i18n = this.options.i18n;
        this.testRunner = this.options.testRunner;

        // Инициализация компонентов
        this.dataManager = new DataManager(this.options);
        this.renderer = new TableRenderer(this.table, { i18n: this.i18n });
        this.events = new TableEvents(this.table);
        this.checker = new RowChecker({ 
            i18n: this.i18n,
            testRunner: this.testRunner 
        });
        this.detailsViewer = new DetailsViewer({ 
            i18n: this.i18n,
            modalManager: this.options.modalManager 
        });
        
        // Привязка обработчиков событий
        this.bindEventHandlers();
    }
    
    /**
     * Инициализация таблицы
     */
    async init() {
        await this.dataManager.loadData();
        this.render();
        this.events.bindEvents();
    }
    
    /**
     * Привязать обработчики событий
     */
    bindEventHandlers() {
        // Проверка строки
        this.events.on('check-row', (index) => {
            this.checkRow(index);
        });
        
        // Просмотр подробностей
        this.events.on('view-details', (index) => {
            this.showRowDetails(index);
        });
        
        // Удаление строки
        this.events.on('delete-row', (index) => {
            this.deleteRow(index);
        });
    }
    
    /**
     * Отрендерить таблицу
     */
    render() {
        const data = this.dataManager.getData();
        this.renderer.render(data);
    }
    
    /**
     * Проверить одну строку
     */
    async checkRow(index) {
        const rowData = this.dataManager.getRow(index);
        if (!rowData || rowData.isChecking) return;
        
        try {
            await this.checker.checkRow(rowData, (updatedRow) => {
                this.dataManager.updateRow(index, updatedRow);
                this.renderer.updateRow(index, updatedRow);
            });
            
            this.dataManager.saveData();
            
        } catch (error) {
            console.error('Ошибка при проверке строки:', error);
        }
    }
    
    /**
     * Проверить все строки
     */
    async checkAllRows() {
        const data = this.dataManager.getData();
        
        await this.checker.checkAllRows(
            data,
            // onProgress
            (completed, total) => {
                this.updateProgress(completed, total);
            },
            // onRowUpdate
            (updatedRow) => {
                const index = data.findIndex(row => row.id === updatedRow.id);
                if (index !== -1) {
                    this.dataManager.updateRow(index, updatedRow);
                    this.renderer.updateRow(index, updatedRow);
                }
            }
        );
        
        this.dataManager.saveData();
    }
    
    /**
     * Обновить прогресс выполнения
     */
    updateProgress(completed, total) {
        const percent = (completed / total) * 100;
        const progressFill = document.querySelector('.progress-fill');
        const progressText = document.querySelector('.progress-text');
        
        if (progressFill) {
            Animation.progress(progressFill, percent, 200);
        }
        
        if (progressText) {
            progressText.textContent = this.i18n.t('notifications.progressStatus', { completed, total });
        }
    }
    
    /**
     * Показать подробности строки
     */
    showRowDetails(index) {
        const rowData = this.dataManager.getRow(index);
        if (!rowData) return;
        
        this.detailsViewer.showRowDetails(rowData);
    }
    
    /**
     * Удалить строку с подтверждением
     */
    async deleteRow(index) {
        const rowData = this.dataManager.getRow(index);
        if (!rowData) return;
        
        const confirmed = await this.options.modalManager.showConfirm(
            this.options.i18n.t('notifications.confirmDeleteRowTitle', { name: rowData.name }),
            this.options.i18n.t('notifications.confirmDeleteRowMessage')
        );
        
        if (confirmed) {
            this.dataManager.removeRow(index);
            this.render();
            Notification.show(this.i18n.t('notifications.rowDeleted', { name: rowData.name }), 'info');
        }
    }
    
    /**
     * Добавить новую строку
     */
    addRow(data) {
        const newRow = this.dataManager.addRow(data);
        this.render();
        return newRow;
    }
    
    /**
     * Удалить строку
     */
    removeRow(index) {
        const removedRow = this.dataManager.removeRow(index);
        if (removedRow) {
            this.render();
        }
        return removedRow;
    }
    
    /**
     * Очистить кэш и перезагрузить исходные данные
     */
    async clearCache() {
        try {
            await this.dataManager.clearCache();
            this.render();
        } catch (error) {
            // Ошибки будут проброшены наверх для обработки в main.js
            throw error;
        }
    }
    
    /**
     * Получить данные
     */
    getData() {
        return this.dataManager.getData();
    }
    
    /**
     * Установить данные
     */
    setData(data) {
        this.dataManager.setData(data);
        this.render();
    }
    
    /**
     * Получить строку по индексу
     */
    getRow(index) {
        return this.dataManager.getRow(index);
    }
    
    /**
     * Обновить строку
     */
    updateRow(index, updates) {
        const success = this.dataManager.updateRow(index, updates);
        if (success) {
            const updatedRow = this.dataManager.getRow(index);
            this.renderer.updateRow(index, updatedRow);
        }
        return success;
    }
    
    /**
     * Получить количество строк
     */
    getRowCount() {
        return this.dataManager.getRowCount();
    }
    
    /**
     * Проверить, есть ли данные
     */
    hasData() {
        return this.dataManager.hasData();
    }
    
    /**
     * Уничтожить таблицу и освободить ресурсы
     */
    destroy() {
        this.events.unbindEvents();
        this.checker.cancelAllChecks();
        this.renderer.clear();
    }
}

// Экспорт в глобальную область
window.DataTable = DataTable;
