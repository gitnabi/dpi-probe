/**
 * Основной класс приложения DPI Probe
 */

class DPIProbeApp {
    constructor() {
        // Сервис интернационализации
        this.i18n = new I18nService();

        // Компоненты приложения
        this.modalManager = new ModalManager({ i18n: this.i18n });
        this.initializer = new AppInitializer({ 
            i18n: this.i18n,
            modalManager: this.modalManager
        });
        this.eventManager = new EventManager();
        this.testController = null;
        this.resultViewer = null;
        this.uiController = new UIController(this.i18n);
        
        // Основные объекты
        this.dataTable = null;
        this.testRunner = null;
        this.urlResultsContainer = null;
        
        this.init();
    }
    
    /**
     * Инициализация приложения
     */
    async init() {
        try {
            // Инициализация сервиса переводов
            await this.i18n.init();

            // Инициализация утилит
            Format.init(this.i18n);
            DetailsRenderer.init(this.i18n);

            // Инициализация UI
            this.uiController.init();
            
            // Инициализация компонентов
            const components = await this.initializer.init();
            this.dataTable = components.dataTable;
            this.testRunner = components.testRunner;
            this.urlResultsContainer = components.urlResultsContainer;
            
            // Инициализация контроллеров
            this.testController = new TestController(this.testRunner, this.dataTable, { i18n: this.i18n });
            this.resultViewer = new ResultViewer(this.urlResultsContainer, { i18n: this.i18n });
            
            // Настройка обработчиков событий для результатов
            this.resultViewer.setEventHandlers({
                onAddToTable: (testResult) => this.addTestResultToTable(testResult)
            });
            
            // Инициализация модального окна
            this.modalManager.init();
            
            // Привязка событий
            this.eventManager.bindEvents(this);

            // Привязка кастомных событий приложения
            this.bindCustomEvents();

            // Привязка событий переключателя языка
            this.bindLangSwitcherEvents();
            
            // DPI Probe приложение успешно инициализировано
            
        } catch (error) {
            console.error('Критическая ошибка инициализации:', error);
            
            if (error.message === 'Critical CSV loading error') {
                this.uiController.disableAllControls();
                this.uiController.showTableError(this.i18n.t('notifications.csvLoadErrorGeneral'));
            }
        }
    }

    /**
     * Привязать кастомные события
     */
    bindCustomEvents() {
        Events.listen('result-card-closed', () => {
            if (this.testController) {
                this.testController.clearLastSingleResult();
            }
        });
    }

    /**
     * Привязать события к переключателю языка
     */
    bindLangSwitcherEvents() {
        const langSwitcher = document.getElementById('langSwitcher');
        if (!langSwitcher) return;

        // Устанавливаем активную кнопку
        this.updateLangSwitcherUI();

        langSwitcher.addEventListener('click', (event) => {
            const button = event.target.closest('.lang-btn');
            if (button && button.dataset.lang) {
                const lang = button.dataset.lang;
                this.changeLanguage(lang);
            }
        });
    }

