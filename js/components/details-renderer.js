/**
 * Модуль для рендеринга деталей тестов
 * Используется как в карточке результатов, так и в модальном окне.
 */
class DetailsRenderer {
    static i18n = null;

    static init(i18n) {
        this.i18n = i18n;
    }

    /**
     * Рендер всех секций с тестами
     */
    static render(rowData) {
        if (!this.i18n) {
            console.error('DetailsRenderer not initialized. Call DetailsRenderer.init(i18n) first.');
            return '<p>Error: Renderer not initialized.</p>';
        }
        const { testDetails, lastChecked } = rowData;
        if (!testDetails || !testDetails.http) {
            return `<p>${this.i18n.t('detailsCard.noDetails')}</p>`;
        }

        const targetType = URLUtils.getTargetType(testDetails.http.url);
        const isDomainCheck = targetType !== 'ipv4' && targetType !== 'ipv6';

        const httpCard = this.renderHTTP(testDetails.http);
        const sslCard = this.renderSSL(testDetails.ssl);
        const dnsCard = this.renderDNS(testDetails.dns, targetType);

        const lastCheckedHTML = lastChecked 
            ? `<span class="last-checked-info">${this.i18n.t('detailsCard.lastChecked')} ${Format.date(new Date(lastChecked))}</span>`
            : '';

        const footerHTML = `
            <div class="test-details-footer">
                ${lastCheckedHTML}
            </div>
        `;

        let innerHTML;
        // Для доменов выносим DNS в отдельный широкий блок
        if (isDomainCheck) {
            innerHTML = `
                <div class="test-details-grid">
                    ${httpCard}
                    ${sslCard}
                </div>
                ${dnsCard}
                ${footerHTML}
            `;
        } else {
            innerHTML = `
                <div class="test-details-grid">
                    ${httpCard}
                    ${sslCard}
                    ${dnsCard}
                </div>
                ${footerHTML}
            `;
        }

        return `<div class="details-modal-content">${innerHTML}</div>`;
    }

    /**
     * Рендер карточки теста
     */
    static renderTestCard(title, status, icon, details, message = '', extraClasses = '', titleComponent = null) {
        const messageHTML = message ? `<p class="test-detail-message">${message}</p>` : '';
        const titleHTML = titleComponent || `<h5 class="test-detail-card-title">${title}</h5>`;

        return `
            <div class="test-detail-card status-border-${status} ${extraClasses}">
                <div class="test-detail-card-header">
                    <span class="status-icon status-${status}">${icon}</span>
                    ${titleHTML}
                </div>
                ${messageHTML}
                <div class="test-detail-card-body">
                    ${details}
                </div>
            </div>
        `;
    }

    /**
     * Рендер секции "HTTP"
     */
    static renderHTTP(http) {
        if (!http) return '';
        const status = http.connected ? 'success' : 'error';
        const icon = http.connected ? '✓' : '✗';
        
        let message = http.message ? this.i18n.t(http.message) : '';
        if (!http.connected && http.errorName) {
            const errorKey = `detailsCard.http.errors.${http.errorName}`;
            const fallback = `detailsCard.http.errors.default`;
            message += ` (${this.i18n.t(errorKey, { defaultValue: this.i18n.t(fallback) })})`;
        }

        const details = `
            <div class="test-detail-item"><strong>${this.i18n.t('detailsCard.executionTime')}</strong><span>${Format.time(http.responseTime)}</span></div>
            <div class="test-detail-item"><strong>${this.i18n.t('detailsCard.http.statusCode')}</strong><span>${http.statusCode || 'N/A'}</span></div>
            <div class="test-detail-item"><strong>${this.i18n.t('detailsCard.http.requestDetails.method')}</strong><span>${http.method || 'N/A'}</span></div>
        `;

        return this.renderTestCard('HTTP', status, icon, details, message);
    }

    /**
     * Рендер секции "SSL/TLS"
     */
    static renderSSL(ssl) {
        if (!ssl) return '';
        const status = ssl.valid ? 'success' : (ssl.hasSSL ? 'error' : 'warning');
        const icon = status === 'success' ? '✓' : (status === 'error' ? '✗' : '⚠');
        
        let message = ssl.message ? this.i18n.t(ssl.message) : '';
        if (ssl.isBlackHoled) {
            message += ` <span class="blackhole-warning">${this.i18n.t('detailsCard.ssl.blackholeWarning')}</span>`;
        } else if (!ssl.valid && ssl.errorName) {
            const errorKey = `detailsCard.ssl.errors.${ssl.errorName}`;
            const fallback = `detailsCard.ssl.errors.default`;
            message += ` (${this.i18n.t(errorKey, { defaultValue: this.i18n.t(fallback) })})`;
        }

        const details = `
            <div class="test-detail-item"><strong>${this.i18n.t('detailsCard.ssl.protocol')}</strong><span>${ssl.protocol || 'N/A'}</span></div>
            <div class="test-detail-item"><strong>${this.i18n.t('detailsCard.executionTime')}</strong><span>${Format.time(ssl.checkTime)}</span></div>
            <div class="test-detail-item"><strong>${this.i18n.t('detailsCard.http.requestDetails.method')}</strong><span>${ssl.method || 'N/A'}</span></div>
        `;
        return this.renderTestCard('SSL/TLS', status, icon, details, message);
    }

