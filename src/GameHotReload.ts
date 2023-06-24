import { Assets } from 'pixi.js';
import { game, resource, resources } from './Game';
import assets from './assets.txt';
import mainen from './assets/main-en.strand';
import { DEBUG } from './debug';
import { log } from './logger';

export { mainen, assets };

export async function enableHotReload() {
	async function onHotReloadStrand() {
		game.app.ticker.stop();
		Assets.unload('main-en');
		const data = await Assets.load(mainen);
		resources['main-en'] = data;
		if (!window.scene) throw new Error('Could not find scene');
		window.scene.strand.setSource(
			resource<string>(`main-${window.scene.strand.language || 'en'}`) || ''
		);
		if (window.scene.strand.currentPassage?.title) {
			await new Promise<void>((r) => {
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						if (!window.scene) return;
						window.scene.strand.history.push(
							window.scene.strand.currentPassage.title
						);
						window.scene.strand.back();
						r();
					});
				});
			});
		}
		game.app.ticker.start();
	}
	// allow hot-reloading main.strand
	// and assets
	if (DEBUG) {
		let promiseReloading = Promise.resolve();
		if (import.meta.webpackHot) {
			import.meta.webpackHot.accept('./assets/main-en.strand', () => {
				promiseReloading = promiseReloading.then(() => {
					log('[HACKY HMR] Reloading strand');
					return onHotReloadStrand();
				});
			});

			const { client } = await import('webpack-dev-server/client/socket');
			client.client.addEventListener('message', (e) => {
				if ((JSON.parse(e.data) as { type: string }).type === 'still-ok') {
					promiseReloading = promiseReloading.then(() => {
						log('[HACKY HMR] Reloading assets');
						return game.reloadAssets();
					});
				}
			});
		}
	}
}
