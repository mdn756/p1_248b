// Stanford CS248B Pinball Assignment
// Startercode: Doug L. James, djames@cs.stanford.edu

//p5.disableFriendlyErrors = true;

let BALL_RADIUS = 25;
const FRAMERATE = 60; // Try a lower value, e.g., 10, to test ray-marching CCD

let obstacles;
let ball;
let flipperL, flipperR;
let isPaused = true;
let maxPenetrationDepth = 0; // nonnegative value for largest overlap

let bgImg;

function preload() {
	bgImg = loadImage('rainbowStripes.jpg');
}

console.log("Compiled");

function setup() {
	// TRADITIONAL RECTANGLE SHAPE, BUT FEEL FREE TO DO SOMETHING ELSE:
	createCanvas(min(windowWidth, windowHeight / 1.5), windowHeight); // actual size then given by (width,height)

	frameRate(FRAMERATE);

	ellipseMode(RADIUS); // --> circle(x,y,r)

	// RESIZING SCREEN SHOULDN'T CHANGE THE GAME LAYOUT, SO RECORD SCALE:
	let s = width / 659; // scale factor to allow for different screen resolutions sizes
	
	BALL_RADIUS *= s;

	// REPLACE WITH YOUR MANY WONDERFUL OBSTACLES
	obstacles = [];
	for (let k = 0; k < 5; k++) {
		let circleK = new CircleObstacle(createVector(random(0.2 * width, 0.8 * width), random(0.2 * height, 0.6 * height)), random(20 * s, 100 * s));
		//circleK.setCOR(random(1));
		circleK.setColor(color(random(0, 255), random(0, 255), random(0, 255)));
		circleK.setCOR(0.95);
		obstacles.push(circleK);
	}
	
	// Corner
	let triangle = new TriangleObstacle(createVector(width + 10, height + 10), createVector(0.8 * width, 0), createVector(width, 0), createVector(width, height * 0.1));
	triangle.setColor(color(random(0, 255), random(0, 255), random(0, 255)));
	triangle.setCOR(0.95);
	obstacles.push(triangle);	
	
	// Plunger Wall
	let plungerWall = new RoundBox(createVector(width * 0.90, height * 0.65), width * 0.007, height / 2);
	plungerWall.setColor(color(random(0, 255), random(0, 255), random(0, 255)));
	plungerWall.setCOR(0.95);	
	obstacles.push(plungerWall);

	// SETUP FLIPPERS: (pivot, r1, r2, h, angleRest, dAngleAction, speed[rad/s], key)
	{
		flipperL = new Flipper(vec2(0.10 * width, 0.79 * height), 40 * s, 20 * s, 200 * s, -PI * 1 / 4, +PI / 2, 6., 70); // 'f'
		flipperR = new Flipper(vec2(0.8 * width, 0.79 * height), 40 * s, 20 * s, 200 * s, +PI * 5 / 4, -PI / 2, 6., 74); // 'j'
		obstacles.push(flipperL);
		obstacles.push(flipperR);
	}

	// MAKE YOUR DOMAIN BOUNDARY (BASIC BOX FOR NOW):
	let domainBox = new BoxObstacle(createVector(width / 2, height / 2), width / 2, height / 2);
	domainBox.invert(); // think inside the box
	obstacles.push(domainBox);
	//print("|obstacles|=" + obstacles.length);

	ball = new Ball(BALL_RADIUS);
	resetGame(ball, flipperL, flipperR);
    
}

function draw() {
	if (keyIsDown(32)) {
		ball.p.y++;
		ball.v.y -= 10;
	}
	if (!isPaused && !keyIsDown(32))
		timestep();

	drawScene();
	//drawScore();
}

function timestep() {
	const dt = 0.001 * deltaTime;
	flipperL.timestep(dt);
	flipperR.timestep(dt);
	ball.timestep(dt);

	if (ballIsInEndzone()) { // end turn
		isPaused = true;
		resetGame(ball, flipperL, flipperR);
	}
}

// Returns true if the ball is in the endzone.
function ballIsInEndzone() {
	// SIMPLE CHECK FOR NOW:
	return (ball.p.y > height * 0.95);
}