    /**
     * Рендер секции "DNS"
     */
    static renderDNS(dns, targetType) {
        if (!dns) return '';
        const isReverse = targetType === 'ipv4' || targetType === 'ipv6';
        const title = isReverse ? 'Reverse DNS' : 'DNS';
        
        let status = 'success';
        if (dns.spoofed) {
            status = 'error';
        } else if (!dns.resolved) {
            status = 'error';
        }

        const icon = status === 'success' ? '✓' : '✗';
        
        let message = '';
        const time = dns.resolveTime ? Format.time(dns.resolveTime) : null;

        if (dns.spoofed) {
            message = time 
                ? this.i18n.t('detailsCard.dns.spoofingDetectedWithTime', { time })
                : this.i18n.t('detailsCard.dns.spoofingDetected');
        } else if (dns.resolved) {
            message = time
                ? this.i18n.t('detailsCard.dns.successWithTime', { time })
                : this.i18n.t('detailsCard.dns.success');
        } else {
            message = time
                ? this.i18n.t('detailsCard.dns.errorWithTime', { time })
                : this.i18n.t('detailsCard.dns.error');
        }

        let details = '';
        let extraCardClasses = '';
        let titleComponent = `<h5 class="test-detail-card-title">${title}</h5>`;

        if (isReverse) {
            const ptrQueryNameHTML = dns.ptrQueryName ? `<div class="test-detail-item"><strong>${this.i18n.t('detailsCard.dns.ptrQueryName')}</strong><span class="dns-result">${dns.ptrQueryName}</span></div>` : '';
            details = `
                <div class="test-detail-item"><strong>${this.i18n.t('detailsCard.dns.domain')}</strong><span class="dns-result">${dns.reverseDomain || 'N/A'}</span></div>
                <div class="test-detail-item"><strong>${this.i18n.t('detailsCard.dns.dnsServer')}</strong><span>${dns.dnsServer || 'N/A'}</span></div>
                ${ptrQueryNameHTML}
            `;
        } else {
            extraCardClasses = 'dns-domain-card';
            
            details = `<div class="dns-servers-container">`;
            for (const serverName in dns.servers) {
                const serverResult = dns.servers[serverName];
                const serverStatus = serverResult.resolved ? 'success' : 'error';
                const serverIcon = serverStatus === 'success' ? '✓' : '✗';

                const ipHeader = `
                    <div class="ip-ptr-header">
                        <strong class="ip-address-header">
                            ${this.i18n.t('detailsCard.dns.ipAddressWithTime', { time: Format.time(serverResult.resolveTime) })}
                        </strong>
                        <strong class="ptr-record-header">${this.i18n.t('detailsCard.dns.ptrRecord')}</strong>
                    </div>
                `;
                
                let ipsHTML = `<div class="no-records-message">${this.i18n.t('detailsCard.dns.noRecords')}</div>`;
                if (serverResult.ips.length > 0) {
                    ipsHTML = serverResult.ips.map(ipInfo => {
                        const ptrDetails = dns.ptrDetails[ipInfo.ip];
                        const ptrTime = ptrDetails ? ptrDetails.resolveTime : null;
                        const ptrTimeHTML = ptrTime ? `<span class="ptr-time">(${Format.time(ptrTime)})</span>` : '';

                        return `
                            <div class="ip-ptr-item">
                                <span class="ip-address">${ipInfo.ip}</span>
                                <span class="ptr-record">
                                    ${ipInfo.ptr || this.i18n.t('detailsCard.dns.noPtr')}
                                    ${ptrTimeHTML}
                                </span>
                            </div>
                        `;
                    }).join('');
                }

                details += `
                    <div class="dns-server-result-wrapper">
                        <div class="dns-server-header">
                            <div class="dns-server-name">
                                <span class="status-icon status-${serverStatus}">${serverIcon}</span>
                                <strong>${serverName.charAt(0).toUpperCase() + serverName.slice(1)}</strong>
                            </div>
                        </div>
                        <div class="dns-server-ips">
                            ${serverResult.ips.length > 0 ? ipHeader : ''}
                            ${ipsHTML}
                        </div>
                    </div>
                `;
            }
            details += `</div>`;
        }

        return this.renderTestCard(title, status, icon, details, message, extraCardClasses, titleComponent);
    }

    }

