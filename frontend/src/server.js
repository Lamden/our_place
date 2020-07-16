import sirv from 'sirv';
import polka from 'polka';
import compression from 'compression';
import * as sapper from '@sapper/server';

const { PORT, NODE_ENV } = process.env;
const dev = NODE_ENV === 'development';
const DBUSER = process.env.DBUSER || 'myUserAdmin'
const DBPWD = process.env.DBPWD || 'dbadmin'

import explorer from './blockexplorer'

const redis = require("redis");
const client = redis.createClient();
const mongoose = require('mongoose');

mongoose.connect(
	`mongodb://${DBUSER}:${DBPWD}@127.0.0.1:27017/places?authSource=admin`,
	{useNewUrlParser: true, useUnifiedTopology: true}, (error) => {
		if (!error) explorer(false, client, mongoose)
	}
	)

client.on("error", function(error) {

});



function addClients(req, res, next){
	req.redisClient = client
	req.mongooseClient = mongoose
	next()
}

polka() // You can also use Express
	.use(
		compression({ threshold: 0 }),
		sirv('static', { dev }),
		addClients,
		sapper.middleware()
	)
	.listen(PORT, err => {
		if (err) console.log('error', err);
	});
