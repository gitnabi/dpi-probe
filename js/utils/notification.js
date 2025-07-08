/**
 * Утилиты для уведомлений
 */

const NotificationUtils = {
    /**
     * Показать уведомление
     */
    show: (message, type = 'info', duration = 5000) => {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        `;
        
        // Добавить стили для уведомлений если их нет
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 12px 16px;
                    border-radius: 8px;
                    color: white;
                    font-weight: 500;
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    max-width: 400px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
                    transform: translateX(100%);
                    opacity: 0;
                    transition: all 0.3s ease;
                }
                
                .notification.show {
                    transform: translateX(0);
                    opacity: 1;
                }
                
                .notification.hide {
                    transform: translateX(100%);
                    opacity: 0;
                }
                
                .notification-info { background: #1f6feb; }
                .notification-success { background: #238636; }
                .notification-warning { background: #d29922; }
                .notification-error { background: #da3633; }
                
                .notification-close {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 18px;
                    cursor: pointer;
                    padding: 0;
                    opacity: 0.8;
                    flex-shrink: 0;
                }
                
                .notification-close:hover {
                    opacity: 1;
                }
                
                .notification-message {
                    flex: 1;
                    word-wrap: break-word;
                }
            `;
            document.head.appendChild(styles);
        }
        
        // Позиционирование уведомлений друг под другом
        const existingNotifications = document.querySelectorAll('.notification');
        let topOffset = 20;
        existingNotifications.forEach(existing => {
            const rect = existing.getBoundingClientRect();
            topOffset = Math.max(topOffset, rect.bottom + 10);
        });
        notification.style.top = `${topOffset}px`;
        
        document.body.appendChild(notification);
        
        // Показать уведомление с анимацией
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Обработчик закрытия
        const closeBtn = notification.querySelector('.notification-close');
        const close = () => {
            notification.classList.remove('show');
            notification.classList.add('hide');
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        };
        
        closeBtn.addEventListener('click', close);
        
        // Автоматическое закрытие
        if (duration > 0) {
            setTimeout(close, duration);
        }
        
        return notification;
    }
};

// Экспорт в глобальную область для обратной совместимости
window.NotificationUtils = NotificationUtils;
// Также создаем алиас для старого кода
window.Notification = NotificationUtils;

