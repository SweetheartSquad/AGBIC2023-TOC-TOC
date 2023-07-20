import { Btn } from './Btn';
import { BtnItem } from './BtnItem';
import { Character } from './Character';
import {
	BODY_ENVIRONMENT,
	BODY_PLAYER,
	SENSOR_INTERACTION,
	SENSOR_PLAYER,
} from './collision';
import { Roam } from './Scripts/Roam';

export class NPC extends Character {
	name: string;

	roam: Roam;

	btn?: Btn;

	constructor({
		name,
		roam = 0,
		use,
		offset = 0,
		...options
	}: ConstructorParameters<typeof Character>[0] & {
		name?: string;
		use?: ConstructorParameters<typeof BtnItem>[0]['use'];
		roam?: number;
		offset?: number;
	}) {
		super({
			...options,
			bodyCollision: {
				isStatic: true,
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

		if (offset) {
			// @ts-ignore
			this.display.container.offset = offset;
		}

		this.name = name || options.body || '';
		if (use) {
			this.btn = new BtnItem({
				gameObject: this,
				use,
				label: this.name,
			});
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
