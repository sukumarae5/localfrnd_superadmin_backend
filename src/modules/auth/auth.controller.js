// src/modules/auth/auth.controller.js
const ApiResponse = require("../../utils/apiresponse.util");
const { HTTP_STATUS } = require("../../constants");
const { REFRESH_COOKIE_NAME, refreshCookieOptions } = require("./auth.constants");
const authService = require("./auth.service");

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const { accessToken, rawRefreshToken, admin } = await authService.login({
      email,
      password,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
    });

    res.cookie(REFRESH_COOKIE_NAME, rawRefreshToken, refreshCookieOptions);

    res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, { accessToken, admin }, "Login successful"));
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
    const { accessToken } = await authService.refresh({ rawToken });

    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { accessToken }));
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
    await authService.logout({ rawToken });

    res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, null, "Logged out successfully"));
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const admin = await authService.me({ adminId: req.admin.adminId });
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, { admin }));
  } catch (err) {
    next(err);
  }
}

module.exports = { login, refresh, logout, me };