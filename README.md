# Leader election for nodejs applications

Elect a leader among several nodes using consul.

https://www.consul.io/docs/guides/leader-election.html

## Usage

### Basic example

var leaderElection = require("exp-leader-election");

```javascript
var config = {
  key: "locks/my-little-service";
  consul: {
    host: "consul.host.or.ip",
  }
}

leaderElection(config)
.on("gainedLeadership", function () {
    // Whoo-hoo, we have been elected as leader! Do work.
  })
.on("lostLeadership"), function () {
   // Uh-oh, we are lo longer the leader! Stop work.
  })
.on("error"), function () {
   // Error occured. State is unknown, so depending on the application we might need to stop work.
   log.error("Leader election error occured", error);
  });
```

### The let-it-crash way

If you want your application to crash in case of leader election errors, just omit the
"error" listener.

## Configuration

```javascript
{
  key: ..., // path to key in consul (string)
  debug: ...,  // function for debugging (function)
  consul: {
    host: // hostmame or ip (string),
    port: // (string),
    token: // auth token (string)
  }
}
```
