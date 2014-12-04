function init(ko) {
    ko.components.register('koko-view', {
        template: require('./koko-view.html')
    });
}

module.exports = {
    init: init
};