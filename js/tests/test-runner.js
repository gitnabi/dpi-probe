/**
 * Основной класс-оркестратор для выполнения тестов
 */
class TestRunner {
    constructor(options = {}) {
        this.i18n = options.i18n;
        if (!this.i18n) {
            throw new Error('TestRunner requires an i18n service instance.');
        }
    }

    /**
     * Выполнить полную проверку для одного URL
     */
    async runSingleTest(url) {
        const totalStartTime = performance.now();

        // 1. Проверка доступности (HTTP)
        const availability = await this._checkAvailability(url);
        
        // 2. Определяем тип цели для корректной обработки
        const targetType = URLUtils.getTargetType(url);
        const domain = URLUtils.getDomain(url);
        
        // 3. Проверка SSL
        const sslResult = await NetworkUtils.checkSSL(url);
        let sslStatus = 'invalid';
        if (!sslResult.hasSSL) {
            sslStatus = 'no_ssl'; // HTTP протокол
        } else if (sslResult.valid) {
            sslStatus = 'valid';
        }
        
        // 4. Проверка DNS
        let dnsTime = null;
        let dnsDetails = null;
        if (targetType === 'domain') {
            dnsDetails = await NetworkUtils.resolveDNS(domain);
            dnsTime = dnsDetails.resolved ? dnsDetails.resolveTime : null;
        } else {
            // Для IP-адресов делаем обратный DNS lookup
            const reverseDnsResult = await NetworkUtils.reverseResolveDNS(domain);
            dnsTime = reverseDnsResult.resolved ? reverseDnsResult.resolveTime : null;
            dnsDetails = {
                ...reverseDnsResult,
                spoofed: false, // Спуфинг не применим к обратному DNS
                servers: { // Для консистентности данных
                    'google': { resolved: reverseDnsResult.resolved, ips: reverseDnsResult.reverseDomain ? [reverseDnsResult.reverseDomain] : [], error: reverseDnsResult.error, resolveTime: reverseDnsResult.resolveTime },
                    'cloudflare': { resolved: reverseDnsResult.resolved, ips: reverseDnsResult.reverseDomain ? [reverseDnsResult.reverseDomain] : [], error: reverseDnsResult.error, resolveTime: reverseDnsResult.resolveTime }
                },
                ptrQueryName: reverseDnsResult.ptrQueryName
            };
        }
        
        const totalExecutionTime = Math.round(performance.now() - totalStartTime);

        // 5. Собираем детальную информацию
        const testDetails = {
            totalExecutionTime,
            http: {
                url: url,
                connected: availability.available,
                responseTime: availability.responseTime,
                statusCode: availability.statusCode,
                responseType: availability.responseType,
                errorName: availability.errorName,
                method: availability.method,
                message: availability.available ? 'detailsCard.http.success' : 'detailsCard.http.error'
            },
            ssl: {
                hasSSL: sslResult.hasSSL,
                valid: sslResult.valid,
                status: sslStatus,
                protocol: sslResult.protocol || (url.startsWith('https://') ? 'TLS' : 'HTTP'),
                checkTime: sslResult.checkTime,
                responseType: sslResult.responseType,
                isBlackHoled: sslResult.isBlackHoled,
                errorName: sslResult.errorName,
                method: sslResult.method,
                message: sslResult.valid ? 'detailsCard.ssl.success' :
                        (!sslResult.hasSSL ? 'detailsCard.ssl.warning' : 'detailsCard.ssl.error')
            },
            dns: {
                ...dnsDetails,
                resolved: dnsDetails?.resolved || false,
                ipAddresses: dnsDetails?.ipAddresses || [],
                spoofed: dnsDetails?.spoofed || false,
                servers: dnsDetails?.servers || {},
                reverseDomain: dnsDetails?.reverseDomain || null,
                recordType: dnsDetails?.recordType || (targetType === 'domain' ? 'A' : 'PTR'),
                error: dnsDetails?.error || null,
                message: dnsDetails?.resolved ? 'detailsCard.dns.success' : 'detailsCard.dns.error'
            }
        };
        
        // 6. Формируем итоговый результат
        return {
            responseTime: availability.responseTime,
            ssl: sslStatus,
            dns: dnsTime,
            verdict: this.getVerdict({ ...availability, ssl: sslStatus, testDetails, targetType }),
            testDetails
        };
    }

    /**
     * Проверить доступность URL через реальный HTTP запрос
     */
    async _checkAvailability(url) {
        const startTime = performance.now();
        const timeout = 8000;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            await fetch(url, {
                method: 'GET',
                mode: 'no-cors',
                cache: 'no-cache',
                redirect: 'follow',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            const responseTime = Math.round(performance.now() - startTime);
            
            return {
                available: true,
                responseTime,
                statusCode: 200, // В no-cors реальный статус недоступен
                responseType: 'Opaque (no-cors)',
                method: 'GET'
            };
            
        } catch (error) {
            const responseTime = Math.round(performance.now() - startTime);
            
            return {
                available: false,
                responseTime,
                statusCode: error.name === 'AbortError' ? 408 : 0,
                error: error.message,
                errorName: error.name,
                method: 'GET'
            };
        }
    }

    /**
     * Вынести вердикт на основе результатов тестов
     */
    getVerdict(results) {
        const { available: connected, ssl, testDetails, targetType } = results;
        const dnsResolved = testDetails.dns.resolved;
        const dnsSpoofed = testDetails.dns.spoofed;
        const isBlackHoled = testDetails.ssl.isBlackHoled;

        // Наивысший приоритет: явные признаки цензуры
        if (dnsSpoofed) {
            return { level: 2, messageKey: 'dnsSpoofing' };
        }
        if (isBlackHoled) {
            return { level: 2, messageKey: 'blackhole' };
        }

        // Новая логика на основе запроса пользователя
        // DNS true, SSL false (invalid cert), HTTP false -> Блок на уровне IP/SNI
        if (dnsResolved && !connected && ssl === 'invalid') {
            return { level: 2, messageKey: 'ipSniBlock' };
        }

        // DNS true, SSL true, HTTP false -> Блок по HTTP внутри TLS (DPI)
        if (dnsResolved && !connected && ssl === 'valid') {
            return { level: 2, messageKey: 'httpTlsBlock' };
        }

        // Старая логика: DNS true, HTTP true, SSL-сертификат подменен
        if (dnsResolved && connected && ssl === 'invalid') {
            return { level: 2, messageKey: 'dpiSsl' };
        }

        // Специальная обработка для IPv6, где HTTP-доступность не является надежным индикатором
        if (targetType === 'ipv6' && !connected) {
            return { level: 1, messageKey: 'ipv6StatusUnclear' };
        }

        // Стандартные вердикты для доменов и IPv4
        if (dnsResolved && !connected) {
            // Этот случай теперь частично покрывается новой логикой,
            // но оставим его для ситуаций, когда SSL не применим (http://)
            return { level: 1, messageKey: 'ipBlock' };
        }
        if (!dnsResolved && !connected) {
            return { level: 1, messageKey: 'dnsBlock' };
        }

        // Если все проверки прошли успешно
        return { level: 0, messageKey: 'noCensorship' };
    }
}

// Экспорт в глобальную область
window.TestRunner = TestRunner;