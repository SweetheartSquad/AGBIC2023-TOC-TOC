import { Body, Events, Runner } from 'matter-js';
import { Container, DisplayObject, Graphics, Sprite } from 'pixi.js';
import { Area } from './Area';
import { Border } from './Border';
import { BtnItem } from './BtnItem';
import { Camera } from './Camera';
import { game, resource } from './Game';
import { GameObject } from './GameObject';
import { Item } from './Item';
import { engine } from './Physics';
import { PhysicsDebug } from './PhysicsDebug';
import { Player } from './Player';
import { ScreenFilter } from './ScreenFilter';
import { StrandE } from './StrandE';
import { TweenManager } from './Tweens';
import { UIDialogue } from './UIDialogue';
import { size } from './config';
import { DEBUG } from './debug';
import { getInput } from './main';
import { clamp, delay, relativeMouse, removeFromArray, tex } from './utils';

let player: Player;

function depthCompare(
	a: DisplayObject & { offset?: number },
	b: DisplayObject & { offset?: number }
): number {
	return a.y + (a.offset || 0) - (b.y + (b.offset || 0));
}

export class GameScene {
	container = new Container();

	graphics = new Graphics();

	camPoint = new Container();

	camera = new Camera();

	dialogue: UIDialogue;

	screenFilter: ScreenFilter;

	strand: StrandE;

	border: Border;

	areas: Partial<{ [key: string]: GameObject[] }> & { root: GameObject[] } = {
		root: [],
	};

	area?: string;

	get currentArea() {
		return this.areas[this.area || ''];
	}

	find(name: string) {
		return this.currentArea?.find(
			(i) => (i as { name?: string }).name === name
		);
	}

	findAll(name: string) {
		return this.currentArea?.filter(
			(i) => (i as { name?: string }).name === name
		);
	}

	player: Player;

	onCollisionStart: (e: Matter.IEventCollision<Matter.Engine>) => void;

	onCollisionEnd: (e: Matter.IEventCollision<Matter.Engine>) => void;

	runner: Runner;

	physicsDebug?: PhysicsDebug;

	focusAmt = 0.8;

	carrying?: Item;

	sprCarrying: Sprite;

	constructor() {
		this.container.addChild(this.camPoint);
		this.camera.setTarget(this.camPoint);
		this.camera.display.container.interactiveChildren = true;

		this.player = player = new Player({});
		this.container.addChild(player.display.container);
		this.container.addChild(player.displayShadow.container);

		this.sprCarrying = new Sprite(tex('blank'));
		this.sprCarrying.anchor.x = 0.5;
		this.sprCarrying.anchor.y = 1;
		game.app.stage.addChild(this.sprCarrying);

		this.strand = new StrandE({
			source: resource<string>('main-en') || '',
			logger: {
				/* eslint-disable no-console */
				log: (...args) => this.strand.debug && console.log(...args),
				warn: (...args) => console.warn(...args),
				error: (...args) => console.error(...args),
				/* eslint-enable no-console */
			},
			renderer: {
				displayPassage: (passage) => {
					if (passage.title === 'close') {
						this.dialogue.close();
						player.followers.forEach((i) => {
							i.roam.active = true;
						});
						return Promise.resolve();
					}
					player.followers.forEach((i) => {
						i.roam.active = false;
					});
					const program = this.strand.execute(passage.program);
					if (this.strand.voice) {
						this.dialogue.voice = this.strand.voice;
						delete this.strand.voice;
					}
					const text: string[] = [];
					const actions: ((typeof program)[number] & {
						name: 'action';
					})['value'][] = [];
					program.forEach((node) => {
						switch (node.name) {
							case 'text':
								text.push(node.value);
								break;
							case 'action':
								actions.push(node.value);
								break;
							default:
								throw new Error('unrecognized node type');
						}
					});
					this.dialogue.say(
						text.join('').trim(),
						actions.map((i) => ({
							text: i.text,
							action: () => this.strand.eval(i.action),
						}))
					);
					return Promise.resolve();
				},
			},
		});
		this.strand.scene = this;
		this.strand.debug = DEBUG;
		this.dialogue = new UIDialogue(this.strand);

		this.border = new Border();
		this.border.init();

		const interactions: Body[] = [];

		const updateInteractions = async () => {
			const interrupt = interactions.find((i) => i.plugin.interrupt);
			if (interrupt) {
				interactions.length = 0;
				this.strand.gameObject = interrupt.plugin.gameObject as GameObject;
				if (interrupt.plugin.interrupt.passage) {
					this.strand.goto(interrupt.plugin.interrupt.passage);
				}
				return;
			}
			const goto = interactions.find((i) => i.plugin.goto);
			if (goto) {
				interactions.length = 0;
				const { transition = 1 } = goto.plugin.goto;
				const collidesWith = player.bodySensor.body.collisionFilter.mask;
				if (transition) {
					player.bodySensor.body.collisionFilter.mask = 0;
					this.dialogue.scrim(1, 300 * transition);
					await delay(300 * transition);
				}
				this.dialogue.prompt();
				this.goto(goto.plugin.goto);
				if (transition) {
					this.dialogue.scrim(0, 100 * transition);
					await delay(100 * transition);
					player.bodySensor.body.collisionFilter.mask = collidesWith;
				}
			}
		};
		Events.on(
			engine,
			'collisionStart',
			(this.onCollisionStart = ({ pairs }) => {
				pairs.forEach(({ bodyA, bodyB }) => {
					if (bodyA === player.bodySensor.body) {
						interactions.push(bodyB);
						updateInteractions();
					} else if (bodyB === player.bodySensor.body) {
						interactions.push(bodyA);
						updateInteractions();
					}
				});
			})
		);
		Events.on(
			engine,
			'collisionEnd',
			(this.onCollisionEnd = ({ pairs }) => {
				pairs.forEach(({ bodyA, bodyB }) => {
					if (bodyA === player.bodySensor.body) {
						removeFromArray(interactions, bodyB);
						updateInteractions();
					} else if (bodyB === player.bodySensor.body) {
						removeFromArray(interactions, bodyA);
						updateInteractions();
					}
				});
			})
		);

		this.take(this.player);
		this.take(this.dialogue);
		this.take(this.border);
		this.take(this.camera);

		this.screenFilter = new ScreenFilter();

		this.camera.display.container.addChild(this.container);

		this.strand.history.push('close');

		this.border.display.container.alpha = 0;
		this.strand.goto('start');

		this.runner = Runner.create({
			isFixed: true,
		});
		Runner.start(this.runner, engine);
	}

