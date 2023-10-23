function resetGame(ball, flipperL, flipperR) {
	// BALL INITIAL CONDITIONS (MODIFY FOR YOUR GAME, e.g., for plunger)
	ball.v.x = 0;
	ball.v.y = -900;
	
	// ball.v.x = random(-400, -200);
	// ball.v.y = random(-100, 100);
	ball.p.x = width * 0.955;
	ball.p.y = height * 0.8;
	flipperL.resetFlipper();
	flipperR.resetFlipper();
}