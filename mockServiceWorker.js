/**
 * Mock Service Worker.
 * @see https://github.com/open-draft/msw
 * - Please do NOT modify this file.
 * - Please do NOT serve this file on production.
 */
/* eslint-disable */
/* tslint:disable */

const bannerStyle = 'color:orangered;font-weight:bold;'

self.addEventListener('install', function() {
  return self.skipWaiting()
})

self.addEventListener('activate', function() {
  console.log('%c[MSW] Service Worker activated.', bannerStyle)
  return self.clients.claim()
})

self.addEventListener('message', function(event) {
  switch (event.data) {
    case 'MOCK_ACTIVATE': {
      self.__isMswEnabled = true
      console.groupCollapsed('%c[MSW] Mocking enabled.', bannerStyle)
      console.log(
        '%cGetting started: %chttps://redd.gitbook.io/msw/getting-started',
        'font-weight:bold',
        'font-weight:normal',
      )
      console.log('Found an issue? https://github.com/open-draft/msw/issues')
      console.groupEnd()
      break
    }

    case 'MOCK_DEACTIVATE': {
      self.__isMswEnabled = false
      console.warn('[MSW] Deactivating Service Worker...')
      break
    }
  }
})

function serializeHeaders(headers) {
  const reqHeaders = {}
  headers.forEach((value, name) => {
    reqHeaders[name] = value
  })
  return reqHeaders
}

function messageClient(client, message) {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel()

    channel.port1.onmessage = (event) => {
      if (event.data && event.data.error) {
        reject(event.data.error)
      } else {
        resolve(event.data)
      }
    }

    client.postMessage(JSON.stringify(message), [channel.port2])
  })
}

self.addEventListener('fetch', async function(event) {
  const { clientId, request } = event
  const requestClone = request.clone()
  const getOriginalResponse = () => fetch(requestClone)

  event.respondWith(
    new Promise(async (resolve) => {
      const client = await event.target.clients.get(clientId)

      // Bypass requests while MSW is not enabled
      if (!client || !self.__isMswEnabled) {
        return resolve(getOriginalResponse())
      }

      // Bypass requests with the explicit bypass header
      if (request.headers.get('x-msw-bypass') === 'true') {
        const modifiedHeaders = serializeHeaders(request.headers)
        // Remove the bypass header to comply with the CORS preflight check
        delete modifiedHeaders['x-msw-bypass']

        return resolve(
          fetch(
            new Request(request.url, {
              ...req,
              headers: new Headers(modifiedHeaders),
            }),
          ),
        )
      }

      /**
       * Converts "Headers" to the plain Object to be stringified.
       * @todo See how this handles multipe headers with the same name.
       */
      const reqHeaders = serializeHeaders(request.headers)
      const body = await request
        .json()
        .catch(() => request.text())
        .catch(() => null)

      const clientResponse = await messageClient(client, {
        url: request.url,
        method: request.method,
        headers: reqHeaders,
        cache: request.cache,
        mode: request.mode,
        credentials: request.credentials,
        destination: request.destination,
        integrity: request.integrity,
        redirect: request.redirect,
        referrer: request.referrer,
        referrerPolicy: request.referrerPolicy,
        body,
        bodyUsed: request.bodyUsed,
        keepalive: request.keepalive,
      })

      if (clientResponse === 'MOCK_NOT_FOUND') {
        return resolve(getOriginalResponse())
      }

      const mockedResponse = JSON.parse(clientResponse, (key, value) => {
        return key === 'headers' ? new Headers(value) : value
      })

      setTimeout(
        resolve.bind(this, new Response(mockedResponse.body, mockedResponse)),
        mockedResponse.delay,
      )
    }).catch((error) => {
      console.error(
        '[MSW] Failed to mock a "%s" request to "%s": %s',
        request.method,
        request.url,
        error,
      )
    }),
  )
})
