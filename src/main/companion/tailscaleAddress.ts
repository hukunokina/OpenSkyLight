import os from 'node:os'

/** Pure (interfaces injectable) so the pick is unit-testable on fixtures. */

/** Tailscale hands out addresses from the CGNAT block 100.64.0.0/10. */
function isTailscaleRange(ip: string): boolean {
  const m = /^100\.(\d{1,3})\./.exec(ip)
  if (!m) return false
  const second = Number(m[1])
  return second >= 64 && second <= 127
}

/**
 * IPv4 addresses on the tailnet, best guess first: the Tailscale adapter's
 * own 100.64/10 address, then any other 100.64/10 address (the adapter is
 * renamed on some machines). Empty while Tailscale is down.
 */
export function pickTailscaleAddresses(
  ifaces: NodeJS.Dict<os.NetworkInterfaceInfo[]> = os.networkInterfaces()
): string[] {
  const candidates: { ip: string; score: number }[] = []
  for (const [name, infos] of Object.entries(ifaces)) {
    for (const info of infos ?? []) {
      if (info.family !== 'IPv4' || info.internal) continue
      if (!isTailscaleRange(info.address)) continue
      candidates.push({ ip: info.address, score: /tailscale/i.test(name) ? 1 : 0 })
    }
  }
  candidates.sort((a, b) => b.score - a.score)
  return [...new Set(candidates.map((c) => c.ip))]
}
