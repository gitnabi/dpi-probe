/**
 * Утилиты для форматирования
 */

const Format = {
    i18n: null,

    init(i18n) {
        this.i18n = i18n;
    },

    /**
     * Форматировать время в миллисекундах
     */
    time: (ms) => {
        if (!Format.i18n) {
            console.error('Format.i18n is not initialized. Call Format.init(i18n) first.');
            return `${ms} ms`;
        }
        if (ms < 1000) {
            return `${ms}\u00A0${Format.i18n.t('timeUnits.ms')}`;
        } else if (ms < 60000) {
            return `${(ms / 1000).toFixed(1)}\u00A0${Format.i18n.t('timeUnits.s')}`;
        } else {
            return `${(ms / 60000).toFixed(1)}\u00A0${Format.i18n.t('timeUnits.min')}`;
        }
    },
    
    /**
     * Форматировать дату
     */
    date: (date = new Date()) => {
        return date.toLocaleString('ru-RU', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    },

    /**
     * Обрезать текст до указанной длины
     */
    truncate: (text, maxLength = 50) => {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }
};



