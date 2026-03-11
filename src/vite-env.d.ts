/// <reference types="vite/client" />

declare module 'epubjs' {
  export default class ePub {
    constructor(url: string | ArrayBuffer, options?: any);
    renderTo(element: string | HTMLElement, options?: any): any;
    loaded: {
      navigation: Promise<any>;
      metadata: Promise<any>;
      spine: Promise<any>;
      cover: Promise<any>;
      resources: Promise<any>;
    };
    locations: any;
    ready: Promise<void>;
    destroy(): void;
  }
}

declare module 'epubjs/types/rendition' {
  export default class Rendition {
    display(target?: string): Promise<any>;
    next(): Promise<any>;
    prev(): Promise<any>;
    on(event: string, callback: (...args: any[]) => void): void;
    off(event: string, callback: (...args: any[]) => void): void;
    themes: any;
    hooks: any;
    currentLocation(): any;
  }
}

declare module 'compromise' {
  interface View {
    people(): View;
    places(): View;
    out(format?: string): any;
    json(): any[];
    text(): string;
    found: boolean;
  }
  function nlp(text: string): View;
  export default nlp;
}
