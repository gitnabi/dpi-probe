/**
 * Утилиты для реальных сетевых проверок
 */

const NetworkUtils = {
    BLACK_HOLE_THRESHOLD_MS: 15000, // 15 секунд

    /**
     * Выполнить DNS резолюцию домена
     */
    async resolveDNS(domain) {
        const totalStartTime = performance.now();
        
        const dnsServers = {
            'google': 'https://dns.google/resolve',
            'cloudflare': 'https://cloudflare-dns.com/dns-query'
        };
        
        const promises = Object.entries(dnsServers).map(async ([name, url]) => {
            const startTime = performance.now();
            try {
                const response = await fetch(`${url}?name=${domain}&type=A`, {
                    headers: { 'Accept': 'application/dns-json' }
                });
                if (!response.ok) throw new Error(`DNS query failed for ${name}`);
                
                const data = await response.json();
                const resolveTime = Math.round(performance.now() - startTime);

                if (data.Answer && data.Answer.length > 0) {
                    const ips = data.Answer.filter(r => r.type === 1).map(r => r.data);
                    return { name, ips, resolved: ips.length > 0, resolveTime };
                }
                return { name, ips: [], resolved: false, error: 'NO_RECORDS', resolveTime };
            } catch (error) {
                const resolveTime = Math.round(performance.now() - startTime);
                return { name, ips: [], resolved: false, error: error.message, resolveTime };
            }
        });
        
        const results = await Promise.all(promises);
        
        const allIps = [...new Set(results.flatMap(r => r.ips))];
        
        const ptrPromises = allIps.map(ip => this.reverseResolveDNS(ip).then(ptrResult => ({ ip, ...ptrResult })));
        const ptrResults = await Promise.all(ptrPromises);
        
        const ipToPtrMap = {};
        ptrResults.forEach(ptr => {
            ipToPtrMap[ptr.ip] = ptr;
        });

        const totalResolveTime = Math.round(performance.now() - totalStartTime);

        const finalResult = {
            resolved: results.some(r => r.resolved),
            resolveTime: totalResolveTime,
            recordType: 'A',
            servers: {},
            ipAddresses: allIps,
            ptrDetails: ipToPtrMap
        };
        
        results.forEach(r => {
            finalResult.servers[r.name] = {
                resolved: r.resolved,
                ips: r.ips.map(ip => ({ ip, ptr: ipToPtrMap[ip]?.reverseDomain || null })),
                error: r.error || null,
                resolveTime: r.resolveTime
            };
        });

        finalResult.spoofed = this._isDnsSpoofed(finalResult.servers, domain);
        
        return finalResult;
    },

    /**
     * Определить, имеет ли место DNS-спуфинг, на основе PTR-записей.
     * @private
     */
    _isDnsSpoofed(servers, originalDomain) {
        const googleResult = servers.google;
        const cloudflareResult = servers.cloudflare;

        // Спуфинга нет, если один из серверов не ответил
        if (!googleResult.resolved || !cloudflareResult.resolved) {
            return false;
        }

        // Получаем базовые домены из PTR-записей для каждого сервера
        const getBaseDomain = (hostname) => {
            if (!hostname) return null;
            const parts = hostname.split('.');
            if (parts.length >= 2) {
                return parts.slice(-2).join('.');
            }
            return hostname;
        };

        const googlePtrDomains = new Set(googleResult.ips.map(ip => getBaseDomain(ip.ptr)).filter(Boolean));
        const cloudflarePtrDomains = new Set(cloudflareResult.ips.map(ip => getBaseDomain(ip.ptr)).filter(Boolean));

        // Если нет ни одной PTR-записи, мы не можем сделать вывод
        if (googlePtrDomains.size === 0 || cloudflarePtrDomains.size === 0) {
            return false;
        }

        // Проверяем, есть ли пересечение в базовых доменах
        const intersection = new Set([...googlePtrDomains].filter(d => cloudflarePtrDomains.has(d)));

        // Если пересечения нет, это явный признак спуфинга
        if (intersection.size === 0) {
            return true;
        }

        // Дополнительная проверка: убедимся, что PTR-домены соответствуют исходному домену
        const originalBaseDomain = getBaseDomain(originalDomain);
        const allPtrBaseDomains = new Set([...googlePtrDomains, ...cloudflarePtrDomains]);

        // Если ни один из PTR-доменов не соответствует исходному, это подозрительно
        if (!allPtrBaseDomains.has(originalBaseDomain)) {
            // Это может быть легитимно для крупных сервисов (e.g., google.com -> 1e100.net)
            // Но если домены совсем разные (e.g., youtube.com -> someprovider.net), это спуфинг.
            // Для простоты, если нет прямого совпадения и нет пересечения, считаем спуфингом.
            // Более сложная логика потребовала бы ведения белого списка CDN-доменов.
            if (intersection.size === 0) return true;
        }

        return false;
    },
    
    /**
     * Выполнить обратный DNS lookup для IP
     */
    async reverseResolveDNS(ip) {
        const startTime = performance.now();
        
        try {
            let ptrQueryName;
            if (URLUtils.isIPv4(ip)) {
                ptrQueryName = ip.split('.').reverse().join('.') + '.in-addr.arpa';
            } else if (URLUtils.isIPv6(ip)) {
                // 1. Expand IPv6 address to its full, non-compressed form
                const parts = ip.split('::');
                let left = parts[0] ? parts[0].split(':') : [];
                let right = parts.length > 1 && parts[1] ? parts[1].split(':') : [];
                const numZeros = 8 - (left.length + right.length);
                
                if (numZeros < 0) throw new Error('Invalid IPv6 address format');

                const zeros = Array(numZeros).fill('0000');
                
                const fullAddress = left.concat(zeros).concat(right)
                    .map(part => part.padStart(4, '0'))
                    .join('');

                // 2. Reverse the 32-nibble sequence and join with dots
                ptrQueryName = fullAddress.split('').reverse().join('.') + '.ip6.arpa';
            } else {
                throw new Error('Invalid IP address for reverse DNS');
            }

            const dnsServers = [
                'https://cloudflare-dns.com/dns-query',
                'https://dns.google/resolve'
            ];
            
            for (const dnsServer of dnsServers) {
                try {
                    const response = await fetch(`${dnsServer}?name=${ptrQueryName}&type=PTR`, {
                        headers: {
                            'Accept': 'application/dns-json'
                        }
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        const resolveTime = Math.round(performance.now() - startTime);
                        
                        if (data.Answer && data.Answer.length > 0) {
                            const reverseDomain = data.Answer[0].data;
                            
                            return {
                                resolved: true,
                                resolveTime,
                                reverseDomain: reverseDomain.replace(/\.$/, ''),
                                dnsServer: dnsServer.replace('https://', '').split('/')[0],
                                recordType: 'PTR',
                                ptrQueryName: ptrQueryName
                            };
                        }
                    }
                } catch (error) {
                    console.warn(`Reverse DNS server ${dnsServer} failed:`, error);
                    continue;
                }
            }
            
            return {
                resolved: false,
                resolveTime: Math.round(performance.now() - startTime),
                error: 'PTR_RECORD_NOT_FOUND',
                ptrQueryName: ptrQueryName
            };
            
        } catch (error) {
            return {
                resolved: false,
                resolveTime: Math.round(performance.now() - startTime),
                error: error.message,
                ptrQueryName: null
            };
        }
    },
    
    /**
     * Проверить SSL сертификат
     */
    async checkSSL(url) {
        const startTime = performance.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.BLACK_HOLE_THRESHOLD_MS);

        try {
            if (!url.startsWith('https://')) {
                clearTimeout(timeoutId);
                return {
                    hasSSL: false,
                    reason: 'HTTP_PROTOCOL',
                    checkTime: Math.round(performance.now() - startTime)
                };
            }

            // Используем 'no-cors' для большей надежности
            await fetch(url, {
                method: 'GET',
                mode: 'no-cors',
                cache: 'no-cache',
                signal: controller.signal // <--- Привязываем AbortController
            });

            clearTimeout(timeoutId);
            const checkTime = Math.round(performance.now() - startTime);

            // В 'no-cors' мы не можем проверить статус, но сам факт успешного ответа
            // (без выброшенной ошибки) говорит о том, что SSL работает.
            return {
                hasSSL: true,
                valid: true, // Предполагаем валидность, так как соединение установлено
                protocol: 'TLS',
                checkTime,
                responseType: 'Opaque (no-cors)',
                isBlackHoled: false, // Если мы здесь, таймаут не сработал
                method: 'GET'
            };

        } catch (error) {
            clearTimeout(timeoutId);
            const checkTime = Math.round(performance.now() - startTime);

            // Проверяем, была ли ошибка вызвана нашим таймаутом
            if (error.name === 'AbortError') {
                return {
                    hasSSL: true, // Попытка была, но зависла
                    valid: false,
                    protocol: 'TLS',
                    checkTime,
                    error: 'TIMEOUT_ERROR',
                    errorName: error.name,
                    isBlackHoled: true // Явный признак black-hole
                };
            }

            // Любая другая ошибка сети при запросе к https-ресурсу, скорее всего,
            // связана с проблемой SSL/TLS сертификата.
            return {
                hasSSL: true,
                valid: false,
                protocol: 'TLS',
                checkTime,
                error: 'CERTIFICATE_ERROR',
                errorName: error.name,
                isBlackHoled: false // Таймаут не был причиной
            };
        }
    },
    
    /**
     * Получить информацию о HTTP заголовках
     */
    async getHTTPHeaders(url) {
        try {
            const response = await fetch(url, {
                method: 'HEAD',
                mode: 'cors'
            });
            
            const headers = {};
            for (const [key, value] of response.headers.entries()) {
                headers[key.toLowerCase()] = value;
            }
            
            return {
                success: true,
                headers,
                statusCode: response.status
            };
            
        } catch (error) {
            // Если CORS блокирует, пробуем GET запрос с no-cors
            try {
                const response = await fetch(url, {
                    method: 'GET',
                    mode: 'no-cors'
                });
                
                return {
                    success: true,
                    headers: {}, // no-cors не дает доступ к заголовкам
                    statusCode: response.status || 200,
                    corsBlocked: true
                };
                
            } catch (secondError) {
                return {
                    success: false,
                    error: secondError.message
                };
            }
        }
    }
};

// Экспорт в глобальную область для обратной совместимости
window.NetworkUtils = NetworkUtils;
