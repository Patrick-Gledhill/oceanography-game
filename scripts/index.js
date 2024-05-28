window.onerror = function (err, src, lineno, colno) {
    alert(err + " " + lineno + ":" + colno);
}

/**
 * @type { HTMLCanvasElement }
 */
var scene = document.getElementById("scene");
var ctx = scene.getContext("2d");

var vWidth = window.innerWidth;
var vHeight = window.innerHeight;

var updateIdx = 999;
var tFps = 60;

var keysDown = [];

var paused = false;

var mouse = {
    prevX: 0,
    prevY: 0,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    down: false,
    rightdown: false
}

function resizeCanvas() {
    vWidth = window.innerWidth;
    vHeight = window.innerHeight;
    scene.width = vWidth * window.devicePixelRatio;
    scene.height = vHeight * window.devicePixelRatio;
}

resizeCanvas();

// var openedMenuHierarchy = [
//     ["nothing-opened", "none"]
// ];

// function updateMenuDisplay() {
//     for (var i = 0; i < openedMenuHierarchy.length; i++) {
//         var cMenu = openedMenuHierarchy[i];

//         if (cMenu[0] === "nothing-opened") {
//             continue;
//         }

//         if (i === openedMenuHierarchy.length - 1) {
//             document.getElementById(cMenu[0]).style.display = cMenu[1];
//         } else {
//             document.getElementById(cMenu[0]).style.display = "none";
//         }
//     }
// }

// function openMenu(menuName) {
//     // debugger;
//     for (var i = 0; i < openedMenuHierarchy.length - 1; i++) {
//         var cMenu = openedMenuHierarchy[i];

//         if (cMenu[0] === menuName) {
//             var nMenu = openedMenuHierarchy.splice(i, 1);
//             openedMenuHierarchy.push(cMenu);
//             break;
//         }
//     }

//     updateMenuDisplay();
// }

// function closeTopMenu() {
//     if (openedMenuHierarchy[openedMenuHierarchy.length - 1][0] === "nothing-opened") {
//         return;
//     }

//     var wasOpened = openedMenuHierarchy.pop();
//     openedMenuHierarchy.unshift(wasOpened);
//     updateMenuDisplay();
// }

// function closeAllMenus() {
//     while (openedMenuHierarchy[openedMenuHierarchy.length - 1][0] !== "nothing-opened") {
//         closeTopMenu();
//     }
// }

// updateMenuDisplay();

function clamp(min, max, value) {
    return Math.min(Math.max(min, value), max);
}

function random(min, max) {
    return (Math.random() * (max - min)) + min;
}

function sqDistAB(a, b) {
    var dx = b.center.x - a.center.x;
    var dy = b.center.y - a.center.y;
    return dx * dx + dy * dy;
}

var degToRad = Math.PI / 180;

var radToDeg = 180 / Math.PI;

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function lerpAngle(a1, a2, t) {
    return Math.atan2(lerp(Math.sin(a1), Math.sin(a2), t), lerp(Math.cos(a1), Math.cos(a2), t));
}

function lerpVec2(v1, v2, t) {
    return new Vec2(lerp(v1.x, v2.x, t), lerp(v1.y, v2.y, t));
}

function lerpVec3(v1, v2, t) {
    return new Vec3(lerp(v1.x, v2.x, t), lerp(v1.y, v2.y, t), lerp(v1.z, v2.z, t));
}

function snapNumberToGrid(number, gridSize) {
    return Math.round(number / gridSize) * gridSize;
}

function drawGrid(context, x, y, width, height, gridCellSize = 16, options = {}) {
    context.save();
    Object.assign(context, options);
    context.beginPath();

    if (typeof gridCellSize === "number") {
        for (var lx = x; lx <= x + width; lx += gridCellSize) {
            context.moveTo(lx, y);
            context.lineTo(lx, y + height);
        }

        for (var ly = y; ly <= y + height; ly += gridCellSize) {
            context.moveTo(x, ly);
            context.lineTo(x + width, ly);
        }
    } else if (typeof gridCellSize === "object") {
        for (var lx = x; lx <= x + width; lx += gridCellSize.x) {
            context.moveTo(lx, y);
            context.lineTo(lx, y + height);
        }

        for (var ly = y; ly <= y + height; ly += gridCellSize.y) {
            context.moveTo(x, ly);
            context.lineTo(x + width, ly);
        }
    }

    context.stroke();
    context.closePath();
    context.restore();
}

function distanceToPointFromLine(point, line, givePoint = false) {
    var x0 = point.x;
    var y0 = point.y;
    var x1 = line.pointA.position.x;
    var y1 = line.pointA.position.y;
    var x2 = line.pointB.position.x;
    var y2 = line.pointB.position.y;

    // Calculate coefficients of the line equation (Ax + By + C = 0y)
    var A = y2 - y1;
    var B = x1 - x2;
    var C = x2 * y1 - x1 * y2;

    // Calculate the closest point on the line to the given point
    var xc = (B * (B * x0 - A * y0) - A * C) / (A * A + B * B);
    var yc = (A * (A * y0 - B * x0) - B * C) / (A * A + B * B);

    // Check if the closest point is within the line segment
    var d1 = Math.sqrt((xc - x1) ** 2 + (yc - y1) ** 2);
    var d2 = Math.sqrt((xc - x2) ** 2 + (yc - y2) ** 2);

    if (d1 <= Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) && d2 <= Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)) {
        // The closest point is within the line segment
        if (givePoint == true) {
            return {
                point: new Vec2(xc, yc),
                distance: Math.abs(A * x0 + B * y0 + C) / Math.sqrt(A ** 2 + B ** 2)
            }
        }
        return Math.abs(A * x0 + B * y0 + C) / Math.sqrt(A ** 2 + B ** 2);
    }

    // Calculate the distance from the point to the line segment endpoints
    var dPA = Math.sqrt((x0 - x1) ** 2 + (y0 - y1) ** 2);
    var dPB = Math.sqrt((x0 - x2) ** 2 + (y0 - y2) ** 2);

    // Choose the minimum distance
    return Math.min(dPA, dPB);
}

function pointToCircleCollisionDetection(point, circle) {
    var dx = circle.position.x - point.position.x;
    var dy = circle.position.y - point.position.y;
    var sqDist = dx * dx + dy * dy;

    if (sqDist < circle.radius * circle.radius) {
        return true;
    }

    return false;
}

function pointToStaticCircleCollisionResolution(point, circle) {
    var col = pointToCircleCollisionDetection(point, circle);

    if (col) {
        var pointDir = Math.atan2(point.position.y - circle.position.y, point.position.x - circle.position.x);

        point.position.x = circle.position.x + Math.cos(pointDir) * circle.radius;
        point.position.y = circle.position.y + Math.sin(pointDir) * circle.radius;

        return true;
    }

    return false;
}

