var director = require('director');
var utils    = require('./utils');

/*
    This is a low-level router that calls the provided callback
    whenever the user navigates to a configured route.
    The callback receives two parameters:
     - The route matched pattern
     - An object containing the parameter values for the route
*/

var router;

// Config.
var routes;           // A array of "/route/:patterns"
var routeParams;      // An array of named parameter definitions
var redirects;        // An object mapping "a/rout:pattern" to "another/url"

function normalizeUrlFragment(url) {
    if (!url) {
        return '/';
    }
    if (url.slice(0, 1) !== '/') {
        url = '/' + url;
    }
    if (url.slice(url.length - 1, 1) !== '/') {
        url += '/';
    }
    return url;
}

function startRouter(config, cb) {
    // The router can only be started once.
    if (routes) {
        throw new Error('The router is already started.');
    }

    // Validate config.
    routes           = config.routes;
    routeParams      = config.routeParams;
    redirects        = config.redirects;
    if (!routes  || !routeParams || !redirects) {
        throw new Error ('Invalid configuration');
    }

    // Supply default routeParam values.
    var paramName;
    var fnNoop = function (o) { return o; };
    for (paramName in config.routeParams) {
        config.routeParams[paramName] = routeParams[paramName] || {};
        config.routeParams[paramName].parse = routeParams[paramName].parse || fnNoop;
        config.routeParams[paramName].regex = routeParams[paramName].regex || /(.*)/g;
    }

    // Create router instance.
    router = new director.Router();
    router.configure({
        html5history: config.html5History
    });

    // Register param name/regex pairs.
    // Director will validate that params match the supplied regex.
    // If they don't, the user will see the 404 route.
    for (paramName in routeParams) {
        router.param(paramName, routeParams[paramName].regex);
    }

    // Register route patterns.
    var route;
    for (var i in routes) {
        route = routes[i];
        router.on(utils.optionalizeTrailingSlash(route), onRoute.bind(window, route, cb));
    }

    // Register redirects.
    for (route in redirects) { // jshint ignore:line
        /* jshint -W083 */
        router.on(utils.optionalizeTrailingSlash(route), function() {
            navigate(redirects[route]);
        });
        /* jshint +W083 */
    }

    // If route not found, set the component path to blank.
    router.on('.*', onRoute.bind(window, '', cb));

    // If we receive a url that looks like /root/something/ in a browser
    // using hash based routing, we redirect to root/#/something
    // NOte: Director handles the inverse situtation nicely.
    if (!router.history) {
        var path = normalizeUrlFragment(window.location.pathname);
        var root = normalizeUrlFragment(config.rootPath);
        if (path.slice(0, root.length) === root) {
            path = path.slice(root.length - 1); // Leave starting "/"
        } else {
            throw new Error('Path does not start with the provided "root" path');
        }
        if (path !== '/') {
            window.location = root + '#' + path;
            return;
        }
    }
    router.init(router.history ? '' : window.location.pathname);
}

function navigate(url) {
    if (url.slice(0, 2) === '/#') {
        url = url.slice(2);
    }
    router.setRoute(url);
}

function onRoute(route, cb/*, params */) {
    var paramsList = Array.prototype.slice.call(arguments, 2);
    var paramsObj = {};
    var paramCount = 0;
    utils.processPattern(route, function(part, isParam) {
        if (isParam) {
            paramsObj[part] = routeParams[part].parse(paramsList[paramCount]);
            paramCount++;
        }
    });
    cb(route, paramsObj);
}

module.exports = {
    start: startRouter,
    navigate: navigate
};