/**
 * Проверщик строк таблицы
 * Отвечает за выполнение тестов для отдельных строк и массовых проверок
 */
class RowChecker {
    constructor(options = {}) {
        this.activeChecks = new Set();
        this.i18n = options.i18n;
        this.testRunner = options.testRunner;
        if (!this.testRunner) {
            throw new Error('RowChecker requires a TestRunner instance.');
        }
    }
    
    /**
     * Проверить одну строку
     */
    async checkRow(rowData, onUpdate) {
        if (this.activeChecks.has(rowData.id)) {
            return; // Уже проверяется
        }
        
        this.activeChecks.add(rowData.id);
        
        // Установить состояние проверки
        rowData.isChecking = true;
        if (onUpdate) onUpdate(rowData);
        
        try {
            // Выполнить проверку через TestRunner
            const results = await this.testRunner.runSingleTest(rowData.url);
            
            // Обновить данные
            Object.assign(rowData, {
                responseTime: results.responseTime,
                ssl: results.ssl,
                dns: results.dns,
                verdict: results.verdict,
                lastChecked: new Date().toISOString(),
                isChecking: false,
                // Сохраняем детальную информацию для подробностей
                testDetails: results.testDetails
            });
            
            if (onUpdate) onUpdate(rowData);
            
        } catch (error) {
            console.error(`Ошибка при проверке ${rowData.name}:`, error);
            
            Object.assign(rowData, { 
                isChecking: false, 
                verdict: { level: 2, message: error.message } 
            });

            if (onUpdate) onUpdate(rowData);

            Notification.show(this.i18n.t('notifications.checkError', { name: rowData.name }), 'error');
        } finally {
            this.activeChecks.delete(rowData.id);
        }
    }
    
    /**
     * Проверить все строки
     */
    async checkAllRows(data, onProgress, onRowUpdate) {
        const uncheckedRows = data
            .map((row, index) => ({ row, index }))
            .filter(({ row }) => !this.activeChecks.has(row.id));
        
        if (uncheckedRows.length === 0) {
            Notification.show(this.i18n.t('notifications.testsAlreadyRunning'), 'warning');
            return;
        }
        
        Notification.show(this.i18n.t('notifications.startingMultipleChecks', { count: uncheckedRows.length }), 'info');
        
        // Проверяем по 3 сайта одновременно для имитации параллельной обработки
        const batchSize = 3;
        const batches = [];
        
        for (let i = 0; i < uncheckedRows.length; i += batchSize) {
            batches.push(uncheckedRows.slice(i, i + batchSize));
        }
        
        let completed = 0;
        const total = uncheckedRows.length;
        
        for (const batch of batches) {
            const promises = batch.map(({ row, index }) => 
                this.checkRow(row, onRowUpdate).then(() => {
                    completed++;
                    if (onProgress) onProgress(completed, total);
                }).catch(error => {
                    completed++;
                    if (onProgress) onProgress(completed, total);
                    console.error(`Ошибка проверки ${row.name}:`, error);
                })
            );
            
            await Promise.all(promises);
            
            // Небольшая пауза между батчами
            if (batch !== batches[batches.length - 1]) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        Notification.show(this.i18n.t('notifications.allChecksCompleted'), 'success');
    }
    
    /**
     * Проверить, выполняется ли проверка для строки
     */
    isChecking(rowId) {
        return this.activeChecks.has(rowId);
    }
    
    /**
     * Получить количество активных проверок
     */
    getActiveChecksCount() {
        return this.activeChecks.size;
    }
    
    /**
     * Отменить все активные проверки
     */
    cancelAllChecks() {
        this.activeChecks.clear();
    }
}

// Экспорт в глобальную область
window.RowChecker = RowChecker;