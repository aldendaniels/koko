var router      = require('./router');
var stateNode   = require('./state-node');
var stateTree   = require('./state-tree');
var urlResolver = require('./url-resolver');
var component   = require('./component');
var bindings    = require('./bindings');
var kokoView    = require('./koko-view');
var utils       = require('./utils');

var ko;
var config;

function init(ko_) {
    ko = ko_;
    component.init(ko);
    kokoView.init(ko);
    bindings.init(ko);
    setEarlyExports();
}

function run(config_) {
    config = config_;

    // Init stuff to inject dependencies.
    stateNode.init(ko, config, stateTree);
    stateTree.init(ko);
    urlResolver.init(ko, config);

    // Get list of routes for router
    var route;
    var routes = [];
    for (route in config.routes) {
        routes.push(route);
    }

    // Get resolved redirects for router.
    var redirects = {};
    for (route in config.redirects) {
        var target = config.redirects[route];
        if (typeof target === 'object') {
            redirects[route] = urlResolver.resolveAbsolutePathToUrl(target.path, target.params);
        } else {
            redirects[route] = urlResolver.resolveAbsolutePathToUrl(target);
        }
    }

    // Get resolved 404 redirect for router.
    var notFoundRedirect;
    if (typeof config.notFoundRedirect === 'object') {
        notFoundRedirect = urlResolver.resolveAbsolutePathToUrl(config.notFoundRedirect.path, config.notFoundRedirect.params);
    } else {
        notFoundRedirect = urlResolver.resolveAbsolutePathToUrl(config.notFoundRedirect);
    }

    // Start router.
    router.start({
        rootUrl: config.rootUrl,
        routes: routes,
        routeParams: config.routeParams,
        redirects: redirects,
        notFoundRedirect: notFoundRedirect,
        html5History: config.html5History || false
    }, onRoute);

    // Export API.
    setLateExports();
}

function onRoute(route, params) {
    stateTree.update(config.routes[route], params);
}

function navigateToPath(path, params, stateNode) {
    router.navigate(urlResolver.resolvePathToUrl(path, params, stateNode));
}

function navigateToUrl(url) {
    router.navigate(url);
}

// Called by .init()
function setEarlyExports() {
    utils.assign(module.exports, {
        componentViewModel: component.createComponentViewModel,
        run: run
    });
}

// Called by .run()
function setLateExports() {
    utils.assign(module.exports, {
        resolve: urlResolver.resolvePathToUrl,
        navigateToPath: navigateToPath,
        navigateToUrl: navigateToUrl,
        root: {
            stateNode: stateTree.getRoot()
        }
    });
}

module.exports.init = init;