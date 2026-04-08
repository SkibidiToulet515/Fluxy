const { createProxyMiddleware } = require("http-proxy-middleware");

const BACKEND_TARGET = process.env.REACT_APP_DEV_BACKEND || "http://localhost:3001";

const common = {
  target: BACKEND_TARGET,
  changeOrigin: true,
  ws: true,
  secure: false,
  logLevel: "silent",
};

module.exports = function setupProxy(app) {
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
