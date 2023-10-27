//////////////////////////////////////////////
// Base (abstract) class for your obstacles //
//////////////////////////////////////////////
class Obstacle {

	constructor() {
		this.signMultiplier = 1; //outside
		this.COR = 1; //bouncy
		this.energy = 0;
		this.color = color("white");
		this.strokeColor = color("white");
	}

	// Negates SDF to flip inside/outside.
	invert() {
		this.signMultiplier *= -1;
	}

	// OVERRIDE to draw object.
	draw() {

	}

	// Called when the ball collides with this obstacle. Override to make it do something useful, e.g., scoring, sound, colors, etc.
	notifyOfCollision() {}

	/** 
	 * OVERRIDE to implement signed distance at the specified point.
	 * @param {p5.Vector} p Position
	 * @return {number} Returns the SDF value, d.
	 */
	distance(p) {
		return 0 * this.signMultiplier;
	}

	/**
	 * Convenience method that returns the SDF distance and object reference as an array.
	 * @return {[number,object]} Returns the SDF value, d, and this object, o, as an array [d,o].
	 */
	distanceO(p) {
		return [this.distance(p), this]; // MUST OVERRIDE TO RETURN PROPER distance() 
	}

	// Normal at p
	normal(p) {
		return this.normalFD2(p);// TODO!
	}
	// TODO: Two-sided finite difference calculation.
	normalFD2(p) {
		const h = 0.1;
		let q = createVector(p.x, p.y);
		q.x += h;
		let d = this.distance(p);
		let dxh = this.distance(q);
		q.x -= h;
		q.y += h;
		let dyh = this.distance(q);

		//replace d with r
		let r = createVector(p.x, p.y);
		r.x -= h;
		let r_dxh = this.distance(r);
		r.x += h;
		r.y -= h;
		let r_dyh = this.distance(r);

		let n = createVector((dxh - r_dxh) / (2*h), (dyh - r_dyh) / (2*h)).normalize();
		return n;
		// return this.normalFD1(p); /// LIES!!! 1≠2
	}
	
	// One-sided finite difference calculation.
	normalFD1(p) {
		const h = 0.1;
		let q = createVector(p.x, p.y);
		q.x += h;
		let d = this.distance(p);
		let dxh = this.distance(q);
		q.x -= h;
		q.y += h;
		let dyh = this.distance(q);
		let n = createVector((dxh - d) / h, (dyh - d) / h).normalize();
		return n;
	}

	// False if the obstacle is not moving, e.g., fixed. 
	isMoving() {
		return false;
	}
	// OVERRIDE. Spatial velocity at field point, p. Zero if not moving.
	velocity(p) {
		return vec2(0, 0);
	}


	getCOR() {
		return this.COR; //eps
	}
	setCOR(eps) {
		this.COR = constrain(eps, 0, 1);
	}
	getEnergy() {
		return this.energy; //eps
	}
	setEnergy(E) {
		this.energy = E;
	}
	getColor() {
		return this.color;
	}
	setColor(c) {
		this.color = c;
	}
	setStrokeColor(c) {
		this.strokeColor = c;
	}
}

///////////////////////////////////////
// Flipper Obstacle (rotates!)
///////////////////////////////////////
class Flipper extends Obstacle {
  
	/** Flipper based on unevenCapsule SDF
	 * @param {p5.Vector} pivot point of flipper
	 * @param {number} r1 Radius 1
	 * @param {number} r2 Radius 2
	 * @param {number} h  length of flipper
	 */
	constructor(pivot, r1, r2, h, angleRest, dAngleAction, speed, flipperKeyCode) {
		super();
		this.pivot = pivot;
		this.r1 = r1;      
		this.r2 = r2;
		this.h = h;
		this.angleRest = angleRest;
		this.dAngleAction = dAngleAction;
		this.speed = sign(dAngleAction) * abs(speed); // proper sign so that omega=speed moves it there.
		this.flipperKeyCode = flipperKeyCode;
		this.COR = 0.1; // tune as you want on (0,1]
		this.color = "DarkRed";
		this.resetFlipper();
	}

	resetFlipper() {
		this.angleRad = this.angleRest;
		this.omega = 0; // angularSpeed
	}

	setAngleRad(angleRad) {
		this.angleRad = angleRad;
	}
	getAngleRad() {
		return this.angleRad;
	}

