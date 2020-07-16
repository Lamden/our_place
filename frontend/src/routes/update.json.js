
export async function get(req, res, next) {
	const lastUpdate = new Date(req.query.timestamp)

	res.setHeader('Content-Type', 'application/json');

	res.end(JSON.stringify( await new Promise((resolver) => {
		req.mongooseClient.models.Updates.find({
			"timestamp": { $gt: lastUpdate }
		})
		.then(updates => resolver({updates, timestamp: new Date()}))
	})))
}