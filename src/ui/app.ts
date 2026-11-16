import type { Country } from '../api/types.js';
import { createSearchController, type SearchState } from '../search/searchController.js';
import { createCountryCard, createCountryDetailsModal } from './countryView.js';
import { createElement } from './dom.js';
import { createCachedCountrySearch } from '../api/cachedSearch.js';
import { createSearchHistory } from '../search/searchHistory.js';

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

  const history = createSearchHistory();
  const historyContainer = createElement('div', { className: 'history-list' });

  const header = createElement(
    'header',
    { className: 'app-header' },
    createElement('h1', { className: 'app-title', textContent: 'Поиск стран' }),
    input,
    historyContainer,
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
    if (input.value.trim()) {
      history.add(input.value);
      renderHistory();
    }
    const modal = createCountryDetailsModal(country, closeModal);
    modalContainer.replaceChildren(modal);
  };

  const renderHistory = (): void => {
    const items = history.getAll();
    if (items.length === 0) {
      historyContainer.replaceChildren();
      return;
    }

    historyContainer.replaceChildren(
      createElement('span', { className: 'history-label', textContent: 'История:' }),
      ...items.map((item) => {
        const chip = createElement('button', {
          className: 'history-chip',
          textContent: item,
          attributes: { type: 'button' },
        });
        chip.addEventListener('click', () => {
          input.value = item;
          controller.searchImmediate(item);
        });
        return chip;
      }),
    );
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

  const controller = createSearchController(renderState, {
    searchFn: createCachedCountrySearch(),
  });

  input.addEventListener('input', () => {
    controller.search(input.value);
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && input.value.trim()) {
      history.add(input.value);
      renderHistory();
      controller.searchImmediate(input.value);
    }
  });

  renderHistory();
}
