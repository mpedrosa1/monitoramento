/** Par { value, label } para Select.Root (Base UI exibe label no trigger). */
export type SelectItemOption<V = string> = {
  value: V;
  label: string;
};

export function selectItems<V extends string>(
  entries: Array<{ value: V; label: string }>
): SelectItemOption<V>[] {
  return entries;
}