	timestep(dt) {
		if (keyIsDown(this.flipperKeyCode)) {
			this.omega = this.speed;
			//print(this.flipperKeyCode+"  "+this.omega);
		} else {
			// MOVE DOWN UNTIL AT REST:
			this.omega = -this.speed / 1.5; // slower
		}
		this.angleRad += this.omega * dt;

		// CLAMP TO RANGE:
		let anglePrev = this.angleRad;
		if (this.dAngleAction > 0)
			this.angleRad = clamp(this.angleRad, this.angleRest, this.angleRest + this.dAngleAction);
		else
			this.angleRad = clamp(this.angleRad, this.angleRest + this.dAngleAction, this.angleRest);

		// ZERO OMEGA IF WE CLAMPED angleRad (since used for vn estimate):
		if (anglePrev != this.angleRad) // got clamped, so set to rest
			this.omega = 0;
	}

	isMoving() {
		return (this.omega != 0);
	}
	velocity(p) {
		if (this.isMoving()) {
			let R = sub(p, this.pivot).mult(-this.omega); // R*omega ... need perp vector
			return vec2(-R.y, R.x); // omega x (p-pivot)
		} else
			return vec2(0, 0);
	}

	draw() {
		fill("white");
		this.drawFlipper(1.0); // outer layer
		fill(this.color);
		this.drawFlipper(0.9); // core color
	}

	drawFlipper(scale) {
		push();
		if(false) {//outlines
			stroke(0);
			strokeWeight(2);
		}
		rectMode(RADIUS);
		if (this.signMultiplier > 0) {

			translate(this.pivot.x, this.pivot.y);
			rotate(-PI / 2.0 - this.angleRad);

			let R1 = scale * this.r1; // larger
			let R2 = this.r2 - (this.r1 - R1); // smaller

			// DRAW IN "DOWN" POSITION AT ORIGIN
			{
				// DRAW TWO CIRCLES:
				const c1x = 0;
				const c1y = 0;
				const c2x = 0;
				const c2y = 0 + this.h;
				circle(c1x, c1y, R1);
				circle(c2x, c2y, R2);

				// DRAW POLYGON FOR BODY:
				let sinBeta = abs(R1 - R2) / this.h;
				let cosBeta = sqrt(1.0 - sq(sinBeta));
				const dx1 = R1 * cosBeta;
				const dy1 = R1 * sinBeta;
				const dx2 = R2 * cosBeta;
				const dy2 = R2 * sinBeta;
				// DRAW 4 VERTICES:
				const V1 = vec2(c1x + dx1, c1y + dy1);
				const V2 = vec2(c2x + dx2, c2y + dy2);
				const V3 = vec2(c2x - dx2, c2y + dy2);
				const V4 = vec2(c1x - dx1, c1y + dy1);
				beginShape();
				vertexv2(V1); // --> vertex(V1.x, V1.y);
				vertexv2(V2);
				vertexv2(V3);
				vertexv2(V4);
				endShape(CLOSE);
			}
		}
		pop();
	}

	//isMoving() { return true; }

	distance(p) {
		let v = sub(p, this.pivot); // p-pivot
		let rotAngle = -((-PI / 2.0) - this.angleRad);
		let vRot = rotateVec2(v, rotAngle);
		return this.signMultiplier * SDF.sdUnevenCapsule(vRot, this.r1, this.r2, this.h);
	}
}

///////////////////////////////////////
// CIRCLE OBSTACLE
///////////////////////////////////////
class CircleObstacle extends Obstacle {
	constructor(center, radius) {
		super();
		this.center = center;
		this.radius = radius;
	}

	draw() {
		if (this.signMultiplier > 0) {
			push();
			fill(this.color);
			stroke(this.strokeColor);
			strokeWeight(10);
			circle(this.center.x, this.center.y, this.radius); // RADIUS MODE
			pop();
		}
	}
    notifyOfCollision() {
		score = score + 10;
	}
	distance(p) {
		return this.signMultiplier * SDF.sdCircle(sub(p, this.center), this.radius);
	}
}

///////////////////////////////////////
// UFO OBSTACLE
///////////////////////////////////////
class UFOObstacle extends Obstacle {
	constructor(center, s) {
		super();
		this.center = center;
		this.radius = s*45;
	}
    
	draw() {
		if (this.signMultiplier > 0) {
			//fill(this.color);
			//circle(this.center.x, this.center.y, this.radius); // RADIUS MODE
			imageMode(CENTER);
			image(ufoImg, this.center.x - 10, this.center.y + 10);
			imageMode(CORNER);
		}
	}
    notifyOfCollision() {
		score = score + 150;
		powImageVisible = true;
    	powImageStartTime = millis();
		img_select = random(1);
	}
	distance(p) {
		return this.signMultiplier * SDF.sdCircle(sub(p, this.center), this.radius);
	}
}
///////////////////////////////////////
// rounded box OBSTACLE
///////////////////////////////////////
class RoundBox extends Obstacle {

