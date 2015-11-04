var _       = require('lodash')
var OAuth   = require('oauth')
var request = require('superagent')
require('superagent-oauth')(request)

var MyJohnDeere = function(apiUrl, appId, appSecret, accessToken, accessTokenSecret) {
	var properties = typeof apiUrl === 'object' ? apiUrl : {
		apiUrl:            apiUrl,
		appId:             appId,
		appSecret:         appSecret,
		accessToken:       accessToken,
		accessTokenSecret: accessTokenSecret
	}

	this.properties = properties
	this.links = {}
}

MyJohnDeere.prototype.getRequestToken = function(callbackUrl) {
	this.properties.callbackUrl = this.properties.callbackUrl || callbackUrl

	return this._createOAuthContext()
		.then(this.getLinks.bind(this))
		.then(this._createOAuthContext.bind(this))
		.then(this._getRequestToken.bind(this))
}

MyJohnDeere.prototype.getAuthorizationUrl = function() {
	var url = this.links.oauthAuthorizeRequestToken.replace('{token}', this.properties.requestToken)
	return url
}

MyJohnDeere.prototype.getAccessToken = function(requestToken, requestTokenSecret, verifier) {
	this.properties.requestToken       = this.properties.requestToken       || requestToken
	this.properties.requestTokenSecret = this.properties.requestTokenSecret || requestTokenSecret
	this.properties.verifier           = this.properties.verifier           || verifier

	return this._createOAuthContext()
		.then(this.getLinks           .bind(this))
		.then(this._createOAuthContext.bind(this))
		.then(this._getAccessToken    .bind(this))
}

MyJohnDeere.prototype.getLinks = function() {
	return new Promise((resolve, reject) => {
		this.get('/').end((err, res) => {
			if (err) {
				reject(err)
				return
			}

			this.links = res.body.links
			resolve(this.links)
		})
	})
}

MyJohnDeere.prototype._unpackLinks = function(links) {
	var linkDir = {}
	_.each(links, linkObj => {
		linkDir[linkObj.rel] = linkObj.uri
	})

	return linkDir
}

MyJohnDeere.prototype._createOAuthContext = function() {
	this.oauth = new OAuth.OAuth(
		this.links.oauthRequestToken || '',
		this.links.oauthAccessToken  || '',
		this.properties.appId,
		this.properties.appSecret,
		'1.0',
		this.properties.callbackUrl,
		'HMAC-SHA1'
	)

	return Promise.resolve()
}

MyJohnDeere.prototype._getRequestToken = function() {
	return new Promise((resolve, reject) => {
		this.oauth.getOAuthRequestToken((err, requestToken, requestTokenSecret, results) => {
			if (err) {
				reject(err)
				return
			}

			this.properties.requestToken       = requestToken
			this.properties.requestTokenSecret = requestTokenSecret

			resolve({token: this.properties.requestToken, tokenSecret: this.properties.requestTokenSecret})
		})
	})
}

MyJohnDeere.prototype._getAccessToken = function() {
	return new Promise((resolve, reject) => {
		this.oauth.getOAuthAccessToken(
			this.properties.requestToken,
			this.properties.requestTokenSecret,
			this.properties.verifier,
			(err, accessToken, accessTokenSecret, results) => {
				if (err) {
					reject(err)
					return
				}

				this.properties.accessToken       = accessToken
				this.properties.accessTokenSecret = accessTokenSecret

				resolve({token: this.properties.accessToken, tokenSecret: this.properties.accessTokenSecret})
			})
	})
}

MyJohnDeere.prototype.request = function(method, url, options) {
	if (!this.oauth) {
		this._createOAuthContext()
	}

	// Allow omitting method
	if (typeof url === 'object' || url === undefined) {
		options = url
		url     = method
		method  = 'GET'
	}

	options = options || {}

	// Allow relative URLs
	if (url.startsWith('/')) {
		url = this.properties.apiUrl + url
	}

	// Allow URL interpolation
	_.each(Object.keys(options), key => {
		if (url.includes(`{${key}}`)) {
			url = url.replace(`{${key}}`, options[key])
			delete options[key]
		}
	})
console.log('url: ' + url)
console.log('method: ' + method)
console.log('options: ' + JSON.stringify(options))

	// Create request instance
	var r = request(method, url)

	// Hijack the .end function
	var self = this
	r._end = r.end
	r.end  = function(callback) {
		r._end(function(err, res) {
			// Try to unpack the links into a more friendly version
			if (res && res.body && res.body.links) {
				res.body.links = self._unpackLinks(res.body.links)

				// Apply same logic to links inside value objects
				_.each(res.body.values || [], value => {
					if (value.links) {
						value.links = self._unpackLinks(value.links)
					}
				})
			}

			// Call user callback
			callback.apply(this, [err, res])
		})
	}

	// Presign and set default JSON Accept header
	r = r
		.sign(this.oauth, this.properties.accessToken || '', this.properties.accessTokenSecret || '')
		.set('Accept', 'application/vnd.deere.axiom.v3+json')

	return r
}

// Convenience functions
MyJohnDeere.prototype.get    = function(url, options) {return this.request('GET',    url, options)}
MyJohnDeere.prototype.post   = function(url, options) {return this.request('POST',   url, options)}
MyJohnDeere.prototype.put    = function(url, options) {return this.request('PUT',    url, options)}
MyJohnDeere.prototype.delete = function(url, options) {return this.request('DELETE', url, options)}

module.exports = MyJohnDeere