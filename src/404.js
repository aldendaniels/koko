function init(ko, componentViewModel) {
    ko.components.register('kokoDefault404', {
        template: require('./404.html'),
        viewModel: componentViewModel({
            init: function() {
                this.koko.setReady();
            }
        })
    });
}

module.exports = {
    init: init
};