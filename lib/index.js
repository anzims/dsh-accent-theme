// dsh-accent-theme - host half.
//
// This half exists so the row mounts and the module scanner discovers the
// browser half (declared as ./client in package.json). All colour work happens
// in lib/client.js through ctx.theme.overrideTokens.
//
// No host service is injected on purpose: the plugin does no host-side work,
// so it cannot be blocked by a missing or renamed host service. The browser
// half declares its own dependency on the `theme` client service instead.
export const name = 'accent-theme'

export function apply() {
  // Intentionally empty.
}