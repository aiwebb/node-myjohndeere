# node-myjohndeere

[MyJohnDeere API](https://developer.deere.com) helper library for node.js.

## Installation

```shell
npm install --save myjohndeere
```

```javascript
var MyJohnDeere = require('myjohndeere')
```

## Usage

#### Getting request token (initial authorization)
```javascript
var mjd = new MyJohnDeere(apiUrl, appId, appSecret)

mjd.getRequestToken(callbackUrl)
	.then(request => {
		// Save request.tokenSecret temporarily
		// Redirect to mjd.getAuthorizationUrl()
	})
```

#### Trading for access token (inside handler for callbackUrl)
```javascript
var mjd = new MyJohnDeere(apiUrl, appId, appSecret)

// oauth_token and oauth_verifier are from URL query params
mjd.getAccessToken(oauth_token, requestTokenSecret, oauth_verifier)
	.then(access => {
		// Save access.token and access.tokenSecret - they're good for up to one year
	})
```

#### Making authorized requests
```javascript
var mjd = new MyJohnDeere(apiUrl, appId, appSecret, accessToken, accessTokenSecret)

// getLinks() stores the top level API catalog in .links
mjd.getLinks().then(() => {
	mjd.get(mjd.links.files).end((err, apiRes) => {
		// JSON result in apiRes.body

		// can continue with e.g. mjd.get(apiRes.body.links.nextPage)
	})
})
```

## Notes
- Links (`apiRes.body.links`, `apiRes.body.values[i].links`) are transformed from arrays of dictionaries (`[{rel: ..., uri: ...}]`) into flat dictionaries (`{self: <uri>, nextPage: <uri>, prevPage: <uri>}`) for convenience.
- `.request([method='GET'], url, [options={}])` returns a pre-signed [superagent](http://visionmedia.github.io/superagent/) request object configured to accept JSON and with support for relative URLs. If you need a different return type, simply override it with `.set('Accept', ...)`.
- `.(get|post|put|delete)` are convenience wrappers for `.request`.
- Requires node 4.x or above.
- URL interpolation is supported via the `options` parameter to `.request` and its convenience wrappers
	- e.g. `mjd.get(mjd.links.organizationMaintenancePlans, {orgId: 12345})`

## Test server
A small [express](https://github.com/strongloop/express/) server is included for testing and as an example implementation. To use it, you'll need to drop in a `settings.js` file:

```javascript
module.exports = {
	mjdEndpoint:  'https://apicert.soa-proxy.deere.com/platform',
	mjdAppId:     '...',
	mjdAppSecret: '...'
}
```

From there, just run `node server.js` in the module directory.

## Contributing

Issues and pull requests welcome.

## TODO

- Embeds
- Recursive calls