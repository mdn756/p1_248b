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

		// From starter code: Process collisions :) 
		let distO = distanceO(this.p);
		let obstacle = distO[1];
		let d = distO[0] - this.r;
		let n = obstacle.normal(this.p);
		let vn = this.v.dot(n) - obstacle.velocity(this.p).dot(n);

		// Raymarching code
		let time_remaining = dt; // this will be decremented
		while (time_remaining > 0) {
			// find the distance of the full time step
			let depthMax = this.v.mag() * dt  - this.r;
			// normal velocity direction
			let vHat = this.v.copy();
			vHat.normalize();
			let p0 = this.p.copy();
	
			// distance of the raymarched step
			let depth = this.raymarchTimestep(depthMax, vHat, p0, dt);
			let time = (depth)/(this.v.mag()); // distance/speed = time
			time_remaining -= time;
		}
	}

	raymarchTimestep(depthMax, vHat, p0, dt) {
		// isPaused = true;
		const MAX_MARCHING_STEPS = 30;
		const PRECISION = 0.01;

		let depth = 0; // total distance moved on ray 
		let distO = distanceO(p0); 
		let obstacle = distO[1]; // nearest object
		let d = 0; 

		for (let i=0; i<MAX_MARCHING_STEPS; i++) {
			// isPaused = true;
			let vHatcpy = vHat.copy();
			let p0 = this.p.copy();
			vHatcpy.mult(depth); // march along v direction
			p0.add(vHatcpy); // add delta v hat
			distO = distanceO(p0);
			obstacle = distO[1];
			d = distO[0]; // distance perpendicular to obstacle
			depth += d; // walk along ray “d”
			if (d < PRECISION + this.r) { // small distance, exit and collide
				break; 
			}

			if (depth > depthMax) { 
				acc(this.p, dt, this.v); // move the whole step
				return depth;
			}
			let time = (d)/(this.v.mag());
			acc(this.p, time, this.v);	
		}	
		let n = obstacle.normal(this.p);
		let vn = this.v.dot(n) - obstacle.velocity(this.p).dot(n);
		if (vn < 0) {
			let eps = obstacle.getCOR();
			vn *= -(1 + eps);
			n.mult(vn);
			this.v.add(n);
			obstacle.notifyOfCollision();
		}
		let time = (d)/(this.v.mag());
		acc(this.p, time, this.v);
		return depth;
	}
}
