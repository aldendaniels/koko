var urlResolver  = require('./url-resolver');
var utils        = require('./utils');
var router       = require('./router');

function init(ko) {

    ko.bindingHandlers.kokoHref = {
        init: function(element) {
            ko.utils.registerEventHandler(element, 'click', function(event) {
                // Short-cicuit for local URls to prevent full page refresh.
                var href = element.getAttribute('href');                
                if (href.slice(0, 1) === '/' || href.indexOf(window.location.origin) === 0) {
                    router.navigate(href);
                    event.preventDefault();
                    event.stopPropagation();
                }
            });
        },
        update: function (element, valueAccessor, ignore1, ignore2, bindingContext) {
            /* Expects:
             *  {
             *      path: 'root.user-list.user-detail',
             *      params: { userId: 123 },
             *      activate: true
             *  }
             * OR
             *   'http://someurl'
             * */

            var opts = valueAccessor();
            switch (typeof opts) {
                case 'object':
                    // Set href.
                    var stateNode = utils.getStateNodeFromContext(bindingContext);
                    element.setAttribute('href', urlResolver.resolvePathToUrl(opts.path, opts.params, stateNode));

                    // Optionally add "selected" class when href target is active.
                    if (opts.activate) {
                        var pathMatchesCurrent = urlResolver.pathMatchesCurrent(opts.path, opts.params, stateNode);
                        utils.toggleElemClass(element, 'active', pathMatchesCurrent);
                    }
                    break;
                case 'string':
                    element.setAttribute('href', opts);
                    break;
                default:
                    throw new Error('kokoHref expect either a string or an object parameter type');
            }
        }
    };

    ko.bindingHandlers.kokoActivate = {
        update: function (element, valueAccessor, ignore1, ignore2, bindingContext) {
            /* Expects:
             *  {
             *      path: 'root.user-list.user-detail',
             *      params: { userId: 123 }
             *  }
             * */
            var opts = valueAccessor();

            // Conditionally add the "active" class.
            var stateNode = utils.getStateNodeFromContext(bindingContext);
            var pathMatchesCurrent = urlResolver.pathMatchesCurrent(opts.path, opts.params, stateNode);
            utils.toggleElemClass(element, 'active', pathMatchesCurrent);
        }
    };

}

module.exports = {
    init: init
};