/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly PUBLIC_API_URL: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}