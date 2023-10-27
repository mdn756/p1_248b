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
let powImageVisible = false;
let powImageStartTime;
let portalTime = 0;
let ufo_pos;
let img_select;

let bgImg;

function preload() {
	//imageMode(CORNERS)
	bgImg = loadImage('spacebg.jpg');
	ufoImg = loadImage('ufo.png');
	powImg = loadImage('pow.png');
	bamImg = loadImage('bam.png');
	zomImg = loadImage('zom.webp');
	zomflipImg = loadImage('zom_flip.webp');
}

console.log("Compiled");

function setup() {
	// TRADITIONAL RECTANGLE SHAPE, BUT FEEL FREE TO DO SOMETHING ELSE:
	createCanvas(min(windowWidth, windowHeight / 1.5), windowHeight); // actual size then given by (width,height)

	frameRate(FRAMERATE);

	ellipseMode(RADIUS); // --> circle(x,y,r)

	// RESIZING SCREEN SHOULDN'T CHANGE THE GAME LAYOUT, SO RECORD SCALE:
	let s = width / 800; // scale factor to allow for different screen resolutions sizes
	
	BALL_RADIUS *= s;
	zomImg.resize(zomImg.width*1, zomImg.height*1.1);
	zomflipImg.resize(zomImg.width, zomImg.height);
	// REPLACE WITH YOUR MANY WONDERFUL OBSTACLES
	obstacles = [];
	bumper_locations = [createVector(width*.25, height*.4),
		createVector(width*.65, height*.4),
		createVector(width*.45, height*.2)];
	for (let k = 0; k < 3; k++) {
		let circleK = new CircleObstacle(bumper_locations[k], 45 * s);
		//circleK.setCOR(random(1));
		circleK.setColor(color(210, 76, 58));
		circleK.setStrokeColor(color(240, 106, 88));
		circleK.setCOR(0.85);
		//circleK.setEnergy(500); //energy modeled as just adding the unit normal multiplied by some scalar
		obstacles.push(circleK);
	}
	ufo_pos = createVector(width*.45, height*.3)
	let ufo = new UFOObstacle(ufo_pos, s);
	//circleK.setCOR(random(1));
	ufo.setCOR(0.85);
	obstacles.push(ufo);

	// Corner
	let triangle = new TriangleObstacle(createVector(width + 10, height + 10), createVector(0.8 * width, 0), createVector(width, 0), createVector(width, height * 0.1));
	triangle.setColor(color(244, 221, 181));
	triangle.setCOR(0.95);
	obstacles.push(triangle);	

	// let arc = new ArcObstacle(width*0.5, height*0.3, 60, 60, HALF_PI, PI);
	// arc.setColor(color(250, 0, 250));
	// obstacles.push(arc);	

	//Sling
    let sling_bounce_l = new RoundBox(createVector(width*.19, height * .65), width * 0.007, height * .12, -PI/10)
    sling_bounce_l.setColor(color(0, 250, 250));
	sling_bounce_l.setCOR(1);
	sling_bounce_l.setEnergy(300);
	obstacles.push(sling_bounce_l);

	let sling_bounce_r = new RoundBox(createVector(width*(.9-.19), height * .65), width * 0.007, height * .12, PI/10)
    sling_bounce_r.setColor(color(0, 250, 250));
	sling_bounce_r.setCOR(1);
	sling_bounce_r.setEnergy(300);
	obstacles.push(sling_bounce_r);
	let sling_l = new SlingObstacle(createVector(width*.25+10, height*.35+10), createVector(width*.09, height*.55), createVector(width*.09, height*.7), createVector(width*.25, height * .79), 1);
	sling_l.setColor(color(250, 0, 250));
	sling_l.setCOR(0.1);
	obstacles.push(sling_l);

	let sling_r = new SlingObstacle(createVector(width*.25+10, height*.35+10), createVector(width*.81, height*.55), createVector(width*.81, height*.7), createVector(width*.65, height * .79), 2);
	sling_r.setColor(color(250, 0, 250));
	sling_r.setCOR(0.1);
	obstacles.push(sling_r);

	
	
	// Plunger Wall
	let plungerWall = new RoundBox(createVector(width * 0.90, height * 0.65), width * 0.007, height / 2, 0);
	plungerWall.setColor(color(78, 151, 183));
	plungerWall.setCOR(0.95);	
	obstacles.push(plungerWall);

	// Lower Wall
	let lowerWall_l = new RoundBox(createVector(width*.78, height * .802), width * 0.007, height * .1, PI*1.7/6)
    lowerWall_l.setColor(color(78, 151, 183));
	lowerWall_l.setCOR(0.1);	
	obstacles.push(lowerWall_l);
	let lowerWall_r = new RoundBox(createVector(width*.12, height * .802), width * 0.007, height * .1, -PI*1.7/6)
    lowerWall_r.setColor(color(78, 151, 183));
	lowerWall_r.setCOR(0.1);	
	obstacles.push(lowerWall_r);

	// SETUP FLIPPERS: (pivot, r1, r2, h, angleRest, dAngleAction, speed[rad/s], key)
	{
		flipperL = new Flipper(vec2(0.24 * width, 0.88 * height), 18 * s, 10 * s, 150 * s, -PI * 1 / 5, +PI / 2, 10., 37); // left arrow
		flipperR = new Flipper(vec2(0.66 * width, 0.88 * height), 17 * s, 10 * s, 150 * s, +PI * 6 / 5, -PI / 2, 10., 39); // right arrow
		flipperL.setColor(color(210, 76, 58));
		flipperR.setColor(color(210, 76, 58));
		obstacles.push(flipperL);
		obstacles.push(flipperR);
	}

	// MAKE YOUR DOMAIN BOUNDARY (BASIC BOX FOR NOW):
	let domainBox = new BoxObstacle(createVector(width / 2, height), width / 2, height);
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
	if (powImageVisible) {
        let currentTime = millis();
        let elapsedTime = currentTime - powImageStartTime;

		if (img_select < 0.5) {
			currentImg = powImg;
		} else {
			currentImg = bamImg;
		}

        // Display the powImg
        if (elapsedTime < 400) {
			push();
			imageMode(CENTER);
			let scaleF = .30;
            scale(scaleF);
            image(currentImg, ufo_pos.x/scaleF + random(-width*.05, width * .05), ufo_pos.y/scaleF + random(-width*.05, width * .05));
			pop();
        } else {
            powImageVisible = false; // Hide the powImg 
        }
    }
}

