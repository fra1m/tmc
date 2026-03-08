import { createAppContext } from './app.js';
import { DEFAULT_PORT } from './config.js';

const context = createAppContext();
const port = Number(process.env.PORT ?? DEFAULT_PORT);

context.startQueues();

const server = context.app.listen(port, () => {
	console.log(`Backend listening on http://localhost:${port}`);
});

function gracefulShutdown() {
	context.stopQueues();
	server.close(() => {
		process.exit(0);
	});
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