    /**
     * Обновить UI переключателя языка
     */
    updateLangSwitcherUI() {
        const currentLang = this.i18n.getCurrentLang();
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === currentLang);
        });
    }

    /**
     * Сменить язык
     */
    async changeLanguage(lang) {
        await this.i18n.changeLang(lang);
        this.updateLangSwitcherUI();
        
        // Перерисовываем компоненты
        this.dataTable.render(); 
        if (this.resultViewer) {
            this.resultViewer.render();
        }
        this.uiController.updateUI();
    }
    
    /**
     * Запустить все тесты
     */
    async runAllTests() {
        if (this.uiController.getState('testsRunning')) {
            Notification.show(this.i18n.t('notifications.testsRunning'), 'warning');
            return;
        }

        try {
            this.uiController.setState('testsRunning', true);
            await this.testController.runAllTests();
        } catch (error) {
            console.error('Ошибка при запуске тестов:', error);
        } finally {
            this.uiController.setState('testsRunning', false);
        }
    }
    
    /**
     * Проверить одиночный URL
     */
    async checkSingleUrl() {
        const urlInput = this.uiController.getElement('urlInput');
        const url = urlInput ? urlInput.value.trim() : '';
        
        if (!url) {
            Notification.show(this.i18n.t('notifications.enterUrl'), 'warning');
            if (urlInput) urlInput.focus();
            return;
        }
        
        try {
            this.uiController.setUrlCheckLoading(true);
            
            const testResult = await this.testController.checkSingleUrl(url);
            
            // Показать результат
            this.resultViewer.showUrlTestResult(testResult);
            
            // Очистить поле ввода
            if (urlInput) urlInput.value = '';
            
        } catch (error) {
            console.error('Ошибка при проверке URL:', error);
            Notification.show(this.i18n.t('notifications.checkError', { message: error.message }), 'error');
        } finally {
            this.uiController.setUrlCheckLoading(false);
        }
    }
    
    /**
     * Показать детали теста в модальном окне
     */
    showTestDetails(testResult) {
        this.dataTable.detailsViewer.showRowDetails(testResult);
    }

    /**
     * Закрыть мо.льное окно
     */
    closeModal() {
        this.modalManager.hide();
    }
    
    /**
     * Добавить результат теста в таблицу
     */
    addTestResultToTable(testResult) {
        this.testController.addTestResultToTable(testResult);
    }
    
    /**
     * Валидация поля ввода URL
     */
    validateUrlInput(input) {
        this.uiController.validateUrlInput(input);
    }
    
    /**
     * Очистить кэш
     */
    async clearCache() {
        const confirmed = await this.modalManager.showConfirm(
            this.i18n.t('notifications.confirmClearCacheTitle'),
            this.i18n.t('notifications.confirmClearCacheMessage')
        );

        if (!confirmed) return;

        try {
            // Очистить результаты URL тестов
            this.resultViewer.clearAllResults();
            
            // Очистить кэш через контроллер тестирования
            await this.testController.clearCache();
            
        } catch (error) {
            console.error('Ошибка при очистке кэша:', error);
            
            if (error.message === 'Critical CSV loading error') {
                this.uiController.disableAllControls();
                this.uiController.showTableError(this.i18n.t('notifications.csvLoadError'));
            }
        }
    }
    
    /**
     * Получить статистику приложения
     */
    getAppStats() {
        return {
            ui: this.uiController.getUIStats(),
            testing: this.testController ? this.testController.getTestingStats() : null,
            results: {
                urlResultsCount: this.resultViewer ? this.resultViewer.getResultsCount() : 0
            },
            modal: {
                isOpen: this.modalManager ? this.modalManager.isModalOpen() : false
            },
            events: {
                boundEventsCount: this.eventManager ? this.eventManager.getBoundEventsCount() : 0
            }
        };
    }
    
    /**
     * Перезапустить приложение
     */
    async restart() {
        try {
            // Отвязать все события
            this.eventManager.unbindAll();
            
            // Закрыть модальное окно
            this.closeModal();
            
            // Очистить результаты
            this.resultViewer.clearAllResults();
            
            // Сбросить UI состояния
            this.uiController.reset();
            
            // Переинициализировать
            await this.init();
            
            Notification.show(this.i18n.t('notifications.appRestarted'), 'success');
            
        } catch (error) {
            console.error('Ошибка при перезапуске приложения:', error);
            Notification.show(this.i18n.t('notifications.appRestartError'), 'error');
        }
    }
    
    /**
     * Уничтожить приложение и освободить ресурсы
     */
    destroy() {
        // Отвязать все события
        if (this.eventManager) {
            this.eventManager.unbindAll();
        }
        
        // Закрыть модальное окно
        if (this.modalManager) {
            this.modalManager.hide();
        }
        
        // Очистить результаты
        if (this.resultViewer) {
            this.resultViewer.clearAllResults();
        }
        
        // Очистить UI кэш
        if (this.uiController) {
            this.uiController.clearCache();
        }
        
        // Уничтожить таблицу
        if (this.dataTable && typeof this.dataTable.destroy === 'function') {
            this.dataTable.destroy();
        }
        
        // DPI Probe приложение уничтожено
    }
}

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
    window.DPIProbeApp = DPIProbeApp;
}
