function updateScore(score) {
    textAlign(LEFT);
    textSize(width*.05);
    fill(255, 200, 0);
    text('Score: ' + score, width*0, height*.03);
}

function updateLives(lives) {
    textAlign(LEFT);
    textSize(width*.05);
    fill(255, 200, 0);
    text('Lives: ' + lives, width*0, height*.06);
}

function gameText() {
    textAlign(CENTER);
    textSize(width*.05);
    fill(255, 200, 0);
    text('GAME OVER! Press n to play again!', width*.5, height*.5);
}