/**
 * Просмотрщик подробностей
 * Отвечает за отображение детальной информации о проверке в модальном окне
 */
class DetailsViewer {
    constructor(options = {}) {
        if (!options.i18n) {
            throw new Error('DetailsViewer requires an i18n service instance.');
        }
        if (!options.modalManager) {
            throw new Error('DetailsViewer requires a ModalManager instance.');
        }
        this.i18n = options.i18n;
        this.modalManager = options.modalManager;
    }

    /**
     * Показать модальное окно с деталями строки
     */
    showRowDetails(rowData) {
        if (!rowData.testDetails) {
            console.warn('Нет деталей для отображения');
            this.modalManager.setTitle(this.i18n.t('modalContent.testDetailsTitle'));
            this.modalManager.setContent(`<p>${this.i18n.t('detailsCard.noDetails')}</p>`);
            this.modalManager.show();
            return;
        }
        
        this.renderDetails(rowData);
        this.modalManager.show();
    }

    /**
     * Отрендерить содержимое модального окна
     */
    renderDetails(rowData) {
        const { url } = rowData;
        const title = `${this.i18n.t('modalContent.testDetailsTitle')} <span class="details-target">${url}</span>`;
        const content = DetailsRenderer.render(rowData);
        
        this.modalManager.setTitle(title);
        this.modalManager.setContent(content);
    }
}