/**
 * Типобезопасно создаёт HTML-элемент без использования innerHTML.
 */
export function createElement(tag, options = {}, ...children) {
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
