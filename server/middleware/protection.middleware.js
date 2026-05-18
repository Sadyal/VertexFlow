/**
 * 🛡️ PRODUCTION-GRADE SECURITY & SRE PROTECTION MIDDLEWARE
 * Implements SRE monitoring, JSON array/depth bombs sanitizer, timeouts, and watchdogs.
 */

// SRE METRICS
export let eventLoopLag = 0;
let lastCheck = Date.now();

// Track event loop responsiveness (runs as unreferenced timer to minimize footprint)
setInterval(() => {
  const now = Date.now();
  eventLoopLag = Math.max(0, (now - lastCheck) - 1000); // 1000ms is the base ideal time
  lastCheck = now;
  
  if (eventLoopLag > 200) {
    console.warn(`⚠️ [SRE WARNING] Event Loop Lag detected: ${eventLoopLag}ms! Node event loop is choking.`);
  }
}, 1000).unref();

// Memory Heap Watchdog
setInterval(() => {
  const memoryUsage = process.memoryUsage();
  const heapUsedMB = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
  const rssMB = (memoryUsage.rss / 1024 / 1024).toFixed(2);
  
  if (memoryUsage.heapUsed > 350 * 1024 * 1024) {
    console.warn(`🚨 [SRE EMERGENCY] Heap usage is exceeding 350MB target: ${heapUsedMB}MB! RSS: ${rssMB}MB.`);
  }
}, 15000).unref();

/**
 * 🕒 REQUEST TIMEOUT GUARD (10 Seconds)
 */
export const requestTimeout = (req, res, next) => {
  const timeoutId = setTimeout(() => {
    if (!res.headersSent) {
      // Log slow request before failing
      console.warn(`🕒 [SRE TIMEOUT] Request took longer than 10s: ${req.method} ${req.originalUrl}`);
      res.status(503).json({
        success: false,
        message: "Request timeout: The server took too long to respond."
      });
    }
  }, 10000);

  res.on("finish", () => clearTimeout(timeoutId));
  res.on("close", () => clearTimeout(timeoutId));
  next();
};

/**
 * 🛡️ PAYLOAD DEEP-NESTING & ARRAY BOMB SANITIZER
 * Safeguards MongoDB and JSON engines from deep stack exhaustion and array floods.
 */
const checkDepthAndSize = (obj, depth = 0) => {
  if (depth > 8) return false; // Reject nesting depth > 8 (stack overflow prevention)
  
  if (Array.isArray(obj)) {
    if (obj.length > 100) return false; // Reject array flood > 100 items
    for (const item of obj) {
      if (typeof item === "object" && item !== null) {
        if (!checkDepthAndSize(item, depth + 1)) return false;
      }
    }
  } else if (typeof obj === "object" && obj !== null) {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = obj[key];
        if (typeof val === "object" && val !== null) {
          if (!checkDepthAndSize(val, depth + 1)) return false;
        }
      }
    }
  }
  return true;
};

export const payloadSanitizer = (req, res, next) => {
  if (req.body && typeof req.body === "object") {
    if (!checkDepthAndSize(req.body)) {
      return res.status(400).json({
        success: false,
        message: "Payload rejected: Excessive depth or array limits exceeded."
      });
    }
  }
  next();
};

/**
 * 🔒 GRACEFUL MALFORMED JSON EXCEPTION HANDLER
 */
export const malformedJsonHandler = (err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      success: false,
      message: "Malformed JSON payload rejected."
    });
  }
  next(err);
};
