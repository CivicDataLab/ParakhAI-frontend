import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, vi } from 'vitest';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock);
vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);

Element.prototype.getBoundingClientRect = vi.fn(() => ({
  width: 200,
  height: 100,
  top: 0,
  left: 0,
  bottom: 100,
  right: 200,
  x: 0,
  y: 0,
  toJSON: () => ({}),
}));

// Unit tests click <a href> / download anchors; jsdom can't navigate — suppress the noise
beforeAll(() => {
  window.addEventListener(
    'click',
    (event) => {
      const target = event.target as Element | null;
      if (target?.closest?.('a[href]')) {
        event.preventDefault();
      }
    },
    true
  );
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});
