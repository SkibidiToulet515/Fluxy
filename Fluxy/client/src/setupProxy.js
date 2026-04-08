const { createProxyMiddleware } = require("http-proxy-middleware");
const express = require("express");
const fs = require("fs");
const path = require("path");

const BACKEND_TARGET = process.env.REACT_APP_DEV_BACKEND || "http://localhost:3001";
const LOCAL_GAMES_DIR = path.resolve(__dirname, "../UGS Files");

const common = {
  target: BACKEND_TARGET,
  changeOrigin: true,
  ws: true,
  secure: false,
  logLevel: "silent",
};

module.exports = function setupProxy(app) {
  // In local dev, serve games straight from the client UGS folder.
  // This prevents "Error occurred while trying to proxy /games/..." when backend is down.
  if (fs.existsSync(LOCAL_GAMES_DIR)) {
    app.use(
      "/games",
      express.static(LOCAL_GAMES_DIR, {
        setHeaders: (res) => {
          res.setHeader("X-Frame-Options", "SAMEORIGIN");
          res.setHeader("Content-Security-Policy", "frame-ancestors 'self'");
        },
      })
    );
  }

  app.use("/api", createProxyMiddleware(common));
  app.use("/socket.io", createProxyMiddleware(common));
  app.use("/games", createProxyMiddleware(common));
  app.use("/proxy/launch", createProxyMiddleware(common));
  app.use("/uv", createProxyMiddleware(common));
  app.use("/epoxy", createProxyMiddleware(common));
  app.use("/baremux", createProxyMiddleware(common));
  app.use("/scram", createProxyMiddleware(common));
  app.use("/libcurl", createProxyMiddleware(common));
  app.use("/scramjet", createProxyMiddleware(common));
  app.use("/wisp", createProxyMiddleware(common));
};
