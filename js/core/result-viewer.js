/**
 * Модуль отображения результатов тестов DPI Probe
 */
class ResultViewer {
    constructor(container, options = {}) {
        this.container = container;
        if (!options.i18n) {
            throw new Error('ResultViewer requires an i18n service instance.');
        }
        this.i18n = options.i18n;
        this.lastTestResult = null;
    }

    /**
     * Показать результат проверки URL
     */
    showUrlTestResult(testResult) {
        this.lastTestResult = testResult;
        this.render();
    }

    /**
     * Рендер (перерисовка) карточки с результатами
     */
    render() {
        // Всегда очищаем контейнер перед отрисовкой
        this.container.innerHTML = '';

        if (!this.lastTestResult) {
            return; // Если нет данных, контейнер останется пустым
        }

        const resultCard = this.createResultCard(this.lastTestResult);
        this.container.appendChild(resultCard);
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    /**
     * Создать карточку с результатами
     */
    createResultCard(testResult) {
        const card = DOM.create('div', { className: 'url-result-card fade-in' });
        
        // Создаем объект, похожий на rowData, для DetailsRenderer
        const renderData = {
            ...testResult,
            lastChecked: new Date().toISOString() // Для ручной проверки используем текущее время
        };

        card.innerHTML = `
            <div class="url-result-header">
                <h3 class="url-result-title">${this.i18n.t('modalContent.testDetailsTitle')} <span class="details-target">${testResult.url}</span></h3>
                <button class="url-result-close" data-action="close-result">&times;</button>
            </div>
            <div class="url-result-content">
                ${this.renderVerdict(testResult.verdict)}
                ${DetailsRenderer.render(renderData)}
            </div>
            <div class="url-result-actions">
                <button class="btn btn-secondary" data-action="add-to-table">${this.i18n.t('buttons.add')}</button>
            </div>
        `;

        this.bindResultCardEvents(card, testResult);
        return card;
    }
    
    /**
     * Рендер секции с вердиктом
     */
    renderVerdict(verdict) {
        if (!verdict || !verdict.messageKey) return '';
        
        let statusClass, icon;
        const verdictText = this.i18n.t(`verdicts.${verdict.messageKey}`);

        switch (verdict.level) {
            case 1: 
                statusClass = 'warning';
                icon = '⚠️';
                break;
            case 2: 
                statusClass = 'error';
                icon = '🚫';
                break;
            default: 
                statusClass = 'success';
                icon = '✅';
        }

        return `
            <div class="verdict-highlight-card status-border-${statusClass}">
                <div class="verdict-highlight-header">
                    <span class="verdict-highlight-icon">${icon}</span>
                    <h4 class="verdict-highlight-title">${this.i18n.t('table.colVerdict')}</h4>
                </div>
                <p class="verdict-highlight-text">${verdictText}</p>
            </div>
        `;
    }

    /**
     * Привязать события к карточке
     */
    bindResultCardEvents(card, testResult) {
        const closeButton = card.querySelector('[data-action="close-result"]');
        Events.on(closeButton, 'click', () => this.closeResultCard(card));

        const addButton = card.querySelector('[data-action="add-to-table"]');
        Events.on(addButton, 'click', () => {
            if (this.onAddToTable) {
                // Добавляем время проверки перед передачей в таблицу
                const resultWithTimestamp = {
                    ...testResult,
                    lastChecked: new Date().toISOString()
                };
                this.onAddToTable(resultWithTimestamp);
                this.closeResultCard(card);
            }
        });
    }

    /**
     * Закрыть карточку
     */
    closeResultCard(card) {
        // СНАЧАЛА очищаем данные и отправляем событие
        this.lastTestResult = null;
        Events.emit('result-card-closed');

        // ПОТОМ запускаем анимацию
        Animation.fadeOut(card, 300, () => {
            if (card.parentNode) {
                card.parentNode.removeChild(card);
            }
        });
    }

    /**
     * Установить обработчики
     */
    setEventHandlers(handlers) {
        this.onAddToTable = handlers.onAddToTable;
    }

    /**
     * Очистить все отображенные результаты
     */
    clearAllResults() {
        this.container.innerHTML = '';
        this.lastTestResult = null;
    }
}

// Экспорт
window.ResultViewer = ResultViewer;
