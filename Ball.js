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
	
			let depthMax = this.v.mag() * dt  - this.r;
			// normal velocity direction
			let vHat = this.v.copy();
			vHat.normalize();
			let p0 = this.p.copy();
	
			// distance of the raymarched step
			let depth = this.raymarchTimestep(depthMax, vHat, p0);
			let time = (depth)/(this.v.mag()); // distance/speed = time
			if (time < dt) {
				acc(this.p, time, this.v);
				let time_remaining = dt - time;
				let distO = distanceO(this.p); 
				let obstacle = distO[1]; // nearest object
				let n = obstacle.normal(this.p);
				let vn = this.v.dot(n) - obstacle.velocity(this.p).dot(n);
				if (vn < 0) {
					let eps = obstacle.getCOR();
					vn *= -(1 + eps);
					n.mult(vn);
					this.v.add(n);
					obstacle.notifyOfCollision();
				}
				if (time_remaining>0){
					acc(this.p, time_remaining, this.v);
				}
			}
			else {
				acc(this.p, dt, this.v);
			}
			
	}
	
	raymarchTimestep(depthMax, vHat, p0) {
		const MAX_MARCHING_STEPS = 30;
		const PRECISION = 0.01;
	
		let depth = 0; // total distance moved on ray 
		let distO = distanceO(p0); 
		let obstacle = distO[1]; // nearest object
		let d = 0; 
		for (let i=0; i<MAX_MARCHING_STEPS; i++) {
			let vHatcpy = vHat.copy();
			vHatcpy.mult(depth); // march along v direction
			p0.add(vHatcpy); // add delta v hat
			distO = distanceO(p0);
			obstacle = distO[1];
			d = distO[0]- this.r; // distance perpendicular to obstacle
			depth += d; // walk along ray “d”
			if (d < PRECISION) { // small distance, exit and collide
				break;
			}
			if (depth > depthMax) { 
				break; // move the whole step
			}
		}	
		return depth;
	}
}
