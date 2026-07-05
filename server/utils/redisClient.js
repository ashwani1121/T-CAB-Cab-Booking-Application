const redis  = require('redis');
const client = redis.createClient({
    socket: {
      host: '127.0.0.1',
      port: 6379
    }
});
client.on('error', err => console.error('❌ Redis Client Error:', err));
const connectRedis = async () => {
	await client.connect();
	console.log('✅ Connected to Redis');
};
module.exports = { client, connectRedis };