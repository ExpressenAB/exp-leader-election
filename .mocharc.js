"use strict";

process.env.NODE_ENV = "test";
process.env.CONSUL_PORT = process.env.CONSUL_PORT || 8500;

module.exports = {
  ui: "mocha-cakes-2",
  exit: true,
  timeout: 10000,
};
