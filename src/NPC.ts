import { Btn } from './Btn';
import { Character } from './Character';
import {
	BODY_ENVIRONMENT,
	BODY_PLAYER,
	SENSOR_INTERACTION,
	SENSOR_PLAYER,
} from './collision';
import { getActiveScene } from './main';
import { Roam } from './Scripts/Roam';

export class NPC extends Character {
	roam: Roam;

	btn?: Btn;

	constructor({
		passage,
		roam = 0,
		...options
	}: ConstructorParameters<typeof Character>[0] & {
		passage?: string;
		roam?: number;
	}) {
		super({
			...options,
			bodyCollision: {
				...options.bodyCollision,
				collisionFilter: {
					category: BODY_ENVIRONMENT,
					mask: BODY_PLAYER | BODY_ENVIRONMENT,
				},
			},
			bodySensor: {
				...options.bodySensor,
				collisionFilter: {
					category: SENSOR_INTERACTION,
					mask: SENSOR_PLAYER,
				},
			},
		});
		this.scripts.push((this.roam = new Roam(this)));
		this.roam.range[1] = roam;
		this.roam.target.x = this.transform.x;
		this.roam.target.y = this.transform.y;
		this.roam.speed.x *= 0.004;
		this.roam.speed.y *= 0.004;

		if (passage) {
			this.btn = new Btn(
				() => {
					const scene = getActiveScene();
					if (!scene) return;
					scene.strand.gameObject = this;
					scene.strand.goto(passage);
				},
				getActiveScene()
					?.t('talk to {}')
					.replace('{}', options.body || '') || ''
			);
			this.display.container.addChild(this.btn.display.container);
			this.display.container.interactiveChildren = true;
		}
	}

	update(): void {
		this.moving.x = this.bodyCollision.body.velocity.x;
		this.moving.y = this.bodyCollision.body.velocity.y;
		super.update();
		if (this.btn) {
			this.btn.display.container.width = this.spr.width;
			this.btn.display.container.height = this.spr.height;
		}
	}
}
