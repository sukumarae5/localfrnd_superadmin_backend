// ASSUMPTION: you have an asyncHandler wrapper somewhere (common in Express/Prisma
// boilerplates) to avoid try/catch in every controller. If not, wrap the bodies
// below in try/catch and pass errors to next(err) manually instead.
const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse = require("../../utils/apiresponse.util");
const { HTTP_STATUS } = require("../../constants");
const service = require("./userAuth.service");

const sendOtp = asyncHandler(async (req, res) => {
  const { mobileCountryCode, mobileNumber } = req.body;
  const result = await service.sendOtp(mobileCountryCode, mobileNumber);

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, "OTP sent successfully"));
});

const verifyOtp = asyncHandler(async (req, res) => {
  const { mobileCountryCode, mobileNumber, otp } = req.body;
  console.log(mobileCountryCode, mobileNumber, otp)
  const deviceMeta = service.extractDeviceMeta(req);

  const { user, isNewUser, accessToken, refreshToken } = await service.verifyOtp(
    mobileCountryCode,
    mobileNumber,
    otp,
    deviceMeta
  );

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      {
        user: {
          id: user.publicId,
          displayCode: user.displayCode,
          mobileCountryCode: user.mobileCountryCode,
          mobileNumber: user.mobileNumber,
          fullName: user.fullName,
        },
        // Lets the app know whether to route to profile-completion.
        profileComplete: Boolean(user.fullName),
        accessToken,
        refreshToken,
        isNewUser,
      },
      isNewUser ? "Registration successful" : "Login successful"
    )
  );
});

module.exports = { sendOtp, verifyOtp };