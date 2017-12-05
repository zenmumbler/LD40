class SmoothNum {
	private v_: number;
	private target_: number;
	private t0: number;
	private t1: number;

	constructor(init = 0) {
		this.v_ = this.target_ = init;
		this.t0 = this.t1 = 0;
	}

	set value(nv: number) {
		if (nv !== this.target_) {
			this.v_ = this.value;
			this.target_ = nv;
			this.t0 = Date.now();
			this.t1 = this.t0 + 3000;
		}
	}

	get value() {
		let t = Date.now();
		if (t <= this.t0) {
			return this.v_;
		}
		if (t >= this.t1) {
			return this.target_;
		}
		let d = this.t1 - this.t0;
		const dv = this.target_ - this.v_;
		t -= this.t0;
		t /= d;
		t = t * t;
		return this.v_ + dv * t;
	}
}


type GameStateListener = ((gs: GameState) => any) | { gameStateChanged(gs: GameState): any; };

class GameState {
	private gridPuzzleSolved_ = false;
	private slidePuzzleSolved_ = false;
	private hasArtifactA_ = false;
	private hasArtifactB_ = false;
	private hasArtifactC_ = false;
	private message_ = "";
	private messageEndTimer_ = 0;
	private camTilt_ = new SmoothNum(0);
	private ending_ = false;

	private listeners_: GameStateListener[] = [];

	listen(f: GameStateListener) {
		this.listeners_.push(f);
	}
	private signal() {
		for (const l of this.listeners_) {
			if (typeof l === "function") {
				l(this);
			}
			else {
				l.gameStateChanged(this);
			}
		}
	}

	solvedGrid() { this.gridPuzzleSolved_ = true; this.signal(); }
	solvedSlide() { this.slidePuzzleSolved_ = true; this.signal(); }
	get didSolveGrid() { return this.gridPuzzleSolved_; }
	get didSolveSlide() { return this.slidePuzzleSolved_; }

	pickup(artifact: "A" | "B" | "C") {
		switch (artifact) {
			case "A": this.hasArtifactA_ = true; break;
			case "B": this.hasArtifactB_ = true; break;
			case "C": this.hasArtifactC_ = true; break;
		}
		const count = this.artifactCount;
		this.camTilt_.value = math.deg2rad(count * 4);
		this.signal();
	}
	get hasArtifactA() { return this.hasArtifactA_; }
	get hasArtifactB() { return this.hasArtifactB_; }
	get hasArtifactC() { return this.hasArtifactC_; }
	get artifactCount() {
		return [this.hasArtifactA_, this.hasArtifactB_, this.hasArtifactC_].filter(v => v).length;
	}

	get cameraTilt() { return this.camTilt_.value; }

	showMessage(m: string) {
		this.message_ = m;
		const duration = 1500 + m.split(" ").length * 275;
		if (this.messageEndTimer_) {
			clearTimeout(this.messageEndTimer_);
		}
		if (m !== "The End") {
			this.messageEndTimer_ = setTimeout(() => {
				this.message_ = "";
				this.signal();
			}, duration);
		}
		this.signal();
	}
	get message() { return this.message_; }

	setEnd() { this.ending_ = true; this.signal(); }
	get ending() { return this.ending_; }
}
