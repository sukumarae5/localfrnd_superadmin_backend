require("dotenv").config();
const express=require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const cookieParser = require("cookie-parser");


const { notFoundHandler, errorHandler } = require("./middleware/error.middleware");   
const routes = require("./routes/index")


const app=express()
// app.use(cors());
app.use(cors({ origin: process.env.CLIENT_URL || "*", credentials: true }));
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === "development" ? "dev" : "combined"));
app.use(compression());
app.use(cookieParser());
app.use(
  express.json({
    // Capture the exact raw bytes as received, before Express parses them.
    // Webhook HMAC signatures must be verified against these raw bytes, not
    // against JSON.stringify(req.body) — re-serializing a parsed object can
    // produce different whitespace than what the sender actually hashed,
    // causing valid signatures to fail verification.
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));


app.use("/api", routes);

app.use(notFoundHandler);
app.use(errorHandler);


module.exports = app;