var router      = require('./router');
var stateNode   = require('./state-node');
var stateTree   = require('./state-tree');
var urlResolver = require('./url-resolver');
var component   = require('./component');
var bindings    = require('./bindings');
var kokoView    = require('./koko-view');
var _404        = require('./404');
var utils       = require('./utils');

var ko;
var config;

function init(ko_) {
    ko = ko_;
    component.init(ko);
    kokoView.init(ko);
    _404.init(ko, component.createComponentViewModel);
    bindings.init(ko);
    setEarlyExports();
}

function setConfig(config_) {
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

    // Start router.
    router.start({
        rootUrl: config.rootUrl,
        routes: routes,
        routeParams: config.routeParams,
        redirects: redirects,
        html5History: config.html5History || false
    }, onRoute);

    // Export API.
    setLateExports();
}

function onRoute(route, params) {
    if (route) {
        stateTree.update(config.routes[route], params);
    } else {
        stateTree.update(config.notFoundComponent || 'kokoDefault404', params);
    }

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
        config: setConfig
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