function drawScene() {
	clear();
	//background(180);
	image(bgImg, 0, 0);

	noStroke();

	if (keyIsPressed === true && key === 's')
		drawSDFRaster();

	// DRAW OBSTACLES:
	{
		fill(255);
		for (let i = 0; i < obstacles.length; i++)
			obstacles[i].draw();
	}

	ball.draw();
}

// Draws raster of scene SDF 
function drawSDFRaster() {
	// Warning: slow for small h due to draw call overhead
	const h = 5;
	rectMode(CENTER); // --> square(x,y,h) of width h centered at (x,y)
	noStroke();
	for (let i = 0; i < width; i += h) {
		for (let j = 0; j < height; j += h) {
			let distO = distanceO(createVector(i, j));
			let d = max(0, distO[0]);
			let o = distO[1];
			if (d <= 0) // Black obstacles
				fill(0, 0, 0);
			else // Purple distances
				fill(d, 0, d);
			square(i, j, h); //point(i,j);
		}
	}
}

/** SDF of all scene obstacles.
 * @param {p5.Vector} p 2D position to query SDF at.
 * @return {number,object} [d,o] Distance, d, to closest obstacle, o.
 */
function distanceO(p) {
	let minDistO = [Infinity, this];
	for (let i = 0; i < obstacles.length; i++) {
		const doi = obstacles[i].distanceO(p);
		minDistO = SDF.opUnion(minDistO, doi); // [min(d1,d2), closestObstacle]
	}
	return minDistO;
}

function keyPressed() {
	if (key === ' ') {
		isPaused = !isPaused;
	}	
}

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



//////////////////////////////////////////////
// Base (abstract) class for your obstacles //
//////////////////////////////////////////////
class Obstacle {

	constructor() {
		this.signMultiplier = 1; //outside
		this.COR = 1; //bouncy
		this.color = color("white");
	}

	// Negates SDF to flip inside/outside.
	invert() {
		this.signMultiplier *= -1;
	}

