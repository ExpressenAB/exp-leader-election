# Leader election for nodejs applications

[![Run tests](https://github.com/ExpressenAB/exp-leader-election/actions/workflows/run-tests.yml/badge.svg?branch=master)](https://github.com/ExpressenAB/exp-leader-election/actions/workflows/run-tests.yml)

Elect a leader among several nodes using consul.

https://www.consul.io/docs/guides/leader-election.html

## Usage

### Basic example

Connect to consul and get notified about leadership status.

```javascript
var leaderElection = require("exp-leader-election");
var service = require("my-little-service");

var config = {
  key: "locks/my-little-service",
  consul : {
    host: "my.consul.hostname"
  }
}

leaderElection(config)
.on("gainedLeadership", function () {
    // Whoo-hoo, we have been elected as leader! Do work.
    service.startDoingWork();
  })
.on("error", function () {
   // Error occured, stop work.
   log.error("Leader election error occured", error);
   service.stopDoingWork();
  });
```

### The let-it-crash way

If you want your application to crash in case of leader election errors, just omit the
"error" listener. This is the simplest and most robust way to deal with errors,
but it requires that you have a process manager (such as forever or pm2) in place to
ensure that the application is restarted again.

## Configuration

### Full Example

```javascript
{
  key: "locks/my-little-service", // Only required option
  debug: console.log,
  consul: {
    host: "127.0.0.1",
    port: 8050,
    token: "asdpf2344d083udhd8723",
    ttl: 15,
    lockDelay: 10,
    readWait: 180
  }
}
```
### Consul

* `consul.host`: Consul hostname or ip (string)
* `consul.port`: Consul port (number)
* `consul.ttl`: Tuning, session ttl seconds (number, default 15)
* `consul.lockDelay`: Tuning, session lock-delay seconds (number, default 10)
* `consul.readWait`: Tuning, read wait seconds (number, default 180)

To read more about the tuning parameters, see
https://www.consul.io/docs/internals/sessions.html

### Debugging

* `debug`: function accepting a variable number of args. Supply if you want to print debugging info.
