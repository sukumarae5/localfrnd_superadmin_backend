// Wraps an async Express handler so any thrown error (e.g. `throw new ApiError(...)`)
// or rejected promise is automatically forwarded to next(err) — which your
// error.middleware.js picks up and turns into a JSON response. Without this,
// every controller would need its own try/catch just to call next(err).
//
// Usage:
//   const sendOtp = asyncHandler(async (req, res) => { ... });

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;