function pointToRectangleCollisionDetection(point, rect) {
    if (point.x > rect.position.x && point.y > rect.position.y && rect.position.x + rect.width > point.x && rect.position.y + rect.height > point.y) {
        return true;
    }

    return false;
}

function rectangleToRectangleCollisionDetection(rect1, rect2) {
    if (rect1.position.x + rect1.width > rect2.position.x && rect1.position.y + rect1.height > rect2.position.y && rect2.position.x + rect2.width > rect1.position.x && rect2.position.y + rect2.height > rect1.position.y) {
        return true;
    }

    return false;
}

function rectangleToStaticRectangleCollisionResolution(rect, rectS) {
    if (rectangleToRectangleCollisionDetection(rect, rectS) == true) {
        var dx = (rect.position.x + rect.width / 2) - (rectS.position.x + rectS.width / 2);
        var dy = (rect.position.y + rect.height / 2) - (rectS.position.y + rectS.height / 2);

        if (Math.abs(dx / rectS.width) > Math.abs(dy / rectS.height)) {
            if (dx < 0) {
                rect.position.x = rectS.position.x - rect.width;
                return "l";
            } else {
                rect.position.x = rectS.position.x + rectS.width;
                return "r";
            }
        } else {
            if (dy < 0) {
                rect.position.y = rectS.position.y - rect.height;
                return "t";
            } else {
                rect.position.y = rectS.position.y + rectS.height;
                return "b";
            }
        }
    }

    return false;
}

class Vec2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    plusEquals(vector) {
        if (vector instanceof Vec2) {
            this.x += vector.x;
            this.y += vector.y;
            return;
        }

        this.x += vector;
        this.y += vector;
    }

    add(vector) {
        if (vector instanceof Vec2) {
            return new Vec2(this.x + vector.x, this.y + vector.y);
        }

        return new Vec2(this.x + vector, this.y + vector);
    }

    minusEquals(vector) {
        if (vector instanceof Vec2) {
            this.x -= vector.x;
            this.y -= vector.y;
            return;
        }

        this.x -= vector;
        this.y -= vector;
    }

    subtract(vector) {
        if (vector instanceof Vec2) {
            return new Vec2(this.x - vector.x, this.y - vector.y);
        }

        return new Vec2(this.x - vector, this.y - vector);
    }

    timesEquals(vector) {
        if (vector instanceof Vec2) {
            this.x *= vector.x;
            this.y *= vector.y;
            return;
        }

        this.x *= vector;
        this.y *= vector;
    }

    multiply(vector) {
        if (vector instanceof Vec2) {
            return new Vec2(this.x * vector.x, this.y * vector.y);
        }

        return new Vec2(this.x * vector, this.y * vector);
    }

    divideEquals(vector) {
        if (vector instanceof Vec2) {
            this.x /= vector.x;
            this.y /= vector.y;
            return;
        }

        this.x /= vector;
        this.y /= vector;
    }

    divide(vector) {
        if (vector instanceof Vec2) {
            return new Vec2(this.x / vector.x, this.y / vector.y);
        }

        return new Vec2(this.x / vector, this.y / vector);
    }

    dot(vector) {
        return (this.x * vector.x) + (this.y * vector.y);
    }

    length() {
        return Math.sqrt(this.dot(this));
    }

    normalized() {
        var mag = Math.sqrt(this.dot(this));
        return this.divide(mag);
    }

    direction() {
        return Math.atan2(this.y, this.x);
    }

    reflect(normal) {
        return this.subtract(normal.multiply(2 * this.dot(normal)));
    }
}

class Vec3 {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    plusEquals(vector) {
        if (vector instanceof Vec3) {
            this.x += vector.x;
            this.y += vector.y;
            this.z += vector.z;
            return;
        }

        this.x += vector;
        this.y += vector;
        this.z += vector;
    }

    add(vector) {
        if (vector instanceof Vec3) {
            return new Vec3(this.x + vector.x, this.y + vector.y, this.z + vector.z);
        }

        return new Vec3(this.x + vector, this.y + vector, this.z + vector.z);
    }

    minusEquals(vector) {
        if (vector instanceof Vec3) {
            this.x -= vector.x;
            this.y -= vector.y;
            this.z -= vector.z;
            return;
        }

        this.x -= vector;
        this.y -= vector;
        this.z -= vector;
    }

    subtract(vector) {
        if (vector instanceof Vec3) {
            return new Vec3(this.x - vector.x, this.y - vector.y, this.z - vector.z);
        }

        return new Vec3(this.x - vector, this.y - vector, this.z - vector);
    }

    timesEquals(vector) {
        if (vector instanceof Vec3) {
            this.x *= vector.x;
            this.y *= vector.y;
            this.z *= vector.z;
            return;
        }

        this.x *= vector;
        this.y *= vector;
        this.z *= vector;
    }

    multiply(vector) {
        if (vector instanceof Vec3) {
            return new Vec3(this.x * vector.x, this.y * vector.y, this.z * vector.z);
        }

        return new Vec3(this.x * vector, this.y * vector, this.z * vector);
    }

    divideEquals(vector) {
        if (vector instanceof Vec3) {
            this.x /= vector.x;
            this.y /= vector.y;
            this.z /= vector.z;
            return;
        }

        this.x /= vector;
        this.y /= vector;
        this.z /= vector;
    }

    divide(vector) {
        if (vector instanceof Vec3) {
            return new Vec3(this.x / vector.x, this.y / vector.y, this.z / vector.z);
        }

        return new Vec3(this.x / vector, this.y / vector, this.z / vector);
    }

    dot(vector) {
        return (this.x * vector.x) + (this.y * vector.y) + (this.z * vector.z);
    }

    length() {
        return Math.sqrt(this.dot(this));
    }

    normalized() {
        var mag = Math.sqrt(this.dot(this));
        return this.divide(mag);
    }

    // direction() {
    //     return Math.atan2(this.y, this.x);
    // }

    reflect(normal) {
        return this.subtract(normal.multiply(2 * this.dot(normal)));
    }
}

class Camera {
    constructor(x, y, viewScale) {
        this.x = x;
        this.y = y;
        this.viewScale = viewScale;
        this.traX = 0;
        this.traY = 0;
    }

    applyToCtx(context, cWidth, cHeight) {
        context.scale(this.viewScale, this.viewScale);
        context.translate(-(this.x - (cWidth / (this.viewScale * 2))), -(this.y - (cHeight / (this.viewScale * 2))));

        this.traX = -(this.x - (cWidth / (this.viewScale * 2)));
        this.traY = -(this.y - (cHeight / (this.viewScale * 2)));

        return {
            x: -(this.x - (cWidth / (this.viewScale * 2))),
            y: -(this.y - (cHeight / (this.viewScale * 2)))
        };
    }

