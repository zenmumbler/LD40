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
	ux: Interactable[] = [];

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
				materials: tombModel.materials.map(mat => makePBRMat(scene, mat))
			},
			rigidBody: {
				shape: tombShape,
				mass: 0,
				friction: 0.7
			}
		});

		// ----- PLAYER
		this.player = new PlayerController(dom.$1("canvas"), [-26, 4.1, 32], scene, this.sound);

		// ----- Interactables
		this.ux.push(new GridPillar(scene, cache, this.sound));
		
		// ----- finish up
		allocGeoms(scene);
	}

	private inFocus: entity.Entity = 0;

	update(timeStep: number) {
		const scene = this.scene;
		const player = this.player;
		player.step(timeStep);
		this.scene.camera.lookAt(player.view.pos, player.view.focusPos, player.view.up);

		// look at / interact with objects
		const ray = vec3.sub([], player.view.focusPos, player.view.pos);
		vec3.scaleAndAdd(ray, player.view.pos, ray, 1); // meters of reach for look/interact
		const arb = scene.physicsWorld.rayCastClosest(player.view.pos, ray);
		const prevFocus = this.inFocus;
		if (arb) {
			const ent = scene.colliders.identifyEntity(arb);
			if (control.keyboard.pressed(control.Key.E)) {
				for (let i = 0; i < this.ux.length; ++i) {
					if (this.ux[i].interact(ent)) {
						break;
					}
				}
			}
			else {
				if (this.inFocus !== ent) {
					for (let i = 0; i < this.ux.length; ++i) {
						if (this.ux[i].hover(ent)) {
							break;
						}
					}
				}
			}
			this.inFocus = ent;
		}
		else {
			this.inFocus = 0;
		}
		if (prevFocus && prevFocus !== this.inFocus) {
			for (let i = 0; i < this.ux.length; ++i) {
				if (this.ux[i].blur(prevFocus)) {
					break;
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
