// Tank Mayhem!
// Copyright © 2014 Gabriel Eve
// JavaScript

// Run javascript only once the window has loaded
window.onload = function () {

    // Defines a strict JavaScript interpretation
    "use strict";

    // TODO: organise variables, especially relating to movement (create function?)
    // TODO: change names to game.foo
    // Game constants
    var game = {

        SCALE: 6,
        SPEED: 3,                          // number of pixels per frames
        NUM_ROTATIONS: Math.ceil(100 / game.SPEED) * 4,
        WW: 5,         // Wall width
        controls1: [37, 39, 38, 40, 77],   // keyboard controls
        controls2: [83, 70, 69, 68, 81],
        esc: 27,
        tankNumber: 0,
        // Game elements
        canvas1: document.getElementById("canvas-1"),
        canvas2: document.getElementById("canvas-2"),
        canvas3: document.getElementById("canvas-3"),
        hpDisp: [],
        ctx1: canvas1.getContext("2d"),
        ctx2: canvas2.getContext("2d"),
        ctx3: canvas3.getContext("2d"),
        // Game arrays
        keysDown: [],
        keysPressed: [],                   // status of depressed keys
        theta: [],
        dx: [],
        dy: [],
        elements: [],
        tanks: [],
        requestId
    };

    game.hpDisp.push(document.getElementById("hp-p1"));
    game.hpDisp.push(document.getElementById("hp-p2"));

    // Pre calculate angles and x,y increments
    for (var i = game.NUM_ROTATIONS - 1; i >= 0; i -= 1) {
        game.theta[i] = (i / game.NUM_ROTATIONS) * 2 * Math.PI;
        game.dx[i] = Math.cos(game.theta[i]);
        game.dy[i] = Math.sin(game.theta[i]);
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

        var w = 3 * game.SCALE,                        // width
            l = 4 * game.SCALE,                        // length
            spd = game.SPEED,                   // [px/frame] SPEED
            spdR = game.SPEED / 2,              // reverse SPEED
            color = color,
            left = keys[0],
            right = keys[1],
            up = keys[2],
            down = keys[3],
            fire = keys[4],
            ammo = 6,                      // num of bullet ammunition
            x = Math.random() * game.canvas2.width * 0.8 + game.canvas2.width * 0.1,
            y = Math.random() * game.canvas2.height * 0.8 + game.canvas2.height * 0.1,
            d = Math.floor(Math.random() * game.NUM_ROTATIONS),
            hp = 100,                       // health
            number = game.tankNumber + 1,
            wobble = 0;

        this.getHp = function () {return hp;};

        this.updateAmmo = function (change) {ammo += change;};

        // Update position of tank and fire weapons
        this.update = function () {
            var b;
            // Update directional index based on turning right/left and wobble
            if (game.keysPressed[left]) {
                d -= 1;
            }
            if (game.keysPressed[right]) {
                d += 1;
            }
            // Damage penalty
            if (hp < 50) {
                d += randi(2) - 1;
            }
            if (d < 0) {
                d += game.NUM_ROTATIONS;
            } else if (d >= game.NUM_ROTATIONS) {
                d -= game.NUM_ROTATIONS;
            }
            // Move forward or reverse
            if (game.keysPressed[up]) {
                x += game.dx[d] * spd;
                y += game.dy[d] * spd;
            } else if (game.keysPressed[down]) {
                x -= game.dx[d] * spdR;
                y -= game.dy[d] * spdR;
            }
            // Fire a bullet when triggered
            if (game.keysDown[fire]) {
                if (ammo > 0) {
                    game.elements.push(new Bullet(x + game.dx[d] * 40, y + game.dy[d] * 40, d, this))
                    ammo -= 1;
                }
                game.keysDown[fire] = false;
            }
            // Collision with bullets
            for (var i = game.elements.length - 1; i >= 0; i -= 1) {
                b = game.elements[i];
                if (b instanceof Bullet) {
                    var X2 = Math.pow(x - b.getX(), 2),
                        Y2 = Math.pow(y - b.getY(), 2),
                        R2 = Math.pow(l + b.getW(), 2);
                    if (X2 + Y2 < R2) {
                        b.setT(1);
                        b.setColor("red");
                        hp -= b.getDamage();
                        game.hpDisp[number].innerHTML = "hp: " + hp;
                    }
                }
            }
        }

        // Draw tank on canvas
        this.draw = function () {
            game.ctx2.save();
            game.ctx2.translate(x, y);
            game.ctx2.rotate(game.theta[d]);
            game.ctx2.fillStyle = color;
            game.ctx2.fillRect(-l, -w, l * 2, w * 2);
            game.ctx2.fillStyle = "black";
            game.ctx2.fillRect(-l * 0.5, -w * 0.4, l * 2, w * 0.8);
            game.ctx2.restore();
        }
    }


    // Bullet object
    function Bullet(x, y, d, owner) {
        var w = game.SCALE,                         // radius
            x = x, //t.x + game.dx[t.d] * 40;        // x-coordinate
            y = y, //t.y + game.dy[t.d] * 40;        // y-coordinate
            u = 3.5 * game.SPEED * game.dx[d],       // x-component of velocity
            v = 3.5 * game.SPEED * game.dy[d],       // y-component of velocity
            t = 15 * 60 / game.SPEED,                    // time until expiry
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
            var ix = Math.floor((x - game.WW) / gridResolution),
                iy = Math.floor((y - game.WW) / gridResolution),
                a = ix + iy * m,
                xlim = x + u/2,
                ylim = y + v/2;
                // va = [a-m, a-m+1, a, a+1, a+m, a+m+1],
                // ha = [a-1, a, a+1, a+m-1, a+m, a+m+1];
            if ((xlim - w < ix * gridResolution + game.WW && verticalMapelements[a]) || (xlim + w > (ix+1) * gridResolution - game.WW && verticalMapelements[a+1])) {
                u = -u;
            }
            if ((ylim - w < iy * gridResolution + game.WW && horizontalMapelements[a]) || (ylim + w > (iy+1) * gridResolution - game.WW && horizontalMapelements[a+m])) {
                v = -v;
            }
            // Update position
            x += u;
            y += v;
            u *= 0.998;
            v *= 0.998;
        }

        this.draw = function () {
            game.ctx2.save();
            game.ctx2.beginPath();
            game.ctx2.arc(x, y, w, 0, 2 * Math.PI);
            game.ctx2.globalAlpha = op;
            game.ctx2.fillStyle = color;
            game.ctx2.fill();
            game.ctx2.restore();
        }
    }



    // TODO: Initialise game.keysPressed to 'false' rather than 'undefined'?

    // ===================================================================== //
    // Start screen
    // ===================================================================== //

    startScreen("red");
    game.canvas3.onclick = startGame;

    function startScreen (color) {
        game.ctx2.textAlign = "center";
        game.ctx2.font = "normal normal bold 80px Futura";
        game.ctx2.fillStyle = color;
        game.ctx2.fillText("Click to start", game.canvas2.width / 2, game.canvas2.height / 2);
        game.ctx2.font = "italic normal normal 40px Futura";
        game.ctx2.fillStyle = "gray"
        game.ctx2.fillText("(Version 0.3: Work in progress)", game.canvas2.width / 2, game.canvas2.height * 0.7);
    }
    game.canvas3.onmouseover = function () {
        game.ctx2.clearRect(0, 0, game.canvas2.width, game.canvas2.height);
        startScreen("limegreen");
    }
    game.canvas3.onmouseout = function () {
        game.ctx2.clearRect(0, 0, game.canvas2.width, game.canvas2.height);
        startScreen("red");
    }

    // ===================================================================== //
    // Map generator
    // ===================================================================== //

    var gridResolution = 120,
        m = game.canvas2.width / gridResolution + 1,
        n = game.canvas2.height / gridResolution + 1,
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
        game.ctx1.fillStyle = "black"
        for (var a = verticalMapgame.elements.length - 1; a >= 0; a--) {
            // draw map on grid offset by wall thickness
            x = (a % m) * gridResolution + game.WW;
            y = Math.floor(a / m) * gridResolution + game.WW;
            if (verticalMapelements[a]) {
                game.ctx1.fillRect(x-game.WW, y-game.WW, 2*game.WW, gridResolution + 2*game.WW);
            }
            if (horizontalMapelements[a]) {
                game.ctx1.fillRect(x-game.WW, y-game.WW, gridResolution + 2*game.WW, 2*game.WW);
            }
        }
    }




    // ===================================================================== //
    // Initializing game
    // ===================================================================== //

    function startLoop() {
        // intervalLoop = window.setInterval(gameloop, 17);
        game.requestId = window.requestAnimationFrame(gameLoop);
    }
    function stopLoop() {
        // window.clear(intervalLoop);
        window.cancelAnimationFrame(game.requestId);
    }

    function startGame() {
        game.ctx3.clearRect(0, 0, game.canvas3.width, game.canvas3.height);
        game.canvas3.onclick = null;
        game.canvas3.onmouseover = null;
        game.canvas3.onmouseout = null;
        game.elements.push(new Tank("red", game.controls1), new Tank("blue", game.controls2));

        // Show player health
        game.hpDisp[0].style.visibility = "visible";
        game.hpDisp[1].style.visibility = "visible";

        // Set event handlers for key presses
        document.onkeydown = function (e) {
            if (e.keyCode === game.esc && game.keysDown[game.esc]) {
                game.keysDown[game.esc] = false;
                startLoop();
            } else {
                game.keysDown[e.keyCode] = true;         // Detect if key has been pressed
            }
            game.keysPressed[e.keyCode] = true;      // Change key status to 'in use'

            // alert(e.keyCode);                // Displays the key code when pressed
            // disable default document behaviour of keys (e.g. arrow keys scrolling)
            if (e.preventDefault) {e.preventDefault(); }
        };
        document.onkeyup = function (e) {
            game.keysPressed[e.keyCode] = false;     // Change key status to 'not in use'
        };
        mapGenerator2();
        drawMap();
        startLoop();
    }

    // ===================================================================== //
    // Game loop
    // ===================================================================== //

    // function gameloop() {
    //     game.ctx2.clearRect(0, 0, game.canvas2.width, game.canvas2.height);
    //     updateBullets(bullets);
    //     drawBullets(bullets);
    //     for (i = game.tanks.length - 1; i >= 0; i--) {
    //         updateTank(game.tanks[i]);
    //         drawTank(game.tanks[i]);
    //     }
    //     if (game.keysDown[game.esc]) {
    //         game.ctx2.font = "40px Futura";
    //         game.ctx2.globalAlpha = 0.7;
    //         game.ctx2.fillStyle = "white";
    //         game.ctx2.fillRect(0, 0, game.canvas2.width, game.canvas2.height);
    //         game.ctx2.globalAlpha = 1;
    //         game.ctx2.fillStyle = "black";
    //         game.ctx2.fillText("Paused", game.canvas2.width / 2, game.canvas2.height / 2);
    //         window.clearInterval(intervalLoop);
    //     }
    //     for (i = game.tanks.length - 1; i >= 0; i -= 1) {
    //         if (game.tanks[i].hp <= 0) {
    //             endGame(game.tanks[i]);
    //         }
    //     }
    // }

    // Main menu
    function mainMenu() {
        stopLoop();
        game.ctx2.save();
        game.ctx2.font = "40px Futura";
        game.ctx2.globalAlpha = 0.7;
        game.ctx2.fillStyle = "white";
        game.ctx2.fillRect(0, 0, game.canvas2.width, game.canvas2.height);
        game.ctx2.globalAlpha = 1;
        game.ctx2.fillStyle = "black";
        game.ctx2.fillText("Paused", game.canvas2.width / 2, game.canvas2.height / 2);
        game.ctx2.restore();
        //TODO: add event listener to startLoop
    }

    //Clear canvas operation
    function clearCanvas() {
        game.ctx2.clearRect(0, 0, game.canvas2.width, game.canvas2.height);
    }

    // Gameloop to run every frame
    function gameLoop() {
        var expired;
        // Update movement etc of all canvas game.elements
        for (var i = game.elements.length - 1; i >= 0; i -= 1) {
            expired = game.elements[i].update();
            if (expired) {
                // Remove element if it no longer exists
                game.elements.splice(i, 1);
            }
        }

        // Clear the canvas
        clearCanvas();

        // Redraw all game.elements onto the canvas
        for (var i = game.elements.length - 1; i >= 0; i -= 1) {
            game.elements[i].draw();
        }

        // Check if game is over
        for (var i = game.elements.length - 1; i >= 0; i--) {
            if (game.elements[i] instanceof Tank && game.elements[i].getHp() <= 0) {
                endGame(game.elements[i]);
            }
        }

        // Access menu
        if (game.keysDown[game.esc]) {
            game.keysDown[game.esc] = false;
            mainMenu();
        }

        startLoop();
    }


    // ===================================================================== //
    // Game over
    // ===================================================================== //

    function endGame(winner) {
            stopLoop();
            game.ctx2.save();
            game.ctx2.font = "40px Futura";
            game.ctx2.globalAlpha = 0.7;
            game.ctx2.fillStyle = "green";
            game.ctx2.fillRect(0, 0, game.canvas2.width, game.canvas2.height);
            game.ctx2.globalAlpha = 1;
            game.ctx2.fillStyle = winner.color;
            game.ctx2.fillText(winner.color + " player wins", game.canvas2.width / 2, game.canvas2.height / 2);
            game.ctx2.restore();
    }

    // game.ctx2.webkitImageSmoothingEnabled = false;
};
