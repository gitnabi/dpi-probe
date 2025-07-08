/**
 * Утилиты для анимаций
 */

const Animation = {
    /**
     * Плавное появление элемента
     */
    fadeIn: (element, duration = 300) => {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        
        if (!element) return;
        
        element.style.opacity = '0';
        element.style.display = '';
        element.classList.remove('hidden');
        
        let start = null;
        
        const animate = (timestamp) => {
            if (!start) start = timestamp;
            const progress = (timestamp - start) / duration;
            
            if (progress < 1) {
                element.style.opacity = progress;
                requestAnimationFrame(animate);
            } else {
                element.style.opacity = '1';
            }
        };
        
        requestAnimationFrame(animate);
    },
    
    /**
     * Плавное исчезновение элемента
     */
    fadeOut: (element, duration = 300) => {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        
        if (!element) return;
        
        let start = null;
        const initialOpacity = parseFloat(getComputedStyle(element).opacity) || 1;
        
        const animate = (timestamp) => {
            if (!start) start = timestamp;
            const progress = (timestamp - start) / duration;
            
            if (progress < 1) {
                element.style.opacity = initialOpacity * (1 - progress);
                requestAnimationFrame(animate);
            } else {
                element.style.opacity = '0';
                element.style.display = 'none';
                element.classList.add('hidden');
            }
        };
        
        requestAnimationFrame(animate);
    },
    
    /**
     * Анимация прогресса
     */
    progress: (element, targetPercent, duration = 1000) => {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        
        if (!element) return;
        
        let start = null;
        const startPercent = parseFloat(element.style.width) || 0;
        
        const animate = (timestamp) => {
            if (!start) start = timestamp;
            const progress = Math.min((timestamp - start) / duration, 1);
            
            const currentPercent = startPercent + (targetPercent - startPercent) * progress;
            element.style.width = `${currentPercent}%`;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
};

// Экспорт в глобальную область для обратной совместимости
window.Animation = Animation;

