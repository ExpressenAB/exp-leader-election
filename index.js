
var consul = require("consul");
var os = require("os");
var EventEmitter = require("events");

function start(options) {
    var client = consul({host: "consul-web.service.consul.xpr.dex.nu", port: "80",
                        defaults: {token: "8291ec9a-5f1e-a32c-aee5-3428d56f9135"}});
    var emitter = new EventEmitter();
    var isLeader = false;
    var key = options.key;
    var sessionId;
    var waitIndex;

    client.session.create({ttl: "15s", lockdelay: "1s"}, function(err, session) {
      console.log("Session created", session)
      if (err) return emitter.emit("error", err);
      sessionId = session.ID;
      setInterval(renewSession, 10000);
      setImmediate(claimLeadership);
    });

    function claimLeadership() {
      console.log("Claiming", sessionId)
      client.kv.set(options.key, os.hostname, {acquire: sessionId}, function (err, acquired) {
        if (err) return emitter.emit("error", err);
        console.log("Claimed", acquired);
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
      console.log("Waiting", waitIndex);
      client.kv.get({key: key, index: waitIndex, wait: "5m"}, function(err, result) {
        console.log("Got", result);
        if (err) return emitter.emit("error");
        waitIndex = result.ModifyIndex;
        if (!result.Session) {
          setTimeout(claimLeadership, 1000); // TODO correlate with lock delay
        } else {
          setImmediate(wait);
        }
      });
    }

    function renewSession() {
      client.session.renew(sessionId, function(err) {
        if (err) console.log("Error renewing session: ", sessionId)
      });
    }

    return emitter;
}

module.exports = start;
