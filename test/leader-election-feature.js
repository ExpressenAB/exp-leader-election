"use strict";

// NOTE - requires consul started on localhost:8500 in dev mode:
// consul agent -dev -advertise=127.0.0.1

const leaderElection = require("../");
const prefix = "exp-leader-election-feature-test-";
const testKey = prefix + new Date().getTime();
const Consul = require("consul");

const options = {
  host: "localhost",
  port: process.env.CONSUL_PORT,
};

const config = {
  key: testKey,
  consul: {
    ttl: 10,
    lockDelay: 0,
    readWait: 180,
    ...options,
  },
};

Feature("Elect leader", () => {
  let consul;
  before((done) => {
    consul = Consul(options);
    return consul.kv.delete({key: prefix, recurse: true}, done);
  });

  Scenario("Two clients", () => {
    let sessionId;
    after((done) => {
      return consul.session.destroy(sessionId, done);
    });

    let client, client2;
    When("First client is connected to consul it should be leader", (done) => {
      client = leaderElection(config);
      client.on("gainedLeadership", (pSessionId) => {
        sessionId = pSessionId;
        done();
      });
    });
    When("Second client is connected", () => {
      client2 = leaderElection(config);
    });
    Then("It becomes leader if the first client is disconnected", (done) => {
      client2.on("gainedLeadership", () => {
        done();
      });
      client.on("error", () => {});
      consul.session.destroy(sessionId, () => {});
    });
  });
});
