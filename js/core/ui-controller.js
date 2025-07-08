/**
 * Контроллер управления UI состояниями DPI Probe
 */

class UIController {
    constructor(i18n) {
        this.i18n = i18n;
        if (!this.i18n) {
            throw new Error('UIController requires an i18n service instance.');
        }
        this.elements = new Map();
        this.states = new Map();
    }
    
    /**
     * Инициализация UI элементов
     */
    init() {
        // Кэшируем основные элементы UI
        this.cacheElements([
            'runAllTestsBtn',
            'clearCacheBtn', 
            'checkUrlBtn',
            'urlInput',
            'progressIndicator',
            'modalOverlay',
            'modalClose',
            'infoWidget',
            'userLocation'
        ]);
        
        // Устанавливаем начальные состояния
        this.setInitialStates();
        
        // Отображаем локацию пользователя
        this.displayUserLocation();
    }
    
    /**
     * Получить и отобразить локацию пользователя
     */
    async displayUserLocation() {
        const locationEl = this.getElement('userLocation');
        if (!locationEl) return;

        const ICONS = {
            location: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`,
            isp: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>`
        };

        try {
            const response = await fetch('https://ipwho.is/');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            if (data.success) {
                let html = '';
                const locationString = [data.country, data.city].filter(Boolean).join(', ');

                if (locationString) {
                    html += `<div class="location-item">${ICONS.location}<span>${locationString}</span></div>`;
                }
                if (data.connection && data.connection.isp) {
                    html += `<div class="location-item">${ICONS.isp}<span>${data.connection.isp}</span></div>`;
                }
                html += `<div class="location-ip">${this.i18n.t('location.ip')} ${data.ip}</div>`;
                locationEl.innerHTML = html;
            } else {
                locationEl.innerHTML = `<div class="location-item"><span>${this.i18n.t('location.unavailable')}</span></div>`;
            }
        } catch (error) {
            console.error('Ошибка при получении данных о локации:', error);
            locationEl.innerHTML = `<div class.location-item"><span>${this.i18n.t('location.errorFetching')}</span></div>`;
        }
    }
    
    /**
     * Кэшировать элементы DOM
     */
    cacheElements(elementIds) {
        elementIds.forEach(id => {
            const element = DOM.get(id);
            if (element) {
                this.elements.set(id, element);
            }
        });
    }
    
    /**
     * Получить кэшированный элемент
     */
    getElement(id) {
        return this.elements.get(id);
    }
    
    /**
     * Установить начальные состояния
     */
    setInitialStates() {
        this.states.set('testsRunning', false);
        this.states.set('modalOpen', false);
        this.states.set('appDisabled', false);
    }
    
    /**
     * Установить состояние
     */
    setState(key, value) {
        this.states.set(key, value);
        this.updateUI();
    }
    
    /**
     * Получить состояние
     */
    getState(key) {
        return this.states.get(key);
    }
    
    /**
     * Обновить UI в соответствии с текущими состояниями
     */
    updateUI() {
        this.updateTestingUI();
        this.updateModalUI();
        this.updateAppDisabledUI();
    }
    
    /**
     * Обновить UI тестирования
     */
    updateTestingUI() {
        const testsRunning = this.getState('testsRunning');
        const runAllTestsBtn = this.getElement('runAllTestsBtn');
        const progressIndicator = this.getElement('progressIndicator');
        
        if (runAllTestsBtn) {
            runAllTestsBtn.disabled = testsRunning;
            if (testsRunning) {
                runAllTestsBtn.innerHTML = `<span class="loading-spinner"></span> ${this.i18n.t('buttons.running')}`;
            } else {
                runAllTestsBtn.innerHTML = `<span class="btn-icon">▶</span> ${this.i18n.t('runAllTests')}`;
            }
        }
        
        if (progressIndicator) {
            if (testsRunning) {
                DOM.show(progressIndicator);
            } else {
                DOM.hide(progressIndicator);
            }
        }
    }
    
