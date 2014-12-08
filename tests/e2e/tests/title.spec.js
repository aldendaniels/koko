/* global describe, it, client */
var assert = require('chai').assert;

describe('Koko scenario', function() {
    it('should contain the expected title',function(done) {
        client
            .url('http://localhost:8081')
            .getTitle(function(err, title) {
                assert.equal(undefined, err);
                assert.strictEqual(title, 'Test Koko App');
            })
            .call(done);
    });
});