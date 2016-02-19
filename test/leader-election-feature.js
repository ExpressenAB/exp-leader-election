"use strict";

var assert = require("assert");
var util = require("util");
var leader = require("exp-leader-election");

Feature("Elect leader", function () {

  Scenario("One client", function () {
    after(disconnect);
    When("Connected to consul", function (done) {
      var client = leader.connect({}, done);
    });
    Then("We should be leader", function (done) {
      client.onLeader(done);
    });
  });

});

// Helper functions
function disconnect() {

}
