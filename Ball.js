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
		let time_remaining = dt;
		while (time_remaining > 0) {
			time_remaining -= this.raymarchTimestep(d, vn, obstacle, dt);
		}
	}

	raymarchTimestep(d, vn, obstacle, dt) {
		// Raymarching
		let v = this.v.copy();
		let vHat = this.v.copy();
		vHat.normalize();

		let depthMax = this.v.mag() * dt  - this.r;
		let p0 = this.p.copy();
		const MAX_MARCHING_STEPS = 30;
		const PRECISION = 0.001;
		let depth = 0;
		for (let i=0; i<MAX_MARCHING_STEPS; i++) {
			vHat.mult(depth);
			p0.add(vHat); // add delta v hat
			let distO = distanceO(p0);
			obstacle = distO[1];
			let d = distO[0]; // max safe dist ball can move
			depth += d; // walk along ray "d"
			if (d < PRECISION + this.r) {
				print("d<prec");
				break;
			}			
			if (depth >= depthMax) {
				acc(this.p, dt, this.v);
				return dt;
			}
		
		}
		let n = obstacle.normal(p0);
		vn = v.dot(n) - obstacle.velocity(v).dot(n);

		if (vn < 0) {
			// isPaused = true;
			let eps = obstacle.getCOR();
			vn *= -(1 + eps);
			let n = obstacle.normal(p0);
			let normal = n;
			n.mult(vn);
			this.v.add(n);
			let E = obstacle.getEnergy();
			this.v.add(normal.mult(E));

			// Tell obstacle it was hit:
			obstacle.notifyOfCollision();

			// DEBUG INTERPENETRATION:
			maxPenetrationDepth = max(maxPenetrationDepth, abs(d));
			print("maxPenetrationDepth: " + maxPenetrationDepth);	
		}
		if (this.v.mag() != 0) {
			let time = (depth-d)/(this.v.mag());
			acc(this.p, time, this.v); 		// Update position:	// p += dt*v
			return time;
		}		
		return dt;
	}

}
