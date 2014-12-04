var stateTree = require('./state-tree');
var utils     = require('./utils');

var ko;
var config;

function init(ko_, config_) {
    ko = ko_;
    config = config_;
}

function resolveAbsolutePathToUrl(path, params) {
    // Get pattern.
    params = params || {};
    var patterns = [];
    utils.forOwn(config.routes, function(pattern, _path) {
        if (_path === path) {
            patterns.push(pattern);
        }
    });

    // Substitute parameters.
    var urls = patterns.map(function(pattern) {
        var parts = [];
        var isMatch = true;
        utils.processPattern(pattern, function (part, isParam) {
            if (isParam) {
                if (params.hasOwnProperty(part)) {
                    var param = params[part] + '';
                    var regex = config.routeParams[part].regex;
                    var match = param.match(regex);
                    if (match && match[0] === param) {
                        parts.push(params[part] + '');
                    }
                    else {
                        isMatch = false;
                        return false; // Stop.
                    }
                } else {
                    isMatch = false;
                    return false; // Stop.
                }
            } else {
                parts.push(part);
            }
        });
        return (isMatch ? parts.join('/') : null);
    })
    .filter(function(url) {
        return url !== null;
    });

    // Validate result.
    if (urls.length === 1) {
        return (config.html5History ? '' : '/#') + urls[0];
    } else {
        var s = ' for path "' + path + '" and params "' + JSON.stringify(params) + '".';
        if (urls.length === 0) {
            throw new Error('Could not resolve url' + s);
        }
        throw new Error('Multple URLs match' + s);
    }
}

function resolvePathToUrl(path, params, stateNode) {
    params = params || {};
    if (isPathRelative(path)) {
        // Make path absolute.
        path = stateNode.getPathToHere() + (path === '.' ? '' : path);

        // Use current params where not supplied.
        var curParams = stateNode.params;
        for (var paramName in curParams) {
            if (!params[paramName]) {
                params[paramName] = curParams[paramName]();
            }
        }
    }
    return resolveAbsolutePathToUrl(path, params);
}

function pathMatchesCurrent(path, params, stateNode) {
    // root.thing matches root.thing.other-thing (partial match).
    var providedPath = resolvePathToUrl(path, params, stateNode);
    var curPath = resolveAbsolutePathToUrl(stateTree.getActivePath(), ko.toJS(stateNode.routeParams));
    return curPath.indexOf(providedPath) === 0;
}

function isPathRelative (path) {
    return path.indexOf('.') === 0;
}

module.exports = {
    init: init,
    resolveAbsolutePathToUrl: resolveAbsolutePathToUrl,
    resolvePathToUrl: resolvePathToUrl,
    pathMatchesCurrent: pathMatchesCurrent,
    isPathRelative: isPathRelative
};