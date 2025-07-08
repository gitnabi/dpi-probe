/**
 * Рендерер таблицы
 * Отвечает за создание и форматирование элементов таблицы
 */
class TableRenderer {
    constructor(tableElement, options = {}) {
        this.table = tableElement;
        this.tbody = this.table.querySelector('.table-body');
        this.i18n = options.i18n;
        if (!this.i18n) {
            // Создаем заглушку, если сервис не передан, чтобы избежать ошибок
            this.i18n = { t: (key) => key };
            console.warn('TableRenderer initialized without i18n service.');
        }
    }
    
    /**
     * Отрендерить всю таблицу
     */
    render(data) {
        this.tbody.innerHTML = '';
        
        data.forEach((row, index) => {
            const tr = this.createRow(row, index);
            this.tbody.appendChild(tr);
        });
    }
    
    /**
     * Создать строку таблицы
     */
    createRow(rowData, index) {
        const tr = DOM.create('tr', {
            'data-row-id': rowData.id,
            'data-index': index
        });

        const { testDetails, verdict } = rowData;

        tr.innerHTML = `
            <td class="col-number">${index + 1}</td>
            <td class="col-actions">
                <div class="row-actions">
                    <button class="btn-check-row" data-action="check-row" ${rowData.isChecking ? 'disabled' : ''}>
                        ${rowData.isChecking ? `<span class="loading-spinner"></span> ${this.i18n.t('actions.checking')}` : this.i18n.t('actions.check')}
                    </button>
                </div>
            </td>
            <td class="col-name sticky-left" title="${rowData.name}">${Format.truncate(rowData.name, 25)}</td>
            <td class="col-target" title="${rowData.url}">${Format.truncate(rowData.url, 40)}</td>
            <td class="col-location" title="${rowData.location || ''}">${Format.truncate(rowData.location || 'N/A', 15)}</td>
            <td class="col-response-time">${this.formatHTTP(rowData.responseTime, rowData.testDetails)}</td>
            <td class="col-ssl">${this.formatSSL(rowData.ssl, rowData)}</td>
            <td class="col-dns">${this.formatDNS(rowData.dns)}</td>
            <td class="col-details">
                <button class="btn-details" data-action="view-details" ${!testDetails ? 'disabled' : ''}>
                    ${!testDetails ? this.i18n.t('actions.noData') : this.i18n.t('actions.details')}
                </button>
            </td>
            <td class="col-notes sticky-right">
                <div class="verdict-container">
                    <span class="verdict-text">${this.formatVerdict(verdict)}</span>
                    <button class="btn-delete-row" data-action="delete-row" title="${this.i18n.t('actions.delete')}">✕</button>
                </div>
            </td>
        `;
        
        return tr;
    }
    
    /**
     * Обновить одну строку
     */
    updateRow(index, rowData) {
        const row = this.tbody.querySelector(`tr[data-index="${index}"]`);
        if (!row) return;
        
        const newRow = this.createRow(rowData, index);
        row.parentNode.replaceChild(newRow, row);
    }

    /**
     * Форматировать HTTP статус
     */
    formatHTTP(time, details) {
        if (time === null) return '<span class="text-muted">—</span>';

        const isSuccess = details?.http?.connected;
        const icon = isSuccess ? '<span class="status-icon-inline status-success">✓</span>' : '<span class="status-icon-inline status-error">✗</span>';
        
        const formatted = Format.time(time);
        let className = 'text-success';
        
        if (time > 2000) className = 'text-error';
        else if (time > 1000) className = 'text-warning';
        
        return `${icon} <span class="${className}">${formatted}</span>`;
    }
    
    /**
     * Форматировать SSL статус
     */
    formatSSL(ssl, rowData) {
        if (ssl === null || typeof ssl === 'undefined') return '<span class="text-muted">—</span>';
        
        // Для IP-адресов SSL почти всегда невалиден, это ожидаемо
        if (rowData && URLUtils.getTargetType(rowData.url) !== 'domain' && ssl === 'invalid') {
            return '<span class="text-warning">⚠</span>';
        }

        const sslMap = {
            'valid': '<span class="text-success">✓</span>',
            'invalid': '<span class="text-error">✗</span>',
            'no_ssl': '<span class="text-muted">HTTP</span>',
        };
        
        return sslMap[ssl] || '<span class="text-muted">—</span>';
    }
    
    /**
     * Форматировать DNS статус
     */
    formatDNS(dns) {
        if (dns === null || typeof dns === 'undefined') return '<span class="text-muted">—</span>';
        
        if (typeof dns === 'number') {
            const formatted = Format.time(dns);
            let className = 'text-success';
            
            if (dns > 500) className = 'text-error';
            else if (dns > 200) className = 'text-warning';
            
            return `<span class="${className}">${formatted}</span>`;
        }
        
        return '<span class="text-error">Ошибка</span>';
    }
    
    /**
     * Форматировать вердикт
     */
    formatVerdict(verdict) {
        if (!verdict || !verdict.messageKey) return '<span class="text-muted">—</span>';

        let className = '';
        const verdictText = this.i18n.t(`verdicts.${verdict.messageKey}`);

        switch (verdict.level) {
            case 1: // Предупреждение
                className = 'text-warning';
                break;
            case 2: // Ошибка
                className = 'text-error';
                break;
            default: // Успех
                className = 'text-success';
        }

        return `<span class="${className}" title="${verdictText}">${verdictText}</span>`;
    }
    
    /**
     * Очистить таблицу
     */
    clear() {
        this.tbody.innerHTML = '';
    }
    
    /**
     * Получить строку по индексу
     */
    getRow(index) {
        return this.tbody.querySelector(`tr[data-index="${index}"]`);
    }
    
    /**
     * Получить все строки
     */
    getAllRows() {
        return this.tbody.querySelectorAll('tr');
    }
}

// Экспорт в глобальную область
window.TableRenderer = TableRenderer;