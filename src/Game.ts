import HowlerLoaderParser from 'howler-pixi-loader-middleware';
import {
	Application,
	Assets,
	Container,
	DisplayObject,
	extensions,
	loadTxt,
	NineSlicePlane,
	ProgressCallback,
	Renderer,
	SCALE_MODES,
	settings,
	Sprite,
	Text,
	utils,
} from 'pixi.js';
import { size } from './config';
import * as fonts from './font';
import { assets, enableHotReload, mainen } from './GameHotReload';
import { getActiveScene, init } from './main';
import { Display } from './Scripts/Display';
import { tex } from './utils';

// PIXI configuration stuff
settings.SCALE_MODE = SCALE_MODES.NEAREST;
settings.ROUND_PIXELS = true;

function cacheBust(url: string) {
	const urlObj = new URL(url, window.location.href);
	urlObj.searchParams.set('t', process.env.HASH || '');
	return urlObj.toString();
}

let frameCounts: Record<string, number>;
export const resources: Record<string, unknown> = {};

export function resource<T>(key: string) {
	return resources[key] as T | undefined;
}

export function getFrameCount(animation: string): number {
	return frameCounts[animation] || 0;
}

window.resources = resources;
window.resource = resource;

function updateResourceCache(assetsLoaded: Record<string, unknown>) {
	// cache frame sequence data
	const animated = Object.keys(assetsLoaded)
		.filter((i) => i.endsWith('.1'))
		.map((i) => i.replace(/\.1$/, ''));
	frameCounts = Object.fromEntries(
		animated.map((i) => [
			i,
			Object.keys(assetsLoaded).filter((j) => j.startsWith(i)).length,
		])
	);

	// update public cache
	Object.keys(resources).forEach((i) => delete resources[i]);
	Object.entries(assetsLoaded).forEach(([key, value]) => {
		resources[key] = value;
	});
	animated.forEach((i) => {
		resources[i] = resources[`${i}.1`];
	});
}

export class Game {
	app: Application;

	startTime: number;

	constructor() {
		const canvas = document.createElement('canvas');
		this.app = new Application({
			view: canvas,
			width: size.x,
			height: size.y,
			antialias: false,
			backgroundAlpha: 1,
			resolution: 1,
			clearBeforeRender: true,
			backgroundColor: 0x000000,
		});
		this.startTime = Date.now();
	}

	async load(onLoad?: ProgressCallback) {
		Assets.init();

		// setup parsers
		Assets.loader.parsers.push({
			...loadTxt,
			test(url) {
				return utils.path.extname(url).includes('.strand');
			},
		});
		Assets.loader.parsers.push({
			...loadTxt,
			test(url) {
				return utils.path.extname(url).includes('.glsl');
			},
		});
		extensions.add(HowlerLoaderParser);

		// load assets list
		const assetsData = (await Assets.load<string>(cacheBust(assets))) as string;
		const assetResources = assetsData
			.trim()
			.split(/\r?\n/)
			.flatMap((i) => {
				if (i.match(/\.x\d+\./)) {
					const [base, count, ext] = i.split(/\.x(\d+)\./);
					return new Array(parseInt(count, 10))
						.fill('')
						.map((_, idx) => `${base}.${idx + 1}.${ext}`);
				}
				return i;
			})
			.filter((i) => i && !i.startsWith('//'))
			.reduce<Record<string, string>>((acc, i) => {
				const name = i.split('/').pop()?.split('.').slice(0, -1).join('.') || i;
				const url = cacheBust(i.startsWith('http') ? i : `assets/${i}`);
				acc[name] = url;
				return acc;
			}, {});

		// add fixed assets
		assetResources['main-en'] = cacheBust(mainen);

		// load assets
		Assets.addBundle('resources', assetResources);
		const assetsLoaded = await Assets.loadBundle('resources', onLoad);

		// verify assets loaded
		const failedToLoad = Object.keys(assetResources)
			.filter((i) => !assetsLoaded[i])
			.join(', ');
		if (failedToLoad) throw new Error(`Failed to load: ${failedToLoad}`);

		updateResourceCache(assetsLoaded);

		// preload fonts
		Object.values(fonts).forEach((i) => {
			const t = new Text('preload', i);
			t.alpha = 0;
			this.app.stage.addChild(t);
			this.app.stage.render(this.app.renderer as Renderer);
			this.app.stage.removeChild(t);
		});
	}

	private async reloadAssetsRaw() {
		this.app.ticker.stop();

		function recurseChildren(
			result: DisplayObject[],
			obj: DisplayObject
		): DisplayObject[] {
			result = result.concat(obj);
			if (!(obj instanceof Container)) return result;
			return result.concat(
				...(obj as Container).children.map((i) => recurseChildren([], i))
			);
		}
		const scene = getActiveScene();
		const objs = recurseChildren([], this.app.stage).concat(
			...Object.values(scene?.areas || [])
				.flat()
				.flatMap((i) => i?.getScripts(Display))
				.filter((i) => i)
				.map((i) => recurseChildren([], (i as Display).container))
		);
		type Textured = Sprite | NineSlicePlane;
		const textures = objs
			.map((i) => [i, (i as Textured)?.texture?.textureCacheIds[1]])
			.filter(([, id]) => id) as [Textured, string][];

		await Assets.unloadBundle('resources');
		const assetsLoaded = await Assets.loadBundle('resources');
		updateResourceCache(assetsLoaded);
		textures.forEach(([textured, texId]) => {
			if ((textured as NineSlicePlane).shader) {
				(textured as NineSlicePlane).shader.uniforms.uSampler.baseTexture =
					tex(texId).baseTexture;
			}
			textured.texture = tex(texId);
		});
		scene?.screenFilter.reload();
		this.app.ticker.start();
	}

	private reloadingAssets = Promise.resolve();

	async reloadAssets() {
		this.reloadingAssets = this.reloadingAssets.then(() =>
			this.reloadAssetsRaw()
		);
		return this.reloadingAssets;
	}

	init = init;
}

export const game = new Game();
window.game = game;

enableHotReload();
