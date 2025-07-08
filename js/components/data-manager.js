/**
 * Менеджер данных для таблицы
 * Отвечает за загрузку, сохранение и конвертацию данных
 */
class DataManager {
    constructor(options = {}) {
        this.options = {
            autoSave: true,
            storageKey: 'dpi-probe-data',
            csvFile: 'targets_to_check.csv',
            ...options
        };
        
        this.i18n = this.options.i18n;
        if (!this.i18n) {
            throw new Error('DataManager requires an i18n service instance.');
        }
        
        this.data = [];
    }
    
    /**
     * Загрузить данные из localStorage или из CSV файла
     */
    async loadData() {
        const savedData = State.load(this.options.storageKey);
        
        if (savedData && savedData.length > 0) {
            this.data = savedData;
        } else {
            try {
                const csvData = await this._loadCSV(this.options.csvFile);
                this.data = this.convertCSVToTableData(csvData);
                this.saveData();
            } catch (error) {
                console.error('Ошибка загрузки CSV файла:', error);
                Notification.show(this.i18n.t('notifications.csvLoadFailed', { file: this.options.csvFile, message: error.message }), 'error', 0);
                throw new Error(this.i18n.t('notifications.csvLoadCritical', { file: this.options.csvFile, message: error.message }));
            }
        }
        
        return this.data;
    }

    async _loadCSV(filePath) {
        try {
            const response = await fetch(filePath, { cache: 'no-cache' });
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(this.i18n.t('notifications.csvNotFound', { file: filePath }));
                } else {
                    throw new Error(this.i18n.t('notifications.csvHttpError', { file: filePath, status: response.status, statusText: response.statusText }));
                }
            }
            
            const buffer = await response.arrayBuffer();
            const decoder = new TextDecoder('utf-8');
            const text = decoder.decode(buffer);
            
            if (!text.trim()) {
                throw new Error(this.i18n.t('notifications.csvEmpty', { file: filePath }));
            }
            
            const lines = text.trim().split('\n');
            const data = [];
            
            for (const line of lines) {
                if (line.trim()) {
                    const columns = line.split(',').map(col => col.trim());
                    if (columns.length >= 2) {
                        data.push({
                            name: columns[0] || '',
                            url: columns[1] || '',
                            location: columns[2] || ''
                        });
                    }
                }
            }
            
            if (data.length === 0) {
                throw new Error(this.i18n.t('notifications.csvNoData', { file: filePath }));
            }
            
            return data;
        } catch (error) {
            console.error('Ошибка загрузки CSV файла:', error);
            throw error;
        }
    }

    
    /**
     * Сохранить данные в localStorage
     */
    saveData() {
        if (this.options.autoSave) {
            State.save(this.options.storageKey, this.data);
        }
    }
    
    /**
     * Конвертировать CSV данные в формат таблицы
     */
    convertCSVToTableData(csvData) {
        return csvData.map((site, index) => ({
            id: `site_${index + 1}`,
            name: site.name,
            url: site.url,
            location: site.location,
            responseTime: null,
            ssl: null,
            dns: null,
            verdict: null,
            lastChecked: null,
            isChecking: false
        }));
    }
    
    /**
     * Получить все данные
     */
    getData() {
        return this.data;
    }
    
    /**
     * Установить данные
     */
    setData(data) {
        this.data = data;
        this.saveData();
    }
    
    /**
     * Получить строку по индексу
     */
    getRow(index) {
        return this.data[index] || null;
    }
    
    /**
     * Обновить строку по индексу
     */
    updateRow(index, updates) {
        if (index >= 0 && index < this.data.length) {
            Object.assign(this.data[index], updates);
            this.saveData();
            return true;
        }
        return false;
    }
    
    /**
     * Добавить новую строку
     */
    addRow(data) {
        // Создаем объект новой строки с базовыми значениями по умолчанию
        const newRow = {
            id: `row_${Date.now()}`,
            name: data.url, // Безопасное значение по умолчанию
            url: data.url,
            location: '',
            status: 'pending',
            responseTime: null,
            ssl: null,
            dns: null,
            notes: '',
            isChecking: false,
            testDetails: null,
            verdict: null,
            // Перезаписываем значения по умолчанию всеми данными из переданного объекта
            ...data 
        };

        this.data.push(newRow);
        this.saveData();
        return newRow;
    }
    
    /**
     * Удалить строку по индексу
     */
    removeRow(index) {
        if (index >= 0 && index < this.data.length) {
            const removedRow = this.data.splice(index, 1)[0];
            this.saveData();
            return removedRow;
        }
        return null;
    }
    
    /**
     * Очистить кэш и перезагрузить исходные данные
     */
    async clearCache() {
        // Просто удалить данные из localStorage
        State.remove(this.options.storageKey);
        // Очищаем данные в памяти, чтобы следующий loadData их перезагрузил
        this.data = [];
    }
    
    /**
     * Получить количество строк
     */
    getRowCount() {
        return this.data.length;
    }
    
    /**
     * Проверить, есть ли данные
     */
    hasData() {
        return this.data.length > 0;
    }
}

// Экспорт в глобальную область
window.DataManager = DataManager;
