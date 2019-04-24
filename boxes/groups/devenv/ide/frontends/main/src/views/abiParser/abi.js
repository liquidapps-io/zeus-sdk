


function toXy(num) {
    return {
        x: 1023 & num,
        y: num >> 10
    }
}


function p(e) {
    return "string" === typeof e ? (t = e,
    Number.parseInt(t.slice(1), 16)) : e;
    var t
}


var bigInt = require("big-integer");