    applyToMouse(cWidth, cHeight, mouseX, mouseY) {
        var translatedMouse = { x: mouseX, y: mouseY };
        translatedMouse.x = (mouseX + (this.x * this.viewScale) - (cWidth / 2)) / this.viewScale;
        translatedMouse.y = (mouseY + (this.y * this.viewScale) - (cHeight / 2)) / this.viewScale;

        return translatedMouse;
    }
}

var camera = new Camera(0, 0, 1);

var airFriction = 0.999;
var waterViscosity = 0.983;
var gravity = (((9.8 * 5) / 60) / 60);
var gravityDir = new Vec2(0, 1).normalized();

class Player {
    constructor(x, y, width, height) {
        this.prevPos = new Vec2(x, y);
        this.position = new Vec2(x, y);
        this.velocity = new Vec2(0, 0);
        this.width = width;
        this.height = height;
        this.acceleration = ((15 * 5) / 60) / 60;
        this.tMoveDirection = 0;
        this.moveDirection = 0;
        this.oceanZone = "Unknown";
    }

    get center() {
        return this.position.add(new Vec2(this.width / 2, this.height / 2));
    }

    get top() {
        return this.center.add(new Vec2(0, -this.height / 2));
    }

    get bottom() {
        return this.center.add(new Vec2(0, this.height / 2));
    }

    getGravityMultiplier() {
        if (this.center.y / 5 <= (this.height / 2) / 5 && this.center.y >= 0) {
            return -0.3;
        }

        // return 1;
        return clamp(0.25, 1.3, ((this.center.y / 5) / 11000) * 1.3);

        // return (Math.abs(this.position.y + 1) / 1000) ** 1.2;
    }

    update(staticObjects) {
        if (this.center.y >= 0) {
            var mult = 0;

            if (keysDown["w"]) {
                mult += 1;
            }

            if (keysDown["s"]) {
                mult -= 1;
            }

            if (keysDown["a"]) {
                this.tMoveDirection -= 2 * degToRad;
            }

            if (keysDown["d"]) {
                this.tMoveDirection += 2 * degToRad;
            }

            if (keysDown["c"]) {
                mult *= 3;
            }

            this.moveDirection = lerpAngle(this.moveDirection, this.tMoveDirection, 0.2);

            this.velocity.plusEquals(new Vec2(Math.cos(this.moveDirection) * this.acceleration * mult, Math.sin(this.moveDirection) * this.acceleration * 1.25 * mult));
        }

        if (this.center.y >= 0) {
            this.velocity.plusEquals(gravityDir.multiply(gravity * this.getGravityMultiplier()));
            this.velocity.timesEquals(waterViscosity);
        } else {
            this.velocity.timesEquals(airFriction);
            this.velocity.plusEquals(gravityDir.multiply(gravity));
        }

        var sPrevPos = this.position.add(0);

        this.position.plusEquals(this.velocity);

        this.prevPos = sPrevPos;

        if (this.bottom.y > 54500) {
            this.position.y = 54500 - this.height;
            this.velocity.x = this.velocity.x * 0.95;
            this.velocity.y = this.velocity.y * -0.1;
        }

        var oceanYPosition = this.center.y /= 5;

        if (oceanYPosition <= 200) {
            this.oceanZone = "Epipelagic Zone: 0m - 200m";
        } else if (oceanYPosition >= 200 && oceanYPosition <= 1000) {
            this.oceanZone = "Mesopelagic Zone: 200m - 1000m";
        } else if (oceanYPosition >= 1000 && oceanYPosition <= 4000) {
            this.oceanZone = "Bathypelagic Zone: 1000m - 4000m";
        } else if (oceanYPosition >= 4000 && oceanYPosition <= 6000) {
            this.oceanZone = "Abyssal Zone: 4000m - 6000m";
        } else if (oceanYPosition >= 6000 && oceanYPosition <= 11000) {
            this.oceanZone = "Hadal Zone: 6000m - 11000m";
        }
    }

    draw(context) {
        context.save();
        context.fillStyle = "#ffff00";
        context.translate(this.center.x, this.center.y);
        context.rotate(this.moveDirection);

        var dir = Math.sign(Math.cos(this.moveDirection));
        if (dir === -1) {
            context.rotate(Math.PI);
        }
        context.scale(dir, 1);

        context.save();

        context.fillStyle = "#d0d000";
        context.beginPath();
        context.rect(-this.width * 0.8, -this.height * 0.2, this.width * 0.5, this.height * 0.4);
        context.fill();
        context.closePath();

        context.fillStyle = "#ffff00";
        context.beginPath();
        context.ellipse(0, 0, this.width / 2, (this.height / 2) * 0.9, 0, -105 * degToRad, 0, true);
        context.lineTo((this.width / 2) * 0.25, -(this.height / 2) * 0.2);
        context.fill();
        context.closePath();

        context.globalCompositeOperation = "multiply";
        context.fillStyle = "#4080ff80";
        context.beginPath();
        context.ellipse(0, 0, this.width / 2, (this.height / 2) * 0.9, 0, -105 * degToRad, 0, false);
        context.lineTo((this.width / 2) * 0.25, -(this.height / 2) * 0.2);
        context.fill();
        context.closePath();

        // context.beginPath();
        // context.ellipse(0, 0, this.width / 2, (this.height / 2) * 0.9, 0, 0, 2 * Math.PI, false);
        // context.fill();
        // context.closePath();

        context.restore();

        context.fillStyle = "#808080";
        context.beginPath();
        context.rect(-this.width * 0.8, -this.height * 0.35, this.width * 0.2, this.height * 0.7);
        context.fill();
        context.closePath();
        // context.fillRect(this.position.x, this.position.y, this.width, this.height);
        context.restore();
    }
}

class Fish {
    constructor(x, y, radiusX, radiusY, swimSpeed, type) {
        this.position = new Vec2(x, y);
        var randomAngle = random(-180, 180);
        this.velocity = new Vec2(Math.cos(randomAngle) * random(0.1, 2), Math.sin(randomAngle) * random(0.1, 2));
        this.moveDirection = 0;
        this.tMoveDirection = Math.atan2(this.velocity.y, this.velocity.x);
        this.swimSpeed = swimSpeed; // ((14.7 * 5) / 60) / 60; // 15.6 gws
        this.radiusX = radiusX;
        this.radiusY = radiusY;
        this.type = type;
        this.hunger = 70;
    }

    get center() {
        return this.position;
    }

    get top() {
        return this.center.add(new Vec2(0, -this.radiusY));
    }

    get bottom() {
        return this.center.add(new Vec2(0, this.radiusY));
    }

    getGravityMultiplier() {
        // return 1;
        return clamp(-100, 1.3, ((this.center.y / 5) / 11000) * -10.3);

        // return (Math.abs(this.position.y + 1) / 1000) ** 1.2;
    }

