import cors from 'cors';
import express from 'express';

import { ADD_BATCH_INTERVAL_MS, DATA_BATCH_INTERVAL_MS } from './config.js';
import { buildApiRouter } from './api/routes.js';
import { ItemStore } from './domain/itemStore.js';
import { OperationQueue } from './queue/operationQueue.js';

export function createAppContext() {
	const app = express();

	const store = new ItemStore();

	const addQueue = new OperationQueue({
		name: 'add-queue',
		intervalMs: ADD_BATCH_INTERVAL_MS,
	});

	const dataQueue = new OperationQueue({
		name: 'data-queue',
		intervalMs: DATA_BATCH_INTERVAL_MS,
	});

	app.use(cors());
	app.use(express.json());

	app.get('/health', (_req, res) => {
		res.json({ ok: true });
	});

	app.use('/api', buildApiRouter({ store, addQueue, dataQueue }));

	return {
		app,
		startQueues() {
			addQueue.start();
			dataQueue.start();
		},
		stopQueues() {
			addQueue.stop();
			dataQueue.stop();
		},
	};
}
