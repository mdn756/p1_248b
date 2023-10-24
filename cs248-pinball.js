// Stanford CS248B Pinball Assignment
// Startercode: Doug L. James, djames@cs.stanford.edu

//p5.disableFriendlyErrors = true;

let BALL_RADIUS = 25;
const FRAMERATE = 60; // Try a lower value, e.g., 10, to test ray-marching CCD

let obstacles;
let ball;
let score = 0;
let lives = 3;
let flipperL, flipperR;
let isPaused = true;
let ballReset = true;
let gameStatus = true; //false is game over
let maxPenetrationDepth = 0; // nonnegative value for largest overlap

let bgImg;

function preload() {
	//imageMode(CORNERS)
	bgImg = loadImage('neon.jpg');
	ufoImg = loadImage('ufo.png');
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
	for (let k = 0; k < 4; k++) {
		let circleK = new CircleObstacle(createVector(random(0.2 * width, 0.8 * width), random(0.2 * height, 0.6 * height)), random(20 * s, 100 * s));
		//circleK.setCOR(random(1));
		circleK.setColor(color(random(0, 255), random(0, 255), random(0, 255)));
		circleK.setCOR(0.85);
		circleK.setEnergy(.1); //energy modeled as just adding the unit normal multiplied by some scalar
		obstacles.push(circleK);
	}
	let ufo = new UFOObstacle();
	//circleK.setCOR(random(1));
	ufo.setColor(color(random(0, 255), random(0, 255), random(0, 255)));
	ufo.setCOR(0.85);
	obstacles.push(ufo);

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
		flipperL = new Flipper(vec2(0.10 * width, 0.79 * height), 40 * s, 20 * s, 200 * s, -PI * 1 / 4, +PI / 2, 10., 37); // left arrow
		flipperR = new Flipper(vec2(0.8 * width, 0.79 * height), 40 * s, 20 * s, 200 * s, +PI * 5 / 4, -PI / 2, 10., 39); // right arrow
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
	if (keyIsDown(32) && ballReset && gameStatus) {
		if (ball.v.y > -2000) {
			ball.p.y++;
		    ball.v.y -= 10;
		    isPaused = false;    
		}
		     
	}
	if (!isPaused && !ballReset) {
		ballReset = false;
		timestep(); 
	}

	drawScene();
	updateScore(score);
	updateLives(lives);
	if (!gameStatus) {
		gameText();
	}
}

function timestep() {
	const dt = 0.001 * deltaTime;
	flipperL.timestep(dt);
	flipperR.timestep(dt);
	ball.timestep(dt);

	if (ballIsInEndzone()) { // end turn
		isPaused = true;
		ballReset = true;
		if (lives > 0) {
			lives = lives - 1;
		}
		else {
			gameStatus = false;
		}
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
	ufoImg.resize(100,100)
    
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
	if (key === 'p') {
		isPaused = !isPaused;
	}	
}

function keyPressed() {
	if (key === 'n') {
		isPaused = true;
		gameStatus = true;
		ballReset = true;
		lives = 3;
		score = 0;
		resetGame(ball, flipperL, flipperR);
	}	
}

function keyReleased() {
    if (key === ' ') {
        ballReset = false;
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