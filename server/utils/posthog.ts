import { PostHog } from 'posthog-node'

let posthog: PostHog | null = null

function getPostHog(): PostHog {
  if (!posthog) {
    const config = useRuntimeConfig()
    posthog = new PostHog(String(config.public.posthogPublicKey), { host: String(config.public.posthogHost) })
  }
  return posthog
}

export function capture(event: string, properties?: Record<string, unknown>, distinctId = 'server') {
  getPostHog().capture({ distinctId, event, properties })
}
