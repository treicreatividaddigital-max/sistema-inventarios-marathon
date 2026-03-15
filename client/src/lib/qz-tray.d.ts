declare global {
  type QzPromiseResolver = (value?: string | undefined) => void;
  type QzPromiseRejector = (reason?: unknown) => void;
  type QzPromiseFactory = (resolve: QzPromiseResolver, reject: QzPromiseRejector) => void;

  interface QzConfig {
    copies?: number;
    jobName?: string;
    encoding?: string;
  }

  interface QzTrayApi {
    websocket: {
      isActive(): boolean;
      connect(options?: { host?: string; port?: number | null; secure?: boolean | null; retries?: number | null; delay?: number | null }): Promise<void>;
      disconnect(): Promise<void>;
    };
    printers: {
      find(query?: string): Promise<string>;
      getDefault(): Promise<string>;
      getPrinters(): Promise<string[]>;
    };
    configs: {
      create(printer: string, options?: QzConfig): unknown;
    };
    print(config: unknown, data: Array<string | Record<string, unknown>>): Promise<void>;
    security?: {
      setCertificatePromise(factory: QzPromiseFactory): void;
      setSignaturePromise(factory: (toSign: string) => QzPromiseFactory): void;
    };
  }

  interface Window {
    qz?: QzTrayApi;
  }
}

export {};
