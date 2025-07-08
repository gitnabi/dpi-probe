/**
 * Утилиты для работы с URL
 */

const URLUtils = {
    /**
     * Проверить, является ли строка IPv4 адресом
     */
    isIPv4: (str) => {
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return ipv4Regex.test(str);
    },

    /**
     * Проверить, является ли строка IPv6 адресом
     */
    isIPv6: (str) => {
        const ipv6Regex = /^(?:(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(?:(?::[0-9a-fA-F]{1,4}){1,6})|:(?:(?::[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(?::[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(?:ffff(?::0{1,4}){0,1}:){0,1}(?:(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])|(?:[0-9a-fA-F]{1,4}:){1,4}:(?:(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
        return ipv6Regex.test(str);
    },

    /**
     * Проверить, является ли строка IP-адресом
     */
    isIPAddress: (str) => {
        return URLUtils.isIPv4(str) || URLUtils.isIPv6(str);
    },
    
    /**
     * Проверить валидность URL или IP-адреса
     */
    isValid: (url) => {
        try {
            // Для IPv6 нужно обернуть в скобки для конструктора URL
            const potentialIPv6 = url.replace(/^https?:\/\//, '');
            if (URLUtils.isIPv6(potentialIPv6)) {
                new URL(`http://[${potentialIPv6}]`);
                return true;
            }
            new URL(url);
            return true;
        } catch {
            const cleanUrl = url.replace(/^https?:\/\//, '');
            return URLUtils.isIPAddress(cleanUrl);
        }
    },
    
    /**
     * Нормализовать URL или IP-адрес (добавить протокол если отсутствует)
     */
    normalize: (url) => {
        if (!url) return '';
        
        url = url.trim();
        
        if (URLUtils.isIPv6(url)) {
            return `http://[${url}]`;
        }
        
        if (URLUtils.isIPv4(url)) {
            return 'http://' + url;
        }
        
        if (!url.match(/^https?:\/\//)) {
            url = 'https://' + url;
        }
        
        return url;
    },
    
    /**
     * Извлечь домен или IP из URL
     */
    getDomain: (url) => {
        try {
            const hostname = new URL(url).hostname;
            // Убираем скобки для IPv6-адресов
            return hostname.replace(/\[|\]/g, '');
        } catch {
            const cleanUrl = url.replace(/^https?:\/\//, '').split('/')[0];
            return cleanUrl.replace(/\[|\]/g, '');
        }
    },
    
    /**
     * Определить тип цели (domain, ipv4, ipv6)
     */
    getTargetType: (url) => {
        const domain = URLUtils.getDomain(url);
        if (URLUtils.isIPv6(domain)) {
            return 'ipv6';
        }
        if (URLUtils.isIPv4(domain)) {
            return 'ipv4';
        }
        return 'domain';
    }
};

// Экспорт в глобальную область для обратной совместимости
window.URLUtils = URLUtils;