    /**
     * Обновить UI модального окна
     */
    updateModalUI() {
        const modalOpen = this.getState('modalOpen');
        
        if (modalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }
    
    /**
     * Обновить UI при отключении приложения
     */
    updateAppDisabledUI() {
        const appDisabled = this.getState('appDisabled');
        
        if (appDisabled) {
            this.disableAllControls();
        }
    }
    
    /**
     * Показать прогресс тестирования
     */
    showProgress(show = true) {
        this.setState('testsRunning', show);
    }
    
    /**
     * Установить состояние загрузки для кнопки проверки URL
     */
    setUrlCheckLoading(loading = true) {
        const checkBtn = this.getElement('checkUrlBtn');
        
        if (checkBtn) {
            if (loading) {
                checkBtn.innerHTML = `<span class="loading-spinner"></span> ${this.i18n.t('buttons.checking')}`;
                checkBtn.disabled = true;
            } else {
                // Просто восстанавливаем текст из i18n, который теперь содержит иконку
                checkBtn.innerHTML = this.i18n.t('checkUrl');
                checkBtn.disabled = false;
            }
        }
    }
    
    /**
     * Валидировать поле ввода URL
     */
    validateUrlInput(input) {
        if (!input) return;

        const url = input.value.trim();
        
        if (!url) {
            // Сброс стилей, если поле пустое
            input.style.borderColor = '';
            input.title = '';
            return;
        }
        
        const normalizedUrl = URLUtils.normalize(url);
        
        if (URLUtils.isValid(normalizedUrl)) {
            input.style.borderColor = 'var(--text-success)';
            
            // Показываем тип цели в подсказке
            const targetType = URLUtils.getTargetType(normalizedUrl);
            const typeText = targetType === 'ipv4' ? this.i18n.t('urlInput.ipv4') :
                           targetType === 'ipv6' ? this.i18n.t('urlInput.ipv6') : this.i18n.t('urlInput.domain');
            input.title = `${typeText}: ${normalizedUrl}`;
        } else {
            input.style.borderColor = 'var(--text-error)';
            input.title = this.i18n.t('urlInput.invalidUrl');
        }
    }
    
    /**
     * Отключить все элементы управления
     */
    disableAllControls() {
        const runAllTestsBtn = this.getElement('runAllTestsBtn');
        const clearCacheBtn = this.getElement('clearCacheBtn');
        const checkUrlBtn = this.getElement('checkUrlBtn');
        const urlInput = this.getElement('urlInput');
        
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
        
        this.setState('appDisabled', true);
    }
    
    /**
     * Включить все элементы управления
     */
    enableAllControls() {
        const runAllTestsBtn = this.getElement('runAllTestsBtn');
        const clearCacheBtn = this.getElement('clearCacheBtn');
        const checkUrlBtn = this.getElement('checkUrlBtn');
        const urlInput = this.getElement('urlInput');
        
        if (runAllTestsBtn) {
            runAllTestsBtn.disabled = false;
            runAllTestsBtn.innerHTML = `<span class="btn-icon">▶</span> ${this.i18n.t('runAllTests')}`;
            runAllTestsBtn.title = '';
        }
        
        if (clearCacheBtn) {
            clearCacheBtn.disabled = false;
            clearCacheBtn.title = '';
        }
        
        if (checkUrlBtn) {
            checkUrlBtn.disabled = false;
            checkUrlBtn.innerHTML = this.i18n.t('checkUrl');
            checkUrlBtn.title = '';
        }
        
        if (urlInput) {
            urlInput.disabled = false;
            urlInput.placeholder = this.i18n.t('urlInputPlaceholder');
        }
        
        this.setState('appDisabled', false);
    }
    
    /**
     * Показать ошибку в таблице
     */
    showTableError(message) {
        const tableBody = document.querySelector('.table-body');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="10" class="error-message" style="text-align: center; padding: 40px; color: var(--text-error);">
                        <div style="font-size: 18px; margin-bottom: 10px;">⚠ ${this.i18n.t('appStatus.criticalError')}</div>
                        <div>${message}</div>
                        <div style="margin-top: 10px; font-size: 14px; opacity: 0.8;">
                            ${this.i18n.t('appStatus.checkFileReload')}
                        </div>
                    </td>
                </tr>
            `;
        }
    }
    
    /**
     * Получить статистику UI
     */
    getUIStats() {
        return {
            cachedElements: this.elements.size,
            states: Object.fromEntries(this.states),
            testsRunning: this.getState('testsRunning'),
            modalOpen: this.getState('modalOpen'),
            appDisabled: this.getState('appDisabled')
        };
    }
    
    /**
     * Сбросить все состояния
     */
    reset() {
        this.setInitialStates();
        this.enableAllControls();
        this.updateUI();
    }
    
    /**
     * Очистить кэш элементов
     */
    clearCache() {
        this.elements.clear();
    }
    
    /**
     * Переинициализировать UI
     */
    reinit() {
        this.clearCache();
        this.init();
    }
}

// Экспорт для использования в других модулях
if (typeof window !== 'undefined') {
    window.UIController = UIController;
}
