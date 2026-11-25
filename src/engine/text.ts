/** Replace `{name}` placeholders. */
export function subst(text: string, vars: { name: string }): string {
  return text.replace(/\{name\}/g, vars.name)
}
