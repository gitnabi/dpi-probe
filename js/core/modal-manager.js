/**
 * Модуль управления модальными окнами DPI Probe
 */

class ModalManager {
    constructor(options = {}) {
        this.i18n = options.i18n;
        if (!this.i18n) {
            throw new Error('ModalManager requires an i18n service instance.');
        }
        this.modalOverlay = null;
        this.modalBody = null;
        this.modalTitle = null;
        this.isOpen = false;
    }
    
    init() {
        this.modalOverlay = DOM.get('modalOverlay');
        this.modalBody = DOM.get('modalBody');
        this.modalTitle = document.querySelector('.modal-title');
        
        if (!this.modalOverlay || !this.modalBody) {
            console.warn('Модальное окно не найдено в DOM');
            return false;
        }
        
        return true;
    }
    
    show() {
        if (!this.modalOverlay) {
            console.error('Модальное окно не инициализировано');
            return;
        }
        
        DOM.show(this.modalOverlay);
        Animation.fadeIn(this.modalOverlay, 300);
        this.isOpen = true;
        document.body.style.overflow = 'hidden';
    }
    
    hide() {
        if (!this.modalOverlay) {
            return;
        }
        
        Animation.fadeOut(this.modalOverlay, 300);
        this.isOpen = false;
        document.body.style.overflow = '';
    }
    
    setTitle(title) {
        if (this.modalTitle) {
            this.modalTitle.innerHTML = title;
        }
    }
    
    setContent(content) {
        if (this.modalBody) {
            if (typeof content === 'string') {
                this.modalBody.innerHTML = content;
            } else if (content instanceof HTMLElement) {
                this.modalBody.innerHTML = '';
                this.modalBody.appendChild(content);
            }
        }
    }
    
    showInfoModal() {
        // Показываем стандартный заголовок, если он был скрыт
        if (this.modalTitle && this.modalTitle.parentElement) {
            this.modalTitle.parentElement.style.display = '';
        }
        this.setTitle(this.i18n.t('modalContent.infoModalTitle'));

        // Получаем все возможные вердикты и их описания
        const verdicts = this.i18n.t('verdicts');
        const verdictInfo = this.i18n.t('verdictInfo');

        // Определяем логическую последовательность для отображения
        const verdictOrder = [
            'dnsBlock',
            'dnsSpoofing',
            'ipBlock',
            'ipSniBlock',
            'blackhole',
            'dpiSsl',
            'httpTlsBlock',
            'noCensorship',
            'ipv6StatusUnclear'
        ];

        let verdictsHtml = '';
        // Итерируемся в заданной последовательности
        for (const key of verdictOrder) {
            if (verdicts[key] && verdictInfo[key]) {
                verdictsHtml += `
                    <div class="info-verdict-item">
                        <strong class="info-verdict-title">${verdicts[key]}</strong>
                        <p class="info-verdict-description">${verdictInfo[key]}</p>
                    </div>
                `;
            }
        }

        const content = `
            <div class="info-modal-content">
                <p>${this.i18n.t('modalContent.infoModalP1')}</p>
                
                <h4>${this.i18n.t('modalContent.verdictInfoTitle')}</h4>
                <div class="info-verdicts-list">
                    ${verdictsHtml}
                </div>

                <h4>${this.i18n.t('modalContent.infoModalSSLTitle')}</h4>
                <p>${this.i18n.t('modalContent.infoModalSSLText')}</p>

                <h4>${this.i18n.t('modalContent.infoModalDNSTitle')}</h4>
                <p>${this.i18n.t('modalContent.infoModalDNSText')}</p>
            </div>
        `;
        this.setContent(content);
        this.show();
    }

    /**
     * Показать кастомное окно подтверждения
     * @param {string} title - Заголовок окна
     * @param {string} message - Сообщение для подтверждения
     * @returns {Promise<boolean>} - Promise, который разрешается в true, если пользователь подтвердил
     */
    showConfirm(title, message) {
        return new Promise((resolve) => {
            this.setTitle(title);

            const content = `
                <div class="confirm-modal-content">
                    <div class="confirm-modal-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-alert-triangle">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                    </div>
                    <h4 class="confirm-modal-title">${title}</h4>
                    <p class="confirm-modal-text">${message}</p>
                    <div class="confirm-modal-actions">
                        <button class="btn btn-secondary" id="confirmCancelBtn">${this.i18n.t('modalContent.cancel')}</button>
                        <button class="btn btn-primary" id="confirmOkBtn">${this.i18n.t('modalContent.confirm')}</button>
                    </div>
                </div>
            `;
            this.setContent(content);

            // Прячем стандартный заголовок, так как у нас есть свой
            if (this.modalTitle && this.modalTitle.parentElement) {
                this.modalTitle.parentElement.style.display = 'none';
            }

            const handleConfirm = () => {
                this.hide();
                cleanup();
                resolve(true);
            };

            const handleCancel = () => {
                this.hide();
                cleanup();
                resolve(false);
            };

            const confirmBtn = DOM.get('confirmOkBtn');
            const cancelBtn = DOM.get('confirmCancelBtn');

            confirmBtn.addEventListener('click', handleConfirm);
            cancelBtn.addEventListener('click', handleCancel);
            
            const overlayClickListener = (e) => {
                if (e.target === this.modalOverlay) {
                    handleCancel();
                }
            };
            this.modalOverlay.addEventListener('click', overlayClickListener);

            const cleanup = () => {
                confirmBtn.removeEventListener('click', handleConfirm);
                cancelBtn.removeEventListener('click', handleCancel);
                this.modalOverlay.removeEventListener('click', overlayClickListener);
                // Возвращаем видимость заголовка для других модальных окон
                if (this.modalTitle && this.modalTitle.parentElement) {
                    this.modalTitle.parentElement.style.display = '';
                }
                // Убираем кастомный класс
                this.modalOverlay.querySelector('.modal').classList.remove('confirm-modal');
            };

            // Добавляем кастомный класс для стилизации
            this.modalOverlay.querySelector('.modal').classList.add('confirm-modal');
            this.show();
        });
    }

    isModalOpen() {
        return this.isOpen;
    }
}


