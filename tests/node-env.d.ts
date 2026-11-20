// Tests and playwright.config.ts run in Node. Declares the one Node global they use,
// so we do not need the @types/node dependency.
declare const process: {
  env: Record<string, string | undefined>
  cwd(): string
}
