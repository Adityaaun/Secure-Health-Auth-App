/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RECAPTCHA_SITE_KEY: string;
  // Add other environment variables here if you have more
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}