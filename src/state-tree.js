var stateNode = require('./state-node');

var tree;
var activePath;
var activePathNotifyer;

function init (ko) {
    tree = new stateNode.StateNode(null, {});
    tree.status('visible');

    // The active path is used by the koko-activate and koko-href bindings.
    // When the bindings are initilized, the should always look at the lastest path.
    // When the path changes, however, we don't want the bindings to be updated
    // Until the transition is complete. To acheive this, getActivePath() returns
    // the current path but creates a subscription to activePathNotifyer().
    // Whenever a transition is complete, we need to manually update activePathNotifyer()
    // so that the appropriate bindings are updated.
    activePath = '';
    activePathNotifyer = ko.observable();
}

function update(path, routeParams) {
    var node = tree;
    activePath = path;
    path.split('.').forEach(function(componentName) {
        node = node.loadChild(componentName);
        node.updateRouteParams(routeParams);
    });
    if (node.children().length) {
        node.children.removeAll();
        activePathNotifyer(activePath);
    }
}

function transitionIfReady () {
    if (tree.isBranchReady()) {
        tree.transition();
        activePathNotifyer(activePath);
    }
}

function getActivePath() {
    activePathNotifyer();
    return activePath;
}

function getRoot() {
    return tree;
}

module.exports = {
    init: init,
    update: update,
    transitionIfReady: transitionIfReady,
    getActivePath: getActivePath,
    getRoot: getRoot
};