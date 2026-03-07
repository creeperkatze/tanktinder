import { PostHog } from 'posthog-node'

let _ph: PostHog | null = null

function getPostHog(): PostHog {
  if (!_ph) {
    const config = useRuntimeConfig()
    _ph = new PostHog(String(config.public.posthogPublicKey), { host: String(config.public.posthogHost) })
  }
  return _ph
}

export function capture(event: string, properties?: Record<string, unknown>, distinctId = 'server') {
  getPostHog().capture({ distinctId, event, properties })
}
