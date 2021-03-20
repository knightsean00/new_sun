const { strict } = require('assert');
var fs = require('fs');

const timeBreak = {
    1: 1,
    2: 60,
    3: 3600
}

module.exports = {
    makeDir: (path) => {
        if (!fs.existsSync(path)) {
            fs.mkdirSync(path);
        }
    },

    getArgs: (cmd) => {
        let args = cmd.split(' ');
        var output = {command: args[0], position: []};

        let option = []
        let flag = null
        for (let i = 1; i < args.length; i++) {
            if (args[i].startsWith("-") && flag == null) {
                option.push(true);
                flag = args[i].slice(1);
            }
            else if (flag != null) {
                if (args[i].startsWith("-")) {
                    output[flag] = option;
                    option = [true];
                    flag = args[i].slice(1);
                } else {
                    option.push(args[i])
                }
            } else {
                output.position.push(args[i])
            }
        }
        
        if (flag != null) {
            output[flag] = option;
        }

        return output
    },

    strToSec: (time) => {
        let times = time.split(':');
        let output = 0
        for (let i = times.length - 1; i >= 0; i--) {
            output += timeBreak[times.length - i] * parseInt(times[i])
        }
        return output
    }
}