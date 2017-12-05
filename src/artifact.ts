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

	hover(ent: entity.Entity) {
		if (this.info) {
			if (ent === this.info.entity) {
				const count = this.gameState.artifactCount;
				if (count === 0) {
					this.gameState.showMessage("I gaze upon the orb. It is calling for me. I can feel its power...");
				}
				else if (count === 1) {
					this.gameState.showMessage("The second orb, I can only imagine the power it will give me..");
				}
				else {
					this.gameState.showMessage("The final orb! I! I will become ...immortal!");
				}
			}
		}
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
				this.sound.play(SFX.Power);

				this.scene.colliders.destroy(this.info.collider);
				this.scene.renderers.setEnabled(this.info.renderer, false);
				this.info = undefined;
				this.gameState.pickup(this.which);
				const count = this.gameState.artifactCount;
				if (count === 1) {
					this.gameState.showMessage("As I grab the orb I can feel a power growing inside me.\nI feel a bit strange, but that was to be expected.");
				}
				else if (count === 2) {
					this.gameState.showMessage("The orb engulfs me as I stagger to contain its immense power.\nMy limbs are cramping up but I have to continue!");
				}
				else {
					this.gameState.showMessage("I've done it! I'm... I feel like... like I'm being ripped apart!!\nI must get out. Out! OUT!!");
					this.sound.stopMusic();
					this.sound.startMusic(true);
				}
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
				this.baseY = -4.8;
				position = [0, this.baseY, 49.59];
			}
		}

		if (willActivate) {
			this.activated = true;
			if (this.which !== "C") {
				this.sound.play(SFX.Orb);
			}

			const mat = makePBRMat(this.scene, this.cache("material", "Orb")) as effect.StandardEffectData;
			mat.emissiveFactor[3] = .1;

			this.info = makeEntity(this.scene, {
				transform: {
					position
				},
				geom: this.sphere,
				renderer: {
					materials: [mat]
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
