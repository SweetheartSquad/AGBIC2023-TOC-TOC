// eslint-disable-next-line import/extensions
import './assets/style.css';
import { size } from './config';
import { DEBUG } from './debug';
import { error } from './logger';
import { Resizer, ScaleModes } from './Resizer';

let preloaded = false;

// 0 = preload doesn't visually affect loader progress
// 1 = asset load doesn't visually affect loader progress
// .5 = preload and asset load equally visually affect loader progress
const preloadWeight = 0.25;
let progress = 0;

function makeStr(mask: number) {
	return `Loading...\n${(mask * 100).toFixed(0)}%`;
}

const progressEl = document.createElement('p');
progressEl.setAttribute('role', 'progressbar');
progressEl.setAttribute('aria-valuemin', '0');
progressEl.setAttribute('aria-valuemax', '100');
progressEl.textContent = makeStr(0);

// try to auto-focus and make sure the game can be focused with a click if run from an iframe
window.focus();
document.body.addEventListener('mousedown', () => {
	window.focus();
});

export const resizer = new Resizer(size.x, size.y, ScaleModes.MULTIPLES);
window.resizer = resizer;
document.body.appendChild(resizer.element);

const playEl = document.createElement('button');
playEl.id = 'play';
playEl.textContent = 'Play';
resizer.appendChild(playEl);

let hasErrored = false;
function fail(err: unknown) {
	hasErrored = true;
	progressEl.textContent = `Something went wrong - Sorry :(\n${
		err instanceof Error ? err.message : 'See console for details'
	}`;
	throw err;
}

function loadProgressHandler(p?: number) {
	if (hasErrored) return;
	// called during loading
	if (p !== undefined) {
		progress = p;
		if (preloaded) {
			progress *= 1 - preloadWeight;
			progress += preloadWeight * 100;
		} else {
			progress *= preloadWeight;
		}
		progress = Math.max(1, Math.min(99, progress));
	}
	const str = makeStr((progress || 0) / 100);
	progressEl.textContent = str;
	progressEl.setAttribute('aria-valuenow', (progress || 0).toString(10));
}

async function play() {
	let interval: ReturnType<typeof setInterval> | undefined;
	try {
		playEl.remove();

		resizer.appendChild(progressEl);

		// start the preload
		loadProgressHandler(0);
		interval = setInterval(() => {
			loadProgressHandler();
		}, 100);

		const [{ game }] = await Promise.all([import('./Game')]);
		preloaded = true;
		// start the actual load
		loadProgressHandler(0);

		await game.load((p) => loadProgressHandler(p * 100));
		progressEl.remove();
		// TODO: remove unsafe cast https://github.com/pixijs/pixijs/pull/8820
		resizer.appendChild(game.app.view as unknown as HTMLCanvasElement);
		game.init();
	} catch (err) {
		preloaded = true;
		error(err);
		fail(err);
	} finally {
		clearInterval(interval);
	}
}

playEl.onclick = play;
if (DEBUG) {
	window.debugPhysics = false;
	playEl.click();
}

interface LoadedEvent {
	detail: { loaded: number; total: number; resource: { url: string } };
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
document.addEventListener(
	'chunk-progress-webpack-plugin',
	({ detail: { loaded, total } }: LoadedEvent) => {
		loadProgressHandler((loaded / total) * 100 || 0);
	}
);
