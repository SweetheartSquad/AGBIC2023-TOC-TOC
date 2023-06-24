import localForage from 'localforage';
// eslint-disable-next-line import/extensions
import pkg from '../package.json';

localForage.config({
	name: pkg.name,
	storeName: pkg.name.replace(/^[a-zA-Z0-9_]/g, '_'), // Should be alphanumeric, with underscores.
	description: pkg.description,
});
export const storage = localForage;
