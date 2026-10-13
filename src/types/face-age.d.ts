export type FaceAgeWidget = {
  render: () => Promise<unknown>;
  API?: {
    setCustomProducts?: (products: DemoProduct[]) => void;
    getAdvisorData?: (callback: (data: unknown) => void) => void;
  };
  onDisplayProducts?: (callback: (data: unknown) => void) => void;
  onClickProduct?: (callback: (data: unknown) => void) => void;
  onAddToCart?: (callback: (data: unknown) => void) => void;
  onCheckout?: (callback: (data: unknown) => void) => void;
};

export type DemoProduct = {
  id: number;
  url: string;
  image: string;
  title: string;
  description: string;
  price: number;
  problems: string[];
};

export type SampleResult = {
  scan?: { problems?: { key: string }[]; skinAgeBucket?: string };
  results?: { ok?: boolean; status?: number }[];
};

declare global {
  interface Window {
    FaceAge?: new (options: Record<string, unknown>) => FaceAgeWidget;
    FaceAgeInsights?: {
      attach: (widget: FaceAgeWidget, options: Record<string, unknown>) => void;
      optOut: () => void;
      optIn: () => void;
      isOptedOut: () => boolean;
      sendSample: (options: {
        endpoint: string;
        writeKey: string;
        language?: string;
      }) => Promise<SampleResult>;
    };
  }
}

export {};
