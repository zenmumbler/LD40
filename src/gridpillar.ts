interface GridButan {
	index: number;
	comp: EntityInfo;
	pressed: boolean;
}

class GridPillar implements Interactable {
	private butans = new Map<entity.Entity, GridButan>();
	private solved = false;
	private correct = [
		1, 0, 0,
		0, 1, 0,
		1, 1, 1
	];

	private pattern() {
		const p: number[] = [];
		this.butans.forEach(butan => {
			p[butan.index] = +butan.pressed;
		});
		return p;
	}

	private checkPattern() {
		const pattern = this.pattern();
		if (pattern.every((v, i) => this.correct[i] === v)) {
			this.solved = true;
			this.gameState.solvedGrid();
		}
	}

	hover(ent: entity.Entity) {
		if (this.solved) {
			return false;
		}

		const butan = this.butans.get(ent);
		if (butan) {
			const mats = this.scene.renderers.materials(butan.comp.renderer) as effect.StandardEffectData[];
			vec4.copy(mats[0].emissiveFactor, [0.3, 0.3, 0.3, 1]);
			return true;
		}
		return false;
	}

	blur(ent: entity.Entity) {
		const butan = this.butans.get(ent);
		if (butan) {
			const mats = this.scene.renderers.materials(butan.comp.renderer) as effect.StandardEffectData[];
			vec4.copy(mats[0].emissiveFactor, [0, 0, 0, 0]);
			return true;
		}
		return false;
	}

	interact(ent: entity.Entity) {
		const butan = this.butans.get(ent);
		if (butan) {
			if (this.solved) {
				this.gameState.showMessage("The switches are stuck in place.");
			}
			else {
				butan.pressed = !butan.pressed;
				const pos = this.scene.transforms.localPosition(butan.comp.transform);
				this.scene.transforms.setPosition(butan.comp.transform, [pos[0], butan.pressed ? 0.04 : 0.07, pos[2]]);
				this.checkPattern();
			}
			return true;
		}
		return false;
	}

	constructor(public gameState: GameState, public scene: sd.Scene, public cache: asset.CacheAccess, public sound: Sound) {
		const dark = makePBRMat(scene, cache("material", "Granite_Dark_Gray"));

		// pillar
		makeEntity(scene, {
			transform: {
				position: [-24.5, 3.32, 32],
				rotation: quat.fromEuler(0, math.deg2rad(35), 0)
			},
			geom: geometry.gen.generate(new geometry.gen.Box({
				width: .2, height: .8, depth: .2
			})),
			renderer: {
				materials: [dark]
			}
		});

		const SLAB_DIM = 0.8;
		const HALF_SLAB_DIM = SLAB_DIM / 2;
		const slab = makeEntity(scene, {
			transform: {
				position: [-24.5, 3.8, 32],
				rotation: quat.fromEuler(Math.PI, math.deg2rad(325), math.deg2rad(230))
			},
			geom: geometry.gen.generate(new geometry.gen.Box({
				width: SLAB_DIM, height: 0.1, depth: SLAB_DIM 
			})),
			renderer: {
				materials: [dark]
			},
			rigidBody: {
				mass: 0,
				shape: physics.makeShape({
					type: physics.PhysicsShapeType.Box,
					halfExtents: [.5, .05, .5],
				})!
			}
		});

		const oos = SLAB_DIM  / 7;
		const hoos = oos / 2;
		const buttonShape = physics.makeShape({
			type: physics.PhysicsShapeType.Box,
			halfExtents: [oos, .02, oos]
		})!;

		const makeButan = (index: number) => {
			const gx = (index % 3) * 2;
			const gy = ((index / 3) >> 0) * 2;
			const butan = makeEntity(scene, {
				parent: slab.transform,
				transform: {
					position: [-HALF_SLAB_DIM + hoos + oos + (gx * oos), .07, -HALF_SLAB_DIM + hoos + oos + (gy * oos)]
				},
				geom: geometry.gen.generate(new geometry.gen.Box({
					width: oos, height: .04, depth: oos
				})),
				renderer: {
					materials: [makePBRMat(scene, cache("material", "Metal_Silver"))]
				},
				rigidBody: {
					mass: 0,
					shape: buttonShape,
					isTrigger: true,
					isKinematic: true
				}
			});
			this.butans.set(butan.entity, {
				index,
				comp: butan,
				pressed: false
			});
		};

		for (let bx = 0; bx < 9; ++bx) {
			makeButan(bx);
		}
	}
}
