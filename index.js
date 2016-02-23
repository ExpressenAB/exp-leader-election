"use strict";

var consul = require("consul");
var EventEmitter = require("events");
var _ = require("lodash");

function session(opts, emitter) {
    emitter = emitter || new EventEmitter();
    opts = _.defaultsDeep(opts, {debug: _.noop, consul: {ttl: 15, lockDelay: 10, readWait: 180}});
    opts.debug("Using options", opts);
    var client = consul(
      {host: opts.consul.host, port: opts.consul.port, defaults: {token: opts.consul.token}});
    var isLeader = false;
    var sessionId, renewTimer, waitIndex, resetTimer;

    // Try to claim leadeship by locking key. Emit appropriate events to caller.
    function claimLeadership() {
      client.kv.set(opts.key, "leader", {acquire: sessionId}, function (err, acquired) {
        if (handleError(err)) return;
        opts.debug("Claimed. Leader: ", isLeader, ", result:", acquired);
        if (!isLeader && acquired) {
          emitter.emit("gainedLeadership", sessionId);
        }
        if (isLeader && !acquired) {
          emitter.emit("lostLeadership");
        }
        isLeader = acquired;
        wait();
      });
    }

    // Read key and wait for changes. If no session is attached to the key, try to
    // claim leadership after waiting for the LOCK DELAY to expire.
    function wait() {
      var waitCmd = {key: opts.key, index: waitIndex, wait: opts.consul.readWait + "s"};
      client.kv.get(waitCmd, function (err, res) {
        if (handleError(err)) return;
        opts.debug("Read key", opts.key, "result: ", res);
        waitIndex = res.ModifyIndex;
        if (!res.Session) {
          if (isLeader) {
            isLeader = false;
            emitter.emit("lostLeadership");
          }
          opts.debug("No session for ", opts.key, ", aquire in", opts.consul.lockDelay, "secs");
          setTimeout(claimLeadership, opts.consul.lockDelay * 1000);
        } else {
          setImmediate(wait);
        }
      });
    }

    // Renew session so it won't expire
    function renewSession() {
      client.session.renew(sessionId, function (err) {
          if (handleError(err)) return;
         opts.debug("Renewed session", sessionId);
      });
    }

    // Schedules creation of new session and emit "error" if an error has occured.
    // If a new session is already scheduled, we do not re-schedule.
    function handleError(err) {
      if (resetTimer) return true;
      if (err) {
        emitter.emit("error", err);
        clearInterval(renewTimer);
        client.session.destroy(sessionId, function () {});
        resetTimer = setTimeout(function () {
          session(opts, emitter);
        }, 3000);
      }
      return err;
    }

    // Create session and start renew timer to keep it alive. The try to claim key.
    var sessionCmd = {ttl: opts.consul.ttl + "s", lockdelay: opts.consul.lockDelay + "s"};
    client.session.create(sessionCmd, function (err, newSession) {
      if (handleError(err)) return;
      opts.debug("Created new session", newSession);
      sessionId = newSession.ID;
      renewTimer = setInterval(renewSession, opts.consul.ttl * 1000 * 0.9);
      return setImmediate(claimLeadership);
    });

    return emitter;
}

module.exports = session;