    update(group = [], enemies = [], prey = []) {
        var moveSpeed = 1;
        if (this.hunger > 0) {
            this.hunger -= 0.01;
        }

        if (this.center.y >= 0) {
            if (this.type === "Atlantic Bluefin Tuna" || this.type === "Great White Shark") {
                if ((this.center.x / 5) > 100) {
                    this.tMoveDirection = -Math.PI;
                } else if ((this.center.x / 5) < -100) {
                    this.tMoveDirection = 0;
                } else if ((this.center.y / 5) < 10) {
                    this.tMoveDirection = new Vec2(this.center.x + this.velocity.x * 10, this.center.y + random(1, 5)).subtract(this.center).direction();
                } else if ((this.center.y / 5) > 500) {
                    this.tMoveDirection = -Math.PI / 2;
                }
            } else if (this.type === "Blue Lanternfish") {
                if ((this.center.x / 5) > 100) {
                    this.tMoveDirection = -Math.PI;
                } else if ((this.center.x / 5) < -100) {
                    this.tMoveDirection = 0;
                } else if ((this.center.y / 5) < 300) {
                    this.tMoveDirection = new Vec2(this.center.x + (this.velocity.x * 10), this.center.y + random(5, 10)).subtract(this.center).direction();
                } else if ((this.center.y / 5) > 1500) {
                    this.tMoveDirection = -Math.PI / 2;
                }
            }

            var avgPos = new Vec2(0, 0);
            var avgAngle = this.tMoveDirection;

            var numberInRange = 0;

            for (var i = 0; i < group.length; i++) {
                var other = group[i];

                if (this === other) {
                    continue;
                }

                if (Math.sqrt(sqDistAB(other, this)) < 40) {
                    var dv = other.center.subtract(this.center);
                    var idv = other.center.subtract(this.center).multiply(-1);
                    var nAngle = idv.normalized();

                    // this.velocity.x += nAngle.x * 0.04;
                    // this.velocity.y += nAngle.y * 0.04;

                    this.tMoveDirection = lerpAngle(this.tMoveDirection, idv.direction(), 0.1);

                    avgPos.x += dv.x;
                    avgPos.y += dv.y;

                    numberInRange++;
                    // avgAngle += other.tMoveDirection;
                    avgAngle = lerpAngle(avgAngle, other.tMoveDirection, 0.05);
                }
            }

            if (numberInRange > 0) {
                avgPos.divideEquals(numberInRange);
                // avgAngle /= other.tMoveDirection;

                // avgPos.plusEquals(new Vec2(Math.cos(avgAngle) * 5, Math.sin(avgAngle) * 5));

                // this.velocity.plusEquals(avgPos.multiply(0.01));

                this.tMoveDirection = lerpAngle(this.tMoveDirection, avgPos.direction(), 0.35);

                this.tMoveDirection = lerpAngle(this.tMoveDirection, avgAngle, 0.7);

                if (Math.random() < 0.05) {
                    this.tMoveDirection += random(-30, 30) * degToRad;
                    moveSpeed = 0.7;
                }
            } else if (Math.random() < 0.05) {
                this.tMoveDirection += random(-20, 20) * degToRad;
                moveSpeed = 0.7;
            }

            for (var i = 0; i < enemies.length; i++) {
                var enemy = enemies[i];

                if (Math.sqrt(sqDistAB(enemy, this)) < 60) {
                    this.tMoveDirection = lerpAngle(this.tMoveDirection, this.center.subtract(enemy.center).direction(), 0.5);
                }
            }

            if (this.hunger <= 90) {
                var closestDist = Infinity;
                var closest = null;

                for (var i = 0; i < prey.length; i++) {
                    var other = prey[i];
                    var dist = Math.sqrt(sqDistAB(this, other));

                    if ((dist < 200 || closest == null) && dist < closestDist) {
                        closest = other;
                        closestDist = dist;
                    }
                }

                if (closest != null) {
                    this.tMoveDirection = lerpAngle(this.tMoveDirection, closest.center.add(closest.velocity).subtract(this.center).direction(), 0.5);

                    if (closestDist < 10) {
                        prey.splice(prey.indexOf(closest, 0), 1);
                        this.hunger += 10;
                    }

                    moveSpeed = 1.1;
                }
            }

            this.moveDirection = lerpAngle(this.moveDirection, this.tMoveDirection, 0.2);

            this.velocity.x += Math.cos(this.moveDirection) * this.swimSpeed * moveSpeed;
            this.velocity.y += Math.sin(this.moveDirection) * this.swimSpeed * moveSpeed;

            this.velocity.plusEquals(gravityDir.multiply(gravity * this.getGravityMultiplier()));
            this.velocity.timesEquals(waterViscosity);
        } else {
            this.velocity.timesEquals(airFriction);
            this.velocity.plusEquals(gravityDir.multiply(gravity));
        }

        this.position.plusEquals(this.velocity);
    }

