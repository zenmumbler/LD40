// This is an experimental version of the player view using the Kinematic Character Controller
// ...I'll look into this after LD40

/*
class PlayerView {
	private angleX_ = 0;
	private angleY_ = 0;
	private rot_: sd.Float4;
	private dir_ = [0, 0, -1];
	private up_ = [0, 1, 0];
	private velocity_ = [0, 0, 0];

	private controller_: Ammo.btKinematicCharacterController;
	private transform_: entity.TransformInstance;
	private tempBV3_: Ammo.btVector3;
	readonly HEIGHT = 1.7;
	readonly MASS = 70;

	constructor(public initialPos: sd.Float3, private scene: sd.Scene) {
		this.rotate([0, 0]);

		const ei = makeEntity(scene, {
			transform: {
				position: initialPos,
				rotation: quat.fromEuler(0, this.angleY_, this.angleX_)
			},
			light: {
				type: entity.LightType.Point,
				colour: [1, 1, 1],
				range: 15,
				intensity: .8
			}
		});
		this.transform_ = ei.transform;

		const shape = physics.makeShape({
			type: physics.PhysicsShapeType.Capsule,
			radius: .2,
			height: this.HEIGHT,
			orientation: Ammo.AxisIndex.Y
		})!;

		this.controller_ = scene.physicsWorld.createCharacter({
			shape,
			stepHeight: .3,
			worldPos: initialPos
		});

		this.tempBV3_ = new Ammo.btVector3();
	}

	rotate(localRelXY: sd.Float2) {
		this.angleX_ -= Math.PI * 1.3 * localRelXY[1];
		this.angleX_ = math.clamp(this.angleX_, -Math.PI * 0.3, Math.PI * 0.3);
		this.angleY_ += Math.PI * 1.8 * localRelXY[0];
		this.rot_ = quat.fromEuler(0, this.angleY_, this.angleX_);
		vec3.transformQuat(this.dir_, [0, 0, 1], this.rot_);
		vec3.normalize(this.dir_, this.dir_);
		vec3.transformQuat(this.up_, [0, 1, 0], this.rot_);
		vec3.normalize(this.up_, this.up_);
	}

	reset() {
		this.angleX_ = 0;
		this.angleY_ = 0;
		this.rotate([0, 0]);
		this.scene.transforms.setPositionAndRotation(this.transform_, this.initialPos, this.rot_);
		this.tempBV3_.setValue(this.initialPos[0], this.initialPos[1], this.initialPos[2]);
		this.controller_.warp(this.tempBV3_);
	}

	update(timeStep: number, acceleration: number, sideAccel: number) {
		const fwdXZ = vec3.normalize([], [this.dir_[0], 0, this.dir_[2]]);
		const rightXZ = vec3.cross([], fwdXZ, [0, 1, 0]);

		vec3.scaleAndAdd(this.velocity_, this.velocity_, fwdXZ, acceleration * timeStep);
		vec3.scaleAndAdd(this.velocity_, this.velocity_, rightXZ, sideAccel * timeStep);

		vec3.scale(this.velocity_, this.velocity_, 0.85);
		if (vec3.length(this.velocity_) < 0.001) {
			vec3.set(this.velocity_, 0, 0, 0);
		}

		const atx = this.controller_.getGhostObject().getWorldTransform();
		const origin = atx.getOrigin();
		this.scene.transforms.setPosition(this.transform_, [origin.x(), origin.y(), origin.z()]);

		// const lv = this.rigidBody_.getLinearVelocity();
		this.tempBV3_.setValue(this.velocity_[0], 0, this.velocity_[2]);
		// this.rigidBody_.setLinearVelocity(this.tempBV3_);
		this.controller_.setVelocityForTimeInterval(this.tempBV3_, 1);
	}

	get pos() { return this.scene.transforms.localPosition(this.transform_); }
	get dir() { return this.dir_; }
	get rotation() { return this.rot_; }
	get moving() { return false; }
	get focusPos() { return vec3.add([], this.pos, this.dir_); }
	get up() { return this.up_; }
}


const enum KeyboardType {
	QWERTY,
	QWERTZ,
	AZERTY
}


const enum KeyCommand {
	Forward,
	Backward,
	Left,
	Right,
	Interact
}


class PlayerController {
	view: PlayerView;
	private vpWidth_: number;
	private vpHeight_: number;
	private tracking_ = false;
	private lastPos_ = [0, 0];
	private shakeOffset_ = [0, 0];

	constructor(sensingElem: HTMLElement, initialPos: sd.Float3, scene: sd.Scene, private sfx: Sound) {
		this.view = new PlayerView(initialPos, scene);

		this.vpWidth_ = sensingElem.offsetWidth;
		this.vpHeight_ = sensingElem.offsetHeight;

		// -- mouse based rotation
		dom.on(sensingElem, "mousedown", (evt: MouseEvent) => {
			this.tryCaptureMouse();

			this.tracking_ = true;
			this.lastPos_ = [evt.clientX, evt.clientY];
		});

		dom.on(window, "mousemove", (evt: MouseEvent) => {
			if ((document.pointerLockElement === null) && (!this.tracking_)) {
				return;
			}
			const newPos = [evt.clientX, evt.clientY];
			const delta = document.pointerLockElement ? [evt.movementX, evt.movementY] : vec2.sub([], newPos, this.lastPos_);
			vec2.divide(delta, delta, [-this.vpWidth_, -this.vpHeight_]);
			vec2.scale(delta, delta, document.pointerLockElement ? .25 : 1);
			this.lastPos_ = newPos;

			this.view.rotate(delta);
		});

		dom.on(window, "mouseup", () => {
			this.tracking_ = false;
		});
	}

	tryCaptureMouse() {
		const canvas = dom.$1(".stageholder");
		if (canvas.requestPointerLock) {
			canvas.requestPointerLock();
		}
	}

	releaseMouse() {
		if (document.exitPointerLock) {
			document.exitPointerLock();
		}
	}

	public keyboardType = KeyboardType.QWERTY;

	private keyForKeyCommand(cmd: KeyCommand): control.Key {
		let keys: control.Key[] | undefined;
		switch (cmd) {
			case KeyCommand.Forward:
				keys = [control.Key.W, control.Key.W, control.Key.Z];
				break;
			case KeyCommand.Backward:
				keys = [control.Key.S, control.Key.S, control.Key.S];
				break;
			case KeyCommand.Left:
				keys = [control.Key.A, control.Key.A, control.Key.Q];
				break;
			case KeyCommand.Right:
				keys = [control.Key.D, control.Key.D, control.Key.D];
				break;
			case KeyCommand.Interact:
				keys = [control.Key.E, control.Key.E, control.Key.E];
				break;
		}

		return keys ? keys[this.keyboardType] : 0;
	}


	private stepSoundTimer_ = -1;

	handleStepSounds() {
		if (this.view.moving) {
			if (this.stepSoundTimer_ === -1) {
				this.stepSoundTimer_ = setInterval(() => { this.sfx.play(SFX.FootStep); }, 500);
			}
		}
		else {
			this.stopSteps();
		}
	}

	stopSteps() {
		if (this.stepSoundTimer_ > -1) {
			clearInterval(this.stepSoundTimer_);
			this.stepSoundTimer_ = -1;
		}
	}

	public shaking = false;

	get shakeOffset() {
		return this.shakeOffset_;
	}

	step(timeStep: number) {
		const maxAccel = 45;
		let accel = 0, sideAccel = 0;

		if (control.keyboard.down(control.Key.UP) || control.keyboard.down(this.keyForKeyCommand(KeyCommand.Forward))) {
			accel = maxAccel;
		}
		else if (control.keyboard.down(control.Key.DOWN) || control.keyboard.down(this.keyForKeyCommand(KeyCommand.Backward))) {
			accel = -maxAccel;
		}
		if (control.keyboard.down(control.Key.LEFT) || control.keyboard.down(this.keyForKeyCommand(KeyCommand.Left))) {
			sideAccel = -maxAccel;
		}
		else if (control.keyboard.down(control.Key.RIGHT) || control.keyboard.down(this.keyForKeyCommand(KeyCommand.Right))) {
			sideAccel = maxAccel;
		}

		if (accel !== 0 && sideAccel !== 0) {
			accel = Math.sign(accel) * 42.43;
			sideAccel = Math.sign(sideAccel) * 42.43;
		}

		if (this.shaking) {
			vec2.sub(this.shakeOffset_, vec2.random(this.shakeOffset_, 0.03), [0.015, 0.015]);
		}
		else {
			vec2.set(this.shakeOffset_, 0, 0);
		}

		this.view.update(timeStep, accel, sideAccel);

		this.handleStepSounds();
	}
}
*/
