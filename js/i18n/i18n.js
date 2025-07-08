/**
 * I18nService - сервис для интернационализации
 */
class I18nService {
    constructor(supportedLanguages = ['en', 'ru']) {
        this.supportedLanguages = supportedLanguages;
        this.translations = {};
        this.currentLang = this.getInitialLang();
    }

    /**
     * Инициализация сервиса
     */
    async init() {
        await this.loadTranslations(this.currentLang);
        this.translatePage();
    }

    /**
     * Получить переведенную строку по ключу
     * @param {string} key - Ключ для перевода (например, 'table.colName')
     * @param {object} replacements - Объект для замены плейсхолдеров (например, { name: 'Google' })
     */
    t(key, replacements = {}) {
        const keys = key.split('.');
        let translation = this.translations;

        for (const k of keys) {
            translation = translation[k];
            if (translation === undefined) {
                console.warn(`[I18n] Translation not found for key: ${key}`);
                return key;
            }
        }

        if (typeof translation === 'string' && Object.keys(replacements).length > 0) {
            return Object.entries(replacements).reduce((acc, [placeholder, value]) => {
                return acc.replace(`{${placeholder}}`, value);
            }, translation);
        }

        return translation;
    }

    /**
     * Сменить язык
     * @param {string} lang - Новый язык (например, 'en')
     */
    async changeLang(lang) {
        if (!this.supportedLanguages.includes(lang)) {
            console.error(`[I18n] Unsupported language: ${lang}`);
            return;
        }
        this.currentLang = lang;
        localStorage.setItem('dpi-probe-lang', lang);
        await this.loadTranslations(lang);
        this.translatePage();
    }

    /**
     * Загрузить файл с переводами
     */
    async loadTranslations(lang) {
        try {
            const response = await fetch(`lang/${lang}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load ${lang}.json`);
            }
            const buffer = await response.arrayBuffer();
            const decoder = new TextDecoder('utf-8');
            const text = decoder.decode(buffer);
            this.translations = JSON.parse(text);
        } catch (error) {
            console.error('[I18n] Error loading translations:', error);
            // Загружаем английский как запасной вариант
            if (lang !== 'en') {
                await this.loadTranslations('en');
            }
        }
    }

    /**
     * Перевести все элементы на странице с атрибутом data-i18n
     */
    translatePage() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.dataset.i18n;
            const translation = this.t(key);
            if (typeof translation === 'string') {
                // Проверяем, является ли элемент input'ом, чтобы установить placeholder
                if (element.tagName === 'INPUT' && element.placeholder) {
                    element.placeholder = translation;
                } else {
                    element.textContent = translation;
                }
            }
        });

        // Обновляем заголовки, которые не являются частью основного контента
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.dataset.i18nTitle;
            element.title = this.t(key);
        });
    }

    /**
     * Получить начальный язык
     */
    getInitialLang() {
        const savedLang = localStorage.getItem('dpi-probe-lang');
        if (savedLang && this.supportedLanguages.includes(savedLang)) {
            return savedLang;
        }

        const browserLang = navigator.language.split('-')[0];
        if (this.supportedLanguages.includes(browserLang)) {
            return browserLang;
        }

        return this.supportedLanguages[0]; // Возвращаем первый поддерживаемый язык (en)
    }

    /**
     * Получить текущий язык
     */
    getCurrentLang() {
        return this.currentLang;
    }
}


