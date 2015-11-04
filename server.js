var express = require('express')
var app     = express()
var ip      = require('ip')

var port = 3080
var url  = `http://${ip.address()}:${port}`

// Stand-in for user data (database table, redis store, etc)
var userData = {}

// Drop a settings.js file in this directory
var settings = require('./settings')

var MyJohnDeere = require('./index')

app.get('/authorize', function (req, res) {
	userData = {}

	var mjd = new MyJohnDeere(settings.mjdEndpoint, settings.mjdAppId, settings.mjdAppSecret)

	mjd.getRequestToken(`${url}/saveAuthorization`)
		.then(request => {
			userData.requestTokenSecret = request.tokenSecret
			res.send(`<script type="text/javascript">window.location = '${mjd.getAuthorizationUrl()}'</script>`)
		})
		.catch(e => res.send(e))
})

app.get('/saveAuthorization', function (req, res) {
	var mjd = new MyJohnDeere(settings.mjdEndpoint, settings.mjdAppId, settings.mjdAppSecret)

	mjd.getAccessToken(req.query.oauth_token, userData.requestTokenSecret, req.query.oauth_verifier)
		.then(access => {
			// Save the access token and secret - they're good for up to one year
			userData.accessToken       = access.token
			userData.accessTokenSecret = access.tokenSecret
		})
		.then(() => {
			makeAuthorizedCall()
		})
		.catch(e => res.send(e))

	function makeAuthorizedCall() {
		var mjd = new MyJohnDeere(
			settings.mjdEndpoint, settings.mjdAppId, settings.mjdAppSecret,
			userData.accessToken, userData.accessTokenSecret)

		mjd.getLinks().then(() => {
			mjd.get(mjd.links.files).end((err, apiRes) => {
				if (err) {
					res.send(err)
					return
				}

				res.send('<pre>' + JSON.stringify(apiRes.body, null, 2) + '</pre>')
			})
		})
	}
})

var server = app.listen(port, function () {
	console.log('Example app listening at http://%s:%s', ip.address(), port)
	console.log(`Visit ${url}/authorize`)
})