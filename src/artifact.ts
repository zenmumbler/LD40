class Artifact implements Interactable, Updateable {
	activated = false;
	retrieved = false;
	info: EntityInfo | undefined;
	sphere: geometry.Geometry;
	animTime = 0;
	baseY = 0;

	shape = physics.makeShape({
		type: physics.PhysicsShapeType.Sphere,
		radius: .2,
	})!;

	hover(_ent: entity.Entity) {
		return false;
	}

	blur(_ent: entity.Entity) {
		return false;
	}

	interact(ent: entity.Entity) {
		if (this.retrieved) {
			return false;
		}
		if (this.info) {
			if (ent === this.info.entity) {
				this.retrieved = true;

				this.scene.colliders.destroy(this.info.collider);
				this.scene.renderers.setEnabled(this.info.renderer, false);
				this.info = undefined;
				this.gameState.pickup(this.which);
				this.gameState.showMessage("It is mine!!!");
				return true;
			}
		}
		return false;
	}

	update(dt: number) {
		if (this.info && this.activated && !this.retrieved) {
			this.animTime += dt;
			const pos = this.scene.transforms.localPosition(this.info.transform);
			pos[1] = this.baseY + Math.sin(this.animTime / 2) * 0.05;
			this.scene.transforms.setPosition(this.info.transform, pos);
		} 
	}

	gameStateChanged(gs: GameState) {
		if (this.activated) {
			return;
		}

		let willActivate = false;
		let position = [0, 0, 0];

		if (this.which === "A") {
			if (gs.didSolveGrid) {
				willActivate = true;
				this.baseY = 4.1;
				position = [-26, this.baseY, 34.1];
			}
		}
		else if (this.which === "B") {
			if (gs.didSolveSlide) {
				willActivate = true;
				this.baseY = 4.1;
				position = [25.5, this.baseY, 34.1];
			}
		}
		else /* C */ {
			if (gs.didSolveGrid && gs.didSolveSlide) {
				willActivate = true;
				this.baseY = -3.9;
				position = [0, this.baseY, 49.85];
			}
		}

		if (willActivate) {
			this.activated = true;
			this.info = makeEntity(this.scene, {
				transform: {
					position
				},
				geom: this.sphere,
				renderer: {
					materials: [makePBRMat(this.scene, this.cache("material", "Metal_Silver"))]
				},
				rigidBody: {
					mass: 0,
					shape: this.shape,
					isTrigger: true,
					isKinematic: true
				}
			});
		}
	}

	constructor(public which: "A" | "B" | "C", public gameState: GameState, public scene: sd.Scene, public cache: asset.CacheAccess, public sound: Sound) {
		this.sphere = geometry.gen.generate(new geometry.gen.Sphere({ radius: .2, rows: 12, segs: 16 }));
		geomsToAllocate.push(this.sphere); // zOMB
		gameState.listen(this);
	}
}
