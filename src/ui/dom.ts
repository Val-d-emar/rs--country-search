export interface CreateElementOptions {
  className?: string;
  textContent?: string;
  attributes?: Record<string, string>;
}

/**
 * Типобезопасно создаёт HTML-элемент без использования innerHTML.
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: CreateElementOptions = {},
  ...children: Array<Node | string>
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);

  if (options.className) {
    element.className = options.className;
  }

  if (options.textContent !== undefined) {
    element.textContent = options.textContent;
  }

  if (options.attributes) {
    for (const [key, value] of Object.entries(options.attributes)) {
      element.setAttribute(key, value);
    }
  }

  if (children.length > 0) {
    element.append(...children);
  }

  return element;
}
