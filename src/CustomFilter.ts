import { Filter, utils } from 'pixi.js';

export class CustomFilter<T extends utils.Dict<unknown>> extends Filter {
	constructor(
		fragmentSource: ConstructorParameters<typeof Filter>[1],
		uniforms?: T
	) {
		super(undefined, fragmentSource, uniforms);
	}

	override get uniforms(): T {
		return this.uniformGroup.uniforms as T;
	}
}
