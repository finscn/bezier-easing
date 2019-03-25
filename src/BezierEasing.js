var BezierEasing;

(function() {
    /*
     options :
        // TODO
    */
    BezierEasing = function(startPoint, endPoint, options) {

        this.startPoint = startPoint || [0, 0];
        this.endPoint = endPoint || [1, 1];

        this.ratioX = this.endPoint[0] - this.startPoint[0];
        this.ratioY = this.endPoint[1] - this.startPoint[1];

        this.controlPoints = [
            [0, 0],
            [1, 1],
        ];
    }

    BezierEasing.prototype.setControlPoints = function(a, b) {
        var cps = this.controlPoints;
        if (a) {
            cps[0][0] = a[0];
            cps[0][1] = a[1];
        }
        if (b) {
            cps[0][0] = b[0];
            cps[0][1] = b[1];
        }

        var orig = this.startPoint;

        var mX1 = (a[0] - orig[0]) / this.ratioX;
        var mY1 = (a[1] - orig[1]) / this.ratioY;
        var mX2 = (b[0] - orig[0]) / this.ratioX;
        var mY2 = (b[1] - orig[1]) / this.ratioY;

        this.bezierFn = bezier(mX1, mY1, mX2, mY2);
    }

    BezierEasing.prototype.get = function(x) {
        if (!this.bezierFn) {
            return x;
        }
        x = (x - this.startPoint[0]) / this.ratioX;
        var y = this.bezierFn(x);
        y = y * this.ratioY + this.startPoint[1];
        return y;
    }

    ////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////

    var NEWTON_ITERATIONS = 4;
    var NEWTON_MIN_SLOPE = 0.001;
    var SUBDIVISION_PRECISION = 0.0000001;
    var SUBDIVISION_MAX_ITERATIONS = 10;

    var kSplineTableSize = 11;
    var kSampleStepSize = 1.0 / (kSplineTableSize - 1.0);

    var float32ArraySupported = typeof Float32Array === 'function';

    function A(aA1, aA2) { return 1.0 - 3.0 * aA2 + 3.0 * aA1; }

    function B(aA1, aA2) { return 3.0 * aA2 - 6.0 * aA1; }

    function C(aA1) { return 3.0 * aA1; }

    // Returns x(t) given t, x1, and x2, or y(t) given t, y1, and y2.
    function calcBezier(aT, aA1, aA2) { return ((A(aA1, aA2) * aT + B(aA1, aA2)) * aT + C(aA1)) * aT; }

    // Returns dx/dt given t, x1, and x2, or dy/dt given t, y1, and y2.
    function getSlope(aT, aA1, aA2) { return 3.0 * A(aA1, aA2) * aT * aT + 2.0 * B(aA1, aA2) * aT + C(aA1); }

    function binarySubdivide(aX, aA, aB, mX1, mX2) {
        var currentX, currentT, i = 0;
        do {
            currentT = aA + (aB - aA) / 2.0;
            currentX = calcBezier(currentT, mX1, mX2) - aX;
            if (currentX > 0.0) {
                aB = currentT;
            } else {
                aA = currentT;
            }
        } while (Math.abs(currentX) > SUBDIVISION_PRECISION && ++i < SUBDIVISION_MAX_ITERATIONS);
        return currentT;
    }

    function newtonRaphsonIterate(aX, aGuessT, mX1, mX2) {
        for (var i = 0; i < NEWTON_ITERATIONS; ++i) {
            var currentSlope = getSlope(aGuessT, mX1, mX2);
            if (currentSlope === 0.0) {
                return aGuessT;
            }
            var currentX = calcBezier(aGuessT, mX1, mX2) - aX;
            aGuessT -= currentX / currentSlope;
        }
        return aGuessT;
    }

    function LinearEasing(x) {
        return x;
    }

    function bezier(mX1, mY1, mX2, mY2) {
        if (!(0 <= mX1 && mX1 <= 1 && 0 <= mX2 && mX2 <= 1)) {
            throw new Error('bezier x values must be in [0, 1] range');
        }

        if (mX1 === mY1 && mX2 === mY2) {
            return LinearEasing;
        }

        // Precompute samples table
        var sampleValues = float32ArraySupported ? new Float32Array(kSplineTableSize) : new Array(kSplineTableSize);
        for (var i = 0; i < kSplineTableSize; ++i) {
            sampleValues[i] = calcBezier(i * kSampleStepSize, mX1, mX2);
        }

        function getTForX(aX) {
            var intervalStart = 0.0;
            var currentSample = 1;
            var lastSample = kSplineTableSize - 1;

            for (; currentSample !== lastSample && sampleValues[currentSample] <= aX; ++currentSample) {
                intervalStart += kSampleStepSize;
            }
            --currentSample;

            // Interpolate to provide an initial guess for t
            var dist = (aX - sampleValues[currentSample]) / (sampleValues[currentSample + 1] - sampleValues[currentSample]);
            var guessForT = intervalStart + dist * kSampleStepSize;

            var initialSlope = getSlope(guessForT, mX1, mX2);
            if (initialSlope >= NEWTON_MIN_SLOPE) {
                return newtonRaphsonIterate(aX, guessForT, mX1, mX2);
            } else if (initialSlope === 0.0) {
                return guessForT;
            } else {
                return binarySubdivide(aX, intervalStart, intervalStart + kSampleStepSize, mX1, mX2);
            }
        }

        return function(x) {
            // Because JavaScript number are imprecise, we should guarantee the extremes are right.
            if (x === 0) {
                return 0;
            }
            if (x === 1) {
                return 1;
            }
            return calcBezier(getTForX(x), mY1, mY2);
        };
    };

    if (typeof module !== "undefined") {
        module.exports = BezierEasing;
    }

})();
