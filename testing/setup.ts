import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

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

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});
