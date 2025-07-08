/**
 * Контроллер тестирования DPI Probe
 */

class TestController {
    constructor(testRunner, dataTable, options = {}) {
        this.testRunner = testRunner;
        this.dataTable = dataTable;
        this.i18n = options.i18n;
        if (!this.i18n) {
            throw new Error('TestController requires an i18n service instance.');
        }
        this.isRunningTests = false;
        this.lastSingleResult = null; // Добавляем свойство для хранения результата
    }
    
    /**
     * Очистить последний результат одиночной проверки
     */
    clearLastSingleResult() {
        this.lastSingleResult = null;
    }
    
    /**
     * Запустить все тесты
     */
    async runAllTests() {
        if (this.isRunningTests) {
            Notification.show(this.i18n.t('notifications.testsRunning'), 'warning');
            return;
        }
        
        this.isRunningTests = true;
        this.showProgress(true);
        
        try {
            await this.dataTable.checkAllRows();
        } catch (error) {
            console.error('Ошибка при выполнении тестов:', error);
            Notification.show(this.i18n.t('notifications.testsError'), 'error');
        } finally {
            this.isRunningTests = false;
            this.showProgress(false);
        }
    }
    
    /**
     * Проверить одиночный URL
     */
    async checkSingleUrl(url) {
        if (!url) {
            throw new Error(this.i18n.t('notifications.urlRequired'));
        }
        
        const normalizedUrl = URLUtils.normalize(url);
        
        if (!URLUtils.isValid(normalizedUrl)) {
            throw new Error(this.i18n.t('notifications.invalidUrl'));
        }
        
        const results = await this.testRunner.runSingleTest(normalizedUrl);
        
        // Формируем результат и сохраняем его
        this.lastSingleResult = {
            id: `single_${Date.now()}`,
            url: normalizedUrl,
            domain: URLUtils.getDomain(normalizedUrl),
            ...results
        };
        
        return this.lastSingleResult;
    }
    
    /**
     * Добавить результат теста в таблицу
     */
    addTestResultToTable(testResult) {
        const { testDetails, verdict } = testResult;
        const { http, ssl, dns } = testDetails;

        // 1. Определяем имя: используем результат rDNS если он успешен, иначе домен из URL, или сам URL
        const isReverseDnsSuccess = dns.resolved && dns.reverseDomain;
        const name = isReverseDnsSuccess ? dns.reverseDomain : (URLUtils.getDomain(testResult.url) || testResult.url);

        // 2. Формируем объект строки, извлекая данные из testDetails
        const newRowData = {
            name: name,
            url: testResult.url,
            status: http.connected ? 'success' : 'error',
            responseTime: http.responseTime,
            ssl: ssl.status,
            dns: dns.resolveTime,
            notes: this.i18n.t('notifications.addedOn', { date: Format.date() }),
            testDetails: testDetails, // Передаем все детали для кнопки "Подробности"
            verdict: verdict,
            lastChecked: testResult.lastChecked // <--- Вот это изменение
        };
        
        this.dataTable.addRow(newRowData);
        Notification.show(this.i18n.t('notifications.addedToTable', { name }), 'success');
    }
    
    /**
     * Очистить кэш и перестроить таблицу
     */
    async clearCache() {
        try {
            // 1. Очищаем кэш в DataManager (теперь он только удаляет из localStorage)
            await this.dataTable.dataManager.clearCache();
            
            // 2. Перезагружаем и рендерим таблицу. 
            // dataTable.init() вызовет dataManager.loadData(), который, не найдя кэша,
            // загрузит данные из CSV.
            await this.dataTable.init();
            
            Notification.show(this.i18n.t('notifications.cacheCleared'), 'success');
        } catch (error) {
            console.error('Ошибка при очистке кэша в TestController:', error);
            Notification.show(this.i18n.t('notifications.cacheClearError'), 'error');
            // Пробрасываем ошибку, чтобы ее можно было обработать выше
            throw error;
        }
    }
    
    /**
     * Показать/скрыть прогресс
     */
    showProgress(show) {
        const progressIndicator = DOM.get('progressIndicator');
        const runAllTestsBtn = DOM.get('runAllTestsBtn');
        
        if (show) {
            DOM.show(progressIndicator);
            runAllTestsBtn.disabled = true;
            runAllTestsBtn.innerHTML = `<span class="loading-spinner"></span> ${this.i18n.t('buttons.running')}`;
        } else {
            DOM.hide(progressIndicator);
            runAllTestsBtn.disabled = false;
            runAllTestsBtn.innerHTML = `<span class="btn-icon">▶</span> ${this.i18n.t('runAllTests')}`;
        }
    }
    
    /**
     * Проверить, выполняются ли тесты
     */
    isTestsRunning() {
        return this.isRunningTests;
    }
    
    /**
     * Получить статистику тестирования
     */
    getTestingStats() {
        return {
            isRunning: this.isRunningTests,
            totalRows: this.dataTable ? this.dataTable.getRowCount() : 0,
            hasData: this.dataTable ? this.dataTable.hasData() : false
        };
    }
    
    /**
     * Остановить все активные тесты
     */
    stopAllTests() {
        if (this.isRunningTests) {
            this.isRunningTests = false;
            this.showProgress(false);
            
            // Попытаться остановить тесты в таблице
            if (this.dataTable && typeof this.dataTable.cancelAllChecks === 'function') {
                this.dataTable.cancelAllChecks();
            }
            
            Notification.show(this.i18n.t('notifications.testsStopped'), 'info');
        }
    }
}

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
    window.TestController = TestController;
}