    draw(context) {
        context.save();
        // var smallerSize = Math.min(this.radiusX, this.radiusY);

        if (this.type === "Atlantic Bluefin Tuna") {
            context.translate(this.position.x, this.position.y);
            var dir = Math.sign(Math.cos(this.moveDirection));
            context.rotate(this.moveDirection);
            if (dir === -1) {
                context.rotate(Math.PI);
            }
            context.scale(dir, 1);
            context.fillStyle = "#707040bf";
            context.save();
            context.translate(this.radiusX * 0.05, -this.radiusY);
            context.rotate(-22 * degToRad);
            context.fillRect(-this.radiusX / 4, -this.radiusY / 4, this.radiusX / 2, this.radiusY * 0.6);
            context.restore();

            context.save();
            context.translate(this.radiusX * 0.05, this.radiusY);
            context.rotate(22 * degToRad);
            context.fillRect(-this.radiusX * 0.05, -this.radiusY / 4, this.radiusX / 6, this.radiusY * 0.6);
            context.restore();

            var grad = context.createLinearGradient(0, -this.radiusY, 0, this.radiusY);
            grad.addColorStop(0.2, "#051035");
            grad.addColorStop(0.95, "#d8ffe8");
            context.fillStyle = grad;
            context.strokeStyle = this.bc;
            context.beginPath();
            context.ellipse(0, 0, this.radiusX, this.radiusY, 0, 0, 2 * Math.PI, false);
            context.fill();
            context.closePath();

            context.fillStyle = "#8090a0";
            context.beginPath();
            context.ellipse(this.radiusX * 0.7, -this.radiusY * 0.14, this.radiusX * 0.06, this.radiusY * 0.14, 0, 0, 2 * Math.PI, false);
            context.fill();
            context.closePath();

            context.fillStyle = "#201507";
            context.beginPath();
            context.ellipse(this.radiusX * 0.01, -this.radiusY * 0.1, this.radiusX * 0.2, this.radiusY * 0.2, 0, 0, 2 * Math.PI, false);
            context.fill();
            context.closePath();

            context.fillStyle = "#000000";
            context.beginPath();
            context.ellipse(this.radiusX * 0.7, -this.radiusY * 0.14, this.radiusX * 0.04, this.radiusY * 0.1, 0, 0, 2 * Math.PI, false);
            context.fill();
            context.closePath();

            context.save();

            context.fillStyle = "#454530";
            context.beginPath();
            context.ellipse(-this.radiusX * 1.55, 0, this.radiusX * 0.6, this.radiusY * 1.25, 0, -60 * degToRad, 60 * degToRad, false);
            context.lineTo(-this.radiusX * 1.1, 0);
            context.fill();
            context.closePath();

            context.strokeStyle = "#203040";
            context.lineWidth = Math.min(this.radiusX, this.radiusY) * 0.05;
            context.beginPath();
            context.moveTo(this.radiusX * 0.8, this.radiusY * 0.15);
            context.lineTo(this.radiusX * 0.99, -this.radiusY * 0.05);
            context.moveTo(this.radiusX * 0.8, this.radiusY * 0.15);
            context.lineTo(this.radiusX * 0.98, this.radiusY * 0.15);
            context.stroke();
            context.closePath();

            context.strokeStyle = "#353520";
            context.lineWidth = Math.min(this.radiusX, this.radiusY) * 0.15;
            context.beginPath();
            context.moveTo(-this.radiusX * 0.25, -this.radiusY);
            context.quadraticCurveTo(-this.radiusX * 0.375, -this.radiusY * 1.3, -this.radiusX * 0.5, -this.radiusY * 1.3);
            context.stroke();
            context.closePath();

            context.lineWidth = Math.min(this.radiusX, this.radiusY) * 0.1;
            context.beginPath();
            context.moveTo(-this.radiusX * 0.25, this.radiusY);
            context.quadraticCurveTo(-this.radiusX * 0.375, this.radiusY * 1.3, -this.radiusX * 0.5, this.radiusY * 1.4);
            context.stroke();
            context.closePath();

            // context.beginPath();
            // context.arc(-this.radiusX * 1.4, 0, this.radiusY * 1.2, 0, 2 * Math.PI, false);
            // context.fill();
            // context.closePath();

            context.restore();
        } else if (this.type === "Great White Shark") {
            context.translate(this.position.x, this.position.y);
            var dir = Math.sign(Math.cos(this.moveDirection));
            context.rotate(this.moveDirection);
            if (dir === -1) {
                context.rotate(Math.PI);
            }
            context.scale(dir, 1);

            context.lineWidth = Math.min(this.radiusX, this.radiusY) * 0.05;
            context.fillStyle = "#404040";
            context.beginPath();
            context.moveTo(0, -this.radiusY);
            context.quadraticCurveTo(this.radiusX * 0.1, -this.radiusY * 1.3, -this.radiusY * 1.2, 0);
            context.stroke();
            context.closePath();

            context.save();
            context.translate(this.radiusX * 0.05, this.radiusY);
            context.rotate(22 * degToRad);
            context.fillRect(-this.radiusX * 0.05, -this.radiusY / 4, this.radiusX / 6, this.radiusY * 0.6);
            context.restore();

            var grad = context.createLinearGradient(0, -this.radiusY, 0, this.radiusY);
            grad.addColorStop(0.6, "#404040");
            grad.addColorStop(0.85, "#f0f0f0");
            context.fillStyle = grad;
            context.strokeStyle = this.bc;
            context.beginPath();
            context.ellipse(0, 0, this.radiusX, this.radiusY, 0, 0, 2 * Math.PI, false);
            context.fill();
            context.closePath();

            context.fillStyle = "#000000";
            context.beginPath();
            context.ellipse(this.radiusX * 0.7, -this.radiusY * 0.14, this.radiusX * 0.04, this.radiusY * 0.1, 0, 0, 2 * Math.PI, false);
            context.fill();
            context.closePath();

            context.save();

            context.fillStyle = "#404040";
            context.beginPath();
            context.ellipse(-this.radiusX * 1.75, -this.radiusY * 0.1, this.radiusX * 0.9, this.radiusY * 1.5, 0, -60 * degToRad, 60 * degToRad, false);
            context.lineTo(-this.radiusX * 1.1, 0);
            context.fill();
            context.closePath();

            context.strokeStyle = "#203040";
            context.lineWidth = Math.min(this.radiusX, this.radiusY) * 0.05;
            context.beginPath();
            context.moveTo(this.radiusX * 0.8, this.radiusY * 0.15);
            context.lineTo(this.radiusX * 0.99, -this.radiusY * 0.05);
            context.moveTo(this.radiusX * 0.8, this.radiusY * 0.15);
            context.lineTo(this.radiusX * 0.98, this.radiusY * 0.15);
            context.stroke();
            context.closePath();

            // context.beginPath();
            // context.arc(-this.radiusX * 1.4, 0, this.radiusY * 1.2, 0, 2 * Math.PI, false);
            // context.fill();
            // context.closePath();

            context.restore();
        } else if (this.type === "Blue Lanternfish") {
            context.translate(this.position.x, this.position.y);
            var dir = Math.sign(Math.cos(this.moveDirection));
            context.rotate(this.moveDirection);
            if (dir === -1) {
                context.rotate(Math.PI);
            }
            context.scale(dir, 1);

            var grad = context.createLinearGradient(0, -this.radiusY, 0, this.radiusY);
            grad.addColorStop(0, "#201510");
            grad.addColorStop(0.6, "#d0d0d0");
            context.fillStyle = grad;
            context.strokeStyle = this.bc;
            context.beginPath();
            context.ellipse(0, 0, this.radiusX, this.radiusY, 0, 0, 2 * Math.PI, false);
            context.fill();
            context.closePath();

            context.fillStyle = "#ffffff";
            context.beginPath();
            context.ellipse(this.radiusX * 0.7, -this.radiusY * 0.14, this.radiusX * 0.15, this.radiusY * 0.4, 0, 0, 2 * Math.PI, false);
            context.fill();
            context.closePath();

            context.fillStyle = "#000000";
            context.beginPath();
            context.ellipse(this.radiusX * 0.7, -this.radiusY * 0.14, this.radiusX * 0.075, this.radiusY * 0.2, 0, 0, 2 * Math.PI, false);
            context.fill();
            context.closePath();

            context.save();

            context.fillStyle = "#454530";
            context.beginPath();
            context.ellipse(-this.radiusX * 1.55, 0, this.radiusX * 0.6, this.radiusY * 1.25, 0, -60 * degToRad, 60 * degToRad, false);
            context.lineTo(-this.radiusX * 1.1, 0);
            context.fill();
            context.closePath();

            // context.beginPath();
            // context.arc(-this.radiusX * 1.4, 0, this.radiusY * 1.2, 0, 2 * Math.PI, false);
            // context.fill();
            // context.closePath();

            context.restore();
        }

        context.restore();
    }
}

var player = new Player(-17.5, 50 * 5, 35, 35);

