import { BLEND_MODES, Sprite } from 'pixi.js';
import { GameObject } from './GameObject';
import { Display } from './Scripts/Display';
import { tex } from './utils';

export class Btn extends GameObject {
	display: Display;

	constructor(public onClick: () => void, label: string) {
		super();
		this.scripts.push((this.display = new Display(this)));

		const spr = new Sprite(tex(`blank`));
		spr.name = 'button';
		this.display.container.addChild(spr);
		this.display.container.interactiveChildren = true;
		spr.anchor.x = 0.5;
		spr.anchor.y = 1.0;
		spr.accessible = true;
		spr.accessibleHint = label;
		spr.interactive = true;
		spr.cursor = 'pointer';
		spr.tabIndex = 0;
		spr.blendMode = BLEND_MODES.ADD;
		spr.on('pointerdown', onClick);
		spr.on('mouseover', () => {
			spr.texture = tex(`glow`);
		});
		spr.on('mousedown', () => {
			spr.texture = tex(`blank`);
			setTimeout(() => {
				spr.texture = tex(`blank`);
			}, 100);
		});
		spr.on('mouseout', () => {
			spr.texture = tex(`blank`);
		});
	}
}
