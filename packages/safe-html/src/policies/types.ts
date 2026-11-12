/** Document preservation rules. UI content uses a separate allowlist. */
export type DocumentPolicy = Readonly<{
  removeElements: readonly string[];
  comments: boolean;
}>;
