/*!
* Koko JavaScript library v0.1.0
* (c) OneSpot, Inc. - http://onespot.com/
* License: MIT (http://www.opensource.org/licenses/mit-license.php)
*/
!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var o;"undefined"!=typeof window?o=window:"undefined"!=typeof global?o=global:"undefined"!=typeof self&&(o=self),o.koko=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
},{"./404":4,"./bindings":5,"./component":6,"./koko-view":8,"./router":9,"./state-node":10,"./state-tree":11,"./url-resolver":12,"./utils":13}],2:[function(require,module,exports){


//
// Generated on Fri Dec 27 2013 12:02:11 GMT-0500 (EST) by Nodejitsu, Inc (Using Codesurgeon).
// Version 1.2.2
//

(function (exports) {

/*
 * browser.js: Browser specific functionality for director.
 *
 * (C) 2011, Nodejitsu Inc.
 * MIT LICENSE
 *
 */

if (!Array.prototype.filter) {
  Array.prototype.filter = function(filter, that) {
    var other = [], v;
    for (var i = 0, n = this.length; i < n; i++) {
      if (i in this && filter.call(that, v = this[i], i, this)) {
        other.push(v);
      }
    }
    return other;
  };
}

if (!Array.isArray){
  Array.isArray = function(obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
  };
}

var dloc = document.location;

function dlocHashEmpty() {
  // Non-IE browsers return '' when the address bar shows '#'; Director's logic
  // assumes both mean empty.
  return dloc.hash === '' || dloc.hash === '#';
}

var listener = {
  mode: 'modern',
  hash: dloc.hash,
  history: false,

  check: function () {
    var h = dloc.hash;
    if (h != this.hash) {
      this.hash = h;
      this.onHashChanged();
    }
  },

  fire: function () {
    if (this.mode === 'modern') {
      this.history === true ? window.onpopstate() : window.onhashchange();
    }
    else {
      this.onHashChanged();
    }
  },

  init: function (fn, history) {
    var self = this;
    this.history = history;

    if (!Router.listeners) {
      Router.listeners = [];
    }

    function onchange(onChangeEvent) {
      for (var i = 0, l = Router.listeners.length; i < l; i++) {
        Router.listeners[i](onChangeEvent);
      }
    }

    //note IE8 is being counted as 'modern' because it has the hashchange event
    if ('onhashchange' in window && (document.documentMode === undefined
      || document.documentMode > 7)) {
      // At least for now HTML5 history is available for 'modern' browsers only
      if (this.history === true) {
        // There is an old bug in Chrome that causes onpopstate to fire even
        // upon initial page load. Since the handler is run manually in init(),
        // this would cause Chrome to run it twise. Currently the only
        // workaround seems to be to set the handler after the initial page load
        // http://code.google.com/p/chromium/issues/detail?id=63040
        setTimeout(function() {
          window.onpopstate = onchange;
        }, 500);
      }
      else {
        window.onhashchange = onchange;
      }
      this.mode = 'modern';
    }
    else {
      //
      // IE support, based on a concept by Erik Arvidson ...
      //
      var frame = document.createElement('iframe');
      frame.id = 'state-frame';
      frame.style.display = 'none';
      document.body.appendChild(frame);
      this.writeFrame('');

      if ('onpropertychange' in document && 'attachEvent' in document) {
        document.attachEvent('onpropertychange', function () {
          if (event.propertyName === 'location') {
            self.check();
          }
        });
      }

      window.setInterval(function () { self.check(); }, 50);

      this.onHashChanged = onchange;
      this.mode = 'legacy';
    }

    Router.listeners.push(fn);

    return this.mode;
  },

  destroy: function (fn) {
    if (!Router || !Router.listeners) {
      return;
    }

    var listeners = Router.listeners;

    for (var i = listeners.length - 1; i >= 0; i--) {
      if (listeners[i] === fn) {
        listeners.splice(i, 1);
      }
    }
  },

  setHash: function (s) {
    // Mozilla always adds an entry to the history
    if (this.mode === 'legacy') {
      this.writeFrame(s);
    }

    if (this.history === true) {
      window.history.pushState({}, document.title, s);
      // Fire an onpopstate event manually since pushing does not obviously
      // trigger the pop event.
      this.fire();
    } else {
      dloc.hash = (s[0] === '/') ? s : '/' + s;
    }
    return this;
  },

  writeFrame: function (s) {
    // IE support...
    var f = document.getElementById('state-frame');
    var d = f.contentDocument || f.contentWindow.document;
    d.open();
    d.write("<script>_hash = '" + s + "'; onload = parent.listener.syncHash;<script>");
    d.close();
  },

  syncHash: function () {
    // IE support...
    var s = this._hash;
    if (s != dloc.hash) {
      dloc.hash = s;
    }
    return this;
  },

  onHashChanged: function () {}
};

var Router = exports.Router = function (routes) {
  if (!(this instanceof Router)) return new Router(routes);

  this.params   = {};
  this.routes   = {};
  this.methods  = ['on', 'once', 'after', 'before'];
  this.scope    = [];
  this._methods = {};

  this._insert = this.insert;
  this.insert = this.insertEx;

  this.historySupport = (window.history != null ? window.history.pushState : null) != null

  this.configure();
  this.mount(routes || {});
};

Router.prototype.init = function (r) {
  var self = this;
  this.handler = function(onChangeEvent) {
    var newURL = onChangeEvent && onChangeEvent.newURL || window.location.hash;
    var url = self.history === true ? self.getPath() : newURL.replace(/.*#/, '');
    self.dispatch('on', url.charAt(0) === '/' ? url : '/' + url);
  };

  listener.init(this.handler, this.history);

  if (this.history === false) {
    if (dlocHashEmpty() && r) {
      dloc.hash = r;
    } else if (!dlocHashEmpty()) {
      self.dispatch('on', '/' + dloc.hash.replace(/^(#\/|#|\/)/, ''));
    }
  }
  else {
    var routeTo = dlocHashEmpty() && r ? r : !dlocHashEmpty() ? dloc.hash.replace(/^#/, '') : null;
    if (routeTo) {
      window.history.replaceState({}, document.title, routeTo);
    }

    // Router has been initialized, but due to the chrome bug it will not
    // yet actually route HTML5 history state changes. Thus, decide if should route.
    if (routeTo || this.run_in_init === true) {
      this.handler();
    }
  }

  return this;
};

Router.prototype.explode = function () {
  var v = this.history === true ? this.getPath() : dloc.hash;
  if (v.charAt(1) === '/') { v=v.slice(1) }
  return v.slice(1, v.length).split("/");
};

Router.prototype.setRoute = function (i, v, val) {
  var url = this.explode();

  if (typeof i === 'number' && typeof v === 'string') {
    url[i] = v;
  }
  else if (typeof val === 'string') {
    url.splice(i, v, s);
  }
  else {
    url = [i];
  }

  listener.setHash(url.join('/'));
  return url;
};

//
// ### function insertEx(method, path, route, parent)
// #### @method {string} Method to insert the specific `route`.
// #### @path {Array} Parsed path to insert the `route` at.
// #### @route {Array|function} Route handlers to insert.
// #### @parent {Object} **Optional** Parent "routes" to insert into.
// insert a callback that will only occur once per the matched route.
//
Router.prototype.insertEx = function(method, path, route, parent) {
  if (method === "once") {
    method = "on";
    route = function(route) {
      var once = false;
      return function() {
        if (once) return;
        once = true;
        return route.apply(this, arguments);
      };
    }(route);
  }
  return this._insert(method, path, route, parent);
};

Router.prototype.getRoute = function (v) {
  var ret = v;

  if (typeof v === "number") {
    ret = this.explode()[v];
  }
  else if (typeof v === "string"){
    var h = this.explode();
    ret = h.indexOf(v);
  }
  else {
    ret = this.explode();
  }

  return ret;
};

Router.prototype.destroy = function () {
  listener.destroy(this.handler);
  return this;
};

Router.prototype.getPath = function () {
  var path = window.location.pathname;
  if (path.substr(0, 1) !== '/') {
    path = '/' + path;
  }
  return path;
};
function _every(arr, iterator) {
  for (var i = 0; i < arr.length; i += 1) {
    if (iterator(arr[i], i, arr) === false) {
      return;
    }
  }
}

function _flatten(arr) {
  var flat = [];
  for (var i = 0, n = arr.length; i < n; i++) {
    flat = flat.concat(arr[i]);
  }
  return flat;
}

function _asyncEverySeries(arr, iterator, callback) {
  if (!arr.length) {
    return callback();
  }
  var completed = 0;
  (function iterate() {
    iterator(arr[completed], function(err) {
      if (err || err === false) {
        callback(err);
        callback = function() {};
      } else {
        completed += 1;
        if (completed === arr.length) {
          callback();
        } else {
          iterate();
        }
      }
    });
  })();
}

function paramifyString(str, params, mod) {
  mod = str;
  for (var param in params) {
    if (params.hasOwnProperty(param)) {
      mod = params[param](str);
      if (mod !== str) {
        break;
      }
    }
  }
  return mod === str ? "([._a-zA-Z0-9-]+)" : mod;
}

function regifyString(str, params) {
  var matches, last = 0, out = "";
  while (matches = str.substr(last).match(/[^\w\d\- %@&]*\*[^\w\d\- %@&]*/)) {
    last = matches.index + matches[0].length;
    matches[0] = matches[0].replace(/^\*/, "([_.()!\\ %@&a-zA-Z0-9-]+)");
    out += str.substr(0, matches.index) + matches[0];
  }
  str = out += str.substr(last);
  var captures = str.match(/:([^\/]+)/ig), capture, length;
  if (captures) {
    length = captures.length;
    for (var i = 0; i < length; i++) {
      capture = captures[i];
      if (capture.slice(0, 2) === "::") {
        str = capture.slice(1);
      } else {
        str = str.replace(capture, paramifyString(capture, params));
      }
    }
  }
  return str;
}

function terminator(routes, delimiter, start, stop) {
  var last = 0, left = 0, right = 0, start = (start || "(").toString(), stop = (stop || ")").toString(), i;
  for (i = 0; i < routes.length; i++) {
    var chunk = routes[i];
    if (chunk.indexOf(start, last) > chunk.indexOf(stop, last) || ~chunk.indexOf(start, last) && !~chunk.indexOf(stop, last) || !~chunk.indexOf(start, last) && ~chunk.indexOf(stop, last)) {
      left = chunk.indexOf(start, last);
      right = chunk.indexOf(stop, last);
      if (~left && !~right || !~left && ~right) {
        var tmp = routes.slice(0, (i || 1) + 1).join(delimiter);
        routes = [ tmp ].concat(routes.slice((i || 1) + 1));
      }
      last = (right > left ? right : left) + 1;
      i = 0;
    } else {
      last = 0;
    }
  }
  return routes;
}

Router.prototype.configure = function(options) {
  options = options || {};
  for (var i = 0; i < this.methods.length; i++) {
    this._methods[this.methods[i]] = true;
  }
  this.recurse = options.recurse || this.recurse || false;
  this.async = options.async || false;
  this.delimiter = options.delimiter || "/";
  this.strict = typeof options.strict === "undefined" ? true : options.strict;
  this.notfound = options.notfound;
  this.resource = options.resource;
  this.history = options.html5history && this.historySupport || false;
  this.run_in_init = this.history === true && options.run_handler_in_init !== false;
  this.every = {
    after: options.after || null,
    before: options.before || null,
    on: options.on || null
  };
  return this;
};

Router.prototype.param = function(token, matcher) {
  if (token[0] !== ":") {
    token = ":" + token;
  }
  var compiled = new RegExp(token, "g");
  this.params[token] = function(str) {
    return str.replace(compiled, matcher.source || matcher);
  };
};

Router.prototype.on = Router.prototype.route = function(method, path, route) {
  var self = this;
  if (!route && typeof path == "function") {
    route = path;
    path = method;
    method = "on";
  }
  if (Array.isArray(path)) {
    return path.forEach(function(p) {
      self.on(method, p, route);
    });
  }
  if (path.source) {
    path = path.source.replace(/\\\//ig, "/");
  }
  if (Array.isArray(method)) {
    return method.forEach(function(m) {
      self.on(m.toLowerCase(), path, route);
    });
  }
  path = path.split(new RegExp(this.delimiter));
  path = terminator(path, this.delimiter);
  this.insert(method, this.scope.concat(path), route);
};

Router.prototype.dispatch = function(method, path, callback) {
  var self = this, fns = this.traverse(method, path, this.routes, ""), invoked = this._invoked, after;
  this._invoked = true;
  if (!fns || fns.length === 0) {
    this.last = [];
    if (typeof this.notfound === "function") {
      this.invoke([ this.notfound ], {
        method: method,
        path: path
      }, callback);
    }
    return false;
  }
  if (this.recurse === "forward") {
    fns = fns.reverse();
  }
  function updateAndInvoke() {
    self.last = fns.after;
    self.invoke(self.runlist(fns), self, callback);
  }
  after = this.every && this.every.after ? [ this.every.after ].concat(this.last) : [ this.last ];
  if (after && after.length > 0 && invoked) {
    if (this.async) {
      this.invoke(after, this, updateAndInvoke);
    } else {
      this.invoke(after, this);
      updateAndInvoke();
    }
    return true;
  }
  updateAndInvoke();
  return true;
};

Router.prototype.invoke = function(fns, thisArg, callback) {
  var self = this;
  var apply;
  if (this.async) {
    apply = function(fn, next) {
      if (Array.isArray(fn)) {
        return _asyncEverySeries(fn, apply, next);
      } else if (typeof fn == "function") {
        fn.apply(thisArg, fns.captures.concat(next));
      }
    };
    _asyncEverySeries(fns, apply, function() {
      if (callback) {
        callback.apply(thisArg, arguments);
      }
    });
  } else {
    apply = function(fn) {
      if (Array.isArray(fn)) {
        return _every(fn, apply);
      } else if (typeof fn === "function") {
        return fn.apply(thisArg, fns.captures || []);
      } else if (typeof fn === "string" && self.resource) {
        self.resource[fn].apply(thisArg, fns.captures || []);
      }
    };
    _every(fns, apply);
  }
};

Router.prototype.traverse = function(method, path, routes, regexp, filter) {
  var fns = [], current, exact, match, next, that;
  function filterRoutes(routes) {
    if (!filter) {
      return routes;
    }
    function deepCopy(source) {
      var result = [];
      for (var i = 0; i < source.length; i++) {
        result[i] = Array.isArray(source[i]) ? deepCopy(source[i]) : source[i];
      }
      return result;
    }
    function applyFilter(fns) {
      for (var i = fns.length - 1; i >= 0; i--) {
        if (Array.isArray(fns[i])) {
          applyFilter(fns[i]);
          if (fns[i].length === 0) {
            fns.splice(i, 1);
          }
        } else {
          if (!filter(fns[i])) {
            fns.splice(i, 1);
          }
        }
      }
    }
    var newRoutes = deepCopy(routes);
    newRoutes.matched = routes.matched;
    newRoutes.captures = routes.captures;
    newRoutes.after = routes.after.filter(filter);
    applyFilter(newRoutes);
    return newRoutes;
  }
  if (path === this.delimiter && routes[method]) {
    next = [ [ routes.before, routes[method] ].filter(Boolean) ];
    next.after = [ routes.after ].filter(Boolean);
    next.matched = true;
    next.captures = [];
    return filterRoutes(next);
  }
  for (var r in routes) {
    if (routes.hasOwnProperty(r) && (!this._methods[r] || this._methods[r] && typeof routes[r] === "object" && !Array.isArray(routes[r]))) {
      current = exact = regexp + this.delimiter + r;
      if (!this.strict) {
        exact += "[" + this.delimiter + "]?";
      }
      match = path.match(new RegExp("^" + exact));
      if (!match) {
        continue;
      }
      if (match[0] && match[0] == path && routes[r][method]) {
        next = [ [ routes[r].before, routes[r][method] ].filter(Boolean) ];
        next.after = [ routes[r].after ].filter(Boolean);
        next.matched = true;
        next.captures = match.slice(1);
        if (this.recurse && routes === this.routes) {
          next.push([ routes.before, routes.on ].filter(Boolean));
          next.after = next.after.concat([ routes.after ].filter(Boolean));
        }
        return filterRoutes(next);
      }
      next = this.traverse(method, path, routes[r], current);
      if (next.matched) {
        if (next.length > 0) {
          fns = fns.concat(next);
        }
        if (this.recurse) {
          fns.push([ routes[r].before, routes[r].on ].filter(Boolean));
          next.after = next.after.concat([ routes[r].after ].filter(Boolean));
          if (routes === this.routes) {
            fns.push([ routes["before"], routes["on"] ].filter(Boolean));
            next.after = next.after.concat([ routes["after"] ].filter(Boolean));
          }
        }
        fns.matched = true;
        fns.captures = next.captures;
        fns.after = next.after;
        return filterRoutes(fns);
      }
    }
  }
  return false;
};

Router.prototype.insert = function(method, path, route, parent) {
  var methodType, parentType, isArray, nested, part;
  path = path.filter(function(p) {
    return p && p.length > 0;
  });
  parent = parent || this.routes;
  part = path.shift();
  if (/\:|\*/.test(part) && !/\\d|\\w/.test(part)) {
    part = regifyString(part, this.params);
  }
  if (path.length > 0) {
    parent[part] = parent[part] || {};
    return this.insert(method, path, route, parent[part]);
  }
  if (!part && !path.length && parent === this.routes) {
    methodType = typeof parent[method];
    switch (methodType) {
     case "function":
      parent[method] = [ parent[method], route ];
      return;
     case "object":
      parent[method].push(route);
      return;
     case "undefined":
      parent[method] = route;
      return;
    }
    return;
  }
  parentType = typeof parent[part];
  isArray = Array.isArray(parent[part]);
  if (parent[part] && !isArray && parentType == "object") {
    methodType = typeof parent[part][method];
    switch (methodType) {
     case "function":
      parent[part][method] = [ parent[part][method], route ];
      return;
     case "object":
      parent[part][method].push(route);
      return;
     case "undefined":
      parent[part][method] = route;
      return;
    }
  } else if (parentType == "undefined") {
    nested = {};
    nested[method] = route;
    parent[part] = nested;
    return;
  }
  throw new Error("Invalid route context: " + parentType);
};



Router.prototype.extend = function(methods) {
  var self = this, len = methods.length, i;
  function extend(method) {
    self._methods[method] = true;
    self[method] = function() {
      var extra = arguments.length === 1 ? [ method, "" ] : [ method ];
      self.on.apply(self, extra.concat(Array.prototype.slice.call(arguments)));
    };
  }
  for (i = 0; i < len; i++) {
    extend(methods[i]);
  }
};

Router.prototype.runlist = function(fns) {
  var runlist = this.every && this.every.before ? [ this.every.before ].concat(_flatten(fns)) : _flatten(fns);
  if (this.every && this.every.on) {
    runlist.push(this.every.on);
  }
  runlist.captures = fns.captures;
  runlist.source = fns.source;
  return runlist;
};

Router.prototype.mount = function(routes, path) {
  if (!routes || typeof routes !== "object" || Array.isArray(routes)) {
    return;
  }
  var self = this;
  path = path || [];
  if (!Array.isArray(path)) {
    path = path.split(self.delimiter);
  }
  function insertOrMount(route, local) {
    var rename = route, parts = route.split(self.delimiter), routeType = typeof routes[route], isRoute = parts[0] === "" || !self._methods[parts[0]], event = isRoute ? "on" : rename;
    if (isRoute) {
      rename = rename.slice((rename.match(new RegExp("^" + self.delimiter)) || [ "" ])[0].length);
      parts.shift();
    }
    if (isRoute && routeType === "object" && !Array.isArray(routes[route])) {
      local = local.concat(parts);
      self.mount(routes[route], local);
      return;
    }
    if (isRoute) {
      local = local.concat(rename.split(self.delimiter));
      local = terminator(local, self.delimiter);
    }
    self.insert(event, local, routes[route]);
  }
  for (var route in routes) {
    if (routes.hasOwnProperty(route)) {
      insertOrMount(route, path.slice(0));
    }
  }
};



}(typeof exports === "object" ? exports : window));
},{}],3:[function(require,module,exports){
module.exports = "<style type=\"text/css\">\n    .not-found {\n        text-align: center;\n        padding-top: 100px;\n    }\n</style>\n<div class=\"not-found\">\n    <h1>404</h1>\n    <p>Sorry, page not found.</p>\n</div>";

},{}],4:[function(require,module,exports){
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
},{"./404.html":3}],5:[function(require,module,exports){
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
             *      path: 'root.user-list.user-detail',
             *      params: { userId: 123 },
             *      activate: true
             *  }
             * */

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
},{"./router":9,"./url-resolver":12,"./utils":13}],6:[function(require,module,exports){
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

    navigate: function(path, params) {
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
},{"./router":9,"./url-resolver":12,"./utils":13}],7:[function(require,module,exports){
module.exports = "<!-- ko foreach: $parent.koko.stateNode.children -->\n<div data-bind=\"\n    component: {\n        name: component,\n        params: { stateNode: $data, parent: $parents[1] }\n    }, visible: isVisible()\n\"></div>\n<!-- /ko -->";

},{}],8:[function(require,module,exports){
function init(ko) {
    ko.components.register('koko-view', {
        template: require('./koko-view.html')
    });
}

module.exports = {
    init: init
};
},{"./koko-view.html":7}],9:[function(require,module,exports){
var director = require('director');
var utils    = require('./utils');

/*
    This is a low-level router that calls the provided callback
    whenever the user navigates to a configured route.
    The callback receives two parameters:
     - The route matched pattern
     - An object containing the parameter values for the route
*/

var router;

// Config.
var routes;           // A array of "/route/:patterns"
var routeParams;      // An array of named parameter definitions
var redirects;        // An object mapping "a/rout:pattern" to "another/url"

function normalizeUrlFragment(url) {
    if (!url) {
        return '/';
    }
    if (url.slice(0, 1) !== '/') {
        url = '/' + url;
    }
    if (url.slice(url.length - 1, 1) !== '/') {
        url += '/';
    }
    return url;
}

function startRouter(config, cb) {
    // The router can only be started once.
    if (routes) {
        throw new Error('The router is already started.');
    }

    // Validate config.
    routes           = config.routes;
    routeParams      = config.routeParams;
    redirects        = config.redirects;
    if (!routes  || !routeParams || !redirects) {
        throw new Error ('Invalid configuration');
    }

    // Supply default routeParam values.
    var paramName;
    var fnNoop = function (o) { return o; };
    for (paramName in config.routeParams) {
        config.routeParams[paramName] = routeParams[paramName] || {};
        config.routeParams[paramName].parse = routeParams[paramName].parse || fnNoop;
        config.routeParams[paramName].regex = routeParams[paramName].regex || /(.*)/g;
    }

    // Create router instance.
    router = new director.Router();
    router.configure({
        html5history: config.html5History
    });

    // Register param name/regex pairs.
    // Director will validate that params match the supplied regex.
    // If they don't, the user will see the 404 route.
    for (paramName in routeParams) {
        router.param(paramName, routeParams[paramName].regex);
    }

    // Register route patterns.
    var route;
    for (var i in routes) {
        route = routes[i];
        router.on(utils.optionalizeTrailingSlash(route), onRoute.bind(window, route, cb));
    }

    // Register redirects.
    for (route in redirects) { // jshint ignore:line
        /* jshint -W083 */
        router.on(utils.optionalizeTrailingSlash(route), function() {
            navigate(redirects[route]);
        });
        /* jshint +W083 */
    }

    // If route not found, set the component path to blank.
    router.on('.*', onRoute.bind(window, '', cb));

    // If we receive a url that looks like /root/something/ in a browser
    // using hash based routing, we redirect to root/#/something
    // NOte: Director handles the inverse situtation nicely.
    if (!router.history) {
        var path = normalizeUrlFragment(window.location.pathname);
        var root = normalizeUrlFragment(config.rootPath);
        if (path.slice(0, root.length) === root) {
            path = path.slice(root.length - 1); // Leave starting "/"
        } else {
            throw new Error('Path does not start with the provided "root" path');
        }
        if (path !== '/') {
            window.location = root + '#' + path;
            return;
        }
    }
    router.init(router.history ? '' : window.location.pathname);
}

function navigate(url) {
    if (url.slice(0, 2) === '/#') {
        url = url.slice(2);
    }
    router.setRoute(url);
}

function onRoute(route, cb/*, params */) {
    var paramsList = Array.prototype.slice.call(arguments, 2);
    var paramsObj = {};
    var paramCount = 0;
    utils.processPattern(route, function(part, isParam) {
        if (isParam) {
            paramsObj[part] = routeParams[part].parse(paramsList[paramCount]);
            paramCount++;
        }
    });
    cb(route, paramsObj);
}

module.exports = {
    start: startRouter,
    navigate: navigate
};
},{"./utils":13,"director":2}],10:[function(require,module,exports){
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
},{"./utils":13}],11:[function(require,module,exports){
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
},{"./state-node":10}],12:[function(require,module,exports){
var stateTree = require('./state-tree');
var utils     = require('./utils');

var ko;
var config;

function init(ko_, config_) {
    ko = ko_;
    config = config_;
}

function resolveAbsolutePathToUrl(path, params) {
    // Get pattern.
    params = params || {};
    var patterns = [];
    utils.forOwn(config.routes, function(pattern, _path) {
        if (_path === path) {
            patterns.push(pattern);
        }
    });

    // Substitute parameters.
    var urls = patterns.map(function(pattern) {
        var parts = [];
        var isMatch = true;
        utils.processPattern(pattern, function (part, isParam) {
            if (isParam) {
                if (params.hasOwnProperty(part)) {
                    var param = params[part] + '';
                    var regex = config.routeParams[part].regex;
                    var match = param.match(regex);
                    if (match && match[0] === param) {
                        parts.push(params[part] + '');
                    }
                    else {
                        isMatch = false;
                        return false; // Stop.
                    }
                } else {
                    isMatch = false;
                    return false; // Stop.
                }
            } else {
                parts.push(part);
            }
        });
        return (isMatch ? parts.join('/') : null);
    })
    .filter(function(url) {
        return url !== null;
    });

    // Validate result.
    if (urls.length === 1) {
        return (config.html5History ? '' : '/#') + urls[0];
    } else {
        var s = ' for path "' + path + '" and params "' + JSON.stringify(params) + '".';
        if (urls.length === 0) {
            throw new Error('Could not resolve url' + s);
        }
        throw new Error('Multple URLs match' + s);
    }
}

function resolvePathToUrl(path, params, stateNode) {
    params = params || {};
    if (isPathRelative(path)) {
        // Make path absolute.
        path = stateNode.getPathToHere() + (path === '.' ? '' : path);

        // Use current params where not supplied.
        var curParams = stateNode.params;
        for (var paramName in curParams) {
            if (!params[paramName]) {
                params[paramName] = curParams[paramName]();
            }
        }
    }
    return resolveAbsolutePathToUrl(path, params);
}

function pathMatchesCurrent(path, params, stateNode) {
    // root.thing matches root.thing.other-thing (partial match).
    var providedPath = resolvePathToUrl(path, params, stateNode);
    var curPath = resolveAbsolutePathToUrl(stateTree.getActivePath(), ko.toJS(stateNode.routeParams));
    return curPath.indexOf(providedPath) === 0;
}

function isPathRelative (path) {
    return path.indexOf('.') === 0;
}

module.exports = {
    init: init,
    resolveAbsolutePathToUrl: resolveAbsolutePathToUrl,
    resolvePathToUrl: resolvePathToUrl,
    pathMatchesCurrent: pathMatchesCurrent,
    isPathRelative: isPathRelative
};
},{"./state-tree":11,"./utils":13}],13:[function(require,module,exports){
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
},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMva29rby5qcyIsIm5vZGVfbW9kdWxlcy9kaXJlY3Rvci9idWlsZC9kaXJlY3Rvci5qcyIsInNyYy80MDQuaHRtbCIsInNyYy80MDQuanMiLCJzcmMvYmluZGluZ3MuanMiLCJzcmMvY29tcG9uZW50LmpzIiwic3JjL2tva28tdmlldy5odG1sIiwic3JjL2tva28tdmlldy5qcyIsInNyYy9yb3V0ZXIuanMiLCJzcmMvc3RhdGUtbm9kZS5qcyIsInNyYy9zdGF0ZS10cmVlLmpzIiwic3JjL3VybC1yZXNvbHZlci5qcyIsInNyYy91dGlscy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5c0JBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9FQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgcm91dGVyICAgICAgPSByZXF1aXJlKCcuL3JvdXRlcicpO1xudmFyIHN0YXRlTm9kZSAgID0gcmVxdWlyZSgnLi9zdGF0ZS1ub2RlJyk7XG52YXIgc3RhdGVUcmVlICAgPSByZXF1aXJlKCcuL3N0YXRlLXRyZWUnKTtcbnZhciB1cmxSZXNvbHZlciA9IHJlcXVpcmUoJy4vdXJsLXJlc29sdmVyJyk7XG52YXIgY29tcG9uZW50ICAgPSByZXF1aXJlKCcuL2NvbXBvbmVudCcpO1xudmFyIGJpbmRpbmdzICAgID0gcmVxdWlyZSgnLi9iaW5kaW5ncycpO1xudmFyIGtva29WaWV3ICAgID0gcmVxdWlyZSgnLi9rb2tvLXZpZXcnKTtcbnZhciBfNDA0ICAgICAgICA9IHJlcXVpcmUoJy4vNDA0Jyk7XG52YXIgdXRpbHMgICAgICAgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbnZhciBrbztcbnZhciBjb25maWc7XG5cbmZ1bmN0aW9uIGluaXQoa29fKSB7XG4gICAga28gPSBrb187XG4gICAgY29tcG9uZW50LmluaXQoa28pO1xuICAgIGtva29WaWV3LmluaXQoa28pO1xuICAgIF80MDQuaW5pdChrbywgY29tcG9uZW50LmNyZWF0ZUNvbXBvbmVudFZpZXdNb2RlbCk7XG4gICAgYmluZGluZ3MuaW5pdChrbyk7XG4gICAgc2V0RWFybHlFeHBvcnRzKCk7XG59XG5cbmZ1bmN0aW9uIHNldENvbmZpZyhjb25maWdfKSB7XG4gICAgY29uZmlnID0gY29uZmlnXztcblxuICAgIC8vIEluaXQgc3R1ZmYgdG8gaW5qZWN0IGRlcGVuZGVuY2llcy5cbiAgICBzdGF0ZU5vZGUuaW5pdChrbywgY29uZmlnLCBzdGF0ZVRyZWUpO1xuICAgIHN0YXRlVHJlZS5pbml0KGtvKTtcbiAgICB1cmxSZXNvbHZlci5pbml0KGtvLCBjb25maWcpO1xuXG4gICAgLy8gR2V0IGxpc3Qgb2Ygcm91dGVzIGZvciByb3V0ZXJcbiAgICB2YXIgcm91dGU7XG4gICAgdmFyIHJvdXRlcyA9IFtdO1xuICAgIGZvciAocm91dGUgaW4gY29uZmlnLnJvdXRlcykge1xuICAgICAgICByb3V0ZXMucHVzaChyb3V0ZSk7XG4gICAgfVxuXG4gICAgLy8gR2V0IHJlc29sdmVkIHJlZGlyZWN0cyBmb3Igcm91dGVyLlxuICAgIHZhciByZWRpcmVjdHMgPSB7fTtcbiAgICBmb3IgKHJvdXRlIGluIGNvbmZpZy5yZWRpcmVjdHMpIHtcbiAgICAgICAgdmFyIHRhcmdldCA9IGNvbmZpZy5yZWRpcmVjdHNbcm91dGVdO1xuICAgICAgICBpZiAodHlwZW9mIHRhcmdldCA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIHJlZGlyZWN0c1tyb3V0ZV0gPSB1cmxSZXNvbHZlci5yZXNvbHZlQWJzb2x1dGVQYXRoVG9VcmwodGFyZ2V0LnBhdGgsIHRhcmdldC5wYXJhbXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVkaXJlY3RzW3JvdXRlXSA9IHVybFJlc29sdmVyLnJlc29sdmVBYnNvbHV0ZVBhdGhUb1VybCh0YXJnZXQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gU3RhcnQgcm91dGVyLlxuICAgIHJvdXRlci5zdGFydCh7XG4gICAgICAgIHJvb3RVcmw6IGNvbmZpZy5yb290VXJsLFxuICAgICAgICByb3V0ZXM6IHJvdXRlcyxcbiAgICAgICAgcm91dGVQYXJhbXM6IGNvbmZpZy5yb3V0ZVBhcmFtcyxcbiAgICAgICAgcmVkaXJlY3RzOiByZWRpcmVjdHMsXG4gICAgICAgIGh0bWw1SGlzdG9yeTogY29uZmlnLmh0bWw1SGlzdG9yeSB8fCBmYWxzZVxuICAgIH0sIG9uUm91dGUpO1xuXG4gICAgLy8gRXhwb3J0IEFQSS5cbiAgICBzZXRMYXRlRXhwb3J0cygpO1xufVxuXG5mdW5jdGlvbiBvblJvdXRlKHJvdXRlLCBwYXJhbXMpIHtcbiAgICBpZiAocm91dGUpIHtcbiAgICAgICAgc3RhdGVUcmVlLnVwZGF0ZShjb25maWcucm91dGVzW3JvdXRlXSwgcGFyYW1zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBzdGF0ZVRyZWUudXBkYXRlKGNvbmZpZy5ub3RGb3VuZENvbXBvbmVudCB8fCAna29rb0RlZmF1bHQ0MDQnLCBwYXJhbXMpO1xuICAgIH1cblxufVxuXG5mdW5jdGlvbiBuYXZpZ2F0ZVRvUGF0aChwYXRoLCBwYXJhbXMsIHN0YXRlTm9kZSkge1xuICAgIHJvdXRlci5uYXZpZ2F0ZSh1cmxSZXNvbHZlci5yZXNvbHZlUGF0aFRvVXJsKHBhdGgsIHBhcmFtcywgc3RhdGVOb2RlKSk7XG59XG5cbmZ1bmN0aW9uIG5hdmlnYXRlVG9VcmwodXJsKSB7XG4gICAgcm91dGVyLm5hdmlnYXRlKHVybCk7XG59XG5cbi8vIENhbGxlZCBieSAuaW5pdCgpXG5mdW5jdGlvbiBzZXRFYXJseUV4cG9ydHMoKSB7XG4gICAgdXRpbHMuYXNzaWduKG1vZHVsZS5leHBvcnRzLCB7XG4gICAgICAgIGNvbXBvbmVudFZpZXdNb2RlbDogY29tcG9uZW50LmNyZWF0ZUNvbXBvbmVudFZpZXdNb2RlbCxcbiAgICAgICAgY29uZmlnOiBzZXRDb25maWdcbiAgICB9KTtcbn1cblxuLy8gQ2FsbGVkIGJ5IC5ydW4oKVxuZnVuY3Rpb24gc2V0TGF0ZUV4cG9ydHMoKSB7XG4gICAgdXRpbHMuYXNzaWduKG1vZHVsZS5leHBvcnRzLCB7XG4gICAgICAgIHJlc29sdmU6IHVybFJlc29sdmVyLnJlc29sdmVQYXRoVG9VcmwsXG4gICAgICAgIG5hdmlnYXRlVG9QYXRoOiBuYXZpZ2F0ZVRvUGF0aCxcbiAgICAgICAgbmF2aWdhdGVUb1VybDogbmF2aWdhdGVUb1VybCxcbiAgICAgICAgcm9vdDoge1xuICAgICAgICAgICAgc3RhdGVOb2RlOiBzdGF0ZVRyZWUuZ2V0Um9vdCgpXG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxubW9kdWxlLmV4cG9ydHMuaW5pdCA9IGluaXQ7IiwiXG5cbi8vXG4vLyBHZW5lcmF0ZWQgb24gRnJpIERlYyAyNyAyMDEzIDEyOjAyOjExIEdNVC0wNTAwIChFU1QpIGJ5IE5vZGVqaXRzdSwgSW5jIChVc2luZyBDb2Rlc3VyZ2VvbikuXG4vLyBWZXJzaW9uIDEuMi4yXG4vL1xuXG4oZnVuY3Rpb24gKGV4cG9ydHMpIHtcblxuLypcbiAqIGJyb3dzZXIuanM6IEJyb3dzZXIgc3BlY2lmaWMgZnVuY3Rpb25hbGl0eSBmb3IgZGlyZWN0b3IuXG4gKlxuICogKEMpIDIwMTEsIE5vZGVqaXRzdSBJbmMuXG4gKiBNSVQgTElDRU5TRVxuICpcbiAqL1xuXG5pZiAoIUFycmF5LnByb3RvdHlwZS5maWx0ZXIpIHtcbiAgQXJyYXkucHJvdG90eXBlLmZpbHRlciA9IGZ1bmN0aW9uKGZpbHRlciwgdGhhdCkge1xuICAgIHZhciBvdGhlciA9IFtdLCB2O1xuICAgIGZvciAodmFyIGkgPSAwLCBuID0gdGhpcy5sZW5ndGg7IGkgPCBuOyBpKyspIHtcbiAgICAgIGlmIChpIGluIHRoaXMgJiYgZmlsdGVyLmNhbGwodGhhdCwgdiA9IHRoaXNbaV0sIGksIHRoaXMpKSB7XG4gICAgICAgIG90aGVyLnB1c2godik7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvdGhlcjtcbiAgfTtcbn1cblxuaWYgKCFBcnJheS5pc0FycmF5KXtcbiAgQXJyYXkuaXNBcnJheSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbiAgfTtcbn1cblxudmFyIGRsb2MgPSBkb2N1bWVudC5sb2NhdGlvbjtcblxuZnVuY3Rpb24gZGxvY0hhc2hFbXB0eSgpIHtcbiAgLy8gTm9uLUlFIGJyb3dzZXJzIHJldHVybiAnJyB3aGVuIHRoZSBhZGRyZXNzIGJhciBzaG93cyAnIyc7IERpcmVjdG9yJ3MgbG9naWNcbiAgLy8gYXNzdW1lcyBib3RoIG1lYW4gZW1wdHkuXG4gIHJldHVybiBkbG9jLmhhc2ggPT09ICcnIHx8IGRsb2MuaGFzaCA9PT0gJyMnO1xufVxuXG52YXIgbGlzdGVuZXIgPSB7XG4gIG1vZGU6ICdtb2Rlcm4nLFxuICBoYXNoOiBkbG9jLmhhc2gsXG4gIGhpc3Rvcnk6IGZhbHNlLFxuXG4gIGNoZWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGggPSBkbG9jLmhhc2g7XG4gICAgaWYgKGggIT0gdGhpcy5oYXNoKSB7XG4gICAgICB0aGlzLmhhc2ggPSBoO1xuICAgICAgdGhpcy5vbkhhc2hDaGFuZ2VkKCk7XG4gICAgfVxuICB9LFxuXG4gIGZpcmU6IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5tb2RlID09PSAnbW9kZXJuJykge1xuICAgICAgdGhpcy5oaXN0b3J5ID09PSB0cnVlID8gd2luZG93Lm9ucG9wc3RhdGUoKSA6IHdpbmRvdy5vbmhhc2hjaGFuZ2UoKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0aGlzLm9uSGFzaENoYW5nZWQoKTtcbiAgICB9XG4gIH0sXG5cbiAgaW5pdDogZnVuY3Rpb24gKGZuLCBoaXN0b3J5KSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuaGlzdG9yeSA9IGhpc3Rvcnk7XG5cbiAgICBpZiAoIVJvdXRlci5saXN0ZW5lcnMpIHtcbiAgICAgIFJvdXRlci5saXN0ZW5lcnMgPSBbXTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvbmNoYW5nZShvbkNoYW5nZUV2ZW50KSB7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbCA9IFJvdXRlci5saXN0ZW5lcnMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIFJvdXRlci5saXN0ZW5lcnNbaV0ob25DaGFuZ2VFdmVudCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy9ub3RlIElFOCBpcyBiZWluZyBjb3VudGVkIGFzICdtb2Rlcm4nIGJlY2F1c2UgaXQgaGFzIHRoZSBoYXNoY2hhbmdlIGV2ZW50XG4gICAgaWYgKCdvbmhhc2hjaGFuZ2UnIGluIHdpbmRvdyAmJiAoZG9jdW1lbnQuZG9jdW1lbnRNb2RlID09PSB1bmRlZmluZWRcbiAgICAgIHx8IGRvY3VtZW50LmRvY3VtZW50TW9kZSA+IDcpKSB7XG4gICAgICAvLyBBdCBsZWFzdCBmb3Igbm93IEhUTUw1IGhpc3RvcnkgaXMgYXZhaWxhYmxlIGZvciAnbW9kZXJuJyBicm93c2VycyBvbmx5XG4gICAgICBpZiAodGhpcy5oaXN0b3J5ID09PSB0cnVlKSB7XG4gICAgICAgIC8vIFRoZXJlIGlzIGFuIG9sZCBidWcgaW4gQ2hyb21lIHRoYXQgY2F1c2VzIG9ucG9wc3RhdGUgdG8gZmlyZSBldmVuXG4gICAgICAgIC8vIHVwb24gaW5pdGlhbCBwYWdlIGxvYWQuIFNpbmNlIHRoZSBoYW5kbGVyIGlzIHJ1biBtYW51YWxseSBpbiBpbml0KCksXG4gICAgICAgIC8vIHRoaXMgd291bGQgY2F1c2UgQ2hyb21lIHRvIHJ1biBpdCB0d2lzZS4gQ3VycmVudGx5IHRoZSBvbmx5XG4gICAgICAgIC8vIHdvcmthcm91bmQgc2VlbXMgdG8gYmUgdG8gc2V0IHRoZSBoYW5kbGVyIGFmdGVyIHRoZSBpbml0aWFsIHBhZ2UgbG9hZFxuICAgICAgICAvLyBodHRwOi8vY29kZS5nb29nbGUuY29tL3AvY2hyb21pdW0vaXNzdWVzL2RldGFpbD9pZD02MzA0MFxuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHdpbmRvdy5vbnBvcHN0YXRlID0gb25jaGFuZ2U7XG4gICAgICAgIH0sIDUwMCk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgd2luZG93Lm9uaGFzaGNoYW5nZSA9IG9uY2hhbmdlO1xuICAgICAgfVxuICAgICAgdGhpcy5tb2RlID0gJ21vZGVybic7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgLy9cbiAgICAgIC8vIElFIHN1cHBvcnQsIGJhc2VkIG9uIGEgY29uY2VwdCBieSBFcmlrIEFydmlkc29uIC4uLlxuICAgICAgLy9cbiAgICAgIHZhciBmcmFtZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lmcmFtZScpO1xuICAgICAgZnJhbWUuaWQgPSAnc3RhdGUtZnJhbWUnO1xuICAgICAgZnJhbWUuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoZnJhbWUpO1xuICAgICAgdGhpcy53cml0ZUZyYW1lKCcnKTtcblxuICAgICAgaWYgKCdvbnByb3BlcnR5Y2hhbmdlJyBpbiBkb2N1bWVudCAmJiAnYXR0YWNoRXZlbnQnIGluIGRvY3VtZW50KSB7XG4gICAgICAgIGRvY3VtZW50LmF0dGFjaEV2ZW50KCdvbnByb3BlcnR5Y2hhbmdlJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGlmIChldmVudC5wcm9wZXJ0eU5hbWUgPT09ICdsb2NhdGlvbicpIHtcbiAgICAgICAgICAgIHNlbGYuY2hlY2soKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICB3aW5kb3cuc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkgeyBzZWxmLmNoZWNrKCk7IH0sIDUwKTtcblxuICAgICAgdGhpcy5vbkhhc2hDaGFuZ2VkID0gb25jaGFuZ2U7XG4gICAgICB0aGlzLm1vZGUgPSAnbGVnYWN5JztcbiAgICB9XG5cbiAgICBSb3V0ZXIubGlzdGVuZXJzLnB1c2goZm4pO1xuXG4gICAgcmV0dXJuIHRoaXMubW9kZTtcbiAgfSxcblxuICBkZXN0cm95OiBmdW5jdGlvbiAoZm4pIHtcbiAgICBpZiAoIVJvdXRlciB8fCAhUm91dGVyLmxpc3RlbmVycykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBsaXN0ZW5lcnMgPSBSb3V0ZXIubGlzdGVuZXJzO1xuXG4gICAgZm9yICh2YXIgaSA9IGxpc3RlbmVycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgaWYgKGxpc3RlbmVyc1tpXSA9PT0gZm4pIHtcbiAgICAgICAgbGlzdGVuZXJzLnNwbGljZShpLCAxKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgc2V0SGFzaDogZnVuY3Rpb24gKHMpIHtcbiAgICAvLyBNb3ppbGxhIGFsd2F5cyBhZGRzIGFuIGVudHJ5IHRvIHRoZSBoaXN0b3J5XG4gICAgaWYgKHRoaXMubW9kZSA9PT0gJ2xlZ2FjeScpIHtcbiAgICAgIHRoaXMud3JpdGVGcmFtZShzKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5oaXN0b3J5ID09PSB0cnVlKSB7XG4gICAgICB3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUoe30sIGRvY3VtZW50LnRpdGxlLCBzKTtcbiAgICAgIC8vIEZpcmUgYW4gb25wb3BzdGF0ZSBldmVudCBtYW51YWxseSBzaW5jZSBwdXNoaW5nIGRvZXMgbm90IG9idmlvdXNseVxuICAgICAgLy8gdHJpZ2dlciB0aGUgcG9wIGV2ZW50LlxuICAgICAgdGhpcy5maXJlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGRsb2MuaGFzaCA9IChzWzBdID09PSAnLycpID8gcyA6ICcvJyArIHM7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIHdyaXRlRnJhbWU6IGZ1bmN0aW9uIChzKSB7XG4gICAgLy8gSUUgc3VwcG9ydC4uLlxuICAgIHZhciBmID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3N0YXRlLWZyYW1lJyk7XG4gICAgdmFyIGQgPSBmLmNvbnRlbnREb2N1bWVudCB8fCBmLmNvbnRlbnRXaW5kb3cuZG9jdW1lbnQ7XG4gICAgZC5vcGVuKCk7XG4gICAgZC53cml0ZShcIjxzY3JpcHQ+X2hhc2ggPSAnXCIgKyBzICsgXCInOyBvbmxvYWQgPSBwYXJlbnQubGlzdGVuZXIuc3luY0hhc2g7PHNjcmlwdD5cIik7XG4gICAgZC5jbG9zZSgpO1xuICB9LFxuXG4gIHN5bmNIYXNoOiBmdW5jdGlvbiAoKSB7XG4gICAgLy8gSUUgc3VwcG9ydC4uLlxuICAgIHZhciBzID0gdGhpcy5faGFzaDtcbiAgICBpZiAocyAhPSBkbG9jLmhhc2gpIHtcbiAgICAgIGRsb2MuaGFzaCA9IHM7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIG9uSGFzaENoYW5nZWQ6IGZ1bmN0aW9uICgpIHt9XG59O1xuXG52YXIgUm91dGVyID0gZXhwb3J0cy5Sb3V0ZXIgPSBmdW5jdGlvbiAocm91dGVzKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBSb3V0ZXIpKSByZXR1cm4gbmV3IFJvdXRlcihyb3V0ZXMpO1xuXG4gIHRoaXMucGFyYW1zICAgPSB7fTtcbiAgdGhpcy5yb3V0ZXMgICA9IHt9O1xuICB0aGlzLm1ldGhvZHMgID0gWydvbicsICdvbmNlJywgJ2FmdGVyJywgJ2JlZm9yZSddO1xuICB0aGlzLnNjb3BlICAgID0gW107XG4gIHRoaXMuX21ldGhvZHMgPSB7fTtcblxuICB0aGlzLl9pbnNlcnQgPSB0aGlzLmluc2VydDtcbiAgdGhpcy5pbnNlcnQgPSB0aGlzLmluc2VydEV4O1xuXG4gIHRoaXMuaGlzdG9yeVN1cHBvcnQgPSAod2luZG93Lmhpc3RvcnkgIT0gbnVsbCA/IHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZSA6IG51bGwpICE9IG51bGxcblxuICB0aGlzLmNvbmZpZ3VyZSgpO1xuICB0aGlzLm1vdW50KHJvdXRlcyB8fCB7fSk7XG59O1xuXG5Sb3V0ZXIucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAocikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMuaGFuZGxlciA9IGZ1bmN0aW9uKG9uQ2hhbmdlRXZlbnQpIHtcbiAgICB2YXIgbmV3VVJMID0gb25DaGFuZ2VFdmVudCAmJiBvbkNoYW5nZUV2ZW50Lm5ld1VSTCB8fCB3aW5kb3cubG9jYXRpb24uaGFzaDtcbiAgICB2YXIgdXJsID0gc2VsZi5oaXN0b3J5ID09PSB0cnVlID8gc2VsZi5nZXRQYXRoKCkgOiBuZXdVUkwucmVwbGFjZSgvLiojLywgJycpO1xuICAgIHNlbGYuZGlzcGF0Y2goJ29uJywgdXJsLmNoYXJBdCgwKSA9PT0gJy8nID8gdXJsIDogJy8nICsgdXJsKTtcbiAgfTtcblxuICBsaXN0ZW5lci5pbml0KHRoaXMuaGFuZGxlciwgdGhpcy5oaXN0b3J5KTtcblxuICBpZiAodGhpcy5oaXN0b3J5ID09PSBmYWxzZSkge1xuICAgIGlmIChkbG9jSGFzaEVtcHR5KCkgJiYgcikge1xuICAgICAgZGxvYy5oYXNoID0gcjtcbiAgICB9IGVsc2UgaWYgKCFkbG9jSGFzaEVtcHR5KCkpIHtcbiAgICAgIHNlbGYuZGlzcGF0Y2goJ29uJywgJy8nICsgZGxvYy5oYXNoLnJlcGxhY2UoL14oI1xcL3wjfFxcLykvLCAnJykpO1xuICAgIH1cbiAgfVxuICBlbHNlIHtcbiAgICB2YXIgcm91dGVUbyA9IGRsb2NIYXNoRW1wdHkoKSAmJiByID8gciA6ICFkbG9jSGFzaEVtcHR5KCkgPyBkbG9jLmhhc2gucmVwbGFjZSgvXiMvLCAnJykgOiBudWxsO1xuICAgIGlmIChyb3V0ZVRvKSB7XG4gICAgICB3aW5kb3cuaGlzdG9yeS5yZXBsYWNlU3RhdGUoe30sIGRvY3VtZW50LnRpdGxlLCByb3V0ZVRvKTtcbiAgICB9XG5cbiAgICAvLyBSb3V0ZXIgaGFzIGJlZW4gaW5pdGlhbGl6ZWQsIGJ1dCBkdWUgdG8gdGhlIGNocm9tZSBidWcgaXQgd2lsbCBub3RcbiAgICAvLyB5ZXQgYWN0dWFsbHkgcm91dGUgSFRNTDUgaGlzdG9yeSBzdGF0ZSBjaGFuZ2VzLiBUaHVzLCBkZWNpZGUgaWYgc2hvdWxkIHJvdXRlLlxuICAgIGlmIChyb3V0ZVRvIHx8IHRoaXMucnVuX2luX2luaXQgPT09IHRydWUpIHtcbiAgICAgIHRoaXMuaGFuZGxlcigpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuUm91dGVyLnByb3RvdHlwZS5leHBsb2RlID0gZnVuY3Rpb24gKCkge1xuICB2YXIgdiA9IHRoaXMuaGlzdG9yeSA9PT0gdHJ1ZSA/IHRoaXMuZ2V0UGF0aCgpIDogZGxvYy5oYXNoO1xuICBpZiAodi5jaGFyQXQoMSkgPT09ICcvJykgeyB2PXYuc2xpY2UoMSkgfVxuICByZXR1cm4gdi5zbGljZSgxLCB2Lmxlbmd0aCkuc3BsaXQoXCIvXCIpO1xufTtcblxuUm91dGVyLnByb3RvdHlwZS5zZXRSb3V0ZSA9IGZ1bmN0aW9uIChpLCB2LCB2YWwpIHtcbiAgdmFyIHVybCA9IHRoaXMuZXhwbG9kZSgpO1xuXG4gIGlmICh0eXBlb2YgaSA9PT0gJ251bWJlcicgJiYgdHlwZW9mIHYgPT09ICdzdHJpbmcnKSB7XG4gICAgdXJsW2ldID0gdjtcbiAgfVxuICBlbHNlIGlmICh0eXBlb2YgdmFsID09PSAnc3RyaW5nJykge1xuICAgIHVybC5zcGxpY2UoaSwgdiwgcyk7XG4gIH1cbiAgZWxzZSB7XG4gICAgdXJsID0gW2ldO1xuICB9XG5cbiAgbGlzdGVuZXIuc2V0SGFzaCh1cmwuam9pbignLycpKTtcbiAgcmV0dXJuIHVybDtcbn07XG5cbi8vXG4vLyAjIyMgZnVuY3Rpb24gaW5zZXJ0RXgobWV0aG9kLCBwYXRoLCByb3V0ZSwgcGFyZW50KVxuLy8gIyMjIyBAbWV0aG9kIHtzdHJpbmd9IE1ldGhvZCB0byBpbnNlcnQgdGhlIHNwZWNpZmljIGByb3V0ZWAuXG4vLyAjIyMjIEBwYXRoIHtBcnJheX0gUGFyc2VkIHBhdGggdG8gaW5zZXJ0IHRoZSBgcm91dGVgIGF0LlxuLy8gIyMjIyBAcm91dGUge0FycmF5fGZ1bmN0aW9ufSBSb3V0ZSBoYW5kbGVycyB0byBpbnNlcnQuXG4vLyAjIyMjIEBwYXJlbnQge09iamVjdH0gKipPcHRpb25hbCoqIFBhcmVudCBcInJvdXRlc1wiIHRvIGluc2VydCBpbnRvLlxuLy8gaW5zZXJ0IGEgY2FsbGJhY2sgdGhhdCB3aWxsIG9ubHkgb2NjdXIgb25jZSBwZXIgdGhlIG1hdGNoZWQgcm91dGUuXG4vL1xuUm91dGVyLnByb3RvdHlwZS5pbnNlcnRFeCA9IGZ1bmN0aW9uKG1ldGhvZCwgcGF0aCwgcm91dGUsIHBhcmVudCkge1xuICBpZiAobWV0aG9kID09PSBcIm9uY2VcIikge1xuICAgIG1ldGhvZCA9IFwib25cIjtcbiAgICByb3V0ZSA9IGZ1bmN0aW9uKHJvdXRlKSB7XG4gICAgICB2YXIgb25jZSA9IGZhbHNlO1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAob25jZSkgcmV0dXJuO1xuICAgICAgICBvbmNlID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIHJvdXRlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB9O1xuICAgIH0ocm91dGUpO1xuICB9XG4gIHJldHVybiB0aGlzLl9pbnNlcnQobWV0aG9kLCBwYXRoLCByb3V0ZSwgcGFyZW50KTtcbn07XG5cblJvdXRlci5wcm90b3R5cGUuZ2V0Um91dGUgPSBmdW5jdGlvbiAodikge1xuICB2YXIgcmV0ID0gdjtcblxuICBpZiAodHlwZW9mIHYgPT09IFwibnVtYmVyXCIpIHtcbiAgICByZXQgPSB0aGlzLmV4cGxvZGUoKVt2XTtcbiAgfVxuICBlbHNlIGlmICh0eXBlb2YgdiA9PT0gXCJzdHJpbmdcIil7XG4gICAgdmFyIGggPSB0aGlzLmV4cGxvZGUoKTtcbiAgICByZXQgPSBoLmluZGV4T2Yodik7XG4gIH1cbiAgZWxzZSB7XG4gICAgcmV0ID0gdGhpcy5leHBsb2RlKCk7XG4gIH1cblxuICByZXR1cm4gcmV0O1xufTtcblxuUm91dGVyLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICBsaXN0ZW5lci5kZXN0cm95KHRoaXMuaGFuZGxlcik7XG4gIHJldHVybiB0aGlzO1xufTtcblxuUm91dGVyLnByb3RvdHlwZS5nZXRQYXRoID0gZnVuY3Rpb24gKCkge1xuICB2YXIgcGF0aCA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZTtcbiAgaWYgKHBhdGguc3Vic3RyKDAsIDEpICE9PSAnLycpIHtcbiAgICBwYXRoID0gJy8nICsgcGF0aDtcbiAgfVxuICByZXR1cm4gcGF0aDtcbn07XG5mdW5jdGlvbiBfZXZlcnkoYXJyLCBpdGVyYXRvcikge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkgKz0gMSkge1xuICAgIGlmIChpdGVyYXRvcihhcnJbaV0sIGksIGFycikgPT09IGZhbHNlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIF9mbGF0dGVuKGFycikge1xuICB2YXIgZmxhdCA9IFtdO1xuICBmb3IgKHZhciBpID0gMCwgbiA9IGFyci5sZW5ndGg7IGkgPCBuOyBpKyspIHtcbiAgICBmbGF0ID0gZmxhdC5jb25jYXQoYXJyW2ldKTtcbiAgfVxuICByZXR1cm4gZmxhdDtcbn1cblxuZnVuY3Rpb24gX2FzeW5jRXZlcnlTZXJpZXMoYXJyLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgaWYgKCFhcnIubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gIH1cbiAgdmFyIGNvbXBsZXRlZCA9IDA7XG4gIChmdW5jdGlvbiBpdGVyYXRlKCkge1xuICAgIGl0ZXJhdG9yKGFycltjb21wbGV0ZWRdLCBmdW5jdGlvbihlcnIpIHtcbiAgICAgIGlmIChlcnIgfHwgZXJyID09PSBmYWxzZSkge1xuICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICBjYWxsYmFjayA9IGZ1bmN0aW9uKCkge307XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb21wbGV0ZWQgKz0gMTtcbiAgICAgICAgaWYgKGNvbXBsZXRlZCA9PT0gYXJyLmxlbmd0aCkge1xuICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaXRlcmF0ZSgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH0pKCk7XG59XG5cbmZ1bmN0aW9uIHBhcmFtaWZ5U3RyaW5nKHN0ciwgcGFyYW1zLCBtb2QpIHtcbiAgbW9kID0gc3RyO1xuICBmb3IgKHZhciBwYXJhbSBpbiBwYXJhbXMpIHtcbiAgICBpZiAocGFyYW1zLmhhc093blByb3BlcnR5KHBhcmFtKSkge1xuICAgICAgbW9kID0gcGFyYW1zW3BhcmFtXShzdHIpO1xuICAgICAgaWYgKG1vZCAhPT0gc3RyKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gbW9kID09PSBzdHIgPyBcIihbLl9hLXpBLVowLTktXSspXCIgOiBtb2Q7XG59XG5cbmZ1bmN0aW9uIHJlZ2lmeVN0cmluZyhzdHIsIHBhcmFtcykge1xuICB2YXIgbWF0Y2hlcywgbGFzdCA9IDAsIG91dCA9IFwiXCI7XG4gIHdoaWxlIChtYXRjaGVzID0gc3RyLnN1YnN0cihsYXN0KS5tYXRjaCgvW15cXHdcXGRcXC0gJUAmXSpcXCpbXlxcd1xcZFxcLSAlQCZdKi8pKSB7XG4gICAgbGFzdCA9IG1hdGNoZXMuaW5kZXggKyBtYXRjaGVzWzBdLmxlbmd0aDtcbiAgICBtYXRjaGVzWzBdID0gbWF0Y2hlc1swXS5yZXBsYWNlKC9eXFwqLywgXCIoW18uKCkhXFxcXCAlQCZhLXpBLVowLTktXSspXCIpO1xuICAgIG91dCArPSBzdHIuc3Vic3RyKDAsIG1hdGNoZXMuaW5kZXgpICsgbWF0Y2hlc1swXTtcbiAgfVxuICBzdHIgPSBvdXQgKz0gc3RyLnN1YnN0cihsYXN0KTtcbiAgdmFyIGNhcHR1cmVzID0gc3RyLm1hdGNoKC86KFteXFwvXSspL2lnKSwgY2FwdHVyZSwgbGVuZ3RoO1xuICBpZiAoY2FwdHVyZXMpIHtcbiAgICBsZW5ndGggPSBjYXB0dXJlcy5sZW5ndGg7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgY2FwdHVyZSA9IGNhcHR1cmVzW2ldO1xuICAgICAgaWYgKGNhcHR1cmUuc2xpY2UoMCwgMikgPT09IFwiOjpcIikge1xuICAgICAgICBzdHIgPSBjYXB0dXJlLnNsaWNlKDEpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RyID0gc3RyLnJlcGxhY2UoY2FwdHVyZSwgcGFyYW1pZnlTdHJpbmcoY2FwdHVyZSwgcGFyYW1zKSk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBzdHI7XG59XG5cbmZ1bmN0aW9uIHRlcm1pbmF0b3Iocm91dGVzLCBkZWxpbWl0ZXIsIHN0YXJ0LCBzdG9wKSB7XG4gIHZhciBsYXN0ID0gMCwgbGVmdCA9IDAsIHJpZ2h0ID0gMCwgc3RhcnQgPSAoc3RhcnQgfHwgXCIoXCIpLnRvU3RyaW5nKCksIHN0b3AgPSAoc3RvcCB8fCBcIilcIikudG9TdHJpbmcoKSwgaTtcbiAgZm9yIChpID0gMDsgaSA8IHJvdXRlcy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBjaHVuayA9IHJvdXRlc1tpXTtcbiAgICBpZiAoY2h1bmsuaW5kZXhPZihzdGFydCwgbGFzdCkgPiBjaHVuay5pbmRleE9mKHN0b3AsIGxhc3QpIHx8IH5jaHVuay5pbmRleE9mKHN0YXJ0LCBsYXN0KSAmJiAhfmNodW5rLmluZGV4T2Yoc3RvcCwgbGFzdCkgfHwgIX5jaHVuay5pbmRleE9mKHN0YXJ0LCBsYXN0KSAmJiB+Y2h1bmsuaW5kZXhPZihzdG9wLCBsYXN0KSkge1xuICAgICAgbGVmdCA9IGNodW5rLmluZGV4T2Yoc3RhcnQsIGxhc3QpO1xuICAgICAgcmlnaHQgPSBjaHVuay5pbmRleE9mKHN0b3AsIGxhc3QpO1xuICAgICAgaWYgKH5sZWZ0ICYmICF+cmlnaHQgfHwgIX5sZWZ0ICYmIH5yaWdodCkge1xuICAgICAgICB2YXIgdG1wID0gcm91dGVzLnNsaWNlKDAsIChpIHx8IDEpICsgMSkuam9pbihkZWxpbWl0ZXIpO1xuICAgICAgICByb3V0ZXMgPSBbIHRtcCBdLmNvbmNhdChyb3V0ZXMuc2xpY2UoKGkgfHwgMSkgKyAxKSk7XG4gICAgICB9XG4gICAgICBsYXN0ID0gKHJpZ2h0ID4gbGVmdCA/IHJpZ2h0IDogbGVmdCkgKyAxO1xuICAgICAgaSA9IDA7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxhc3QgPSAwO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcm91dGVzO1xufVxuXG5Sb3V0ZXIucHJvdG90eXBlLmNvbmZpZ3VyZSA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5tZXRob2RzLmxlbmd0aDsgaSsrKSB7XG4gICAgdGhpcy5fbWV0aG9kc1t0aGlzLm1ldGhvZHNbaV1dID0gdHJ1ZTtcbiAgfVxuICB0aGlzLnJlY3Vyc2UgPSBvcHRpb25zLnJlY3Vyc2UgfHwgdGhpcy5yZWN1cnNlIHx8IGZhbHNlO1xuICB0aGlzLmFzeW5jID0gb3B0aW9ucy5hc3luYyB8fCBmYWxzZTtcbiAgdGhpcy5kZWxpbWl0ZXIgPSBvcHRpb25zLmRlbGltaXRlciB8fCBcIi9cIjtcbiAgdGhpcy5zdHJpY3QgPSB0eXBlb2Ygb3B0aW9ucy5zdHJpY3QgPT09IFwidW5kZWZpbmVkXCIgPyB0cnVlIDogb3B0aW9ucy5zdHJpY3Q7XG4gIHRoaXMubm90Zm91bmQgPSBvcHRpb25zLm5vdGZvdW5kO1xuICB0aGlzLnJlc291cmNlID0gb3B0aW9ucy5yZXNvdXJjZTtcbiAgdGhpcy5oaXN0b3J5ID0gb3B0aW9ucy5odG1sNWhpc3RvcnkgJiYgdGhpcy5oaXN0b3J5U3VwcG9ydCB8fCBmYWxzZTtcbiAgdGhpcy5ydW5faW5faW5pdCA9IHRoaXMuaGlzdG9yeSA9PT0gdHJ1ZSAmJiBvcHRpb25zLnJ1bl9oYW5kbGVyX2luX2luaXQgIT09IGZhbHNlO1xuICB0aGlzLmV2ZXJ5ID0ge1xuICAgIGFmdGVyOiBvcHRpb25zLmFmdGVyIHx8IG51bGwsXG4gICAgYmVmb3JlOiBvcHRpb25zLmJlZm9yZSB8fCBudWxsLFxuICAgIG9uOiBvcHRpb25zLm9uIHx8IG51bGxcbiAgfTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5Sb3V0ZXIucHJvdG90eXBlLnBhcmFtID0gZnVuY3Rpb24odG9rZW4sIG1hdGNoZXIpIHtcbiAgaWYgKHRva2VuWzBdICE9PSBcIjpcIikge1xuICAgIHRva2VuID0gXCI6XCIgKyB0b2tlbjtcbiAgfVxuICB2YXIgY29tcGlsZWQgPSBuZXcgUmVnRXhwKHRva2VuLCBcImdcIik7XG4gIHRoaXMucGFyYW1zW3Rva2VuXSA9IGZ1bmN0aW9uKHN0cikge1xuICAgIHJldHVybiBzdHIucmVwbGFjZShjb21waWxlZCwgbWF0Y2hlci5zb3VyY2UgfHwgbWF0Y2hlcik7XG4gIH07XG59O1xuXG5Sb3V0ZXIucHJvdG90eXBlLm9uID0gUm91dGVyLnByb3RvdHlwZS5yb3V0ZSA9IGZ1bmN0aW9uKG1ldGhvZCwgcGF0aCwgcm91dGUpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBpZiAoIXJvdXRlICYmIHR5cGVvZiBwYXRoID09IFwiZnVuY3Rpb25cIikge1xuICAgIHJvdXRlID0gcGF0aDtcbiAgICBwYXRoID0gbWV0aG9kO1xuICAgIG1ldGhvZCA9IFwib25cIjtcbiAgfVxuICBpZiAoQXJyYXkuaXNBcnJheShwYXRoKSkge1xuICAgIHJldHVybiBwYXRoLmZvckVhY2goZnVuY3Rpb24ocCkge1xuICAgICAgc2VsZi5vbihtZXRob2QsIHAsIHJvdXRlKTtcbiAgICB9KTtcbiAgfVxuICBpZiAocGF0aC5zb3VyY2UpIHtcbiAgICBwYXRoID0gcGF0aC5zb3VyY2UucmVwbGFjZSgvXFxcXFxcLy9pZywgXCIvXCIpO1xuICB9XG4gIGlmIChBcnJheS5pc0FycmF5KG1ldGhvZCkpIHtcbiAgICByZXR1cm4gbWV0aG9kLmZvckVhY2goZnVuY3Rpb24obSkge1xuICAgICAgc2VsZi5vbihtLnRvTG93ZXJDYXNlKCksIHBhdGgsIHJvdXRlKTtcbiAgICB9KTtcbiAgfVxuICBwYXRoID0gcGF0aC5zcGxpdChuZXcgUmVnRXhwKHRoaXMuZGVsaW1pdGVyKSk7XG4gIHBhdGggPSB0ZXJtaW5hdG9yKHBhdGgsIHRoaXMuZGVsaW1pdGVyKTtcbiAgdGhpcy5pbnNlcnQobWV0aG9kLCB0aGlzLnNjb3BlLmNvbmNhdChwYXRoKSwgcm91dGUpO1xufTtcblxuUm91dGVyLnByb3RvdHlwZS5kaXNwYXRjaCA9IGZ1bmN0aW9uKG1ldGhvZCwgcGF0aCwgY2FsbGJhY2spIHtcbiAgdmFyIHNlbGYgPSB0aGlzLCBmbnMgPSB0aGlzLnRyYXZlcnNlKG1ldGhvZCwgcGF0aCwgdGhpcy5yb3V0ZXMsIFwiXCIpLCBpbnZva2VkID0gdGhpcy5faW52b2tlZCwgYWZ0ZXI7XG4gIHRoaXMuX2ludm9rZWQgPSB0cnVlO1xuICBpZiAoIWZucyB8fCBmbnMubGVuZ3RoID09PSAwKSB7XG4gICAgdGhpcy5sYXN0ID0gW107XG4gICAgaWYgKHR5cGVvZiB0aGlzLm5vdGZvdW5kID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIHRoaXMuaW52b2tlKFsgdGhpcy5ub3Rmb3VuZCBdLCB7XG4gICAgICAgIG1ldGhvZDogbWV0aG9kLFxuICAgICAgICBwYXRoOiBwYXRoXG4gICAgICB9LCBjYWxsYmFjayk7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBpZiAodGhpcy5yZWN1cnNlID09PSBcImZvcndhcmRcIikge1xuICAgIGZucyA9IGZucy5yZXZlcnNlKCk7XG4gIH1cbiAgZnVuY3Rpb24gdXBkYXRlQW5kSW52b2tlKCkge1xuICAgIHNlbGYubGFzdCA9IGZucy5hZnRlcjtcbiAgICBzZWxmLmludm9rZShzZWxmLnJ1bmxpc3QoZm5zKSwgc2VsZiwgY2FsbGJhY2spO1xuICB9XG4gIGFmdGVyID0gdGhpcy5ldmVyeSAmJiB0aGlzLmV2ZXJ5LmFmdGVyID8gWyB0aGlzLmV2ZXJ5LmFmdGVyIF0uY29uY2F0KHRoaXMubGFzdCkgOiBbIHRoaXMubGFzdCBdO1xuICBpZiAoYWZ0ZXIgJiYgYWZ0ZXIubGVuZ3RoID4gMCAmJiBpbnZva2VkKSB7XG4gICAgaWYgKHRoaXMuYXN5bmMpIHtcbiAgICAgIHRoaXMuaW52b2tlKGFmdGVyLCB0aGlzLCB1cGRhdGVBbmRJbnZva2UpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmludm9rZShhZnRlciwgdGhpcyk7XG4gICAgICB1cGRhdGVBbmRJbnZva2UoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgdXBkYXRlQW5kSW52b2tlKCk7XG4gIHJldHVybiB0cnVlO1xufTtcblxuUm91dGVyLnByb3RvdHlwZS5pbnZva2UgPSBmdW5jdGlvbihmbnMsIHRoaXNBcmcsIGNhbGxiYWNrKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIGFwcGx5O1xuICBpZiAodGhpcy5hc3luYykge1xuICAgIGFwcGx5ID0gZnVuY3Rpb24oZm4sIG5leHQpIHtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KGZuKSkge1xuICAgICAgICByZXR1cm4gX2FzeW5jRXZlcnlTZXJpZXMoZm4sIGFwcGx5LCBuZXh0KTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGZuID09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICBmbi5hcHBseSh0aGlzQXJnLCBmbnMuY2FwdHVyZXMuY29uY2F0KG5leHQpKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIF9hc3luY0V2ZXJ5U2VyaWVzKGZucywgYXBwbHksIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrLmFwcGx5KHRoaXNBcmcsIGFyZ3VtZW50cyk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgYXBwbHkgPSBmdW5jdGlvbihmbikge1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZm4pKSB7XG4gICAgICAgIHJldHVybiBfZXZlcnkoZm4sIGFwcGx5KTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGZuID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgcmV0dXJuIGZuLmFwcGx5KHRoaXNBcmcsIGZucy5jYXB0dXJlcyB8fCBbXSk7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBmbiA9PT0gXCJzdHJpbmdcIiAmJiBzZWxmLnJlc291cmNlKSB7XG4gICAgICAgIHNlbGYucmVzb3VyY2VbZm5dLmFwcGx5KHRoaXNBcmcsIGZucy5jYXB0dXJlcyB8fCBbXSk7XG4gICAgICB9XG4gICAgfTtcbiAgICBfZXZlcnkoZm5zLCBhcHBseSk7XG4gIH1cbn07XG5cblJvdXRlci5wcm90b3R5cGUudHJhdmVyc2UgPSBmdW5jdGlvbihtZXRob2QsIHBhdGgsIHJvdXRlcywgcmVnZXhwLCBmaWx0ZXIpIHtcbiAgdmFyIGZucyA9IFtdLCBjdXJyZW50LCBleGFjdCwgbWF0Y2gsIG5leHQsIHRoYXQ7XG4gIGZ1bmN0aW9uIGZpbHRlclJvdXRlcyhyb3V0ZXMpIHtcbiAgICBpZiAoIWZpbHRlcikge1xuICAgICAgcmV0dXJuIHJvdXRlcztcbiAgICB9XG4gICAgZnVuY3Rpb24gZGVlcENvcHkoc291cmNlKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNvdXJjZS5sZW5ndGg7IGkrKykge1xuICAgICAgICByZXN1bHRbaV0gPSBBcnJheS5pc0FycmF5KHNvdXJjZVtpXSkgPyBkZWVwQ29weShzb3VyY2VbaV0pIDogc291cmNlW2ldO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgZnVuY3Rpb24gYXBwbHlGaWx0ZXIoZm5zKSB7XG4gICAgICBmb3IgKHZhciBpID0gZm5zLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGZuc1tpXSkpIHtcbiAgICAgICAgICBhcHBseUZpbHRlcihmbnNbaV0pO1xuICAgICAgICAgIGlmIChmbnNbaV0ubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBmbnMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoIWZpbHRlcihmbnNbaV0pKSB7XG4gICAgICAgICAgICBmbnMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICB2YXIgbmV3Um91dGVzID0gZGVlcENvcHkocm91dGVzKTtcbiAgICBuZXdSb3V0ZXMubWF0Y2hlZCA9IHJvdXRlcy5tYXRjaGVkO1xuICAgIG5ld1JvdXRlcy5jYXB0dXJlcyA9IHJvdXRlcy5jYXB0dXJlcztcbiAgICBuZXdSb3V0ZXMuYWZ0ZXIgPSByb3V0ZXMuYWZ0ZXIuZmlsdGVyKGZpbHRlcik7XG4gICAgYXBwbHlGaWx0ZXIobmV3Um91dGVzKTtcbiAgICByZXR1cm4gbmV3Um91dGVzO1xuICB9XG4gIGlmIChwYXRoID09PSB0aGlzLmRlbGltaXRlciAmJiByb3V0ZXNbbWV0aG9kXSkge1xuICAgIG5leHQgPSBbIFsgcm91dGVzLmJlZm9yZSwgcm91dGVzW21ldGhvZF0gXS5maWx0ZXIoQm9vbGVhbikgXTtcbiAgICBuZXh0LmFmdGVyID0gWyByb3V0ZXMuYWZ0ZXIgXS5maWx0ZXIoQm9vbGVhbik7XG4gICAgbmV4dC5tYXRjaGVkID0gdHJ1ZTtcbiAgICBuZXh0LmNhcHR1cmVzID0gW107XG4gICAgcmV0dXJuIGZpbHRlclJvdXRlcyhuZXh0KTtcbiAgfVxuICBmb3IgKHZhciByIGluIHJvdXRlcykge1xuICAgIGlmIChyb3V0ZXMuaGFzT3duUHJvcGVydHkocikgJiYgKCF0aGlzLl9tZXRob2RzW3JdIHx8IHRoaXMuX21ldGhvZHNbcl0gJiYgdHlwZW9mIHJvdXRlc1tyXSA9PT0gXCJvYmplY3RcIiAmJiAhQXJyYXkuaXNBcnJheShyb3V0ZXNbcl0pKSkge1xuICAgICAgY3VycmVudCA9IGV4YWN0ID0gcmVnZXhwICsgdGhpcy5kZWxpbWl0ZXIgKyByO1xuICAgICAgaWYgKCF0aGlzLnN0cmljdCkge1xuICAgICAgICBleGFjdCArPSBcIltcIiArIHRoaXMuZGVsaW1pdGVyICsgXCJdP1wiO1xuICAgICAgfVxuICAgICAgbWF0Y2ggPSBwYXRoLm1hdGNoKG5ldyBSZWdFeHAoXCJeXCIgKyBleGFjdCkpO1xuICAgICAgaWYgKCFtYXRjaCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmIChtYXRjaFswXSAmJiBtYXRjaFswXSA9PSBwYXRoICYmIHJvdXRlc1tyXVttZXRob2RdKSB7XG4gICAgICAgIG5leHQgPSBbIFsgcm91dGVzW3JdLmJlZm9yZSwgcm91dGVzW3JdW21ldGhvZF0gXS5maWx0ZXIoQm9vbGVhbikgXTtcbiAgICAgICAgbmV4dC5hZnRlciA9IFsgcm91dGVzW3JdLmFmdGVyIF0uZmlsdGVyKEJvb2xlYW4pO1xuICAgICAgICBuZXh0Lm1hdGNoZWQgPSB0cnVlO1xuICAgICAgICBuZXh0LmNhcHR1cmVzID0gbWF0Y2guc2xpY2UoMSk7XG4gICAgICAgIGlmICh0aGlzLnJlY3Vyc2UgJiYgcm91dGVzID09PSB0aGlzLnJvdXRlcykge1xuICAgICAgICAgIG5leHQucHVzaChbIHJvdXRlcy5iZWZvcmUsIHJvdXRlcy5vbiBdLmZpbHRlcihCb29sZWFuKSk7XG4gICAgICAgICAgbmV4dC5hZnRlciA9IG5leHQuYWZ0ZXIuY29uY2F0KFsgcm91dGVzLmFmdGVyIF0uZmlsdGVyKEJvb2xlYW4pKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmlsdGVyUm91dGVzKG5leHQpO1xuICAgICAgfVxuICAgICAgbmV4dCA9IHRoaXMudHJhdmVyc2UobWV0aG9kLCBwYXRoLCByb3V0ZXNbcl0sIGN1cnJlbnQpO1xuICAgICAgaWYgKG5leHQubWF0Y2hlZCkge1xuICAgICAgICBpZiAobmV4dC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgZm5zID0gZm5zLmNvbmNhdChuZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5yZWN1cnNlKSB7XG4gICAgICAgICAgZm5zLnB1c2goWyByb3V0ZXNbcl0uYmVmb3JlLCByb3V0ZXNbcl0ub24gXS5maWx0ZXIoQm9vbGVhbikpO1xuICAgICAgICAgIG5leHQuYWZ0ZXIgPSBuZXh0LmFmdGVyLmNvbmNhdChbIHJvdXRlc1tyXS5hZnRlciBdLmZpbHRlcihCb29sZWFuKSk7XG4gICAgICAgICAgaWYgKHJvdXRlcyA9PT0gdGhpcy5yb3V0ZXMpIHtcbiAgICAgICAgICAgIGZucy5wdXNoKFsgcm91dGVzW1wiYmVmb3JlXCJdLCByb3V0ZXNbXCJvblwiXSBdLmZpbHRlcihCb29sZWFuKSk7XG4gICAgICAgICAgICBuZXh0LmFmdGVyID0gbmV4dC5hZnRlci5jb25jYXQoWyByb3V0ZXNbXCJhZnRlclwiXSBdLmZpbHRlcihCb29sZWFuKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZucy5tYXRjaGVkID0gdHJ1ZTtcbiAgICAgICAgZm5zLmNhcHR1cmVzID0gbmV4dC5jYXB0dXJlcztcbiAgICAgICAgZm5zLmFmdGVyID0gbmV4dC5hZnRlcjtcbiAgICAgICAgcmV0dXJuIGZpbHRlclJvdXRlcyhmbnMpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59O1xuXG5Sb3V0ZXIucHJvdG90eXBlLmluc2VydCA9IGZ1bmN0aW9uKG1ldGhvZCwgcGF0aCwgcm91dGUsIHBhcmVudCkge1xuICB2YXIgbWV0aG9kVHlwZSwgcGFyZW50VHlwZSwgaXNBcnJheSwgbmVzdGVkLCBwYXJ0O1xuICBwYXRoID0gcGF0aC5maWx0ZXIoZnVuY3Rpb24ocCkge1xuICAgIHJldHVybiBwICYmIHAubGVuZ3RoID4gMDtcbiAgfSk7XG4gIHBhcmVudCA9IHBhcmVudCB8fCB0aGlzLnJvdXRlcztcbiAgcGFydCA9IHBhdGguc2hpZnQoKTtcbiAgaWYgKC9cXDp8XFwqLy50ZXN0KHBhcnQpICYmICEvXFxcXGR8XFxcXHcvLnRlc3QocGFydCkpIHtcbiAgICBwYXJ0ID0gcmVnaWZ5U3RyaW5nKHBhcnQsIHRoaXMucGFyYW1zKTtcbiAgfVxuICBpZiAocGF0aC5sZW5ndGggPiAwKSB7XG4gICAgcGFyZW50W3BhcnRdID0gcGFyZW50W3BhcnRdIHx8IHt9O1xuICAgIHJldHVybiB0aGlzLmluc2VydChtZXRob2QsIHBhdGgsIHJvdXRlLCBwYXJlbnRbcGFydF0pO1xuICB9XG4gIGlmICghcGFydCAmJiAhcGF0aC5sZW5ndGggJiYgcGFyZW50ID09PSB0aGlzLnJvdXRlcykge1xuICAgIG1ldGhvZFR5cGUgPSB0eXBlb2YgcGFyZW50W21ldGhvZF07XG4gICAgc3dpdGNoIChtZXRob2RUeXBlKSB7XG4gICAgIGNhc2UgXCJmdW5jdGlvblwiOlxuICAgICAgcGFyZW50W21ldGhvZF0gPSBbIHBhcmVudFttZXRob2RdLCByb3V0ZSBdO1xuICAgICAgcmV0dXJuO1xuICAgICBjYXNlIFwib2JqZWN0XCI6XG4gICAgICBwYXJlbnRbbWV0aG9kXS5wdXNoKHJvdXRlKTtcbiAgICAgIHJldHVybjtcbiAgICAgY2FzZSBcInVuZGVmaW5lZFwiOlxuICAgICAgcGFyZW50W21ldGhvZF0gPSByb3V0ZTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmV0dXJuO1xuICB9XG4gIHBhcmVudFR5cGUgPSB0eXBlb2YgcGFyZW50W3BhcnRdO1xuICBpc0FycmF5ID0gQXJyYXkuaXNBcnJheShwYXJlbnRbcGFydF0pO1xuICBpZiAocGFyZW50W3BhcnRdICYmICFpc0FycmF5ICYmIHBhcmVudFR5cGUgPT0gXCJvYmplY3RcIikge1xuICAgIG1ldGhvZFR5cGUgPSB0eXBlb2YgcGFyZW50W3BhcnRdW21ldGhvZF07XG4gICAgc3dpdGNoIChtZXRob2RUeXBlKSB7XG4gICAgIGNhc2UgXCJmdW5jdGlvblwiOlxuICAgICAgcGFyZW50W3BhcnRdW21ldGhvZF0gPSBbIHBhcmVudFtwYXJ0XVttZXRob2RdLCByb3V0ZSBdO1xuICAgICAgcmV0dXJuO1xuICAgICBjYXNlIFwib2JqZWN0XCI6XG4gICAgICBwYXJlbnRbcGFydF1bbWV0aG9kXS5wdXNoKHJvdXRlKTtcbiAgICAgIHJldHVybjtcbiAgICAgY2FzZSBcInVuZGVmaW5lZFwiOlxuICAgICAgcGFyZW50W3BhcnRdW21ldGhvZF0gPSByb3V0ZTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH0gZWxzZSBpZiAocGFyZW50VHlwZSA9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgbmVzdGVkID0ge307XG4gICAgbmVzdGVkW21ldGhvZF0gPSByb3V0ZTtcbiAgICBwYXJlbnRbcGFydF0gPSBuZXN0ZWQ7XG4gICAgcmV0dXJuO1xuICB9XG4gIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgcm91dGUgY29udGV4dDogXCIgKyBwYXJlbnRUeXBlKTtcbn07XG5cblxuXG5Sb3V0ZXIucHJvdG90eXBlLmV4dGVuZCA9IGZ1bmN0aW9uKG1ldGhvZHMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzLCBsZW4gPSBtZXRob2RzLmxlbmd0aCwgaTtcbiAgZnVuY3Rpb24gZXh0ZW5kKG1ldGhvZCkge1xuICAgIHNlbGYuX21ldGhvZHNbbWV0aG9kXSA9IHRydWU7XG4gICAgc2VsZlttZXRob2RdID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgZXh0cmEgPSBhcmd1bWVudHMubGVuZ3RoID09PSAxID8gWyBtZXRob2QsIFwiXCIgXSA6IFsgbWV0aG9kIF07XG4gICAgICBzZWxmLm9uLmFwcGx5KHNlbGYsIGV4dHJhLmNvbmNhdChBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpKSk7XG4gICAgfTtcbiAgfVxuICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICBleHRlbmQobWV0aG9kc1tpXSk7XG4gIH1cbn07XG5cblJvdXRlci5wcm90b3R5cGUucnVubGlzdCA9IGZ1bmN0aW9uKGZucykge1xuICB2YXIgcnVubGlzdCA9IHRoaXMuZXZlcnkgJiYgdGhpcy5ldmVyeS5iZWZvcmUgPyBbIHRoaXMuZXZlcnkuYmVmb3JlIF0uY29uY2F0KF9mbGF0dGVuKGZucykpIDogX2ZsYXR0ZW4oZm5zKTtcbiAgaWYgKHRoaXMuZXZlcnkgJiYgdGhpcy5ldmVyeS5vbikge1xuICAgIHJ1bmxpc3QucHVzaCh0aGlzLmV2ZXJ5Lm9uKTtcbiAgfVxuICBydW5saXN0LmNhcHR1cmVzID0gZm5zLmNhcHR1cmVzO1xuICBydW5saXN0LnNvdXJjZSA9IGZucy5zb3VyY2U7XG4gIHJldHVybiBydW5saXN0O1xufTtcblxuUm91dGVyLnByb3RvdHlwZS5tb3VudCA9IGZ1bmN0aW9uKHJvdXRlcywgcGF0aCkge1xuICBpZiAoIXJvdXRlcyB8fCB0eXBlb2Ygcm91dGVzICE9PSBcIm9iamVjdFwiIHx8IEFycmF5LmlzQXJyYXkocm91dGVzKSkge1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHBhdGggPSBwYXRoIHx8IFtdO1xuICBpZiAoIUFycmF5LmlzQXJyYXkocGF0aCkpIHtcbiAgICBwYXRoID0gcGF0aC5zcGxpdChzZWxmLmRlbGltaXRlcik7XG4gIH1cbiAgZnVuY3Rpb24gaW5zZXJ0T3JNb3VudChyb3V0ZSwgbG9jYWwpIHtcbiAgICB2YXIgcmVuYW1lID0gcm91dGUsIHBhcnRzID0gcm91dGUuc3BsaXQoc2VsZi5kZWxpbWl0ZXIpLCByb3V0ZVR5cGUgPSB0eXBlb2Ygcm91dGVzW3JvdXRlXSwgaXNSb3V0ZSA9IHBhcnRzWzBdID09PSBcIlwiIHx8ICFzZWxmLl9tZXRob2RzW3BhcnRzWzBdXSwgZXZlbnQgPSBpc1JvdXRlID8gXCJvblwiIDogcmVuYW1lO1xuICAgIGlmIChpc1JvdXRlKSB7XG4gICAgICByZW5hbWUgPSByZW5hbWUuc2xpY2UoKHJlbmFtZS5tYXRjaChuZXcgUmVnRXhwKFwiXlwiICsgc2VsZi5kZWxpbWl0ZXIpKSB8fCBbIFwiXCIgXSlbMF0ubGVuZ3RoKTtcbiAgICAgIHBhcnRzLnNoaWZ0KCk7XG4gICAgfVxuICAgIGlmIChpc1JvdXRlICYmIHJvdXRlVHlwZSA9PT0gXCJvYmplY3RcIiAmJiAhQXJyYXkuaXNBcnJheShyb3V0ZXNbcm91dGVdKSkge1xuICAgICAgbG9jYWwgPSBsb2NhbC5jb25jYXQocGFydHMpO1xuICAgICAgc2VsZi5tb3VudChyb3V0ZXNbcm91dGVdLCBsb2NhbCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChpc1JvdXRlKSB7XG4gICAgICBsb2NhbCA9IGxvY2FsLmNvbmNhdChyZW5hbWUuc3BsaXQoc2VsZi5kZWxpbWl0ZXIpKTtcbiAgICAgIGxvY2FsID0gdGVybWluYXRvcihsb2NhbCwgc2VsZi5kZWxpbWl0ZXIpO1xuICAgIH1cbiAgICBzZWxmLmluc2VydChldmVudCwgbG9jYWwsIHJvdXRlc1tyb3V0ZV0pO1xuICB9XG4gIGZvciAodmFyIHJvdXRlIGluIHJvdXRlcykge1xuICAgIGlmIChyb3V0ZXMuaGFzT3duUHJvcGVydHkocm91dGUpKSB7XG4gICAgICBpbnNlcnRPck1vdW50KHJvdXRlLCBwYXRoLnNsaWNlKDApKTtcbiAgICB9XG4gIH1cbn07XG5cblxuXG59KHR5cGVvZiBleHBvcnRzID09PSBcIm9iamVjdFwiID8gZXhwb3J0cyA6IHdpbmRvdykpOyIsIm1vZHVsZS5leHBvcnRzID0gXCI8c3R5bGUgdHlwZT1cXFwidGV4dC9jc3NcXFwiPlxcbiAgICAubm90LWZvdW5kIHtcXG4gICAgICAgIHRleHQtYWxpZ246IGNlbnRlcjtcXG4gICAgICAgIHBhZGRpbmctdG9wOiAxMDBweDtcXG4gICAgfVxcbjwvc3R5bGU+XFxuPGRpdiBjbGFzcz1cXFwibm90LWZvdW5kXFxcIj5cXG4gICAgPGgxPjQwNDwvaDE+XFxuICAgIDxwPlNvcnJ5LCBwYWdlIG5vdCBmb3VuZC48L3A+XFxuPC9kaXY+XCI7XG4iLCJmdW5jdGlvbiBpbml0KGtvLCBjb21wb25lbnRWaWV3TW9kZWwpIHtcbiAgICBrby5jb21wb25lbnRzLnJlZ2lzdGVyKCdrb2tvRGVmYXVsdDQwNCcsIHtcbiAgICAgICAgdGVtcGxhdGU6IHJlcXVpcmUoJy4vNDA0Lmh0bWwnKSxcbiAgICAgICAgdmlld01vZGVsOiBjb21wb25lbnRWaWV3TW9kZWwoe1xuICAgICAgICAgICAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5rb2tvLnNldFJlYWR5KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgfSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGluaXQ6IGluaXRcbn07IiwidmFyIHVybFJlc29sdmVyICA9IHJlcXVpcmUoJy4vdXJsLXJlc29sdmVyJyk7XG52YXIgdXRpbHMgICAgICAgID0gcmVxdWlyZSgnLi91dGlscycpO1xudmFyIHJvdXRlciAgICAgICA9IHJlcXVpcmUoJy4vcm91dGVyJyk7XG5cbmZ1bmN0aW9uIGluaXQoa28pIHtcblxuICAgIGtvLmJpbmRpbmdIYW5kbGVycy5rb2tvSHJlZiA9IHtcbiAgICAgICAgaW5pdDogZnVuY3Rpb24oZWxlbWVudCkge1xuICAgICAgICAgICAga28udXRpbHMucmVnaXN0ZXJFdmVudEhhbmRsZXIoZWxlbWVudCwgJ2NsaWNrJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgICAgICByb3V0ZXIubmF2aWdhdGUoZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2hyZWYnKSk7XG4gICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICB1cGRhdGU6IGZ1bmN0aW9uIChlbGVtZW50LCB2YWx1ZUFjY2Vzc29yLCBpZ25vcmUxLCBpZ25vcmUyLCBiaW5kaW5nQ29udGV4dCkge1xuICAgICAgICAgICAgLyogRXhwZWN0czpcbiAgICAgICAgICAgICAqICB7XG4gICAgICAgICAgICAgKiAgICAgIHBhdGg6ICdyb290LnVzZXItbGlzdC51c2VyLWRldGFpbCcsXG4gICAgICAgICAgICAgKiAgICAgIHBhcmFtczogeyB1c2VySWQ6IDEyMyB9LFxuICAgICAgICAgICAgICogICAgICBhY3RpdmF0ZTogdHJ1ZVxuICAgICAgICAgICAgICogIH1cbiAgICAgICAgICAgICAqICovXG5cbiAgICAgICAgICAgIHZhciBvcHRzID0gdmFsdWVBY2Nlc3NvcigpO1xuXG4gICAgICAgICAgICAvLyBTZXQgaHJlZi5cbiAgICAgICAgICAgIHZhciBzdGF0ZU5vZGUgPSB1dGlscy5nZXRTdGF0ZU5vZGVGcm9tQ29udGV4dChiaW5kaW5nQ29udGV4dCk7XG4gICAgICAgICAgICB2YXIgaHJlZiA9IHVybFJlc29sdmVyLnJlc29sdmVQYXRoVG9Vcmwob3B0cy5wYXRoLCBvcHRzLnBhcmFtcywgc3RhdGVOb2RlKTtcbiAgICAgICAgICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKCdocmVmJywgaHJlZik7XG5cbiAgICAgICAgICAgIC8vIE9wdGlvbmFsbHkgYWRkIFwic2VsZWN0ZWRcIiBjbGFzcyB3aGVuIGhyZWYgdGFyZ2V0IGlzIGFjdGl2ZS5cbiAgICAgICAgICAgIGlmIChvcHRzLmFjdGl2YXRlKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBhdGhNYXRjaGVzQ3VycmVudCA9IHVybFJlc29sdmVyLnBhdGhNYXRjaGVzQ3VycmVudChvcHRzLnBhdGgsIG9wdHMucGFyYW1zLCBzdGF0ZU5vZGUpO1xuICAgICAgICAgICAgICAgIHV0aWxzLnRvZ2dsZUVsZW1DbGFzcyhlbGVtZW50LCAnYWN0aXZlJywgcGF0aE1hdGNoZXNDdXJyZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBrby5iaW5kaW5nSGFuZGxlcnMua29rb0FjdGl2YXRlID0ge1xuICAgICAgICB1cGRhdGU6IGZ1bmN0aW9uIChlbGVtZW50LCB2YWx1ZUFjY2Vzc29yLCBpZ25vcmUxLCBpZ25vcmUyLCBiaW5kaW5nQ29udGV4dCkge1xuICAgICAgICAgICAgLyogRXhwZWN0czpcbiAgICAgICAgICAgICAqICB7XG4gICAgICAgICAgICAgKiAgICAgIHBhdGg6ICdyb290LnVzZXItbGlzdC51c2VyLWRldGFpbCcsXG4gICAgICAgICAgICAgKiAgICAgIHBhcmFtczogeyB1c2VySWQ6IDEyMyB9XG4gICAgICAgICAgICAgKiAgfVxuICAgICAgICAgICAgICogKi9cbiAgICAgICAgICAgIHZhciBvcHRzID0gdmFsdWVBY2Nlc3NvcigpO1xuXG4gICAgICAgICAgICAvLyBDb25kaXRpb25hbGx5IGFkZCB0aGUgXCJhY3RpdmVcIiBjbGFzcy5cbiAgICAgICAgICAgIHZhciBzdGF0ZU5vZGUgPSB1dGlscy5nZXRTdGF0ZU5vZGVGcm9tQ29udGV4dChiaW5kaW5nQ29udGV4dCk7XG4gICAgICAgICAgICB2YXIgcGF0aE1hdGNoZXNDdXJyZW50ID0gdXJsUmVzb2x2ZXIucGF0aE1hdGNoZXNDdXJyZW50KG9wdHMucGF0aCwgb3B0cy5wYXJhbXMsIHN0YXRlTm9kZSk7XG4gICAgICAgICAgICB1dGlscy50b2dnbGVFbGVtQ2xhc3MoZWxlbWVudCwgJ2FjdGl2ZScsIHBhdGhNYXRjaGVzQ3VycmVudCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGluaXQ6IGluaXRcbn07IiwidmFyIGtvO1xudmFyIHV0aWxzICAgICAgID0gcmVxdWlyZSgnLi91dGlscycpO1xudmFyIHJvdXRlciAgICAgID0gcmVxdWlyZSgnLi9yb3V0ZXInKTtcbnZhciB1cmxSZXNvbHZlciA9IHJlcXVpcmUoJy4vdXJsLXJlc29sdmVyJyk7XG5cbmZ1bmN0aW9uIGluaXQoa29fKSB7XG4gICAga28gPSBrb187XG59XG5cbnZhciBDb21wb25lbnRTdGF0ZSA9IHV0aWxzLmNyZWF0ZUNsYXNzKHtcbiAgICBpbml0OiBmdW5jdGlvbihzdGF0ZU5vZGUpIHtcbiAgICAgICAgdGhpcy5kaXNwb3NhYmxlID0gW107XG4gICAgICAgIHRoaXMuZGlzcG9zZUhhbmRsZXJzID0gW107XG4gICAgICAgIHRoaXMuc3RhdGVOb2RlID0gc3RhdGVOb2RlO1xuICAgICAgICB0aGlzLnJvdXRlUGFyYW1zID0gdGhpcy5zdGF0ZU5vZGUucm91dGVQYXJhbXM7XG4gICAgfSxcblxuICAgIHNldFJlYWR5OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5zdGF0ZU5vZGUuc2V0UmVhZHkoKTtcbiAgICB9LFxuXG4gICAgbmF2aWdhdGU6IGZ1bmN0aW9uKHBhdGgsIHBhcmFtcykge1xuICAgICAgICByb3V0ZXIubmF2aWdhdGUodXJsUmVzb2x2ZXIucmVzb2x2ZVBhdGhUb1VybChwYXRoLCBwYXJhbXMsIHRoaXMuc3RhdGVOb2RlKSk7XG4gICAgfSxcblxuICAgIG9uOiBmdW5jdGlvbihldmVudFR5cGUsIGhhbmRsZXIpIHtcbiAgICAgICAgc3dpdGNoIChldmVudFR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ2NvbXBvbmVudERpc3Bvc2FsJzpcbiAgICAgICAgICAgICAgICB0aGlzLmRpc3Bvc2VIYW5kbGVycy5wdXNoKGhhbmRsZXIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnZGVwZW5kZW5jeUNoYW5nZSc6XG4gICAgICAgICAgICAgICAgdGhpcy5kaXNwb3NhYmxlLnB1c2goa28uY29tcHV0ZWQoaGFuZGxlcikpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IgKCdVbnJlY29nbml6ZWQgZXZlbnQgdHlwZSEnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBkaXNwb3NlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gQ2FsbCBoYW5kbGVycy5cbiAgICAgICAgdmFyIGk7XG4gICAgICAgIGZvciAoaSBpbiB0aGlzLmRpc3Bvc2VIYW5kbGVycykge1xuICAgICAgICAgICAgdGhpcy5kaXNwb3NlSGFuZGxlcnNbaV0oKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERpc3Bvc2UgY29tcHV0ZWQgb2JzZXJ2YWJsZXMuXG4gICAgICAgIGZvciAoaSBpbiAgdGhpcy5kaXNwb3NhYmxlKSB7XG4gICAgICAgICAgICB0aGlzLmRpc3Bvc2FibGVbaV0uZGlzcG9zZSgpO1xuICAgICAgICB9XG4gICAgfVxufSk7XG5cbmZ1bmN0aW9uIGNyZWF0ZUNvbXBvbmVudFZpZXdNb2RlbChwcm9wcywgZG9Ob3RCaW5kKSB7XG4gICAgZm9yICh2YXIgaXRlbSBpbiBwcm9wcykge1xuICAgICAgICBpZiAoaXRlbSA9PT0gJ2Rpc3Bvc2UnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IgKCdUaGUgXCJkaXNwb3NlKClcIiBtZXRob2QgaXMgcmVzZXJ2ZWQuIFBsZWFzZSBuYW1lIHlvdXIgZGlzcG9zZSBoYW5kbGVyIHNvbWV0aGluZyBlbHNlLicpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIENsYXNzID0gZnVuY3Rpb24oY29tcG9uZW50UGFyYW1zKSB7XG4gICAgICAgIGlmICghZG9Ob3RCaW5kKSB7XG4gICAgICAgICAgICB1dGlscy5iaW5kTWV0aG9kcyh0aGlzKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmtva28gPSBuZXcgQ29tcG9uZW50U3RhdGUoY29tcG9uZW50UGFyYW1zLnN0YXRlTm9kZSk7XG4gICAgICAgIHRoaXMuZGlzcG9zZSA9IHRoaXMua29rby5kaXNwb3NlLmJpbmQodGhpcy5rb2tvKTtcbiAgICAgICAgaWYgKHRoaXMuaW5pdCkge1xuICAgICAgICAgICAgdGhpcy5pbml0KGNvbXBvbmVudFBhcmFtcy5wYXJlbnQpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGZvciAodmFyIG5hbWUgaW4gcHJvcHMpIHtcbiAgICAgICAgQ2xhc3MucHJvdG90eXBlW25hbWVdID0gcHJvcHNbbmFtZV07XG4gICAgfVxuICAgIHJldHVybiBDbGFzcztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgaW5pdDogaW5pdCxcbiAgICBjcmVhdGVDb21wb25lbnRWaWV3TW9kZWw6IGNyZWF0ZUNvbXBvbmVudFZpZXdNb2RlbFxufTsiLCJtb2R1bGUuZXhwb3J0cyA9IFwiPCEtLSBrbyBmb3JlYWNoOiAkcGFyZW50Lmtva28uc3RhdGVOb2RlLmNoaWxkcmVuIC0tPlxcbjxkaXYgZGF0YS1iaW5kPVxcXCJcXG4gICAgY29tcG9uZW50OiB7XFxuICAgICAgICBuYW1lOiBjb21wb25lbnQsXFxuICAgICAgICBwYXJhbXM6IHsgc3RhdGVOb2RlOiAkZGF0YSwgcGFyZW50OiAkcGFyZW50c1sxXSB9XFxuICAgIH0sIHZpc2libGU6IGlzVmlzaWJsZSgpXFxuXFxcIj48L2Rpdj5cXG48IS0tIC9rbyAtLT5cIjtcbiIsImZ1bmN0aW9uIGluaXQoa28pIHtcbiAgICBrby5jb21wb25lbnRzLnJlZ2lzdGVyKCdrb2tvLXZpZXcnLCB7XG4gICAgICAgIHRlbXBsYXRlOiByZXF1aXJlKCcuL2tva28tdmlldy5odG1sJylcbiAgICB9KTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgaW5pdDogaW5pdFxufTsiLCJ2YXIgZGlyZWN0b3IgPSByZXF1aXJlKCdkaXJlY3RvcicpO1xudmFyIHV0aWxzICAgID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG4vKlxuICAgIFRoaXMgaXMgYSBsb3ctbGV2ZWwgcm91dGVyIHRoYXQgY2FsbHMgdGhlIHByb3ZpZGVkIGNhbGxiYWNrXG4gICAgd2hlbmV2ZXIgdGhlIHVzZXIgbmF2aWdhdGVzIHRvIGEgY29uZmlndXJlZCByb3V0ZS5cbiAgICBUaGUgY2FsbGJhY2sgcmVjZWl2ZXMgdHdvIHBhcmFtZXRlcnM6XG4gICAgIC0gVGhlIHJvdXRlIG1hdGNoZWQgcGF0dGVyblxuICAgICAtIEFuIG9iamVjdCBjb250YWluaW5nIHRoZSBwYXJhbWV0ZXIgdmFsdWVzIGZvciB0aGUgcm91dGVcbiovXG5cbnZhciByb3V0ZXI7XG5cbi8vIENvbmZpZy5cbnZhciByb3V0ZXM7ICAgICAgICAgICAvLyBBIGFycmF5IG9mIFwiL3JvdXRlLzpwYXR0ZXJuc1wiXG52YXIgcm91dGVQYXJhbXM7ICAgICAgLy8gQW4gYXJyYXkgb2YgbmFtZWQgcGFyYW1ldGVyIGRlZmluaXRpb25zXG52YXIgcmVkaXJlY3RzOyAgICAgICAgLy8gQW4gb2JqZWN0IG1hcHBpbmcgXCJhL3JvdXQ6cGF0dGVyblwiIHRvIFwiYW5vdGhlci91cmxcIlxuXG5mdW5jdGlvbiBub3JtYWxpemVVcmxGcmFnbWVudCh1cmwpIHtcbiAgICBpZiAoIXVybCkge1xuICAgICAgICByZXR1cm4gJy8nO1xuICAgIH1cbiAgICBpZiAodXJsLnNsaWNlKDAsIDEpICE9PSAnLycpIHtcbiAgICAgICAgdXJsID0gJy8nICsgdXJsO1xuICAgIH1cbiAgICBpZiAodXJsLnNsaWNlKHVybC5sZW5ndGggLSAxLCAxKSAhPT0gJy8nKSB7XG4gICAgICAgIHVybCArPSAnLyc7XG4gICAgfVxuICAgIHJldHVybiB1cmw7XG59XG5cbmZ1bmN0aW9uIHN0YXJ0Um91dGVyKGNvbmZpZywgY2IpIHtcbiAgICAvLyBUaGUgcm91dGVyIGNhbiBvbmx5IGJlIHN0YXJ0ZWQgb25jZS5cbiAgICBpZiAocm91dGVzKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVGhlIHJvdXRlciBpcyBhbHJlYWR5IHN0YXJ0ZWQuJyk7XG4gICAgfVxuXG4gICAgLy8gVmFsaWRhdGUgY29uZmlnLlxuICAgIHJvdXRlcyAgICAgICAgICAgPSBjb25maWcucm91dGVzO1xuICAgIHJvdXRlUGFyYW1zICAgICAgPSBjb25maWcucm91dGVQYXJhbXM7XG4gICAgcmVkaXJlY3RzICAgICAgICA9IGNvbmZpZy5yZWRpcmVjdHM7XG4gICAgaWYgKCFyb3V0ZXMgIHx8ICFyb3V0ZVBhcmFtcyB8fCAhcmVkaXJlY3RzKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvciAoJ0ludmFsaWQgY29uZmlndXJhdGlvbicpO1xuICAgIH1cblxuICAgIC8vIFN1cHBseSBkZWZhdWx0IHJvdXRlUGFyYW0gdmFsdWVzLlxuICAgIHZhciBwYXJhbU5hbWU7XG4gICAgdmFyIGZuTm9vcCA9IGZ1bmN0aW9uIChvKSB7IHJldHVybiBvOyB9O1xuICAgIGZvciAocGFyYW1OYW1lIGluIGNvbmZpZy5yb3V0ZVBhcmFtcykge1xuICAgICAgICBjb25maWcucm91dGVQYXJhbXNbcGFyYW1OYW1lXSA9IHJvdXRlUGFyYW1zW3BhcmFtTmFtZV0gfHwge307XG4gICAgICAgIGNvbmZpZy5yb3V0ZVBhcmFtc1twYXJhbU5hbWVdLnBhcnNlID0gcm91dGVQYXJhbXNbcGFyYW1OYW1lXS5wYXJzZSB8fCBmbk5vb3A7XG4gICAgICAgIGNvbmZpZy5yb3V0ZVBhcmFtc1twYXJhbU5hbWVdLnJlZ2V4ID0gcm91dGVQYXJhbXNbcGFyYW1OYW1lXS5yZWdleCB8fCAvKC4qKS9nO1xuICAgIH1cblxuICAgIC8vIENyZWF0ZSByb3V0ZXIgaW5zdGFuY2UuXG4gICAgcm91dGVyID0gbmV3IGRpcmVjdG9yLlJvdXRlcigpO1xuICAgIHJvdXRlci5jb25maWd1cmUoe1xuICAgICAgICBodG1sNWhpc3Rvcnk6IGNvbmZpZy5odG1sNUhpc3RvcnlcbiAgICB9KTtcblxuICAgIC8vIFJlZ2lzdGVyIHBhcmFtIG5hbWUvcmVnZXggcGFpcnMuXG4gICAgLy8gRGlyZWN0b3Igd2lsbCB2YWxpZGF0ZSB0aGF0IHBhcmFtcyBtYXRjaCB0aGUgc3VwcGxpZWQgcmVnZXguXG4gICAgLy8gSWYgdGhleSBkb24ndCwgdGhlIHVzZXIgd2lsbCBzZWUgdGhlIDQwNCByb3V0ZS5cbiAgICBmb3IgKHBhcmFtTmFtZSBpbiByb3V0ZVBhcmFtcykge1xuICAgICAgICByb3V0ZXIucGFyYW0ocGFyYW1OYW1lLCByb3V0ZVBhcmFtc1twYXJhbU5hbWVdLnJlZ2V4KTtcbiAgICB9XG5cbiAgICAvLyBSZWdpc3RlciByb3V0ZSBwYXR0ZXJucy5cbiAgICB2YXIgcm91dGU7XG4gICAgZm9yICh2YXIgaSBpbiByb3V0ZXMpIHtcbiAgICAgICAgcm91dGUgPSByb3V0ZXNbaV07XG4gICAgICAgIHJvdXRlci5vbih1dGlscy5vcHRpb25hbGl6ZVRyYWlsaW5nU2xhc2gocm91dGUpLCBvblJvdXRlLmJpbmQod2luZG93LCByb3V0ZSwgY2IpKTtcbiAgICB9XG5cbiAgICAvLyBSZWdpc3RlciByZWRpcmVjdHMuXG4gICAgZm9yIChyb3V0ZSBpbiByZWRpcmVjdHMpIHsgLy8ganNoaW50IGlnbm9yZTpsaW5lXG4gICAgICAgIC8qIGpzaGludCAtVzA4MyAqL1xuICAgICAgICByb3V0ZXIub24odXRpbHMub3B0aW9uYWxpemVUcmFpbGluZ1NsYXNoKHJvdXRlKSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBuYXZpZ2F0ZShyZWRpcmVjdHNbcm91dGVdKTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8qIGpzaGludCArVzA4MyAqL1xuICAgIH1cblxuICAgIC8vIElmIHJvdXRlIG5vdCBmb3VuZCwgc2V0IHRoZSBjb21wb25lbnQgcGF0aCB0byBibGFuay5cbiAgICByb3V0ZXIub24oJy4qJywgb25Sb3V0ZS5iaW5kKHdpbmRvdywgJycsIGNiKSk7XG5cbiAgICAvLyBJZiB3ZSByZWNlaXZlIGEgdXJsIHRoYXQgbG9va3MgbGlrZSAvcm9vdC9zb21ldGhpbmcvIGluIGEgYnJvd3NlclxuICAgIC8vIHVzaW5nIGhhc2ggYmFzZWQgcm91dGluZywgd2UgcmVkaXJlY3QgdG8gcm9vdC8jL3NvbWV0aGluZ1xuICAgIC8vIE5PdGU6IERpcmVjdG9yIGhhbmRsZXMgdGhlIGludmVyc2Ugc2l0dXRhdGlvbiBuaWNlbHkuXG4gICAgaWYgKCFyb3V0ZXIuaGlzdG9yeSkge1xuICAgICAgICB2YXIgcGF0aCA9IG5vcm1hbGl6ZVVybEZyYWdtZW50KHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSk7XG4gICAgICAgIHZhciByb290ID0gbm9ybWFsaXplVXJsRnJhZ21lbnQoY29uZmlnLnJvb3RQYXRoKTtcbiAgICAgICAgaWYgKHBhdGguc2xpY2UoMCwgcm9vdC5sZW5ndGgpID09PSByb290KSB7XG4gICAgICAgICAgICBwYXRoID0gcGF0aC5zbGljZShyb290Lmxlbmd0aCAtIDEpOyAvLyBMZWF2ZSBzdGFydGluZyBcIi9cIlxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQYXRoIGRvZXMgbm90IHN0YXJ0IHdpdGggdGhlIHByb3ZpZGVkIFwicm9vdFwiIHBhdGgnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocGF0aCAhPT0gJy8nKSB7XG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSByb290ICsgJyMnICsgcGF0aDtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgIH1cbiAgICByb3V0ZXIuaW5pdChyb3V0ZXIuaGlzdG9yeSA/ICcnIDogd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lKTtcbn1cblxuZnVuY3Rpb24gbmF2aWdhdGUodXJsKSB7XG4gICAgaWYgKHVybC5zbGljZSgwLCAyKSA9PT0gJy8jJykge1xuICAgICAgICB1cmwgPSB1cmwuc2xpY2UoMik7XG4gICAgfVxuICAgIHJvdXRlci5zZXRSb3V0ZSh1cmwpO1xufVxuXG5mdW5jdGlvbiBvblJvdXRlKHJvdXRlLCBjYi8qLCBwYXJhbXMgKi8pIHtcbiAgICB2YXIgcGFyYW1zTGlzdCA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gICAgdmFyIHBhcmFtc09iaiA9IHt9O1xuICAgIHZhciBwYXJhbUNvdW50ID0gMDtcbiAgICB1dGlscy5wcm9jZXNzUGF0dGVybihyb3V0ZSwgZnVuY3Rpb24ocGFydCwgaXNQYXJhbSkge1xuICAgICAgICBpZiAoaXNQYXJhbSkge1xuICAgICAgICAgICAgcGFyYW1zT2JqW3BhcnRdID0gcm91dGVQYXJhbXNbcGFydF0ucGFyc2UocGFyYW1zTGlzdFtwYXJhbUNvdW50XSk7XG4gICAgICAgICAgICBwYXJhbUNvdW50Kys7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBjYihyb3V0ZSwgcGFyYW1zT2JqKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgc3RhcnQ6IHN0YXJ0Um91dGVyLFxuICAgIG5hdmlnYXRlOiBuYXZpZ2F0ZVxufTsiLCJ2YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbnZhciBrbztcbnZhciBzdGF0ZTtcbnZhciBjb25maWc7XG5cbmZ1bmN0aW9uIGluaXQoa29fLCBjb25maWdfLCBzdGF0ZV8pIHtcbiAgICBrbyA9IGtvXztcbiAgICBjb25maWcgPSBjb25maWdfO1xuICAgIHN0YXRlID0gc3RhdGVfO1xufVxuXG52YXIgU3RhdGVOb2RlID0gdXRpbHMuY3JlYXRlQ2xhc3Moe1xuICAgIGluaXQ6IGZ1bmN0aW9uKGNvbXBvbmVudE5hbWUsIHBhcmFtcywgcGFyZW50Tm9kZSkge1xuICAgICAgICB0aGlzLnBhcmVudCAgICAgICAgICAgICA9IHBhcmVudE5vZGU7XG4gICAgICAgIHRoaXMuY29tcG9uZW50ICAgICAgICAgID0gY29tcG9uZW50TmFtZTtcbiAgICAgICAgdGhpcy5jaGlsZHJlbiAgICAgICAgICAgPSBrby5vYnNlcnZhYmxlQXJyYXkoKTtcbiAgICAgICAgdGhpcy5zdGF0dXMgICAgICAgICAgICAgPSBrby5vYnNlcnZhYmxlKCdsb2FkaW5nJyk7IC8vIGxvYWRpbmcgfCBwZW5kaW5nX3Zpc2libGUgfCB2aXNpYmxlIHwgcGVuZGluZ19yZW1vdmFsXG4gICAgICAgIHRoaXMucm91dGVQYXJhbXMgPSB7fTtcbiAgICAgICAgZm9yICh2YXIgcGFyYW1OYW1lIGluIGNvbmZpZy5yb3V0ZVBhcmFtcykge1xuICAgICAgICAgICAgdGhpcy5yb3V0ZVBhcmFtc1twYXJhbU5hbWVdID0ga28ub2JzZXJ2YWJsZShwYXJhbXNbcGFyYW1OYW1lXSB8fCBudWxsKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBpc1Zpc2libGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5zdGF0dXMoKSA9PT0gJ3Zpc2libGUnIHx8IHRoaXMuc3RhdHVzKCkgPT09ICdwZW5kaW5nX3JlbW92YWwnO1xuICAgIH0sXG5cbiAgICBzZXRSZWFkeTogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aGlzLnN0YXR1cygpICE9PSAnbG9hZGluZycpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignT25seSBsb2FkaW5nIGNvbXBvbmVudHMgY2FuIGJlIG1hcmtlZCBhcyByZWFkeScpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc3RhdHVzKCdwZW5kaW5nX3Zpc2libGUnKTtcbiAgICAgICAgc3RhdGUudHJhbnNpdGlvbklmUmVhZHkoKTtcbiAgICB9LFxuXG4gICAgdXBkYXRlUm91dGVQYXJhbXM6IGZ1bmN0aW9uIChyb3V0ZVBhcmFtcykge1xuICAgICAgICAvLyBTYW5pdHkgY2hlY2suXG4gICAgICAgIGlmICh0aGlzLnN0YXR1cygpID09PSAncGVuZGluZ19yZW1vdmFsJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQYXJhbXMgc2hvdWxkIG5vdCBiZSB1cGRhdGVkIHdoaWxlIHBlbmRpbmcgcmVtb3ZhbCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2xlYXIgb2xkIHZhbHVlcy5cbiAgICAgICAgdmFyIHBhcmFtTmFtZTtcbiAgICAgICAgZm9yIChwYXJhbU5hbWUgaW4gdGhpcy5yb3V0ZVBhcmFtcykge1xuICAgICAgICAgICAgaWYgKCEocGFyYW1OYW1lIGluIHJvdXRlUGFyYW1zKSkge1xuICAgICAgICAgICAgICAgIHRoaXMucm91dGVQYXJhbXNbcGFyYW1OYW1lXShudWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCBuZXcgdmFsdWVzLlxuICAgICAgICBmb3IgKHBhcmFtTmFtZSBpbiByb3V0ZVBhcmFtcykge1xuICAgICAgICAgICAgaWYgKHBhcmFtTmFtZSBpbiB0aGlzLnJvdXRlUGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yb3V0ZVBhcmFtc1twYXJhbU5hbWVdKHJvdXRlUGFyYW1zW3BhcmFtTmFtZV0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VucmVjb2duaXplZCBwYXJhbWV0ZXIgbmFtZS4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICB0cmFuc2l0aW9uOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5jaGlsZHJlbi5yZW1vdmUoZnVuY3Rpb24oY2hpbGQpIHtcbiAgICAgICAgICAgIHJldHVybiBjaGlsZC5zdGF0dXMoKSA9PT0gJ3BlbmRpbmdfcmVtb3ZhbCc7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAodGhpcy5jaGlsZHJlbigpLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5jaGlsZHJlbigpWzBdLnN0YXR1cygndmlzaWJsZScpO1xuICAgICAgICAgICAgdGhpcy5jaGlsZHJlbigpWzBdLnRyYW5zaXRpb24oKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBnZXRQYXRoVG9IZXJlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHBhdGggPSBbdGhpcy5jb21wb25lbnRdO1xuICAgICAgICB2YXIgbm9kZSA9IHRoaXM7XG4gICAgICAgIHdoaWxlIChub2RlLnBhcmVudC5jb21wb25lbnQpIHtcbiAgICAgICAgICAgIHBhdGguc3BsaWNlKDAsIDAsIG5vZGUucGFyZW50LmNvbXBvbmVudCk7XG4gICAgICAgICAgICBub2RlID0gbm9kZS5wYXJlbnQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBhdGguam9pbignLicpO1xuICAgIH0sXG5cbiAgICBsb2FkQ2hpbGQ6IGZ1bmN0aW9uKGNoaWxkQ29tcG9uZW50TmFtZSkge1xuICAgICAgICAvLyBUaGUgY2hpbGQgaXMgYWxyZWFkeSBsb2FkZWQgLSBOT09QLlxuICAgICAgICB2YXIgbWF0Y2hpbmdDaGlsZCA9IHRoaXMuZ2V0TWF0Y2hpbmdDaGlsZChjaGlsZENvbXBvbmVudE5hbWUpO1xuICAgICAgICBpZiAobWF0Y2hpbmdDaGlsZCkge1xuICAgICAgICAgICAgcmV0dXJuIG1hdGNoaW5nQ2hpbGQ7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZW1vdmUgb3RoZXIgY29tcG9uZW50IGlmIG5vdCByZWFkeS5cbiAgICAgICAgdGhpcy5jaGlsZHJlbi5yZW1vdmUoZnVuY3Rpb24oY2hpbGQpIHtcbiAgICAgICAgICAgIHJldHVybiBjaGlsZC5zdGF0dXMoKSA9PT0gJ2xvYWRpbmcnO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTYW5pdHkgY2hlY2suXG4gICAgICAgIGlmICh0aGlzLmNoaWxkcmVuKCkubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1RoZXJlIHNob3VsZCBvbmx5IGJlIDEgYWN0aXZlIGNoaWxkIGNvbXBvbmVudCBhdCBhIHRpbWUnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE1hcmsgdGhlIGxvYWRlZCBjb21wb25lbnQgYXMgcGVuZGluZyByZW1vdmFsLlxuICAgICAgICB0aGlzLmNoaWxkcmVuKCkuZm9yRWFjaChmdW5jdGlvbihjaGlsZCkge1xuICAgICAgICAgICAgY2hpbGQuc3RhdHVzKCdwZW5kaW5nX3JlbW92YWwnKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWRkIG5vZGUuXG4gICAgICAgIHZhciBjaGlsZCA9IG5ldyBTdGF0ZU5vZGUoY2hpbGRDb21wb25lbnROYW1lLCBrby50b0pTKHRoaXMucm91dGVQYXJhbXMpLCB0aGlzKTtcbiAgICAgICAgdGhpcy5jaGlsZHJlbi5wdXNoKGNoaWxkKTtcbiAgICAgICAgcmV0dXJuIGNoaWxkO1xuICAgIH0sXG5cbiAgICBpc0JyYW5jaFJlYWR5OiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHRoaXMuc3RhdHVzKCkgPT09ICdsb2FkaW5nJykge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGkgaW4gdGhpcy5jaGlsZHJlbigpKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuY2hpbGRyZW4oKVtpXS5pc0JyYW5jaFJlYWR5KCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSxcblxuICAgIGdldE1hdGNoaW5nQ2hpbGQ6IGZ1bmN0aW9uKGNvbXBvbmVudE5hbWUpIHtcbiAgICAgICAgdmFyIG1hdGNoaW5nQ2hpbGRyZW4gPSB0aGlzLmNoaWxkcmVuKCkuZmlsdGVyKGZ1bmN0aW9uKGNoaWxkKSB7XG4gICAgICAgICAgICByZXR1cm4gY2hpbGQuY29tcG9uZW50ID09PSBjb21wb25lbnROYW1lO1xuICAgICAgICB9KTtcbiAgICAgICAgaWYgKG1hdGNoaW5nQ2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gbWF0Y2hpbmdDaGlsZHJlblswXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgaW5pdDogaW5pdCxcbiAgICBTdGF0ZU5vZGU6IFN0YXRlTm9kZVxufTsiLCJ2YXIgc3RhdGVOb2RlID0gcmVxdWlyZSgnLi9zdGF0ZS1ub2RlJyk7XG5cbnZhciB0cmVlO1xudmFyIGFjdGl2ZVBhdGg7XG52YXIgYWN0aXZlUGF0aE5vdGlmeWVyO1xuXG5mdW5jdGlvbiBpbml0IChrbykge1xuICAgIHRyZWUgPSBuZXcgc3RhdGVOb2RlLlN0YXRlTm9kZShudWxsLCB7fSk7XG4gICAgdHJlZS5zdGF0dXMoJ3Zpc2libGUnKTtcblxuICAgIC8vIFRoZSBhY3RpdmUgcGF0aCBpcyB1c2VkIGJ5IHRoZSBrb2tvLWFjdGl2YXRlIGFuZCBrb2tvLWhyZWYgYmluZGluZ3MuXG4gICAgLy8gV2hlbiB0aGUgYmluZGluZ3MgYXJlIGluaXRpbGl6ZWQsIHRoZSBzaG91bGQgYWx3YXlzIGxvb2sgYXQgdGhlIGxhc3Rlc3QgcGF0aC5cbiAgICAvLyBXaGVuIHRoZSBwYXRoIGNoYW5nZXMsIGhvd2V2ZXIsIHdlIGRvbid0IHdhbnQgdGhlIGJpbmRpbmdzIHRvIGJlIHVwZGF0ZWRcbiAgICAvLyBVbnRpbCB0aGUgdHJhbnNpdGlvbiBpcyBjb21wbGV0ZS4gVG8gYWNoZWl2ZSB0aGlzLCBnZXRBY3RpdmVQYXRoKCkgcmV0dXJuc1xuICAgIC8vIHRoZSBjdXJyZW50IHBhdGggYnV0IGNyZWF0ZXMgYSBzdWJzY3JpcHRpb24gdG8gYWN0aXZlUGF0aE5vdGlmeWVyKCkuXG4gICAgLy8gV2hlbmV2ZXIgYSB0cmFuc2l0aW9uIGlzIGNvbXBsZXRlLCB3ZSBuZWVkIHRvIG1hbnVhbGx5IHVwZGF0ZSBhY3RpdmVQYXRoTm90aWZ5ZXIoKVxuICAgIC8vIHNvIHRoYXQgdGhlIGFwcHJvcHJpYXRlIGJpbmRpbmdzIGFyZSB1cGRhdGVkLlxuICAgIGFjdGl2ZVBhdGggPSAnJztcbiAgICBhY3RpdmVQYXRoTm90aWZ5ZXIgPSBrby5vYnNlcnZhYmxlKCk7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZShwYXRoLCByb3V0ZVBhcmFtcykge1xuICAgIHZhciBub2RlID0gdHJlZTtcbiAgICBhY3RpdmVQYXRoID0gcGF0aDtcbiAgICBwYXRoLnNwbGl0KCcuJykuZm9yRWFjaChmdW5jdGlvbihjb21wb25lbnROYW1lKSB7XG4gICAgICAgIG5vZGUgPSBub2RlLmxvYWRDaGlsZChjb21wb25lbnROYW1lKTtcbiAgICAgICAgbm9kZS51cGRhdGVSb3V0ZVBhcmFtcyhyb3V0ZVBhcmFtcyk7XG4gICAgfSk7XG4gICAgaWYgKG5vZGUuY2hpbGRyZW4oKS5sZW5ndGgpIHtcbiAgICAgICAgbm9kZS5jaGlsZHJlbi5yZW1vdmVBbGwoKTtcbiAgICAgICAgYWN0aXZlUGF0aE5vdGlmeWVyKGFjdGl2ZVBhdGgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gdHJhbnNpdGlvbklmUmVhZHkgKCkge1xuICAgIGlmICh0cmVlLmlzQnJhbmNoUmVhZHkoKSkge1xuICAgICAgICB0cmVlLnRyYW5zaXRpb24oKTtcbiAgICAgICAgYWN0aXZlUGF0aE5vdGlmeWVyKGFjdGl2ZVBhdGgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZ2V0QWN0aXZlUGF0aCgpIHtcbiAgICBhY3RpdmVQYXRoTm90aWZ5ZXIoKTtcbiAgICByZXR1cm4gYWN0aXZlUGF0aDtcbn1cblxuZnVuY3Rpb24gZ2V0Um9vdCgpIHtcbiAgICByZXR1cm4gdHJlZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgaW5pdDogaW5pdCxcbiAgICB1cGRhdGU6IHVwZGF0ZSxcbiAgICB0cmFuc2l0aW9uSWZSZWFkeTogdHJhbnNpdGlvbklmUmVhZHksXG4gICAgZ2V0QWN0aXZlUGF0aDogZ2V0QWN0aXZlUGF0aCxcbiAgICBnZXRSb290OiBnZXRSb290XG59OyIsInZhciBzdGF0ZVRyZWUgPSByZXF1aXJlKCcuL3N0YXRlLXRyZWUnKTtcbnZhciB1dGlscyAgICAgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbnZhciBrbztcbnZhciBjb25maWc7XG5cbmZ1bmN0aW9uIGluaXQoa29fLCBjb25maWdfKSB7XG4gICAga28gPSBrb187XG4gICAgY29uZmlnID0gY29uZmlnXztcbn1cblxuZnVuY3Rpb24gcmVzb2x2ZUFic29sdXRlUGF0aFRvVXJsKHBhdGgsIHBhcmFtcykge1xuICAgIC8vIEdldCBwYXR0ZXJuLlxuICAgIHBhcmFtcyA9IHBhcmFtcyB8fCB7fTtcbiAgICB2YXIgcGF0dGVybnMgPSBbXTtcbiAgICB1dGlscy5mb3JPd24oY29uZmlnLnJvdXRlcywgZnVuY3Rpb24ocGF0dGVybiwgX3BhdGgpIHtcbiAgICAgICAgaWYgKF9wYXRoID09PSBwYXRoKSB7XG4gICAgICAgICAgICBwYXR0ZXJucy5wdXNoKHBhdHRlcm4pO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBTdWJzdGl0dXRlIHBhcmFtZXRlcnMuXG4gICAgdmFyIHVybHMgPSBwYXR0ZXJucy5tYXAoZnVuY3Rpb24ocGF0dGVybikge1xuICAgICAgICB2YXIgcGFydHMgPSBbXTtcbiAgICAgICAgdmFyIGlzTWF0Y2ggPSB0cnVlO1xuICAgICAgICB1dGlscy5wcm9jZXNzUGF0dGVybihwYXR0ZXJuLCBmdW5jdGlvbiAocGFydCwgaXNQYXJhbSkge1xuICAgICAgICAgICAgaWYgKGlzUGFyYW0pIHtcbiAgICAgICAgICAgICAgICBpZiAocGFyYW1zLmhhc093blByb3BlcnR5KHBhcnQpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBwYXJhbSA9IHBhcmFtc1twYXJ0XSArICcnO1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmVnZXggPSBjb25maWcucm91dGVQYXJhbXNbcGFydF0ucmVnZXg7XG4gICAgICAgICAgICAgICAgICAgIHZhciBtYXRjaCA9IHBhcmFtLm1hdGNoKHJlZ2V4KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1hdGNoICYmIG1hdGNoWzBdID09PSBwYXJhbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFydHMucHVzaChwYXJhbXNbcGFydF0gKyAnJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpc01hdGNoID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7IC8vIFN0b3AuXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpc01hdGNoID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTsgLy8gU3RvcC5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHBhcnRzLnB1c2gocGFydCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gKGlzTWF0Y2ggPyBwYXJ0cy5qb2luKCcvJykgOiBudWxsKTtcbiAgICB9KVxuICAgIC5maWx0ZXIoZnVuY3Rpb24odXJsKSB7XG4gICAgICAgIHJldHVybiB1cmwgIT09IG51bGw7XG4gICAgfSk7XG5cbiAgICAvLyBWYWxpZGF0ZSByZXN1bHQuXG4gICAgaWYgKHVybHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIHJldHVybiAoY29uZmlnLmh0bWw1SGlzdG9yeSA/ICcnIDogJy8jJykgKyB1cmxzWzBdO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBzID0gJyBmb3IgcGF0aCBcIicgKyBwYXRoICsgJ1wiIGFuZCBwYXJhbXMgXCInICsgSlNPTi5zdHJpbmdpZnkocGFyYW1zKSArICdcIi4nO1xuICAgICAgICBpZiAodXJscy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ291bGQgbm90IHJlc29sdmUgdXJsJyArIHMpO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTXVsdHBsZSBVUkxzIG1hdGNoJyArIHMpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gcmVzb2x2ZVBhdGhUb1VybChwYXRoLCBwYXJhbXMsIHN0YXRlTm9kZSkge1xuICAgIHBhcmFtcyA9IHBhcmFtcyB8fCB7fTtcbiAgICBpZiAoaXNQYXRoUmVsYXRpdmUocGF0aCkpIHtcbiAgICAgICAgLy8gTWFrZSBwYXRoIGFic29sdXRlLlxuICAgICAgICBwYXRoID0gc3RhdGVOb2RlLmdldFBhdGhUb0hlcmUoKSArIChwYXRoID09PSAnLicgPyAnJyA6IHBhdGgpO1xuXG4gICAgICAgIC8vIFVzZSBjdXJyZW50IHBhcmFtcyB3aGVyZSBub3Qgc3VwcGxpZWQuXG4gICAgICAgIHZhciBjdXJQYXJhbXMgPSBzdGF0ZU5vZGUucGFyYW1zO1xuICAgICAgICBmb3IgKHZhciBwYXJhbU5hbWUgaW4gY3VyUGFyYW1zKSB7XG4gICAgICAgICAgICBpZiAoIXBhcmFtc1twYXJhbU5hbWVdKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zW3BhcmFtTmFtZV0gPSBjdXJQYXJhbXNbcGFyYW1OYW1lXSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXNvbHZlQWJzb2x1dGVQYXRoVG9VcmwocGF0aCwgcGFyYW1zKTtcbn1cblxuZnVuY3Rpb24gcGF0aE1hdGNoZXNDdXJyZW50KHBhdGgsIHBhcmFtcywgc3RhdGVOb2RlKSB7XG4gICAgLy8gcm9vdC50aGluZyBtYXRjaGVzIHJvb3QudGhpbmcub3RoZXItdGhpbmcgKHBhcnRpYWwgbWF0Y2gpLlxuICAgIHZhciBwcm92aWRlZFBhdGggPSByZXNvbHZlUGF0aFRvVXJsKHBhdGgsIHBhcmFtcywgc3RhdGVOb2RlKTtcbiAgICB2YXIgY3VyUGF0aCA9IHJlc29sdmVBYnNvbHV0ZVBhdGhUb1VybChzdGF0ZVRyZWUuZ2V0QWN0aXZlUGF0aCgpLCBrby50b0pTKHN0YXRlTm9kZS5yb3V0ZVBhcmFtcykpO1xuICAgIHJldHVybiBjdXJQYXRoLmluZGV4T2YocHJvdmlkZWRQYXRoKSA9PT0gMDtcbn1cblxuZnVuY3Rpb24gaXNQYXRoUmVsYXRpdmUgKHBhdGgpIHtcbiAgICByZXR1cm4gcGF0aC5pbmRleE9mKCcuJykgPT09IDA7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGluaXQ6IGluaXQsXG4gICAgcmVzb2x2ZUFic29sdXRlUGF0aFRvVXJsOiByZXNvbHZlQWJzb2x1dGVQYXRoVG9VcmwsXG4gICAgcmVzb2x2ZVBhdGhUb1VybDogcmVzb2x2ZVBhdGhUb1VybCxcbiAgICBwYXRoTWF0Y2hlc0N1cnJlbnQ6IHBhdGhNYXRjaGVzQ3VycmVudCxcbiAgICBpc1BhdGhSZWxhdGl2ZTogaXNQYXRoUmVsYXRpdmVcbn07IiwiZnVuY3Rpb24gcHJvY2Vzc1BhdHRlcm4gKHBhdHRlcm4sIGNhbGxiYWNrKSB7XG4gICAgcGF0dGVybi5zcGxpdCgnLycpLmZvckVhY2goZnVuY3Rpb24ocGFydCkge1xuICAgICAgICB2YXIgaXNQYXJhbSA9IGZhbHNlO1xuICAgICAgICBpZiAocGFydC5pbmRleE9mKCc6JykgPT09IDApIHtcbiAgICAgICAgICAgIHBhcnQgPSBwYXJ0LnJlcGxhY2UoJzonLCAnJyk7XG4gICAgICAgICAgICBpc1BhcmFtID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2FsbGJhY2socGFydCwgaXNQYXJhbSk7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIG9wdGlvbmFsaXplVHJhaWxpbmdTbGFzaCAocGF0dGVybikge1xuICAgIGlmIChwYXR0ZXJuLnNsaWNlKC0xKSA9PT0gJy8nKSB7XG4gICAgICAgIHJldHVybiBwYXR0ZXJuICsgJz8nO1xuICAgIH1cbiAgICBpZiAocGF0dGVybi5zbGljZSgtMSkgPT09ICcvPycpIHtcbiAgICAgICAgcmV0dXJuIHBhdHRlcm47XG4gICAgfVxuICAgIHJldHVybiBwYXR0ZXJuICsgJy8/Jztcbn1cblxuZnVuY3Rpb24gZ2V0U3RhdGVOb2RlRnJvbUNvbnRleHQgKGNvbnRleHQpIHtcbiAgICB3aGlsZSAoY29udGV4dCAmJiAhZ2V0S29rb0Zyb21CaW5kaW5nQ29udGV4dChjb250ZXh0KSkge1xuICAgICAgICBjb250ZXh0ID0gY29udGV4dC4kcGFyZW50O1xuICAgIH1cbiAgICBpZiAoIWNvbnRleHQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb3VsZCBub3QgZmluZCBrb2tvIGluIGNvbnRleHQnKTtcbiAgICB9XG4gICAgcmV0dXJuIGdldEtva29Gcm9tQmluZGluZ0NvbnRleHQoY29udGV4dCkuc3RhdGVOb2RlO1xufVxuXG5mdW5jdGlvbiBnZXRLb2tvRnJvbUJpbmRpbmdDb250ZXh0IChjb250ZXh0KSB7XG4gICAgcmV0dXJuIGNvbnRleHQua29rbyB8fCBjb250ZXh0LiRkYXRhLmtva28gfHwgbnVsbDtcbn1cblxuZnVuY3Rpb24gYmluZE1ldGhvZHMoc2VsZikge1xuICAgIGZvciAodmFyIG5hbWUgaW4gc2VsZikge1xuICAgICAgICBpZiAodHlwZW9mIHNlbGZbbmFtZV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHNlbGZbbmFtZV0gPSBzZWxmW25hbWVdLmJpbmQoc2VsZik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHNlbGY7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUNsYXNzKHByb3BzLCBkb05vdEJpbmQpIHtcbiAgICB2YXIgQ2xhc3MgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKCFkb05vdEJpbmQpIHtcbiAgICAgICAgICAgIGJpbmRNZXRob2RzKHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmluaXQpIHtcbiAgICAgICAgICAgIHRoaXMuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBmb3IgKHZhciBuYW1lIGluIHByb3BzKSB7XG4gICAgICAgIENsYXNzLnByb3RvdHlwZVtuYW1lXSA9IHByb3BzW25hbWVdO1xuICAgIH1cbiAgICByZXR1cm4gQ2xhc3M7XG59XG5cbmZ1bmN0aW9uIGluQXJyYXkobGlzdCwgaXRlbSkge1xuICAgIGZvciAodmFyIGkgaW4gbGlzdCkge1xuICAgICAgICBpZiAobGlzdFtpXSA9PT0gaXRlbSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiByZW1vdmVGcm9tQXJyYXkobGlzdCwgaXRlbSkge1xuICAgIGZvciAodmFyIGkgPSBsaXN0Lmxlbmd0aCAtIDE7IGkgPi0gMDsgaS0tKSB7XG4gICAgICAgIGlmIChsaXN0W2ldID09PSBpdGVtKSB7XG4gICAgICAgICAgICBsaXN0LnNwbGljZShpLCAxKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gYWRkQ2xhc3NUb0VsZW0oZWxlbWVudCwgY2xhc3NOYW1lKSB7XG4gICAgdmFyIGNsYXNzZXMgPSBlbGVtZW50LmNsYXNzTmFtZS5zcGxpdCgnICcpO1xuICAgIGlmICghaW5BcnJheShjbGFzc2VzLCBjbGFzc05hbWUpKSB7XG4gICAgICAgIGNsYXNzZXMucHVzaChjbGFzc05hbWUpO1xuICAgICAgICBlbGVtZW50LmNsYXNzTmFtZSA9IGNsYXNzZXMuam9pbignICcpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gcmVtb3ZlQ2xhc3NGcm9tRWxlbShlbGVtZW50LCBjbGFzc05hbWUpIHtcbiAgICB2YXIgY2xhc3NlcyA9IGVsZW1lbnQuY2xhc3NOYW1lLnNwbGl0KCcgJyk7XG4gICAgaWYgKGluQXJyYXkoY2xhc3NlcywgY2xhc3NOYW1lKSkge1xuICAgICAgICByZW1vdmVGcm9tQXJyYXkoY2xhc3NlcywgY2xhc3NOYW1lKTtcbiAgICAgICAgZWxlbWVudC5jbGFzc05hbWUgPSBjbGFzc2VzLmpvaW4oJyAnKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHRvZ2dsZUVsZW1DbGFzcyhlbGVtZW50LCBjbGFzc05hbWUsIGJvb2wpIHtcbiAgICBpZiAoYm9vbCkge1xuICAgICAgICBhZGRDbGFzc1RvRWxlbShlbGVtZW50LCBjbGFzc05hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJlbW92ZUNsYXNzRnJvbUVsZW0oZWxlbWVudCwgY2xhc3NOYW1lKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGZvck93bihvYmplY3QsIGNiKSB7XG4gICAgZm9yICh2YXIga2V5IGluIG9iamVjdCkge1xuICAgICAgICBpZiAob2JqZWN0Lmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgIGNiKGtleSwgb2JqZWN0W2tleV0pO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiBhc3NpZ24oZGVzdCwgc291cmNlKSB7XG4gICAgZm9yICh2YXIga2V5IGluIHNvdXJjZSkge1xuICAgICAgICBpZiAoc291cmNlLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgIGRlc3Rba2V5XSA9IHNvdXJjZVtrZXldO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBwcm9jZXNzUGF0dGVybjogcHJvY2Vzc1BhdHRlcm4sXG4gICAgb3B0aW9uYWxpemVUcmFpbGluZ1NsYXNoOiBvcHRpb25hbGl6ZVRyYWlsaW5nU2xhc2gsXG4gICAgZ2V0U3RhdGVOb2RlRnJvbUNvbnRleHQ6IGdldFN0YXRlTm9kZUZyb21Db250ZXh0LFxuICAgIGJpbmRNZXRob2RzOiBiaW5kTWV0aG9kcyxcbiAgICBjcmVhdGVDbGFzczogY3JlYXRlQ2xhc3MsXG4gICAgdG9nZ2xlRWxlbUNsYXNzOiB0b2dnbGVFbGVtQ2xhc3MsXG4gICAgYXNzaWduOiBhc3NpZ24sXG4gICAgZm9yT3duOiBmb3JPd25cbn07Il19
