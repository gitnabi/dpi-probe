/**
 * Модуль инициализации приложения DPI Probe
 */

class AppInitializer {
    constructor(options = {}) {
        if (!options.i18n) {
            throw new Error('AppInitializer requires an i18n service instance.');
        }
        if (!options.modalManager) {
            throw new Error('AppInitializer requires a ModalManager instance.');
        }
        this.i18n = options.i18n;
        this.modalManager = options.modalManager;
        this.dataTable = null;
        this.testRunner = null;
        this.urlResultsContainer = null;
    }
    
    /**
     * Инициализация приложения
     */
    async init() {
        // Ждем загрузки DOM
        if (document.readyState === 'loading') {
            return new Promise((resolve) => {
                document.addEventListener('DOMContentLoaded', () => {
                    this.initializeComponents().then(resolve);
                });
            });
        } else {
            return this.initializeComponents();
        }
    }
    
    /**
     * Инициализация компонентов приложения
     */
    async initializeComponents() {
        try {
            // Инициализация компонентов
            this.testRunner = new TestRunner({ i18n: this.i18n });
            this.dataTable = new DataTable('dataTable', { 
                i18n: this.i18n,
                modalManager: this.modalManager,
                testRunner: this.testRunner
            });
            await this.dataTable.init();
            this.urlResultsContainer = DOM.get('urlResultsContainer');
            
            // DPI Probe приложение инициализировано
            
            return {
                dataTable: this.dataTable,
                testRunner: this.testRunner,
                urlResultsContainer: this.urlResultsContainer
            };
            
        } catch (error) {
            console.error('Ошибка инициализации приложения:', error);
            
            // Проверяем, является ли это критической ошибкой загрузки CSV
            if (error.message && error.message.includes('targets_to_check.csv')) {
                // Показываем критическую ошибку с подробностями
                const errorMessage = `${this.i18n.t('appStatus.loadingError')}: Не удалось загрузить или обработать файл targets_to_check.csv.`;
                Notification.show(errorMessage, 'error', 0);
                
                // Блокируем функциональность приложения
                this.disableAppFunctionality(error);
                throw new Error('Critical CSV loading error');
            } else {
                Notification.show(this.i18n.t('appStatus.criticalError'), 'error');
                throw error;
            }
        }
    }
    
    /**
     * Блокировать функциональность приложения при критической ошибке
     */
    disableAppFunctionality(error) {
        // Отключаем все кнопки управления
        const runAllTestsBtn = DOM.get('runAllTestsBtn');
        const clearCacheBtn = DOM.get('clearCacheBtn');
        const checkUrlBtn = DOM.get('checkUrlBtn');
        const urlInput = DOM.get('urlInput');
        
        if (runAllTestsBtn) {
            runAllTestsBtn.disabled = true;
            runAllTestsBtn.innerHTML = `<span class="btn-icon">⚠</span> ${this.i18n.t('appStatus.unavailable')}`;
            runAllTestsBtn.title = this.i18n.t('appStatus.functionUnavailable');
        }
        
        if (clearCacheBtn) {
            clearCacheBtn.disabled = true;
            clearCacheBtn.title = this.i18n.t('appStatus.functionUnavailable');
        }
        
        if (checkUrlBtn) {
            checkUrlBtn.disabled = true;
            checkUrlBtn.innerHTML = `<span class="btn-icon">⚠</span> ${this.i18n.t('appStatus.unavailable')}`;
            checkUrlBtn.title = this.i18n.t('appStatus.functionUnavailable');
        }
        
        if (urlInput) {
            urlInput.disabled = true;
            urlInput.placeholder = this.i18n.t('appStatus.inputUnavailable');
        }
        
        // Показываем сообщение об ошибке в таблице
        const tableBody = document.querySelector('.table-body');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="11" class="error-message" style="text-align: center; padding: 40px; color: var(--text-error);">
                        <div style="font-size: 18px; margin-bottom: 10px;">⚠ ${this.i18n.t('appStatus.loadingError')}</div>
                        <div>${error.message}</div>
                        <div style="margin-top: 20px; font-size: 14px; opacity: 0.8; text-align: left; max-width: 600px; margin-left: auto; margin-right: auto;">
                            <strong>${this.i18n.t('appStatus.howToFix')}</strong>
                            <ul style="list-style-position: inside; padding-left: 0; margin-top: 8px;">
                                <li>${this.i18n.t('appStatus.csvExists')}</li>
                                <li>${this.i18n.t('appStatus.csvFormat')}</li>
                                <li>${this.i18n.t('appStatus.csvRowFormat')}</li>
                                <li>${this.i18n.t('appStatus.csvExample')}</li>
                            </ul>
                        </div>
                    </td>
                </tr>
            `;
        }
        
        console.error(`${this.i18n.t('appStatus.appBlocked')}`, error);
    }
}

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
    window.AppInitializer = AppInitializer;
}
