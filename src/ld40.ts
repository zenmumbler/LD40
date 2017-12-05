// Untitled - a game for LD40: More => Worse
// (c) 2017 by Arthur Langereis — @zenmumbler

/// <reference path="./imports.ts" />
/// <reference path="./sfx.ts" />
/// <reference path="./entities.ts" />
/// <reference path="./player.ts" />
/// <reference path="./gamestate.ts" />
/// <reference path="./gridpillar.ts" />
/// <reference path="./slidepillar.ts" />
/// <reference path="./artifact.ts" />
/// <reference path="./atmospheric.ts" />


class Mensajes {
	timer = 0;
	msg = "";

	constructor(public elem: HTMLElement) {
	}

	gameStateChanged(gs: GameState) {
		if (this.msg === gs.message) {
			return;
		}
		this.msg = gs.message;

		if (this.msg.length) {
			dom.$1("p", this.elem).innerHTML = gs.message.replace(/\n/g, "<br>");
			this.elem.style.display = "block";
		}
		else {
			this.elem.style.display = "none";
		}
	} 
}


class BFD implements Interactable {
	open = false;
	info: EntityInfo;

	hover(ent: entity.Entity) {
		if (!this.open && ent === this.info.entity) {
			this.gameState.showMessage("I sense great power beyond here\nand, something else...");
			return true;
		}
		return false;
	}

	blur(_ent: entity.Entity) {
		return false;
	}

	interact(ent: entity.Entity) {
		if (!this.open && ent === this.info.entity) {
			this.gameState.showMessage("I sense great power beyond here\nand, something else...");
			return true;
		}
		return false;
	}

	gameStateChanged(gs: GameState) {
		if (this.open) {
			return;
		}
		if (gs.didSolveGrid && gs.didSolveSlide) {
			this.open = true;
			// play distant rumble of opening
			this.scene.transforms.setPosition(this.info.transform, [0, 3.6, 32.18]);
			this.scene.colliders.destroy(this.info.collider);
		}
	}

	constructor(public gameState: GameState, public scene: sd.Scene, public cache: asset.CacheAccess, public sound: Sound) {
		gameState.listen(this);

		this.info = makeEntity(scene, {
			transform: {
				position: [0, 1.3, 32.18]
			},
			geom: geometry.gen.generate(new geometry.gen.Box({ width: 2.5, height: 2.6, depth: 0.16 })),
			renderer: {
				materials: [makePBRMat(scene, cache("material", "Blacktop_New"))]
			},
			rigidBody: {
				mass: 0,
				shape: physics.makeShape({ type: physics.PhysicsShapeType.Box, halfExtents: [1.25, 1.3, .08] })!
			}
		});
	}
}


class MainScene implements sd.SceneDelegate {
	scene: sd.Scene;
	gameState: GameState;
	player: PlayerController;
	sound: Sound;
	msg: Mensajes;
	ux: Interactable[] = [];
	framers: Updateable[] = [];

	willLoadAssets() {
		dom.show(".overlay.loading");
	}

	assetLoadProgress(ratio: number) {
		dom.$1(".bar .progress").style.width = Math.round(ratio * 100) + "%";
	}

	finishedLoadingAssets() {
		dom.hide(".overlay.loading");
	}

	gameStateChanged(_gs: GameState) {
	}

	setup() {
		const scene = this.scene;
		const cache = scene.assets;

		this.gameState = new GameState();
		this.gameState.listen(this);

		this.msg = new Mensajes(dom.$1("div.messages"));
		this.gameState.listen(this.msg);

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
				friction: 1
			}
		});

		// ----- PLAYER
		this.player = new PlayerController(dom.$1("canvas"), [26, 4.1, 32], scene, this.sound);

		// ----- Interactables
		this.ux.push(new GridPillar(this.gameState, scene, cache, this.sound));
		this.ux.push(new SlidePillar(this.gameState, scene, cache, this.sound));
		this.ux.push(new Artifact("A", this.gameState, scene, cache, this.sound));
		this.ux.push(new Artifact("B", this.gameState, scene, cache, this.sound));
		this.ux.push(new Artifact("C", this.gameState, scene, cache, this.sound));
		this.ux.push(new BFD(this.gameState, scene, cache, this.sound));
		this.ux.push(new NoWayOut(this.gameState, scene, cache, this.sound));
		this.ux.push(new InfoSphere(this.gameState, scene, cache, [26, 0, 17.2], `"The well of despair"\nI can't see or hear anything in it.`));
		this.ux.push(new InfoSphere(this.gameState, scene, cache, [-26, 0, 17.2], `"The pit of decay"\nLooking into it is making me dizzy.`));
		this.ux.push(new HintBox(this.gameState, scene, cache, "grid"));
		this.ux.push(new HintBox(this.gameState, scene, cache, "ring"));
		this.ux.push(new HintBox(this.gameState, scene, cache, "num"));

		for (const ia of this.ux) {
			if (isUpdateable(ia)) {
				this.framers.push(ia);
			}
		}
		
		// ----- finish up
		allocGeoms(scene);
	}

	private inFocus: entity.Entity = 0;

	update(timeStep: number) {
		const scene = this.scene;
		const player = this.player;
		player.view.tilt = this.gameState.cameraTilt;
		player.step(timeStep);
		this.scene.camera.lookAt(player.view.pos, player.view.focusPos, player.view.up);

		// look at / interact with objects
		const ray = vec3.sub([], player.view.focusPos, player.view.pos);
		vec3.scaleAndAdd(ray, player.view.pos, ray, 1.5); // meters of reach for look/interact
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

		// send update event to those interested
		for (const ua of this.framers) {
			ua.update(timeStep);
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
