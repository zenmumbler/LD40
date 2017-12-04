class GridPillar implements Interactable {
	private butans = new Map<entity.Entity, EntityInfo>();

	hover(ent: entity.Entity) {
		const butan = this.butans.get(ent);
		if (butan) {
			const mats = this.scene.renderers.materials(butan.renderer) as effect.StandardEffectData[];
			vec4.copy(mats[0].emissiveFactor, [0.2, 0.2, 0.2, 1]);
			return true;
		}
		return false;
	}

	blur(ent: entity.Entity) {
		const butan = this.butans.get(ent);
		if (butan) {
			const mats = this.scene.renderers.materials(butan.renderer) as effect.StandardEffectData[];
			vec4.copy(mats[0].emissiveFactor, [0, 0, 0, 0]);
			return true;
		}
		return false;
	}

	interact(ent: entity.Entity) {
		const butan = this.butans.get(ent);
		if (butan) {
			this.scene.transforms.translate(butan.transform, [0, 0.04, 0]);
			return true;
		}
		return false;
	}

	constructor(public scene: sd.Scene, public cache: asset.CacheAccess, public sound: Sound) {
		const lite = makePBRMat(scene, cache("material", "Metal_Silver"));
		const dark = makePBRMat(scene, cache("material", "Granite_Dark_Gray"));

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

		const slab = makeEntity(scene, {
			transform: {
				position: [-24.5, 3.8, 32],
				rotation: quat.fromEuler(Math.PI, math.deg2rad(325), math.deg2rad(215))
			},
			geom: geometry.gen.generate(new geometry.gen.Box({
				width: 1, height: 0.1, depth: 1
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

		const oos = 1 / 7;
		const hoos = oos / 2;
		const buttonShape = physics.makeShape({
			type: physics.PhysicsShapeType.Box,
			halfExtents: [oos, .04, oos]
		})!;

		const butan = makeEntity(scene, {
			parent: slab.transform,
			transform: {
				position: [-.5 + hoos + oos, .08, -.5 + hoos + oos]
			},
			geom: geometry.gen.generate(new geometry.gen.Box({
				width: oos, height: .08, depth: oos
			})),
			renderer: {
				materials: [lite]
			},
			rigidBody: {
				mass: 0,
				shape: buttonShape,
				isTrigger: true,
				isKinematic: true
			}
		});
		this.butans.set(butan.entity, butan);
	}
}