	// OVERRIDE to draw object.
	draw() {}

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
		return this.normalFD1(p); /// LIES!!! 1≠2
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
	getColor() {
		return this.color;
	}
	setColor(c) {
		this.color = c;
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
		this.COR = 0.5; // tune as you want on (0,1]
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
			this.omega = -this.speed / 2; // slower
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
			fill(this.color);
			circle(this.center.x, this.center.y, this.radius); // RADIUS MODE
		}
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
			rect(this.center.x, this.center.y, this.bx, this.by, 100); // RADIUS MODE
		}
		pop();
	}

	distance(p) {
		let v = p5.Vector.sub(p, this.center); // p-c
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

////////////////////////////////////////////////////////////
// Some 2D Signed Distance Fields. Feel free to add more! //
// See https://iquilezles.org/articles/distfunctions2d    // 
// Uses GLSL-like javascript macros below                 //
////////////////////////////////////////////////////////////
class SDF {

	/**
	 * Computes SDF union distance value, min(d1,d2), and its corresponding object reference.
	 * @param distO1 {[number,object]} Obstacle #1's SDF value, d, and object ref, o, as an array [d1,o1].
	 * @param distO2 {[number,object]} Obstacle #2's SDF value, d, and object ref, o, as an array [d2,o2].
	 * @return {[number,object]} Returns [d1,o1] if d1<d2, and [d2,o2] otherwise.
	 */
	static opUnion(distO1, distO2) {
		return (distO1[0] < distO2[0]) ? distO1 : distO2;
	}
	/**
	 * Computes SDF intersection distance value, max(d1,d2), and its corresponding object reference.
	 * @param distO1 {[number,object]} Obstacle #1's SDF value, d, and object ref, o, as an array [d1,o1].
	 * @param distO2 {[number,object]} Obstacle #2's SDF value, d, and object ref, o, as an array [d2,o2].
	 * @return {[number,object]} Returns [d1,o1] if d1>d2, and [d2,o2] otherwise.
	 */
	static opIntersection(distO1, distO2) {
		return (distO1[0] > distO2[0]) ? distO1 : distO2;
	}

	// ANOTHER BOOLEAN YOU MAY WANT TO USE:
	//float opSubtraction ( float d1, float d2 ) { return max(-d1,d2);}

	/**
	 * SDF of a circle at origin.
	 * @param {p5.Vector} p Evaluation point
	 * @param {number}    r Radius
	 * @return {number}   SDF value
	 */
	static sdCircle(p, r) {
		return length(p) - r;
	}
	/**
	 * SDF of a box at origin
	 * @param {p5.Vector} p Evaluation point
	 * @param {p5.Vector} b Half widths in X & Y
	 * @return {number}   SDF value
	 */
	static sdBox(p, b) {
		let d = sub(absv2(p), b);
		return length(maxv2(d, 0.0)) + min(max(d.x, d.y), 0.0);
	}
	
	static sdTriangle(p, p0, p1, p2) {
		let e0 = sub(p1, p0);
		let e1 = sub(p2, p1);
		let e2 = sub(p0, p2);

		let v0 = sub(p, p0);
		let v1 = sub(p, p1);
		let v2 = sub(p, p2);

		let pq0 = sub(v0, mult(e0,clamp( dot(v0,e0)/dot(e0,e0), 0.0, 1.0 )));
		let pq1 = sub(v1, mult(e1,clamp( dot(v1,e1)/dot(e1,e1), 0.0, 1.0 )));
		let pq2 = sub(v2, mult(e2,clamp( dot(v2,e2)/dot(e2,e2), 0.0, 1.0 )));

		let s = sign(e0.x*e2.y - e0.y*e2.x);
		let s0 = createVector( dot( pq0, pq0 ), s*(v0.x*e0.y-v0.y*e0.x) );
		let s1 = createVector( dot( pq1, pq1 ), s*(v1.x*e1.y-v1.y*e1.x) );
		let s2 =  createVector( dot( pq2, pq2 ), s*(v2.x*e2.y-v2.y*e2.x) );
		let xarr = [s0.x, s1.x, s2.x];
		let yarr = [s0.y, s1.y, s2.y];
		let dx = min(xarr);
		let dy = min(yarr);
		return -1 * Math.sqrt(dx)*Math.sign(dy);
	}
	
	// static sdRoundBox(p, b) {
	// 	let d = sub(absv2(p), b);
	// 	return length(maxv2(d, 0.0)) + min(max(d.x, d.y), 0.0);
	// }

	/** 
	 * Uneven Capsule - exact   (https://www.shadertoy.com/view/4lcBWn)
	 * @param {p5.Vector} q  Evaluation point
	 * @param {number}    r1 
	 * @param {number}    r2
	 * @param {number}    h  
	 */
	static sdUnevenCapsule(q, r1, r2, h) {
		// p.x = abs(p.x);
		let p = vec2(abs(q.x), q.y); // local copy to avoid changing pass-by-ref input
		const b = (r1 - r2) / h;
		const a = Math.sqrt(1.0 - b * b);
		const k = dot(p, vec2(-b, a));
		if (k < 0.0) return length(p) - r1;
		if (k > a * h) return length(sub(p, vec2(0.0, h))) - r2;
		return dot(p, vec2(a, b)) - r1;
	}
}

/////////////////////////////////////////////////////////////////
// Some convenient GLSL-like macros for p5.Vector calculations //
/////////////////////////////////////////////////////////////////
function length(v) {
	return v.mag();
}

function dot(x, y) {
	return x.dot(y);
}

function dot2(x) {
	return x.dot(x);
}

function vec2(a, b) {
	return createVector(a, b);
}

function vec3(a, b, c) {
	return createVector(a, b, c);
}

function sign(n) {
	return Math.sign(n);
}

function clamp(n, low, high) {
	return constrain(n, low, high);
}

function add(v, w) {
	return p5.Vector.add(v, w);
}

function sub(v, w) {
	return p5.Vector.sub(v, w);
}

function absv2(v) {
	return vec2(Math.abs(v.x), Math.abs(v.y));
}

function maxv2(v, n) {
	return vec2(Math.max(v.x, n), Math.max(v.y, n));
}

function minv2(v, n) {
	return vec2(Math.min(v.x, n), Math.min(v.y, n));
}

function vertexv2(p) {
	vertex(p.x, p.y);
}

function mult(w, a) {
	let v = createVector(0,0);
	v.x = a * w.x;
	v.y = a * w.y;
	return v;
}
 
function acc(v, a, w) {
	v.x += a * w.x;
	v.y += a * w.y;
}

function rotateVec2(v, thetaRad) {
	const c = cos(thetaRad);
	const s = sin(thetaRad);
	return vec2(c * v.x - s * v.y, s * v.x + c * v.y);
}