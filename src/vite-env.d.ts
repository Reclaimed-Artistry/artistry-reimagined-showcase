/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADSENSE_HOME_SLOT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
