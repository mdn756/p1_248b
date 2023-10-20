////////////////
// Ball class //
////////////////
class Ball {
	constructor(r) {
		this.p = createVector(0, 0);
		this.v = createVector(0, 0);
		this.r = r;
		this.highlight = false;
	}

	draw() {
		stroke(0);
		if (this.highlight)
			fill(255, 0, 0);
		else
			fill(128);

		circle(this.p.x, this.p.y, this.r);
	}

	timestep(dt) {
		// Symplectic Euler integrator:
		// Update velocity:
		const g = +9.81 * 0.113203 * height / 2; // where sin(6.5 degrees) = 0.113203
		this.v.y += dt * g; // positive gravity makes it fall down (since coord system flipped vertically)

		// Process collisions :) 
		let distO = distanceO(this.p);
		let obstacle = distO[1];
		let d = distO[0] - this.r;
		let n = obstacle.normal(this.p);
		let vn = this.v.dot(n) - obstacle.velocity(this.p).dot(n);
		this.highlight = (d < 0);

		// If interpenetrating & not separating --> apply impulse
		if (d < 0 && vn < 0) { // IMPACT!
			//isPaused = true;// DEBUG: PAUSE @ COLLISIONS
			let eps = obstacle.getCOR();
			vn *= -(1 + eps);
			n.mult(vn);
			this.v.add(n);
			// Tell obstacle it was hit:
			obstacle.notifyOfCollision();

			// DEBUG INTERPENETRATION:
			maxPenetrationDepth = max(maxPenetrationDepth, abs(d));
			print("maxPenetrationDepth: " + maxPenetrationDepth);
		}
		//print("dist = "+distO);

		// Update position:
		acc(this.p, dt, this.v); // p += dt*v
	}

}
