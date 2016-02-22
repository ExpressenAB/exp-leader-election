"use strict";

var consul = require("consul");
var EventEmitter = require("events");

var READ_WAIT = "180"; // seconds
var LOCK_DELAY = "10"; // seconds
var TTL = "15";        // seconds

function session(options, emitter) {
    emitter = emitter || new EventEmitter();
    var cOpts = options.consul || {};
    var client = consul({host: cOpts.host, port: cOpts.port, defaults: {token: cOpts.token}});
    var isLeader = false;
    var debug = options.debug || function () {};
    var key = options.key;
    var sessionId, renewTimer, waitIndex, resetTimer;

    function claimLeadership() {
      client.kv.set(key, "leader", {acquire: sessionId}, function (err, acquired) {
        if (handleError(err)) return;
        debug("Claimed. Leader: ", isLeader, ", result:", acquired);
        if (!isLeader && acquired) {
          emitter.emit("gainedLeadership");
        }
        if (isLeader && !acquired) {
          emitter.emit("lostLeadership");
        }
        isLeader = acquired;
        wait();
      });
    }

    function wait() {
      client.kv.get({key: key, index: waitIndex, wait: READ_WAIT + "s"}, function (err, result) {
        if (handleError(err)) return;
        debug("Read key", key, "result: ", result);
        waitIndex = result.ModifyIndex;
        if (!result.Session) {
          if (isLeader) {
            isLeader = false;
            emitter.emit("lostLeadership");
          }
          debug("No session for key", key, ", will try to aquire in", LOCK_DELAY, "secs");
          setTimeout(claimLeadership, LOCK_DELAY * 1000);
        } else {
          setImmediate(wait);
        }
      });
    }

    function renewSession() {
      client.session.renew(sessionId, function (err) {
          if (handleError(err)) return;
         debug("Renewed session", sessionId);
      });
    }

    function handleError(err) {
      if (resetTimer) return true;
      if (err) {
        emitter.emit("error", err);
        clearInterval(renewTimer);
        client.session.destroy(sessionId, function () {});
        resetTimer = setTimeout(function () { session(options, emitter); }, 3000);
      }
      return err;
    }

    client.session.create({ttl: TTL + "s", lockdelay: LOCK_DELAY + "s"}, function (err, session) {
      if (handleError(err)) return;
      debug("Created new session", session);
      sessionId = session.ID;
      renewTimer = setInterval(renewSession, TTL * 1000 * 0.9);
      return setImmediate(claimLeadership);
    });

    return emitter;
}

module.exports = session;
