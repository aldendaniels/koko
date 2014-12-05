var ko;
var utils       = require('./utils');
var router      = require('./router');
var urlResolver = require('./url-resolver');

function init(ko_) {
    ko = ko_;
}

var ComponentState = utils.createClass({
    init: function(stateNode) {
        this.disposable = [];
        this.disposeHandlers = [];
        this.stateNode = stateNode;
        this.routeParams = this.stateNode.routeParams;
    },

    setReady: function() {
        this.stateNode.setReady();
    },

    navigateToPath: function(path, params) {
        router.navigate(urlResolver.resolvePathToUrl(path, params, this.stateNode));
    },

    on: function(eventType, handler) {
        switch (eventType) {
            case 'componentDisposal':
                this.disposeHandlers.push(handler);
                break;
            case 'dependencyChange':
                this.disposable.push(ko.computed(handler));
                break;
            default:
                throw new Error ('Unrecognized event type!');
        }
    },

    dispose: function() {
        // Call handlers.
        var i;
        for (i in this.disposeHandlers) {
            this.disposeHandlers[i]();
        }

        // Dispose computed observables.
        for (i in  this.disposable) {
            this.disposable[i].dispose();
        }
    }
});

function createComponentViewModel(props, doNotBind) {
    for (var item in props) {
        if (item === 'dispose') {
            throw new Error ('The "dispose()" method is reserved. Please name your dispose handler something else.');
        }
    }

    var Class = function(componentParams) {
        if (!doNotBind) {
            utils.bindMethods(this);
        }
        this.koko = new ComponentState(componentParams.stateNode);
        this.dispose = this.koko.dispose.bind(this.koko);
        if (this.init) {
            this.init(componentParams.parent);
        }
    };

    for (var name in props) {
        Class.prototype[name] = props[name];
    }
    return Class;
}

module.exports = {
    init: init,
    createComponentViewModel: createComponentViewModel
};