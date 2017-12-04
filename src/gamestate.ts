type GameStateListener = ((gs: GameState) => any) | { gameStateChanged(gs: GameState): any; };

class GameState {
	private gridPuzzleSolved_ = false;
	private slidePuzzleSolved_ = false;
	private hasArtifactA_ = false;
	private hasArtifactB_ = false;
	private hasArtifactC_ = false;
	private message_ = "";
	private messageEndTimer_ = 0;

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
		this.signal();
	}
	get hasArtifactA() { return this.hasArtifactA_; }
	get hasArtifactB() { return this.hasArtifactB_; }
	get hasArtifactC() { return this.hasArtifactC_; }
	get artifactCount() {
		return [this.hasArtifactA_, this.hasArtifactB_, this.hasArtifactC_].filter(v => v).length;
	}

	showMessage(m: string) {
		this.message_ = m;
		const duration = 1000 + m.split(" ").length * 250;
		console.info("DU", duration);
		if (this.messageEndTimer_) {
			clearTimeout(this.messageEndTimer_);
		}
		this.messageEndTimer_ = setTimeout(() => {
			this.message_ = "";
			this.signal();
		}, duration);
		this.signal();
	}
	get message() { return this.message_; }
}
