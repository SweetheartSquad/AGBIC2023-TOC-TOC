import { BLEND_MODES, Sprite } from 'pixi.js';
import { GameObject } from './GameObject';
import { Display } from './Scripts/Display';
import { getActiveScene, mouse } from './main';
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
		spr.on('pointerdown', (event) => {
			if (event && event.button !== undefined && event.button !== mouse.LEFT)
				return;
			spr.texture = tex(`blank`);
			getActiveScene()?.dialogue.prompt();
			onClick();
		});
		spr.on('mouseover', () => {
			spr.texture = tex(`glow`);
			getActiveScene()?.dialogue.prompt(label, onClick);
		});
		spr.on('mouseout', () => {
			spr.texture = tex(`blank`);
			getActiveScene()?.dialogue.prompt();
		});
	}
}
