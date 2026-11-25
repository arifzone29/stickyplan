import '@testing-library/jest-dom/vitest';

if (
  typeof HTMLDialogElement !== 'undefined' &&
  typeof HTMLDialogElement.prototype.showModal !== 'function'
) {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(returnValue?: string) {
    if (returnValue !== undefined) {
      this.returnValue = returnValue;
    }
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}