var blueFinTuna = [];
var greatWhiteSharks = [];
var lanternFish = [];

for (var i = 0; i < 50; i++) {
    var randAngle = random(-180, 180) * degToRad;
    var scale = random(0.9, 1.1);
    blueFinTuna.push(new Fish(Math.cos(randAngle) * random(0, 50), 300 + Math.sin(randAngle) * random(0, 50), 6.25 * scale, 2.25 * scale, ((14.7 * 5) / 60) / 60, "Atlantic Bluefin Tuna"));
}

for (var i = 0; i < 3; i++) {
    var randAngle = random(-180, 180) * degToRad;
    var scale = random(0.9, 1.3);
    greatWhiteSharks.push(new Fish(Math.cos(randAngle) * random(0, 50), 500 + Math.sin(randAngle) * random(0, 50), 9.9 * scale, 3 * scale, ((15.6 * 5) / 60) / 60, "Great White Shark"));
}

for (var i = 0; i < 25; i++) {
    var randAngle = random(-180, 180) * degToRad;
    var scale = random(1, 1.3);
    lanternFish.push(new Fish(Math.cos(randAngle) * random(0, 50), (350 * 5) + Math.sin(randAngle) * random(0, 50), 1.7 * scale, 0.575 * scale, ((16 * 5) / 60) / 60, "Blue Lanternfish"));
}
// var testF = new Fish(0, -64, 6.25 * 10, 2.25 * 10, "Atlantic Bluefin Tuna");

var skyColor = new Vec3(0.5, 0.7, 1);
// var lightColor = new Vec3(0.8, 0.8, 0.8);

camera.viewScale = 1;

