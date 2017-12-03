// Untitled - a game for LD40: More => Worse
// (c) 2017 by Arthur Langereis — @zenmumbler

/// <reference path="./imports.ts" />
/// <reference path="./sfx.ts" />
/// <reference path="./entities.ts" />
/// <reference path="./player.ts" />


class MainScene implements sd.SceneDelegate {
	scene: sd.Scene;
	player: PlayerController;
	sound: Sound;
	butan: EntityInfo;

	willLoadAssets() {
		dom.show(".overlay.loading");
	}

	assetLoadProgress(ratio: number) {
		dom.$1(".bar .progress").style.width = Math.round(ratio * 100) + "%";
	}

	finishedLoadingAssets() {
		dom.hide(".overlay.loading");
	}

	setup() {
		const scene = this.scene;
		const cache = scene.assets;

		this.sound = new Sound(scene.ad, {
			steps: [
				cache("audio", "step0"),
				cache("audio", "step1")
			],
			// music: undefined
		});

		const standard = scene.rw.effectByName("standard")!;
		// const skybox = scene.rw.effectByName("simple-skybox")!;

		const makePBRMat = (mat: asset.Material) => {
			const data = standard.makeEffectData() as render.effect.StandardEffectData;
			const pbr = mat as asset.StandardMaterial;

			vec3.copy(data.tint, pbr.colour.baseColour);
			vec3.copy(data.emissiveFactor, pbr.emissiveFactor);
			if (vec3.len(pbr.emissiveFactor) > 0) {
				data.emissiveFactor[3] = 1.0;
			}
			if (pbr.colour.colourTexture) {
				data.diffuse = pbr.colour.colourTexture.texture;
			}
			if (pbr.normalTexture) {
				data.normal = pbr.normalTexture.texture;
			}
			vec4.copy(data.texScaleOffset, [pbr.uvScale[0], pbr.uvScale[1], pbr.uvOffset[0], pbr.uvOffset[1]]);

			return data;
		};

		scene.camera.perspective(60, 0.1, 100);

		// --------- LEVEL GEOMETRY
		const tombModel = cache("model", "tomb");
		const tombShape = physics.makeShape({
			type: physics.PhysicsShapeType.Mesh,
			geom: tombModel.geom
		})!;

		makeEntity(scene, {
			geom: tombModel.geom,
			renderer: {
				materials: tombModel.materials.map(mat => makePBRMat(mat))
			},
			rigidBody: {
				shape: tombShape,
				mass: 0,
				friction: 0.7
			}
		});

		// ---------- PLAYER
		this.player = new PlayerController(dom.$1("canvas"), [0, 1.1, 3], scene, this.sound);

		// ---------- TEST PILLAR
		const lite = makePBRMat(tombModel.materials[0]);
		const dark = makePBRMat(tombModel.materials[1]);

		const slab = makeEntity(scene, {
			transform: {
				position: [0, .8, 13],
				rotation: quat.fromEuler(Math.PI, 0, math.deg2rad(215))
			},
			geom: geometry.gen.generate(new geometry.gen.Box({
				width: 1, height: 0.1, depth: 1
			})),
			renderer: {
				materials: [lite]
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
			halfExtents: [oos, .06, oos]
		})!;
		this.butan = makeEntity(scene, {
			parent: slab.transform,
			transform: {
				position: [-.5 + hoos + oos, .04, -.5 + hoos + oos]
			},
			geom: geometry.gen.generate(new geometry.gen.Box({
				width: oos, height: .06, depth: oos
			})),
			renderer: {
				materials: [dark]
			},
			rigidBody: {
				mass: 0,
				shape: buttonShape,
				isTrigger: true,
				isKinematic: true
			}
		});

		// ----- finish up
		const rcb = new render.RenderCommandBuffer();
		for (const geom of geomsToAllocate) {
			rcb.allocate(geom);
		}
		scene.rw.rd.dispatch(rcb);
	}

	update(timeStep: number) {
		const scene = this.scene;
		const player = this.player;
		player.step(timeStep);
		this.scene.camera.lookAt(player.view.pos, player.view.focusPos, player.view.up);

		if (control.keyboard.pressed(control.Key.E)) {
			const ray = vec3.sub([], player.view.focusPos, player.view.pos);
			vec3.scaleAndAdd(ray, player.view.pos, ray, 2);
			const arb = scene.physicsWorld.rayCastClosest(player.view.pos, ray);
			if (arb) {
				const ent = scene.colliders.identifyEntity(arb);
				if (ent === 4) {
					alert("woo!");
				}
			}
		}
	}
}


sd.App.messages.listenOnce("AppStart", undefined, () => {
	const stageHolder = dom.$1(".stageholder");
	const rw = new render.RenderWorld(stageHolder, 1280, 720);
	const adev = audio.makeAudioDevice()!;

	const rdgl1 = rw.rd as render.gl1.GL1RenderDevice;
	if (!(rdgl1.extDerivatives && rdgl1.extFragmentLOD)) {
		alert("Sorry, this game is not compatible with this browser.\n\nTry one of the following:\n- Firefox 50 or newer\n- Safari 9 or newer\n- Chrome 40 or newer\n\nApologies for the trouble.");
		return;
	}
	if (!document.body.requestPointerLock) {
		dom.hide("#fullscreen");
	}
	if (screen.width < 1920 || screen.height < 1080) {
		dom.disable("#vps-fullhd");
		dom.$1("#vps-fullhd").title = "Your display does not support this resolution.";
		dom.$1("#vps-fullhd+label").title = "Your display does not support this resolution.";
	}

	io.loadFile("data/assets-ld40.json", { tryBreakCache: true, responseType: io.FileLoadType.JSON })
		.then((assetsJSON: any) => {
			const scene = new sd.Scene(rw, adev, {
				physicsConfig: physics.makeDefaultPhysicsConfig(),
				assets: assetsJSON.assets,
				delegate: new MainScene()
			});
			sd.App.scene = scene;
		});
});
