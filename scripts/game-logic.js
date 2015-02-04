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
        NUM_ROTATIONS: Math.ceil(100 / SPEED) * 4,
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
        requestID
    };

    game.hpDisp.push(document.getElementById("hp-p1"));
    game.hpDisp.push(document.getElementById("hp-p2"));

    // Pre calculate angles and x,y increments
    for (var i = NUM_ROTATIONS - 1; i >= 0; i -= 1) {
        game.theta[i] = (i / NUM_ROTATIONS) * 2 * Math.PI;
        game.dx[i] = Math.cos(theta[i]);
        game.dy[i] = Math.sin(theta[i]);
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
            spd = SPEED,                   // [px/frame] speed
            spdR = SPEED / 2,              // reverse speed
            color = color,
            left = keys[0],
            right = keys[1],
            up = keys[2],
            down = keys[3],
            fire = keys[4],
            ammo = 6,                      // num of bullet ammunition
            x = Math.random() * canvas2.width * 0.8 + canvas2.width * 0.1,
            y = Math.random() * canvas2.height * 0.8 + canvas2.height * 0.1,
            d = Math.floor(Math.random() * NUM_ROTATIONS),
            hp = 100,                       // health
            number = tankNumber + 1,
            wobble = 0;

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
            ctx2.save();
            ctx2.translate(x, y);
            ctx2.rotate(theta[d]);
            ctx2.fillStyle = color;
            ctx2.fillRect(-l, -w, l * 2, w * 2);
            ctx2.fillStyle = "black";
            ctx2.fillRect(-l * 0.5, -w * 0.4, l * 2, w * 0.8);
            ctx2.restore();
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
            if ((xlim - w < ix * gridResolution + WW && verticalMapElements[a]) || (xlim + w > (ix+1) * gridResolution - WW && verticalMapElements[a+1])) {
                u = -u;
            }
            if ((ylim - w < iy * gridResolution + WW && horizontalMapElements[a]) || (ylim + w > (iy+1) * gridResolution - WW && horizontalMapElements[a+m])) {
                v = -v;
            }
            // Update position
            x += u;
            y += v;
            u *= 0.998;
            v *= 0.998;
        }

        this.draw = function () {
            ctx2.save();
            ctx2.beginPath();
            ctx2.arc(x, y, w, 0, 2 * Math.PI);
            ctx2.globalAlpha = op;
            ctx2.fillStyle = color;
            ctx2.fill();
            ctx2.restore();
        }
    }



    // TODO: Initialise keysPressed to 'false' rather than 'undefined'?

    // ===================================================================== //
    // Start screen
    // ===================================================================== //

    startScreen("red");
    canvas3.onclick = startGame;
    
    function startScreen (color) {
        ctx2.textAlign = "center";
        ctx2.font = "normal normal bold 80px Futura";
        ctx2.fillStyle = color;
        ctx2.fillText("Click to start", canvas2.width / 2, canvas2.height / 2);
        ctx2.font = "italic normal normal 40px Futura";
        ctx2.fillStyle = "gray"
        ctx2.fillText("(Version 0.3: Work in progress)", canvas2.width / 2, canvas2.height * 0.7);
    }
    canvas3.onmouseover = function () {
        ctx2.clearRect(0, 0, canvas2.width, canvas2.height);
        startScreen("limegreen");
    }
    canvas3.onmouseout = function () {
        ctx2.clearRect(0, 0, canvas2.width, canvas2.height);
        startScreen("red");
    }

    // ===================================================================== //
    // Map generator
    // ===================================================================== //

    var gridResolution = 120,
        m = canvas2.width / gridResolution + 1,
        n = canvas2.height / gridResolution + 1,
        verticalMapElements = [],
        horizontalMapElements = [];

    // function mapGenerator() {
    //     for (var iy = n-1; iy >= 0; iy -= 1) {
    //         for (var ix = m-1; ix >= 0; ix -= 1) {
    //             var a = ix + iy * m;
    //             if (ix === 0 || ix === m-1 || Math.random() < elementRatio) {
    //                 verticalMapElements[a] = true;
    //             } else {
    //                 verticalMapElements[a] = false;
    //             }
    //             if (iy === 0 || iy === n-1 || Math.random() < elementRatio) {
    //                 horizontalMapElements[a] = true;
    //             } else {
    //                 horizontalMapElements[a] = false;
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
            verticalMapElements[a] = true;
            horizontalMapElements[a] = true;
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
                verticalMapElements[a] = false;
                activeSet.push(new Square(ix-1, iy, val));
                squareStatus[a-1] = false;
                squaresLeft -= 1;
            }
            // go right
            if (ix !== m-2 && squareStatus[a+1]) {
                verticalMapElements[a+1] = false;
                activeSet.push(new Square(ix+1, iy, val));
                squareStatus[a+1] = false;
                squaresLeft -= 1;
            }
            // go up
            if (iy !== 0 && squareStatus[a-m]) {
                horizontalMapElements[a] = false;
                activeSet.push(new Square(ix, iy-1, val));
                squareStatus[a-m] = false;
                squaresLeft -= 1;
            }
            // go down
            if (iy !== n-2 && squareStatus[a+m]) {
                horizontalMapElements[a+m] = false;
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
        ctx1.fillStyle = "black"
        for (var a = verticalMapElements.length - 1; a >= 0; a--) {
            // draw map on grid offset by wall thickness
            x = (a % m) * gridResolution + WW;
            y = Math.floor(a / m) * gridResolution + WW;
            if (verticalMapElements[a]) {
                ctx1.fillRect(x-WW, y-WW, 2*WW, gridResolution + 2*WW);
            }
            if (horizontalMapElements[a]) {
                ctx1.fillRect(x-WW, y-WW, gridResolution + 2*WW, 2*WW);
            }
        }
    }




    // ===================================================================== //
    // Initializing game
    // ===================================================================== //

    function startLoop() {
        // intervalLoop = window.setInterval(gameloop, 17);
        requestID = window.requestAnimationFrame(gameLoop);
    }
    function stopLoop() {
        // window.clear(intervalLoop);
        window.cancelAnimationFrame(requestID);
    }

    function startGame() {
        ctx3.clearRect(0, 0, canvas3.width, canvas3.height);
        canvas3.onclick = null;
        canvas3.onmouseover = null;
        canvas3.onmouseout = null;
        elements.push(new Tank("red", controls1), new Tank("blue", controls2));

        // Show player health
        hpDisp[0].style.visibility = "visible";
        hpDisp[1].style.visibility = "visible";

        // Set event handlers for key presses
        document.onkeydown = function (e) {
            if (e.keyCode === esc && keysDown[esc]) {
                keysDown[esc] = false;
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
    //     ctx2.clearRect(0, 0, canvas2.width, canvas2.height);
    //     updateBullets(bullets);
    //     drawBullets(bullets);
    //     for (i = tanks.length - 1; i >= 0; i--) {
    //         updateTank(tanks[i]);
    //         drawTank(tanks[i]);
    //     }
    //     if (keysDown[esc]) {
    //         ctx2.font = "40px Futura";
    //         ctx2.globalAlpha = 0.7;
    //         ctx2.fillStyle = "white";
    //         ctx2.fillRect(0, 0, canvas2.width, canvas2.height);
    //         ctx2.globalAlpha = 1;
    //         ctx2.fillStyle = "black";
    //         ctx2.fillText("Paused", canvas2.width / 2, canvas2.height / 2);
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
        ctx2.save();
        ctx2.font = "40px Futura";
        ctx2.globalAlpha = 0.7;
        ctx2.fillStyle = "white";
        ctx2.fillRect(0, 0, canvas2.width, canvas2.height);
        ctx2.globalAlpha = 1;
        ctx2.fillStyle = "black";
        ctx2.fillText("Paused", canvas2.width / 2, canvas2.height / 2);
        ctx2.restore();
        //TODO: add event listener to startLoop
    }

    //Clear canvas operation
    function clearCanvas() {
        ctx2.clearRect(0, 0, canvas2.width, canvas2.height);
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
        if (keysDown[esc]) {
            keysDown[esc] = false;
            mainMenu();
        }

        startLoop();
    }


    // ===================================================================== //
    // Game over
    // ===================================================================== //

    function endGame(winner) {
            stopLoop();
            ctx2.save();
            ctx2.font = "40px Futura";
            ctx2.globalAlpha = 0.7;
            ctx2.fillStyle = "green";
            ctx2.fillRect(0, 0, canvas2.width, canvas2.height);
            ctx2.globalAlpha = 1;
            ctx2.fillStyle = winner.color;
            ctx2.fillText(winner.color + " player wins", canvas2.width / 2, canvas2.height / 2);
            ctx2.restore();
    }

    // ctx2.webkitImageSmoothingEnabled = false;
};