	destroy(): void {
		this.physicsDebug?.destroy();
		if (this.currentArea) {
			Area.unmount(this.currentArea);
		}
		Events.off(engine, 'collisionStart', this.onCollisionStart);
		Events.off(engine, 'collisionEnd', this.onCollisionEnd);
		Object.values(this.areas).forEach((a) => a?.forEach((o) => o.destroy()));
		this.container.destroy({
			children: true,
		});
		this.dialogue.destroy();
		Runner.stop(this.runner);
	}

	goto({
		area = this.area,
		x = 0,
		y = 0,
	}: {
		area?: string;
		x?: number;
		y?: number;
	}) {
		this.gotoArea(area);
		player.setPosition(x, y);
	}

	gotoArea(area?: string) {
		let a = this.currentArea;
		if (a) Area.unmount(a);
		this.area = area;
		a = this.currentArea;
		if (!a) throw new Error(`Area "${area}" does not exist`);
		Area.mount(a, this.container);
	}

	update(): void {
		if (DEBUG) {
			if (
				this.dialogue.isOpen &&
				this.strand.currentPassage.title === 'debug menu' &&
				getInput().menu
			) {
				this.strand.goto('close');
			} else if (getInput().menu) {
				this.strand.goto('debug menu');
			}
		}

		const relativeMousePos = relativeMouse();
		if (!this.dialogue.isOpen) {
			this.camPoint.x = (relativeMousePos.x - size.x / 2) * 0.1;
			this.camPoint.y = (relativeMousePos.y - size.y / 2) * 0.1;
		} else if (this.strand.camPoint) {
			this.camPoint.x = (this.strand.camPoint.x ?? 0) * 0.1;
			this.camPoint.y = (this.strand.camPoint.y ?? 0) * 0.1;
		}
		this.camPoint.x = clamp(-size.x * 0.05, this.camPoint.x, size.x * 0.05);
		this.camPoint.y = clamp(-size.y * 0.05, this.camPoint.y, size.y * 0.05);

		this.sprCarrying.x = relativeMousePos.x;
		this.sprCarrying.y = relativeMousePos.y;

		const curTime = game.app.ticker.lastTime;

		// depth sort
		this.sortScene();
		if (window.debugPhysics) {
			if (!this.physicsDebug) this.physicsDebug = new PhysicsDebug();
			this.container.addChild(this.physicsDebug.display.container);
		}
		this.container.addChild(this.graphics);

		this.screenFilter.update();

		GameObject.update();
		TweenManager.update();
		this.screenFilter.uniforms.curTime = curTime / 1000;
		this.screenFilter.uniforms.camPos = [
			this.camera.display.container.pivot.x,
			-this.camera.display.container.pivot.y,
		];
		this.player.canMove = !this.dialogue.isOpen && !this.carrying;
	}

	sortScene() {
		this.container.children.sort(depthCompare);
	}

	take(gameObject: GameObject) {
		const a = this.currentArea;
		if (a) Area.remove(a, gameObject);
		Area.add(this.areas.root, gameObject);
	}

	drop(gameObject: GameObject) {
		Area.remove(this.areas.root, gameObject);
		const a = this.currentArea;
		if (a) Area.add(a, gameObject);
	}

	pickupItem(item: Item) {
		if (this.carrying === item) {
			this.loseItem();
			return;
		}
		this.loseItem();
		this.player.expression = 'up';
		let texT = tex(item.carrying || `${item.texture}_carrying`);
		if (texT === tex('error')) texT = tex(item.texture);
		this.sprCarrying.texture = texT;
		this.sprCarrying.tint = item.spr.tint;
		this.sprCarrying.scale.x = Math.sign(item.spr.scale.x);
		this.carrying = item;
		this.player.canMove = false;
		this.player.btn = new BtnItem({
			gameObject: this.player,
			use: {
				undefined: ['goto:close'],
				other: ['goto:close'],
				[item.name]: item?.btn?.use.player || ['goto:generic use'],
			},
			label: this.t('me') || '',
		});
		// @ts-ignore
		this.player.btn.cycles = this.player.cycles || {};
		this.player.display.container.addChild(this.player.btn.display.container);
	}

	loseItem(permanent = false) {
		this.player.expression = '';
		if (this.player.btn) {
			// @ts-ignore
			this.player.cycles = { ...this.player.cycles, ...this.player.btn.cycles };
			this.player.btn.destroy();
			this.player.btn = undefined;
		}
		if (!this.carrying) return;
		if (permanent) {
			this.strand.destroy(this.carrying);
		}
		this.carrying = undefined;
		this.sprCarrying.texture = tex('blank');
	}

	/**
	 * basic "localization" function (relying on strand passages as locale entries)
	 * @param key strand passage title
	 * @returns strand passage body for given key, or the key itself as a fallback
	 */
	t(key: string) {
		return this.strand.passages[key]?.body || key;
	}
}
