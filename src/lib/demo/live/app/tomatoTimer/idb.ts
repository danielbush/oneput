import { type DBSchema } from 'idb';
import { type FinishedSession, type UnfinishedSession } from './value.js';

export type FinishedSessionRecord = FinishedSession & { id: number };

export interface TomatoTimerDB extends DBSchema {
	currentSession: {
		value: UnfinishedSession;
		key: string;
	};
	completedSessions: {
		value: FinishedSessionRecord;
		key: number;
	};
}

export const DB_NAME = 'tomato-timer';
export const CURRENT_SESSION_STORE = 'currentSession';
export const CURRENT_SESSION_KEY = 'currentSession';
export const COMPLETED_SESSIONS_STORE = 'completedSessions';
