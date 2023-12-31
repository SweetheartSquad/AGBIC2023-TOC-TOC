import { Btn } from './Btn';
import { GameObject } from './GameObject';
import { Transform } from './Scripts/Transform';
import { getActiveScene } from './main';

export class BtnItem extends Btn {
	cycles: { [key: string]: number } = {};

	use: {
		undefined: string[];
		other: string[];
		[key: string]: string[];
	};

	constructor({
		gameObject,
		use,
		label,
	}: {
		gameObject: GameObject;
		use: BtnItem['use'];
		label: string;
	}) {
		super(() => {
			const scene = getActiveScene();
			if (!scene) return;
			scene.player.flipped =
				scene.player.transform.x > (gameObject.getScript(Transform)?.x || 0);
			scene.player.canMove = false;
			scene.strand.gameObject = gameObject;
			const item = scene.carrying?.name;
			let key = `${item}`;
			let say = this.use[key];
			let { cycles } = this;

			// nothing specific to say, so go to other
			if (!say) {
				key =
					(item && scene.carrying?.btn?.use.otherTarget && 'otherTarget') ||
					'other';
				say = (item && scene.carrying?.btn?.use.otherTarget) || this.use.other;
				cycles = (item && scene.carrying?.btn?.cycles) || this.cycles;
			}

			// nothing to say, so go to global generic use
			if (!say) {
				scene.strand.goto('generic use');
				scene.loseItem();
				return;
			}

			const cycle = cycles[key] || 0;
			cycles[key] = cycle + 1;
			let currentSay = say[cycle % say.length];
			if (currentSay.startsWith('goto:')) {
				scene.strand.goto(currentSay.replace('goto:', ''));
			} else {
				// focus on player instead of target
				if (currentSay.startsWith('p:')) {
					currentSay = currentSay.substring(2);
					scene.strand.gameObject = scene.player;
				}
				// just say the line and lose the item
				scene.dialogue.say(currentSay, [
					{ text: '', action: () => scene.dialogue.close() },
				]);
				scene.loseItem();
			}
		}, label);
		this.use = use;
	}

	resetCycles() {
		this.cycles = {};
	}
}
