import type { Country } from '../api/types.js';
import { createSearchController, type SearchState } from '../search/searchController.js';
import { createCountryCard, createCountryDetailsModal } from './countryView.js';
import { createElement } from './dom.js';

export function initApp(root: HTMLElement): void {
  const input = createElement('input', {
    className: 'search-input',
    attributes: {
      type: 'search',
      placeholder: 'Введите название страны (например, Spain)...',
      'aria-label': 'Поиск страны по названию',
      autofocus: 'true',
    },
  });

  const header = createElement(
    'header',
    { className: 'app-header' },
    createElement('h1', { className: 'app-title', textContent: 'Поиск стран' }),
    input,
  );

  const resultsContainer = createElement('main', {
    attributes: { 'aria-live': 'polite' },
  });

  const modalContainer = createElement('div');

  const appContainer = createElement(
    'div',
    { className: 'app-container' },
    header,
    resultsContainer,
    modalContainer,
  );

  root.replaceChildren(appContainer);

  const closeModal = (): void => {
    modalContainer.replaceChildren();
  };

  const openCountryDetails = (country: Country): void => {
    const modal = createCountryDetailsModal(country, closeModal);
    modalContainer.replaceChildren(modal);
  };

  const renderState = (state: SearchState): void => {
    switch (state.status) {
      case 'idle': {
        resultsContainer.replaceChildren();
        break;
      }
      case 'loading': {
        const loader = createElement(
          'div',
          { className: 'status-box status-loading' },
          createElement('span', { className: 'spinner' }),
          createElement('span', { textContent: `Ищем «${state.query}»...` }),
        );
        resultsContainer.replaceChildren(loader);
        break;
      }
      case 'empty': {
        const emptyBox = createElement(
          'div',
          { className: 'status-box status-empty' },
          createElement('p', {
            textContent: `По запросу «${state.query}» ничего не найдено.`,
          }),
        );
        resultsContainer.replaceChildren(emptyBox);
        break;
      }
      case 'error': {
        const retryButton = createElement('button', {
          className: 'retry-button',
          textContent: 'Повторить',
          attributes: { type: 'button' },
        });
        retryButton.addEventListener('click', () => controller.retry());

        const errorBox = createElement(
          'div',
          { className: 'status-box status-error' },
          createElement('p', { textContent: state.message }),
          retryButton,
        );
        resultsContainer.replaceChildren(errorBox);
        break;
      }
      case 'success': {
        const grid = createElement('div', { className: 'countries-grid' });
        for (const country of state.countries) {
          grid.append(createCountryCard(country, openCountryDetails));
        }
        resultsContainer.replaceChildren(grid);
        break;
      }
    }
  };

  const controller = createSearchController(renderState);

  input.addEventListener('input', () => {
    controller.search(input.value);
  });
}
