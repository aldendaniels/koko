var utils = require('./utils');

var ko;
var state;
var config;

function init(ko_, config_, state_) {
    ko = ko_;
    config = config_;
    state = state_;
}

var StateNode = utils.createClass({
    init: function(componentName, params, parentNode) {
        this.parent             = parentNode;
        this.component          = componentName;
        this.children           = ko.observableArray();
        this.status             = ko.observable('loading'); // loading | pending_visible | visible | pending_removal
        this.routeParams = {};
        for (var paramName in config.routeParams) {
            this.routeParams[paramName] = ko.observable(params[paramName] || null);
        }
    },

    isVisible: function() {
        return this.status() === 'visible' || this.status() === 'pending_removal';
    },

    setReady: function() {
        if (this.status() !== 'loading') {
            throw new Error('Only loading components can be marked as ready');
        }
        this.status('pending_visible');
        state.transitionIfReady();
    },

    updateRouteParams: function (routeParams) {
        // Sanity check.
        if (this.status() === 'pending_removal') {
            throw new Error('Params should not be updated while pending removal');
        }

        // Clear old values.
        var paramName;
        for (paramName in this.routeParams) {
            if (!(paramName in routeParams)) {
                this.routeParams[paramName](null);
            }
        }

        // Add new values.
        for (paramName in routeParams) {
            if (paramName in this.routeParams) {
                this.routeParams[paramName](routeParams[paramName]);
            } else {
                throw new Error('Unrecognized parameter name.');
            }
        }
    },

    transition: function() {
        this.children.remove(function(child) {
            return child.status() === 'pending_removal';
        });
        if (this.children().length) {
            this.children()[0].status('visible');
            this.children()[0].transition();
        }
    },

    getPathToHere: function() {
        var path = [this.component];
        var node = this;
        while (node.parent.component) {
            path.splice(0, 0, node.parent.component);
            node = node.parent;
        }
        return path.join('.');
    },

    loadChild: function(childComponentName) {
        // The child is already loaded - NOOP.
        var matchingChild = this.getMatchingChild(childComponentName);
        if (matchingChild) {
            return matchingChild;
        }

        // Remove other component if not ready.
        this.children.remove(function(child) {
            return child.status() === 'loading';
        });

        // Sanity check.
        if (this.children().length > 1) {
            console.log('There should only be 1 active child component at a time');
        }

        // Mark the loaded component as pending removal.
        this.children().forEach(function(child) {
            child.status('pending_removal');
        });

        // Add node.
        var child = new StateNode(childComponentName, ko.toJS(this.routeParams), this);
        this.children.push(child);
        return child;
    },

    isBranchReady: function() {
        if (this.status() === 'loading') {
            return false;
        }
        for (var i in this.children()) {
            if (!this.children()[i].isBranchReady()) {
                return false;
            }
        }
        return true;
    },

    getMatchingChild: function(componentName) {
        var matchingChildren = this.children().filter(function(child) {
            return child.component === componentName;
        });
        if (matchingChildren.length) {
            return matchingChildren[0];
        }
        return null;
    }
});

module.exports = {
    init: init,
    StateNode: StateNode
};