import { createElement } from './dom.js';
const numberFormatter = new Intl.NumberFormat('ru-RU');
function createLabeledLine(label, value) {
    return createElement('p', { className: 'country-meta' }, createElement('strong', { textContent: `${label}: ` }), value);
}
export function createCountryCard(country, onSelect) {
    const flag = createElement('img', {
        className: 'country-flag',
        attributes: {
            src: country.flagUrl,
            alt: country.flagAlt,
            loading: 'lazy',
        },
    });
    const body = createElement('div', { className: 'country-body' }, createElement('h2', { className: 'country-name', textContent: country.name }), createLabeledLine('Столица', country.capital), createLabeledLine('Регион', country.region), createLabeledLine('Население', numberFormatter.format(country.population)));
    const card = createElement('button', {
        className: 'country-card',
        attributes: { type: 'button' },
    }, flag, body);
    card.addEventListener('click', () => onSelect(country));
    return card;
}
function createBadgeGroup(label, items, emptyText) {
    const container = createElement('div', { className: 'details-item' });
    container.append(createElement('strong', { textContent: `${label}: ` }));
    if (items.length === 0) {
        container.append(emptyText);
        return container;
    }
    const list = createElement('div', { className: 'badge-list' });
    for (const item of items) {
        list.append(createElement('span', { className: 'badge', textContent: item }));
    }
    container.append(list);
    return container;
}
export function createCountryDetailsModal(country, onClose) {
    const backdrop = createElement('div', {
        className: 'modal-backdrop',
        attributes: { role: 'dialog', 'aria-modal': 'true' },
    });
    const closeButton = createElement('button', {
        className: 'modal-close',
        textContent: 'Закрыть',
        attributes: { type: 'button' },
    });
    const header = createElement('div', { className: 'modal-header' }, createElement('h2', {
        className: 'modal-title',
        textContent: `${country.name} (${country.nativeName})`,
    }), closeButton);
    const flag = createElement('img', {
        className: 'modal-flag',
        attributes: { src: country.flagUrl, alt: country.flagAlt },
    });
    const areaText = country.area !== null ? `${numberFormatter.format(country.area)} км²` : 'Нет данных';
    const details = createElement('div', { className: 'details-list' }, createLabeledLine('Столица', country.capital), createLabeledLine('Регион', `${country.region} (${country.subregion})`), createLabeledLine('Население', numberFormatter.format(country.population)), createLabeledLine('Площадь', areaText), createBadgeGroup('Языки', country.languages, 'Нет данных'), createBadgeGroup('Валюты', country.currencies, 'Нет данных'), createBadgeGroup('Границы', country.borders, 'Нет сухопутных границ'));
    const modalContent = createElement('div', { className: 'modal-content' }, header, flag, details);
    backdrop.append(modalContent);
    const handleKeyDown = (event) => {
        if (event.key === 'Escape') {
            cleanupAndClose();
        }
    };
    const cleanupAndClose = () => {
        document.removeEventListener('keydown', handleKeyDown);
        onClose();
    };
    closeButton.addEventListener('click', cleanupAndClose);
    backdrop.addEventListener('click', (event) => {
        if (event.target === backdrop) {
            cleanupAndClose();
        }
    });
    document.addEventListener('keydown', handleKeyDown);
    return backdrop;
}
