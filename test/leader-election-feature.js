"use strict";

// NOTE - requires consul started on localhost:8500 in dev mode:
// consul agent -dev -advertise=127.0.0.1

var assert = require("assert");
var util = require("util");
var leaderElection = require("../");
var prefix = "exp-leader-election-feature-test-";
var testKey = prefix + new Date().getTime();
var config = {key: testKey, consul: {ttl : 10, lockDelay: 0, readWait: 180}};
var consul = require("consul")();

Feature("Elect leader", function () {

  after(function(done) {
    consul.kv.delete({key: prefix, recurse: true}, done);
  });

  Scenario("Two clients", function () {
    var client, client2;
    var sessionId;
    When("First client is connected to consul it should be leader", function () {
      client = leaderElection(config);
      client.on("gainedLeadership", function(pSessionId) {
        sessionId = pSessionId;
        done();
      });
    });
    When("Second client is connected", function () {
      client2 = leaderElection(config);
    });
    Then("It becomes leader if the first client is disconnected", function (done) {
      client2.on("gainedLeadership", function() {
        done();
      });
      client.on("error", function () {});
      consul.session.destroy(sessionId, function () {});
    });
  });
});
