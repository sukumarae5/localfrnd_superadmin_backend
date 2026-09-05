const ApiResponse = require("../../utils/apiresponse.util");
const { HTTP_STATUS } = require("../../constants");

const service = require("./paymentWebhook.service");

/*
Always responds 200 once signature verification has passed (done in
middleware, before this handler runs) -- see the "why we don't throw"
comment in paymentWebhook.service.js. A non-2xx here makes Razorpay
retry the same event repeatedly, which isn't useful once we've already
logged it for investigation.
*/
async function razorpay(req, res, next) {
  try {
    const result = await service.handleRazorpayEvent({
      payload: req.body,
      eventId: req.razorpayEventId,
      requestId: req.headers["x-request-id"] || null,
      endpoint: req.originalUrl,
    });

    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, result, "Webhook received"));
  } catch (error) {
    // Only truly unexpected errors (e.g. DB down) reach here -- business
    // logic failures are already caught and logged inside the service.
    next(error);
  }
}

module.exports = { razorpay };
