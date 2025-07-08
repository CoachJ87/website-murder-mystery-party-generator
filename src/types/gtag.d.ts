declare module 'gtag.js' {
  export const gtag: Gtag.Gtag;
  
  namespace Gtag {
    interface Gtag {
      (command: 'config', targetId: string, config?: ControlParams | EventParams | ConfigParams | any): void;
      (command: 'set', targetId: string, config: any): void;
      (command: 'set', config: any): void;
      (command: 'js', config: Date): void;
      (command: 'event', eventName: string, eventParams?: ControlParams | EventParams | any): void;
    }

    interface ConfigParams {
      page_title?: string;
      page_path?: string;
      page_location?: string;
      send_page_view?: boolean;
    }

    interface ControlParams {
      groups?: string | string[];
      send_to?: string | string[];
      event_callback?: () => void;
      event_timeout?: number;
    }

    interface EventParams {
      event_category?: string;
      event_label?: string;
      value?: any;
      non_interaction?: boolean;
    }
  }
}

declare global {
  interface Window {
    dataLayer: any[];
    gtag: Gtag.Gtag;
  }
}