function main() {
    if (paused == false) {
        if (camera.viewScale < 0.75) {
            camera.viewScale = 0.75;
        }

        if (camera.viewScale > 8) {
            camera.viewScale = 8;
        }

        player.update();

        for (var i = 0; i < blueFinTuna.length; i++) {
            var tuna = blueFinTuna[i];

            tuna.update(blueFinTuna, [player, ...greatWhiteSharks]);
        }

        for (var i = 0; i < greatWhiteSharks.length; i++) {
            var shark = greatWhiteSharks[i];

            shark.update(greatWhiteSharks, [player], blueFinTuna);
        }

        for (var i = 0; i < lanternFish.length; i++) {
            var lFish = lanternFish[i];

            lFish.update(lFish, [player]);
        }

        mouse.x += player.position.x - player.prevPos.x;
        mouse.y += player.position.y - player.prevPos.y;

        // alert(player.velocity.y)
        // alert(player.position.y - player.prevPos.y);

        var offMX = mouse.x - player.center.x;
        var offMY = mouse.y - player.center.y;

        var length = clamp(0, 5, new Vec2(offMX, offMY).length() / 128);
        var mouseAngle = Math.atan2(offMY, offMX);
        camera.x = lerp(camera.x, player.center.x + (Math.cos(mouseAngle) * 32 * length) * 2, 0.2);
        camera.y = lerp(camera.y, player.center.y + (Math.sin(mouseAngle) * 32 * length) * 2, 0.2);

        // camera.x = player.position.x + player.width / 2;
        // camera.y = player.position.y + player.height / 2;

    }

    ctx.save();
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.clearRect(0, 0, vWidth, vHeight);
    ctx.fillStyle = "rgb(" + Math.round(skyColor.x * 255) + ", " + Math.round(skyColor.y * 255) + ", " + Math.round(skyColor.z * 255) + ")"; // 80b3ff
    ctx.fillRect(0, 0, vWidth, vHeight);
    camera.applyToCtx(ctx, vWidth, vHeight);

    for (var i = 0; i < blueFinTuna.length; i++) {
        var tuna = blueFinTuna[i];

        tuna.draw(ctx);
    }

    for (var i = 0; i < greatWhiteSharks.length; i++) {
        var shark = greatWhiteSharks[i];

        shark.draw(ctx);
    }

    for (var i = 0; i < lanternFish.length; i++) {
        var lFish = lanternFish[i];

        lFish.draw(ctx);
    }

    player.draw(ctx);

    // ctx.lineWidth = 1 / camera.viewScale;
    // ctx.strokeStyle = "#ff0000";
    // ctx.beginPath();
    // ctx.arc(0, 0, boidsRadius, 0, 2 * Math.PI, false);
    // ctx.stroke();
    // ctx.closePath();

    ctx.fillStyle = "#ffbf80";
    ctx.beginPath();
    ctx.moveTo(-175 * 5, 6 * 5);
    ctx.quadraticCurveTo(-125 * 5, 6 * 5, -125 * 5, 200 * 5);
    ctx.lineTo(-100 * 5, 1000 * 5);
    ctx.lineTo(-80 * 5, 4000 * 5);
    ctx.lineTo(-75 * 5, 6000 * 5);
    ctx.lineTo(2 * 5, 11000 * 5);
    ctx.lineTo(-1000 * 5, 11000 * 5);
    ctx.lineTo(-1000 * 5, 0);
    ctx.lineTo(-225 * 5, 0);
    ctx.fill();
    // ctx.stroke();
    ctx.closePath();

    // ctx.beginPath();
    // ctx.moveTo(175 * 5, 6 * 5);
    // ctx.quadraticCurveTo(125 * 5, 6 * 5, 125 * 5, 200 * 5);
    // ctx.lineTo(100 * 5, 1000 * 5);
    // ctx.lineTo(80 * 5, 4000 * 5);
    // ctx.lineTo(75 * 5, 6000 * 5);
    // ctx.lineTo(-2 * 5, 11000 * 5);
    // ctx.lineTo(1000 * 5, 11000 * 5);
    // ctx.lineTo(1000 * 5, 0);
    // ctx.lineTo(225 * 5, 0);
    // ctx.fill();
    // // ctx.stroke();
    // ctx.closePath();

    ctx.fillRect(camera.x - (vWidth / 2) / camera.viewScale, 54500, vWidth / camera.viewScale, 500);

    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    // var waterGrad = ctx.createLinearGradient(0, 0, 0, 11000 * 5);
    // waterGrad.addColorStop(0, "rgba(" + Math.round(skyColor.x * 0.1 * 255) + ", " + Math.round(skyColor.y * 0.7 * 255) + ", " + Math.round(skyColor.z * 0.8 * 255) + ", " + "0.6)");
    // waterGrad.addColorStop(1 / 55, "rgba(0, " + Math.round(skyColor.y * 0.1 * 255) + ", " + Math.round(skyColor.z * 0.2 * 255) + ", " + "0.7)");
    // waterGrad.addColorStop(1 / 11, "rgba(0, " + Math.round(skyColor.y * 0.01 * 255) + ", " + Math.round(skyColor.z * 0.05 * 255) + ", " + "0.8)");
    // waterGrad.addColorStop(4 / 11, "rgba(0, 0, " + Math.round(skyColor.z * 0.01 * 255) + ", " + "0.9)");
    // waterGrad.addColorStop(6 / 11, "rgba(0, 0, " + Math.round(skyColor.z * 0.005 * 255) + ", " + "0.925)");
    // waterGrad.addColorStop(1, "rgba(0, 0, " + Math.round(skyColor.z * 0.0025 * 255) + ", " + "0.95)");
    ctx.fillStyle = "rgba(" + Math.round(skyColor.x * 0.5 * 255) + ", " + Math.round(skyColor.y * 0.85 * 255) + ", " + Math.round(skyColor.z * 0.95 * 255) + ", 0.5)";
    ctx.fillRect(camera.x - (vWidth / 2) / camera.viewScale, 0, vWidth / camera.viewScale, 11000 * 5);
    ctx.restore();

    ctx.save();
    var offScreenCanvas = document.createElement("canvas");
    var oCtx = offScreenCanvas.getContext("2d");

    offScreenCanvas.width = vWidth * window.devicePixelRatio;
    offScreenCanvas.height = vHeight * window.devicePixelRatio;

    oCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
    oCtx.lineWidth = 2;
    oCtx.lineCap = "round";
    oCtx.lineJoin = "round";
    oCtx.clearRect(0, 0, vWidth, vHeight);
    camera.applyToCtx(oCtx, vWidth, vHeight);

    // oCtx.globalCompositeOperation = "multiply";
    var waterAbsorptionOverlay = oCtx.createLinearGradient(0, 0, 0, 11000 * 5);
    waterAbsorptionOverlay.addColorStop(0, "#ffffff");
    waterAbsorptionOverlay.addColorStop(1 / 110, "#707070");
    // waterAbsorptionOverlay.addColorStop(1 / 82, "#252525");
    waterAbsorptionOverlay.addColorStop(1 / 55, "#202020");
    waterAbsorptionOverlay.addColorStop(1 / 11, "#101010");
    waterAbsorptionOverlay.addColorStop(4 / 11, "#050505");
    waterAbsorptionOverlay.addColorStop(6 / 11, "#000000");
    // waterAbsorptionOverlay.addColorStop(1, "#000000");
    oCtx.fillStyle = waterAbsorptionOverlay;
    oCtx.fillRect(camera.x - (vWidth / 2) / camera.viewScale, 0, vWidth / camera.viewScale, 12000 * 5);

    if (player.center.y / 5 >= 100) {
        oCtx.globalCompositeOperation = "destination-out";
        var lightGrad = oCtx.createRadialGradient(player.center.x, player.center.y, 0 * 5, player.center.x, player.center.y, 50 * 5);
        lightGrad.addColorStop(0.1, "#ffffff");
        // lightGrad.addColorStop(0.25, "#80bfff40");
        // lightGrad.addColorStop(0.5, "#80bfff10");
        // lightGrad.addColorStop(0.75, "#80bfff02");
        lightGrad.addColorStop(1, "#00000000");
        oCtx.fillStyle = lightGrad;
        oCtx.beginPath();
        oCtx.rect(camera.x - (vWidth / 2) / camera.viewScale, 0, vWidth / camera.viewScale, 12000 * 5);
        oCtx.fill();
        oCtx.closePath();

        for (var i = 0; i < lanternFish.length; i++) {
            var lFish = lanternFish[i];

            if (pointToRectangleCollisionDetection(lFish.center, { position: { x: camera.x - (vWidth / 2) / camera.viewScale, y: camera.y - (vHeight / 2) / camera.viewScale }, width: vWidth / camera.viewScale, height: vHeight / camera.viewScale })) {
                var lightGradF = oCtx.createRadialGradient(lFish.center.x, lFish.center.y, 0 * 5, lFish.center.x, lFish.center.y, 2 * 5);
                lightGradF.addColorStop(0.1, "#ffffff");
                // lightGrad.addColorStop(0.25, "#80bfff40");
                // lightGrad.addColorStop(0.5, "#80bfff10");
                // lightGrad.addColorStop(0.75, "#80bfff02");
                lightGradF.addColorStop(1, "#00000000");
                oCtx.fillStyle = lightGradF;
                oCtx.beginPath();
                oCtx.rect(camera.x - (vWidth / 2) / camera.viewScale, 0, vWidth / camera.viewScale, 12000 * 5);
                oCtx.fill();
                oCtx.closePath();
            }
        }
    }

    ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(offScreenCanvas, camera.x - (vWidth / 2) / camera.viewScale, camera.y - (vHeight / 2) / camera.viewScale, vWidth / camera.viewScale, vHeight / camera.viewScale);
    ctx.restore();

    // ctx.save();
    // ctx.globalAlpha = clamp(0, 500, player.center.y / 5) / 500;
    // ctx.globalCompositeOperation = "multiply";
    // var vignette = ctx.createRadialGradient(player.center.x, player.center.y, 0, player.center.x, player.center.y, 10 * 5);
    // vignette.addColorStop(0, "rgba(255, 255, 255, 1)");
    // vignette.addColorStop(1, "rgba(0, 0, 0, 1)");
    // ctx.fillStyle = vignette;
    // ctx.beginPath();
    // ctx.rect(camera.x - (vWidth / 2) / camera.viewScale, 0, vWidth / camera.viewScale, 55000);
    // ctx.fill();
    // ctx.closePath();
    // ctx.restore();

    ctx.textBaseline = "top";
    ctx.textAlign = "center";
    ctx.font = "bold " + 6 + "px arial";
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#000000";

    for (var i = 0; i < blueFinTuna.length; i++) {
        var tuna = blueFinTuna[i];

        var dist = new Vec2(tuna.center.x - mouse.x, tuna.center.y - mouse.y).length();

        if (dist <= Math.max(tuna.radiusX, tuna.radiusY) * 0.6) {
            ctx.font = "bold " + clamp(2, 100, Math.round(tuna.radiusX * 0.96)) + "px arial";

            ctx.fillText(tuna.type, tuna.center.x, Math.round((tuna.center.y - tuna.radiusY * 7) - 1));

            if (tuna.radiusX / 5 < 1) {
                ctx.fillText("Length: " + ((tuna.radiusX / 5) * 100).toFixed(2) + "cm", tuna.center.x, Math.round(tuna.center.y - tuna.radiusY * 4.5));
            } else {
                ctx.fillText("Length: " + (tuna.radiusX / 5).toFixed(2) + "m", tuna.center.x, Math.round(tuna.center.y - tuna.radiusY * 4.5));
            }

            break;
        }
    }

    for (var i = 0; i < greatWhiteSharks.length; i++) {
        var shark = greatWhiteSharks[i];

        var dist = new Vec2(shark.center.x - mouse.x, shark.center.y - mouse.y).length();

        if (dist <= Math.max(shark.radiusX, shark.radiusY) * 0.6) {
            ctx.font = "bold " + clamp(2, 100, Math.round(shark.radiusX * 0.96)) + "px arial";

            ctx.fillText(shark.type, shark.center.x, Math.round((shark.center.y - shark.radiusY * 7) - 1));

            if (shark.radiusX / 5 < 1) {
                ctx.fillText("Length: " + ((shark.radiusX / 5) * 100).toFixed(2) + "cm", shark.center.x, Math.round(shark.center.y - shark.radiusY * 4.5));
            } else {
                ctx.fillText("Length: " + (shark.radiusX / 5).toFixed(2) + "m", shark.center.x, Math.round(shark.center.y - shark.radiusY * 4.5));
            }

            break;
        }
    }

    for (var i = 0; i < lanternFish.length; i++) {
        var lFish = lanternFish[i];

        var dist = new Vec2(lFish.center.x - mouse.x, lFish.center.y - mouse.y).length();

        if (dist <= Math.max(lFish.radiusX, lFish.radiusY) * 1.2) {
            ctx.font = "bold " + clamp(2, 100, Math.round(lFish.radiusX * 0.96)) + "px arial";

            ctx.fillText(lFish.type, lFish.center.x, Math.round((lFish.center.y - lFish.radiusY * 7) - 1));

            if (lFish.radiusX / 5 < 1) {
                ctx.fillText("Length: " + ((lFish.radiusX / 5) * 100).toFixed(2) + "cm", lFish.center.x, Math.round(lFish.center.y - lFish.radiusY * 4.5));
            } else {
                ctx.fillText("Length: " + (lFish.radiusX / 5).toFixed(2) + "m", lFish.center.x, Math.round(lFish.center.y - lFish.radiusY * 4.5));
            }

            break;
        }
    }

    ctx.restore();

    ctx.save();
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.lineWidth = 1;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.textBaseline = "top";
    ctx.textAlign = "center";
    ctx.font = "bold 16px arial";
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#000000";

    ctx.strokeText("Current Zone: " + player.oceanZone, vWidth / 2, 8);
    ctx.fillText("Current Zone: " + player.oceanZone, vWidth / 2, 8);
    ctx.textAlign = "right";
    ctx.strokeText("Current Depth: " + Math.trunc(player.center.y / 5) + "m", vWidth - 8, 8);
    ctx.fillText("Current Depth: " + Math.trunc(player.center.y / 5) + "m", vWidth - 8, 8);
    ctx.strokeText("Velocity: " + ((player.velocity.length() / 5) * 60).toFixed(1) + "m/s", vWidth - 8, 24);
    ctx.fillText("Velocity: " + ((player.velocity.length() / 5) * 60).toFixed(1) + "m/s", vWidth - 8, 24);

    ctx.textAlign = "left";
    ctx.strokeText("Length of 10m: ", 8, 8);
    ctx.fillText("Length of 10m: ", 8, 8);

    if (player.oceanZone === "Epipelagic Zone: 0m - 200m") {
        document.getElementById("zone-desc").innerText = "The epipelagic zone (or upper open ocean) is the part of the ocean where there is enough sunlight for algae to utilize photosynthesis (the process by which organisms use sunlight to convert carbon dioxide into food). Generally speaking, this zone reaches from the sea surface down to approximately 200 m (650 feet).";
    } else if (player.oceanZone === "Mesopelagic Zone: 200m - 1000m") {
        document.getElementById("zone-desc").innerText = "A layer of the oceanic zone lying beneath the epipelagic zone and above the bathypelagic zone , at depths generally between 200 and 1,000 m (656 and 3,280 ft). The mesopelagic zone receives very little sunlight and is home to many bioluminescent organisms. This zone includes lanternfish and snipe eels.";
    } else if (player.oceanZone === "Bathypelagic Zone: 1000m - 4000m") {
        document.getElementById("zone-desc").innerText = "The bathypelagic zone or bathyal zone is the part of the open ocean that extends from a depth of 1,000 to 4,000 m below the ocean surface. It lies between the mesopelagic above and the abyssopelagic below. This zone includes Dumbo Octopuses mollusks.";
    } else if (player.oceanZone === "Abyssal Zone: 4000m - 6000m") {
        document.getElementById("zone-desc").innerText = "The abyssal zone or abyssopelagic zone is a layer of the pelagic zone of the ocean. At depths of 4,000 - 6,000 m, this zone remains in perpetual darkness. This zone includes chemosynthetic bacteria and fish dark or transparent in color.";
    } else if (player.oceanZone === "Hadal Zone: 6000m - 11000m") {
        document.getElementById("zone-desc").innerText = "The region extending from 6,000 to 11,000 meters is called the hadal, or hadalpelagic, zone after Hades, the Greek god of the underworld. This zone occurs only in trenches. This zone includes the Hadal Snailfish and bristle worms";
    }

    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#000000";
    ctx.beginPath();
    ctx.rect(8, 32, 4, 50 * camera.viewScale);
    ctx.fill();
    // ctx.stroke();
    ctx.closePath();
    // ctx.strokeText("Current Ocean Depth Zone: " + player.oceanZone, vWidth / 2, 8);

    ctx.restore();

    mouse.vx = 0;
    mouse.vy = 0;
    mouse.prevX = mouse.x;
    mouse.prevY = mouse.y;
}

