const API_ORIGIN = 'https://billwise-backend-lbv7.onrender.com'

export default {
  async fetch(request, env) {
    const requestUrl = new URL(request.url)

    if (requestUrl.pathname === '/api' || requestUrl.pathname.startsWith('/api/')) {
      const upstreamUrl = new URL(`${requestUrl.pathname}${requestUrl.search}`, API_ORIGIN)
      return fetch(new Request(upstreamUrl, request))
    }

    return env.ASSETS.fetch(request)
  },
}
