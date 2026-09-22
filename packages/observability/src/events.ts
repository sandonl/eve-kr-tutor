type DiagnosticValue = string | number | boolean | null |
  readonly DiagnosticValue[] | { readonly [key: string]: DiagnosticValue | undefined };

// Callers project safe fields before crossing this interface. Raw errors and
// framework contexts are deliberately not accepted.
export type DiagnosticEvent = {
  readonly event: string;
  readonly [key: string]: DiagnosticValue | undefined;
};
