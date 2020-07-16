
export async function get(req, res, next) {
	res.setHeader('Content-Type', 'application/json');

	res.end(JSON.stringify( await new Promise((resolver) => {
		req.redisClient.get(`place`, function (err, place){
			resolver({place, timestamp: new Date()})
		})
	})))
}