window.onload = function () {
    updateIdx = setInterval(main, 1000 / tFps);
}

window.addEventListener("resize", resizeCanvas);

scene.addEventListener("wheel", (e) => {
    if (e.deltaY < 0) {
        camera.viewScale /= 0.96;
    } else {
        camera.viewScale *= 0.96;
    }
});

window.addEventListener("keydown", (e) => {
    keysDown[e.key] = true;
    e.preventDefault();
});

window.addEventListener("keyup", (e) => {
    keysDown[e.key] = false;
});

window.addEventListener("contextmenu", (e) => {
    e.preventDefault();
});

window.addEventListener("mousedown", (e) => {
    if (e.button === 0) {
        mouse.down = true;
    }

    if (e.button === 2) {
        mouse.rightdown = true;
    }

    var mpx = mouse.x;
    var mpy = mouse.y;
    var mousePos = camera.applyToMouse(vWidth, vHeight, e.clientX, e.clientY);
    mouse.x = mousePos.x;
    mouse.y = mousePos.y;
    mouse.prevX = mpx;
    mouse.prevY = mpy;
});

window.addEventListener("mousemove", (e) => {
    var mpx = mouse.x;
    var mpy = mouse.y;
    var mousePos = camera.applyToMouse(vWidth, vHeight, e.clientX, e.clientY);
    mouse.x = mousePos.x;
    mouse.y = mousePos.y;
    mouse.vx = mouse.x - mpx;
    mouse.vy = mouse.y - mpy;
    mouse.prevX = mpx;
    mouse.prevY = mpy;
});

window.addEventListener("mouseup", () => {
    mouse.down = false;
    mouse.rightdown = false;
});