function timestep() {
	const dt = 0.001 * deltaTime;
	flipperL.timestep(dt);
	flipperR.timestep(dt);
	ball.timestep(dt);

	ballIsInPortal();

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

function ballIsInPortal() {
	// SIMPLE CHECK FOR NOW:
	let currentTime = millis();
	let elapsedTime = currentTime - portalTime;
	// Display the powImg
	if (elapsedTime > 400) {
		if (ball.p.x <= ball.r*1.5) {
			if ((ball.p.y < height*0.2) && (ball.p.y > height*0.1)){
				print("true");
				ball.p.y = height*0.55;
				ball.p.x = width * 0.90-ball.r;
				let vx = ball.v.x;
				ball.v.x = -vx;
				portalTime = millis();
				return;
			}
		}
		if ((ball.p.x + ball.r >= width * 0.90-ball.r) && (ball.p.x - ball.r <= width * 0.90-ball.r)) {
			if (ball.p.y > height*0.4 && ball.p.y < height*0.5){
				print("ball.py"+ball.p.y);
				print("true2");
				ball.p.y = height*0.15;
				ball.p.x = ball.r;
				let vx = ball.v.x;
				ball.v.x = -vx;
				portalTime = millis();
				return;
			}
		}
	}
}

// Returns true if the ball is in the endzone.
function ballIsInEndzone() {
	// SIMPLE CHECK FOR NOW:
	return (ball.p.y > height * 1.2);
}

function drawScene() {
	clear();
	//background(180);
	image(bgImg, 0, 0, min(windowWidth, windowHeight / 1.5), windowHeight);
	ufoImg.resize(width / 9.5333,height/14.3)
	zomImg.resize(width/1.4, height/1.7)
	zomflipImg.resize(width/1.4, height/1.7)
	//ufoImg.resize
	noStroke();

	if (keyIsPressed === true && key === 's')
		drawSDFRaster();

	// DRAW OBSTACLES:
	{
		fill(255);
		for (let i = 0; i < obstacles.length; i++)
			obstacles[i].draw();
	}
	let portal_a = new Portal(ball.r, height*0.2, ball.r, height*0.1);
	portal_a.draw();
	let portal_b = new Portal(width * 0.90-ball.r, height*0.4, width * 0.90-ball.r, height*0.5);
	portal_b.draw();
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
	if (key === 'n') {
		isPaused = true;
		gameStatus = true;
		ballReset = true;
		lives = 3;
		score = 0;
		resetGame(ball, flipperL, flipperR);
	}	
	if (key === 'p') {
		isPaused = !isPaused;
	}
}

function keyReleased() {
    if (key === ' ') {
        ballReset = false;
    }
}
