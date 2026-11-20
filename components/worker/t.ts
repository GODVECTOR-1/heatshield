export type Dictionary = Record<string, string>;

export function makeT(dict: Dictionary) {
  return (key: string, vars?: Record<string, string | number>) => {
    let value = dict[key] ?? key;
    for (const [name, replacement] of Object.entries(vars ?? {})) {
      value = value.replaceAll(`{${name}}`, String(replacement));
    }
    return value;
  };
}
