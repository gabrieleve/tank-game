// Tank Mayhem!
// Copyright © 2014 Gabriel Eve
// JavaScript


// Run javascript only once the window has loaded
window.onload = function () {

    // Defines a strict JavaScript interpretation
    "use strict";

    // TODO: organise variables, especially relating to movement (create function?)

    // Game object
    var SCALE = 6,
        SPEED = 3,                           // number of pixels per frames
        WW = 5,                              // Wall width
        CONTROLS_P1 = [37, 39, 38, 40, 77],    // keyboard controls
        CONTROLS_P2 = [83, 70, 69, 68, 81],
        ESC = 27,
        tankCount = 0,

        // Game elements
        background = document.getElementById("background"),
        canvas = document.getElementById("canvas"),
        foreground = document.getElementById("foreground"),
        hpDisp = [],

        // Game arrays
        keysDown = [],
        keysPressed = [],                   // status of depressed keys
        theta = [],
        dx = [],
        dy = [],
        elements = [],
        tanks = [],
        requestId = [],
        NUM_ROTATIONS = Math.ceil(100 / SPEED) * 4,
        ctxBackground = background.getContext("2d"),
        ctxCanvas = canvas.getContext("2d"),
        ctxForeground = foreground.getContext("2d"),
        canvasWidth = background.width,
        canvasHeight = background.height;


    hpDisp.push(document.getElementById("hp-p1"));
    hpDisp.push(document.getElementById("hp-p2"));

    // Pre calculate angles and x,y increments
    for (var i = NUM_ROTATIONS - 1; i >= 0; i -= 1) {
        theta[i] = (i / NUM_ROTATIONS) * 2 * Math.PI;
        dx[i] = Math.cos(theta[i]);
        dy[i] = Math.sin(theta[i]);
    }

    // function returning a randomly generated integer between and including 0 and max
    function randi(max) {
        return Math.floor(Math.random() * (max + 1));
    }

    // ===================================================================== //
    // Game objects
    // ===================================================================== //

    // Tank object
    function Tank(color, keys) {

        var w = 3 * SCALE,                        // width
            l = 4 * SCALE,                        // length
            spd = SPEED,                   // [px/frame] SPEED
            spdR = SPEED / 2,              // reverse SPEED
            color = color,
            left = keys[0],
            right = keys[1],
            up = keys[2],
            down = keys[3],
            fire = keys[4],
            ammo = 6,                      // num of bullet ammunition
            x = Math.random() * canvasWidth * 0.8 + canvasWidth * 0.1,
            y = Math.random() * canvasHeight * 0.8 + canvasHeight * 0.1,
            d = Math.floor(Math.random() * NUM_ROTATIONS),
            hp = 100,                       // health
            number = tankCount + 1,
            wobble = 3;

        this.getHp = function () {return hp;};

        this.updateAmmo = function (change) {ammo += change;};

        // Update position of tank and fire weapons
        this.update = function () {
            var b;
            // Update directional index based on turning right/left and wobble
            if (keysPressed[left]) {
                d -= 1;
            }
            if (keysPressed[right]) {
                d += 1;
            }
            // Damage penalty
            if (hp < 50) {
                d += randi(2) - 1;
            }
            if (d < 0) {
                d += NUM_ROTATIONS;
            } else if (d >= NUM_ROTATIONS) {
                d -= NUM_ROTATIONS;
            }
            // Move forward or reverse
            if (keysPressed[up]) {
                x += dx[d] * spd;
                y += dy[d] * spd;
            } else if (keysPressed[down]) {
                x -= dx[d] * spdR;
                y -= dy[d] * spdR;
            }
            // Fire a bullet when triggered
            if (keysDown[fire]) {
                if (ammo > 0) {
                    elements.push(new Bullet(x + dx[d] * 40, y + dy[d] * 40, d, this))
                    ammo -= 1;
                }
                keysDown[fire] = false;
            }
            // Collision with bullets
            for (var i = elements.length - 1; i >= 0; i -= 1) {
                b = elements[i];
                if (b instanceof Bullet) {
                    var X2 = Math.pow(x - b.getX(), 2),
                        Y2 = Math.pow(y - b.getY(), 2),
                        R2 = Math.pow(l + b.getW(), 2);
                    if (X2 + Y2 < R2) {
                        b.setT(1);
                        b.setColor("red");
                        hp -= b.getDamage();
                        hpDisp[number].innerHTML = "hp: " + hp;
                    }
                }
            }
        }

        // Draw tank on canvas
        this.draw = function () {
            ctxCanvas.save();
            ctxCanvas.translate(x, y);
            ctxCanvas.rotate(theta[d]);
            ctxCanvas.fillStyle = color;
            ctxCanvas.fillRect(-l, -w, l * 2, w * 2);
            ctxCanvas.fillStyle = "black";
            ctxCanvas.fillRect(-l * 0.5, -w * 0.4, l * 2, w * 0.8);
            ctxCanvas.restore();
        }
    }


    // Bullet object
    function Bullet(x, y, d, owner) {
        var w = SCALE,                         // radius
            x = x, //t.x + dx[t.d] * 40;        // x-coordinate
            y = y, //t.y + dy[t.d] * 40;        // y-coordinate
            u = 3.5 * SPEED * dx[d],       // x-component of velocity
            v = 3.5 * SPEED * dy[d],       // y-component of velocity
            t = 15 * 60 / SPEED,                    // time until expiry
            color = "#" + randi(999),
            owner = owner,
            damage = 34,
            op = 1;                        // opacity

        this.getX = function () {return x;};
        this.getY = function () {return y;};
        this.getW = function () {return w;};
        this.getDamage = function () {return damage;};

        this.setT = function (time) {t = time;};
        this.setColor = function (color) {color = color;};

        // Returns true if object no longer exits
        this.update = function () {
            t -= 1;
            // Fade bullet object when expiring and remove
            if (t <= 0) {
                owner.updateAmmo(1);
                // Bullet has expired
                return true;
            } else if (t <= 10) {
                w *= 1.1;
                op -= 0.1;
            }

            // Wall collision
            var ix = Math.floor((x - WW) / gridResolution),
                iy = Math.floor((y - WW) / gridResolution),
                a = ix + iy * m,
                xlim = x + u/2,
                ylim = y + v/2;
                // va = [a-m, a-m+1, a, a+1, a+m, a+m+1],
                // ha = [a-1, a, a+1, a+m-1, a+m, a+m+1];
            if ((xlim - w < ix * gridResolution + WW && verticalMapelements[a]) || (xlim + w > (ix+1) * gridResolution - WW && verticalMapelements[a+1])) {
                u = -u;
            }
            if ((ylim - w < iy * gridResolution + WW && horizontalMapelements[a]) || (ylim + w > (iy+1) * gridResolution - WW && horizontalMapelements[a+m])) {
                v = -v;
            }
            // Update position
            x += u;
            y += v;
            u *= 0.998;
            v *= 0.998;
        }

        this.draw = function () {
            ctxCanvas.save();
            ctxCanvas.beginPath();
            ctxCanvas.arc(x, y, w, 0, 2 * Math.PI);
            ctxCanvas.globalAlpha = op;
            ctxCanvas.fillStyle = color;
            ctxCanvas.fill();
            ctxCanvas.restore();
        }
    }



    // TODO: Initialise keysPressed to 'false' rather than 'undefined'?

    // ===================================================================== //
    // Start screen
    // ===================================================================== //

    startScreen("red");
    foreground.onclick = startGame;

    function startScreen (color) {
        ctxCanvas.textAlign = "center";
        ctxCanvas.font = "normal normal bold 80px Futura";
        ctxCanvas.fillStyle = color;
        ctxCanvas.fillText("Click to start", canvasWidth / 2, canvasHeight / 2);
    }
    foreground.onmouseover = function () {
        ctxCanvas.clearRect(0, 0, canvasWidth, canvasHeight);
        startScreen("limegreen");
    }
    foreground.onmouseout = function () {
        ctxCanvas.clearRect(0, 0, canvasWidth, canvasHeight);
        startScreen("red");
    }

    // ===================================================================== //
    // Map generator
    // ===================================================================== //

    var gridResolution = 120,
        m = canvasWidth / gridResolution + 1,
        n = canvasHeight / gridResolution + 1,
        verticalMapelements = [],
        horizontalMapelements = [];

    // function mapGenerator() {
    //     for (var iy = n-1; iy >= 0; iy -= 1) {
    //         for (var ix = m-1; ix >= 0; ix -= 1) {
    //             var a = ix + iy * m;
    //             if (ix === 0 || ix === m-1 || Math.random() < elementRatio) {
    //                 verticalMapelements[a] = true;
    //             } else {
    //                 verticalMapelements[a] = false;
    //             }
    //             if (iy === 0 || iy === n-1 || Math.random() < elementRatio) {
    //                 horizontalMapelements[a] = true;
    //             } else {
    //                 horizontalMapelements[a] = false;
    //             }
    //         }
    //     }
    // }

    function mapGenerator2() {

        var ix, iy, a, val, minVal, minIndex,
            gridValues = [],
            activeSet = [],
            squareStatus = [],
            squaresLeft = (m-1) * (n-1);

        for (var a = m*n - 1; a >= 0; a -= 1) {
            verticalMapelements[a] = true;
            horizontalMapelements[a] = true;
            gridValues[a] = Math.pow(Math.random(), 20);
            squareStatus[a] = true;
        }

        // Square object
        function Square(ix, iy, val) {
            this.ix = ix;
            this.iy = iy;
            this.a = ix + iy * m;
            this.val = val + gridValues[this.a];
        }
        // Randomly generate a starting square
        ix = 0; //randi(m - 2);  // number of squares in each row is m-1
        iy = randi(n - 2);  // as above
        a = ix + iy*m;
        val = 0;
        activeSet.push(new Square(ix, iy, val));
        squareStatus[a] = false;
        squaresLeft -= 1;

        while (squaresLeft > 0) {

            // Find the active square with minimum value and return index
            minIndex = 0;
            minVal = activeSet[minIndex].val;
            for (var k = 1; k < activeSet.length; k += 1) {
                if (activeSet[k].val < minVal) {
                    minIndex = k;
                    minVal = activeSet[k].val;
                }
            }

            ix = activeSet[minIndex].ix;
            iy = activeSet[minIndex].iy;
            a = activeSet[minIndex].a;
            val = activeSet[minIndex].val;
            activeSet.splice(minIndex, 1);  // remove closed square

            // go left
            if (ix !== 0 && squareStatus[a-1]) {
                verticalMapelements[a] = false;
                activeSet.push(new Square(ix-1, iy, val));
                squareStatus[a-1] = false;
                squaresLeft -= 1;
            }
            // go right
            if (ix !== m-2 && squareStatus[a+1]) {
                verticalMapelements[a+1] = false;
                activeSet.push(new Square(ix+1, iy, val));
                squareStatus[a+1] = false;
                squaresLeft -= 1;
            }
            // go up
            if (iy !== 0 && squareStatus[a-m]) {
                horizontalMapelements[a] = false;
                activeSet.push(new Square(ix, iy-1, val));
                squareStatus[a-m] = false;
                squaresLeft -= 1;
            }
            // go down
            if (iy !== n-2 && squareStatus[a+m]) {
                horizontalMapelements[a+m] = false;
                activeSet.push(new Square(ix, iy+1, val));
                squareStatus[a+m] = false;
                squaresLeft -= 1;
            }

        }
    }

    // ===================================================================== //
    // Game logic
    // ===================================================================== //




    // ===================================================================== //
    // Collisions
    // ===================================================================== //


    // ===================================================================== //
    // Drawing to canvas
    // ===================================================================== //

    function drawMap() {
        var x, y;
        ctxBackground.fillStyle = "black"
        for (var a = verticalMapelements.length - 1; a >= 0; a--) {
            // draw map on grid offset by wall thickness
            x = (a % m) * gridResolution + WW;
            y = Math.floor(a / m) * gridResolution + WW;
            if (verticalMapelements[a]) {
                ctxBackground.fillRect(x-WW, y-WW, 2*WW, gridResolution + 2*WW);
            }
            if (horizontalMapelements[a]) {
                ctxBackground.fillRect(x-WW, y-WW, gridResolution + 2*WW, 2*WW);
            }
        }
    }




    // ===================================================================== //
    // Initializing game
    // ===================================================================== //

    function startLoop() {
        // intervalLoop = window.setInterval(gameloop, 17);
        requestId = window.requestAnimationFrame(gameLoop);
    }
    function stopLoop() {
        // window.clear(intervalLoop);
        window.cancelAnimationFrame(requestId);
    }

    function startGame() {
        ctxForeground.clearRect(0, 0, foreground.width, foreground.height);
        foreground.onclick = null;
        foreground.onmouseover = null;
        foreground.onmouseout = null;
        elements.push(new Tank("red", CONTROLS_P1), new Tank("blue", CONTROLS_P2));

        // Show player health
        hpDisp[0].style.visibility = "visible";
        hpDisp[1].style.visibility = "visible";

        // Set event handlers for key presses
        document.onkeydown = function (e) {
            if (e.keyCode === ESC && keysDown[ESC]) {
                keysDown[ESC] = false;
                startLoop();
            } else {
                keysDown[e.keyCode] = true;         // Detect if key has been pressed
            }
            keysPressed[e.keyCode] = true;      // Change key status to 'in use'

            // alert(e.keyCode);                // Displays the key code when pressed
            // disable default document behaviour of keys (e.g. arrow keys scrolling)
            if (e.preventDefault) {e.preventDefault(); }
        };
        document.onkeyup = function (e) {
            keysPressed[e.keyCode] = false;     // Change key status to 'not in use'
        };
        mapGenerator2();
        drawMap();
        startLoop();
    }

    // ===================================================================== //
    // Game loop
    // ===================================================================== //

    // function gameloop() {
    //     ctxCanvas.clearRect(0, 0, canvasWidth, canvasHeight);
    //     updateBullets(bullets);
    //     drawBullets(bullets);
    //     for (i = tanks.length - 1; i >= 0; i--) {
    //         updateTank(tanks[i]);
    //         drawTank(tanks[i]);
    //     }
    //     if (keysDown[ESC]) {
    //         ctxCanvas.font = "40px Futura";
    //         ctxCanvas.globalAlpha = 0.7;
    //         ctxCanvas.fillStyle = "white";
    //         ctxCanvas.fillRect(0, 0, canvasWidth, canvasHeight);
    //         ctxCanvas.globalAlpha = 1;
    //         ctxCanvas.fillStyle = "black";
    //         ctxCanvas.fillText("Paused", canvasWidth / 2, canvasHeight / 2);
    //         window.clearInterval(intervalLoop);
    //     }
    //     for (i = tanks.length - 1; i >= 0; i -= 1) {
    //         if (tanks[i].hp <= 0) {
    //             endGame(tanks[i]);
    //         }
    //     }
    // }

    // Main menu
    function mainMenu() {
        stopLoop();
        ctxCanvas.save();
        ctxCanvas.font = "40px Futura";
        ctxCanvas.globalAlpha = 0.7;
        ctxCanvas.fillStyle = "white";
        ctxCanvas.fillRect(0, 0, canvasWidth, canvasHeight);
        ctxCanvas.globalAlpha = 1;
        ctxCanvas.fillStyle = "black";
        ctxCanvas.fillText("Paused", canvasWidth / 2, canvasHeight / 2);
        ctxCanvas.restore();
        //TODO: add event listener to startLoop
    }

    //Clear canvas operation
    function clearCanvas() {
        ctxCanvas.clearRect(0, 0, canvasWidth, canvasHeight);
    }

    // Gameloop to run every frame
    function gameLoop() {
        var expired;
        // Update movement etc of all canvas elements
        for (var i = elements.length - 1; i >= 0; i -= 1) {
            expired = elements[i].update();
            if (expired) {
                // Remove element if it no longer exists
                elements.splice(i, 1);
            }
        }

        // Clear the canvas
        clearCanvas();

        // Redraw all elements onto the canvas
        for (var i = elements.length - 1; i >= 0; i -= 1) {
            elements[i].draw();
        }

        // Check if game is over
        for (var i = elements.length - 1; i >= 0; i--) {
            if (elements[i] instanceof Tank && elements[i].getHp() <= 0) {
                endGame(elements[i]);
            }
        }

        // Access menu
        if (keysDown[ESC]) {
            keysDown[ESC] = false;
            mainMenu();
        }

        startLoop();
    }


    // ===================================================================== //
    // Game over
    // ===================================================================== //

    function endGame(winner) {
            stopLoop();
            ctxCanvas.save();
            ctxCanvas.font = "40px Futura";
            ctxCanvas.globalAlpha = 0.7;
            ctxCanvas.fillStyle = "green";
            ctxCanvas.fillRect(0, 0, canvasWidth, canvasHeight);
            ctxCanvas.globalAlpha = 1;
            ctxCanvas.fillStyle = winner.color;
            ctxCanvas.fillText(winner.color + " player wins", canvasWidth / 2, canvasHeight / 2);
            ctxCanvas.restore();
    }

    // ctxCanvas.webkitImageSmoothingEnabled = false;
};
