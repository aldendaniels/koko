var urlResolver  = require('./url-resolver');
var utils        = require('./utils');
var router       = require('./router');

function init(ko) {

    ko.bindingHandlers.kokoHref = {
        init: function(element) {
            ko.utils.registerEventHandler(element, 'click', function(event) {
                router.navigate(element.getAttribute('href'));
                event.preventDefault();
            });
        },
        update: function (element, valueAccessor, ignore1, ignore2, bindingContext) {
            /* Expects:
             *  {
             *      path: 'root.account-list.account-detail',
             *      params: { accountId: 123 },
             *      select: true,
             *      text: 'Accounts'
             *  }
             * */

            // Get options and element.
            var opts = valueAccessor();

            // Set href.
            var stateNode = utils.getStateNodeFromContext(bindingContext);
            var href = urlResolver.resolvePathToUrl(opts.path, opts.params, stateNode);
            element.setAttribute('href', href);

            // Optionally add "selected" class when href target is active.
            if (opts.activate) {
                var pathMatchesCurrent = urlResolver.pathMatchesCurrent(opts.path, opts.params, stateNode);
                utils.toggleElemClass(element, 'active', pathMatchesCurrent);
            }
        }
    };

    ko.bindingHandlers.kokoActivate = {
        update: function (element, valueAccessor, ignore1, ignore2, bindingContext) {
            /* Expects:
             *  {
             *      path: 'root.account-list.account-detail',
             *      params: { accountId: 123 },
             *  }
             * */

            // Get options and element.
            var opts = valueAccessor();
            var $el = $(element);

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