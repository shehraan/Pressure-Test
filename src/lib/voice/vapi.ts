import Vapi from "@vapi-ai/web";

/**
 * Vapi lazy initialization. Keeps the SDK from loading until the user
 * actually triggers the call moment, so the landing and prelude stay fast.
 *
 * Env vars are the source of truth:
 *   - VITE_VAPI_PUBLIC_KEY      (required)
 *   - VITE_VAPI_ASSISTANT_ID    (required)
 *   - VITE_VAPI_ENABLED=true    (enable voice; otherwise typed fallback)
 */

let instance: Vapi | null = null;

export type VapiConfig = {
  publicKey: string;
  assistantId: string;
  enabled: boolean;
};

export function getVapiConfig(): VapiConfig {
  return {
    publicKey: import.meta.env.VITE_VAPI_PUBLIC_KEY ?? "",
    assistantId: import.meta.env.VITE_VAPI_ASSISTANT_ID ?? "",
    enabled:
      (import.meta.env.VITE_VAPI_ENABLED ?? "false").toString().toLowerCase() === "true",
  };
}

export function isVapiConfigured(): boolean {
  const c = getVapiConfig();
  return c.enabled && !!c.publicKey && !!c.assistantId;
}

export function getVapi(): Vapi {
  if (instance) return instance;
  const { publicKey } = getVapiConfig();
  if (!publicKey) {
    throw new Error("VITE_VAPI_PUBLIC_KEY is not set");
  }
  instance = new Vapi(publicKey);
  return instance;
}

export function disposeVapi(): void {
  if (instance) {
    try {
      instance.removeAllListeners();
    } catch {
      /* ignore */
    }
    try {
      instance.stop();
    } catch {
      /* ignore */
    }
    instance = null;
  }
}
