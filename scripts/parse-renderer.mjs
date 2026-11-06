import { parseSync } from 'oxc-parser'

/** Extract the actual published JavaScript without accepting recovered syntax errors. */
export function parseRenderer(source) {
  const result = parseSync('renderer.js', source, { sourceType: 'module', preserveParens: false })
  if (result.errors.length) throw new SyntaxError(result.errors.map(error => error.message).join('; '))
  return result
}