	/** Rect in RADIUS mode
	 * @param {p5.Vector} center Center of box.
	 * @param {number} bx Half-width in X
	 * @param {number} by Half-width in Y
	 */
	constructor(center, bx, by, angle) {
		super();
		this.center = center;
		this.angle = angle;
		this.bx = bx;
		this.by = by;
	}

	draw() {
		push();
		rectMode(RADIUS);
		if (this.signMultiplier > 0) {
			fill(this.color);
			translate(this.center.x, this.center.y);
			rotate(this.angle);
			
			//rect(this.center.x, this.center.y, this.bx, this.by, 100); // RADIUS MODE
			rect(0, 0, this.bx, this.by, 100); // RADIUS MODE
		}
		pop();
	}
    /* distance(p) {
		let v = p5.Vector.sub(p, this.center).rotate(-this.angle); // Rotate v in the opposite direction
    	let a = 2 * this.bx;
    	let b = 2 * this.by;
    	let r = min(this.bx, this.by);
		return this.signMultiplier * SDF.sdRBox(v, a, b, r);
	} */
	distance(p) {
		let v = p5.Vector.sub(p, this.center); // p-c
		v.rotate(-this.angle)
		return this.signMultiplier * SDF.sdBox(v, vec2(this.bx, this.by));
	}
}
///////////////////////////////////////
// triangle OBSTACLE
///////////////////////////////////////
class TriangleObstacle extends Obstacle {

	/** Triangle
	 * @param {p5.Vector} center Center of box.
	 * @param {number} bx Half-width in X
	 * @param {number} by Half-width in Y
	 */
	constructor(p, p0, p1, p2) {
		super();
		this.p = p;
		this.p0 = p0;
		this.p1 = p1;
		this.p2 = p2;
	}

	draw() {
		push();
		if (this.signMultiplier > 0) {
			fill(this.color);
			triangle(this.p0.x, this.p0.y, this.p1.x, this.p1.y, this.p2.x, this.p2.y);
		}
		pop();
	}

	distance(p) {
		let v = p5.Vector.sub(p, this.center); // p-c
		return this.signMultiplier * SDF.sdTriangle(v, this.p0, this.p1, this.p2);
	}
}

class SlingObstacle extends Obstacle {
		/** Triangle
	 * @param {p5.Vector} center Center of box.
	 * @param {number} bx Half-width in X
	 * @param {number} by Half-width in Y
	 */
		constructor(p, p0, p1, p2, version) {
			super();
			this.p = p;
			this.p0 = p0;
			this.p1 = p1;
			this.p2 = p2;
			this.version = version;
		}

	draw() {
		push();
		if (this.signMultiplier > 0) {
			if (this.version == 1) {
				fill(this.color);
				//triangle(this.p0.x, this.p0.y, this.p1.x, this.p1.y, this.p2.x, this.p2.y);
				let scaleF = .45;
				scale(scaleF)
				translate(this.p2.x  / scaleF - width*.67, this.p2.y / scaleF- height*.52)
				rotate(-PI*.075)
				image(zomImg, 0, 0);
			}
			else {
				fill(this.color);
				//triangle(this.p0.x, this.p0.y, this.p1.x, this.p1.y, this.p2.x, this.p2.y);
				let scaleF = .45;
				scale(scaleF)
				translate(this.p2.x  / scaleF - width*0, this.p2.y / scaleF- height*.62)
				rotate(PI*.075)
				image(zomflipImg, 0, 0);
			}
			
		}
		pop();
	}
	distance(p) {
		let v = p5.Vector.sub(p, this.center); // p-c
		return this.signMultiplier * SDF.sdTriangle(v, this.p0, this.p1, this.p2);
	}
}

///////////////////////////////////////
// Axis-Aligned BOX OBSTACLE
///////////////////////////////////////
class BoxObstacle extends Obstacle {

	/** Rect in RADIUS mode
	 * @param {p5.Vector} center Center of box.
	 * @param {number} bx Half-width in X
	 * @param {number} by Half-width in Y
	 */
	constructor(center, bx, by) {
		super();
		this.center = center;
		this.bx = bx;
		this.by = by;
	}

	draw() {
		push();
		rectMode(RADIUS);
		if (this.signMultiplier > 0) {
			fill(this.color);
			rect(this.center.x, this.center.y, this.bx, this.by); // RADIUS MODE
		}
		pop();
	}

	distance(p) {
		let v = p5.Vector.sub(p, this.center); // p-c
		return this.signMultiplier * SDF.sdBox(v, vec2(this.bx, this.by));
	}
}
