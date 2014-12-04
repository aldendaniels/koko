function processPattern (pattern, callback) {
    pattern.split('/').forEach(function(part) {
        var isParam = false;
        if (part.indexOf(':') === 0) {
            part = part.replace(':', '');
            isParam = true;
        }
        return callback(part, isParam);
    });
}

function optionalizeTrailingSlash (pattern) {
    if (pattern.slice(-1) === '/') {
        return pattern + '?';
    }
    if (pattern.slice(-1) === '/?') {
        return pattern;
    }
    return pattern + '/?';
}

function getStateNodeFromContext (context) {
    while (context && !getKokoFromBindingContext(context)) {
        context = context.$parent;
    }
    if (!context) {
        throw new Error('Could not find koko in context');
    }
    return getKokoFromBindingContext(context).stateNode;
}

function getKokoFromBindingContext (context) {
    return context.koko || context.$data.koko || null;
}

function bindMethods(self) {
    for (var name in self) {
        if (typeof self[name] === 'function') {
            self[name] = self[name].bind(self);
        }
    }
    return self;
}

function createClass(props, doNotBind) {
    var Class = function() {
        if (!doNotBind) {
            bindMethods(this);
        }
        if (this.init) {
            this.init.apply(this, arguments);
        }
    };
    for (var name in props) {
        Class.prototype[name] = props[name];
    }
    return Class;
}

function inArray(list, item) {
    for (var i in list) {
        if (list[i] === item) {
            return true;
        }
    }
    return false;
}

function removeFromArray(list, item) {
    for (var i = list.length - 1; i >- 0; i--) {
        if (list[i] === item) {
            list.splice(i, 1);
        }
    }
}

function addClassToElem(element, className) {
    var classes = element.className.split(' ');
    if (!inArray(classes, className)) {
        classes.push(className);
        element.className = classes.join(' ');
    }
}

function removeClassFromElem(element, className) {
    var classes = element.className.split(' ');
    if (inArray(classes, className)) {
        removeFromArray(classes, className);
        element.className = classes.join(' ');
    }
}

function toggleElemClass(element, className, bool) {
    if (bool) {
        addClassToElem(element, className);
    } else {
        removeClassFromElem(element, className);
    }
}

function forOwn(object, cb) {
    for (var key in object) {
        if (object.hasOwnProperty(key)) {
            cb(key, object[key]);
        }
    }
}

function assign(dest, source) {
    for (var key in source) {
        if (source.hasOwnProperty(key)) {
            dest[key] = source[key];
        }
    }
}

module.exports = {
    processPattern: processPattern,
    optionalizeTrailingSlash: optionalizeTrailingSlash,
    getStateNodeFromContext: getStateNodeFromContext,
    bindMethods: bindMethods,
    createClass: createClass,
    toggleElemClass: toggleElemClass,
    assign: assign,
    forOwn: forOwn
};