/*!
* Koko JavaScript library v0.1.2
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
        if (this.status() === 'loading') {
            this.status('pending_visible');
            state.transitionIfReady();
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMva29rby5qcyIsIm5vZGVfbW9kdWxlcy9kaXJlY3Rvci9idWlsZC9kaXJlY3Rvci5qcyIsInNyYy80MDQuaHRtbCIsInNyYy80MDQuanMiLCJzcmMvYmluZGluZ3MuanMiLCJzcmMvY29tcG9uZW50LmpzIiwic3JjL2tva28tdmlldy5odG1sIiwic3JjL2tva28tdmlldy5qcyIsInNyYy9yb3V0ZXIuanMiLCJzcmMvc3RhdGUtbm9kZS5qcyIsInNyYy9zdGF0ZS10cmVlLmpzIiwic3JjL3VybC1yZXNvbHZlci5qcyIsInNyYy91dGlscy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5c0JBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9FQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIHJvdXRlciAgICAgID0gcmVxdWlyZSgnLi9yb3V0ZXInKTtcbnZhciBzdGF0ZU5vZGUgICA9IHJlcXVpcmUoJy4vc3RhdGUtbm9kZScpO1xudmFyIHN0YXRlVHJlZSAgID0gcmVxdWlyZSgnLi9zdGF0ZS10cmVlJyk7XG52YXIgdXJsUmVzb2x2ZXIgPSByZXF1aXJlKCcuL3VybC1yZXNvbHZlcicpO1xudmFyIGNvbXBvbmVudCAgID0gcmVxdWlyZSgnLi9jb21wb25lbnQnKTtcbnZhciBiaW5kaW5ncyAgICA9IHJlcXVpcmUoJy4vYmluZGluZ3MnKTtcbnZhciBrb2tvVmlldyAgICA9IHJlcXVpcmUoJy4va29rby12aWV3Jyk7XG52YXIgXzQwNCAgICAgICAgPSByZXF1aXJlKCcuLzQwNCcpO1xudmFyIHV0aWxzICAgICAgID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG52YXIga287XG52YXIgY29uZmlnO1xuXG5mdW5jdGlvbiBpbml0KGtvXykge1xuICAgIGtvID0ga29fO1xuICAgIGNvbXBvbmVudC5pbml0KGtvKTtcbiAgICBrb2tvVmlldy5pbml0KGtvKTtcbiAgICBfNDA0LmluaXQoa28sIGNvbXBvbmVudC5jcmVhdGVDb21wb25lbnRWaWV3TW9kZWwpO1xuICAgIGJpbmRpbmdzLmluaXQoa28pO1xuICAgIHNldEVhcmx5RXhwb3J0cygpO1xufVxuXG5mdW5jdGlvbiBzZXRDb25maWcoY29uZmlnXykge1xuICAgIGNvbmZpZyA9IGNvbmZpZ187XG5cbiAgICAvLyBJbml0IHN0dWZmIHRvIGluamVjdCBkZXBlbmRlbmNpZXMuXG4gICAgc3RhdGVOb2RlLmluaXQoa28sIGNvbmZpZywgc3RhdGVUcmVlKTtcbiAgICBzdGF0ZVRyZWUuaW5pdChrbyk7XG4gICAgdXJsUmVzb2x2ZXIuaW5pdChrbywgY29uZmlnKTtcblxuICAgIC8vIEdldCBsaXN0IG9mIHJvdXRlcyBmb3Igcm91dGVyXG4gICAgdmFyIHJvdXRlO1xuICAgIHZhciByb3V0ZXMgPSBbXTtcbiAgICBmb3IgKHJvdXRlIGluIGNvbmZpZy5yb3V0ZXMpIHtcbiAgICAgICAgcm91dGVzLnB1c2gocm91dGUpO1xuICAgIH1cblxuICAgIC8vIEdldCByZXNvbHZlZCByZWRpcmVjdHMgZm9yIHJvdXRlci5cbiAgICB2YXIgcmVkaXJlY3RzID0ge307XG4gICAgZm9yIChyb3V0ZSBpbiBjb25maWcucmVkaXJlY3RzKSB7XG4gICAgICAgIHZhciB0YXJnZXQgPSBjb25maWcucmVkaXJlY3RzW3JvdXRlXTtcbiAgICAgICAgaWYgKHR5cGVvZiB0YXJnZXQgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICByZWRpcmVjdHNbcm91dGVdID0gdXJsUmVzb2x2ZXIucmVzb2x2ZUFic29sdXRlUGF0aFRvVXJsKHRhcmdldC5wYXRoLCB0YXJnZXQucGFyYW1zKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlZGlyZWN0c1tyb3V0ZV0gPSB1cmxSZXNvbHZlci5yZXNvbHZlQWJzb2x1dGVQYXRoVG9VcmwodGFyZ2V0KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFN0YXJ0IHJvdXRlci5cbiAgICByb3V0ZXIuc3RhcnQoe1xuICAgICAgICByb290VXJsOiBjb25maWcucm9vdFVybCxcbiAgICAgICAgcm91dGVzOiByb3V0ZXMsXG4gICAgICAgIHJvdXRlUGFyYW1zOiBjb25maWcucm91dGVQYXJhbXMsXG4gICAgICAgIHJlZGlyZWN0czogcmVkaXJlY3RzLFxuICAgICAgICBodG1sNUhpc3Rvcnk6IGNvbmZpZy5odG1sNUhpc3RvcnkgfHwgZmFsc2VcbiAgICB9LCBvblJvdXRlKTtcblxuICAgIC8vIEV4cG9ydCBBUEkuXG4gICAgc2V0TGF0ZUV4cG9ydHMoKTtcbn1cblxuZnVuY3Rpb24gb25Sb3V0ZShyb3V0ZSwgcGFyYW1zKSB7XG4gICAgaWYgKHJvdXRlKSB7XG4gICAgICAgIHN0YXRlVHJlZS51cGRhdGUoY29uZmlnLnJvdXRlc1tyb3V0ZV0sIHBhcmFtcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgc3RhdGVUcmVlLnVwZGF0ZShjb25maWcubm90Rm91bmRDb21wb25lbnQgfHwgJ2tva29EZWZhdWx0NDA0JywgcGFyYW1zKTtcbiAgICB9XG5cbn1cblxuZnVuY3Rpb24gbmF2aWdhdGVUb1BhdGgocGF0aCwgcGFyYW1zLCBzdGF0ZU5vZGUpIHtcbiAgICByb3V0ZXIubmF2aWdhdGUodXJsUmVzb2x2ZXIucmVzb2x2ZVBhdGhUb1VybChwYXRoLCBwYXJhbXMsIHN0YXRlTm9kZSkpO1xufVxuXG5mdW5jdGlvbiBuYXZpZ2F0ZVRvVXJsKHVybCkge1xuICAgIHJvdXRlci5uYXZpZ2F0ZSh1cmwpO1xufVxuXG4vLyBDYWxsZWQgYnkgLmluaXQoKVxuZnVuY3Rpb24gc2V0RWFybHlFeHBvcnRzKCkge1xuICAgIHV0aWxzLmFzc2lnbihtb2R1bGUuZXhwb3J0cywge1xuICAgICAgICBjb21wb25lbnRWaWV3TW9kZWw6IGNvbXBvbmVudC5jcmVhdGVDb21wb25lbnRWaWV3TW9kZWwsXG4gICAgICAgIGNvbmZpZzogc2V0Q29uZmlnXG4gICAgfSk7XG59XG5cbi8vIENhbGxlZCBieSAucnVuKClcbmZ1bmN0aW9uIHNldExhdGVFeHBvcnRzKCkge1xuICAgIHV0aWxzLmFzc2lnbihtb2R1bGUuZXhwb3J0cywge1xuICAgICAgICByZXNvbHZlOiB1cmxSZXNvbHZlci5yZXNvbHZlUGF0aFRvVXJsLFxuICAgICAgICBuYXZpZ2F0ZVRvUGF0aDogbmF2aWdhdGVUb1BhdGgsXG4gICAgICAgIG5hdmlnYXRlVG9Vcmw6IG5hdmlnYXRlVG9VcmwsXG4gICAgICAgIHJvb3Q6IHtcbiAgICAgICAgICAgIHN0YXRlTm9kZTogc3RhdGVUcmVlLmdldFJvb3QoKVxuICAgICAgICB9XG4gICAgfSk7XG59XG5cbm1vZHVsZS5leHBvcnRzLmluaXQgPSBpbml0OyIsIlxuXG4vL1xuLy8gR2VuZXJhdGVkIG9uIEZyaSBEZWMgMjcgMjAxMyAxMjowMjoxMSBHTVQtMDUwMCAoRVNUKSBieSBOb2Rlaml0c3UsIEluYyAoVXNpbmcgQ29kZXN1cmdlb24pLlxuLy8gVmVyc2lvbiAxLjIuMlxuLy9cblxuKGZ1bmN0aW9uIChleHBvcnRzKSB7XG5cbi8qXG4gKiBicm93c2VyLmpzOiBCcm93c2VyIHNwZWNpZmljIGZ1bmN0aW9uYWxpdHkgZm9yIGRpcmVjdG9yLlxuICpcbiAqIChDKSAyMDExLCBOb2Rlaml0c3UgSW5jLlxuICogTUlUIExJQ0VOU0VcbiAqXG4gKi9cblxuaWYgKCFBcnJheS5wcm90b3R5cGUuZmlsdGVyKSB7XG4gIEFycmF5LnByb3RvdHlwZS5maWx0ZXIgPSBmdW5jdGlvbihmaWx0ZXIsIHRoYXQpIHtcbiAgICB2YXIgb3RoZXIgPSBbXSwgdjtcbiAgICBmb3IgKHZhciBpID0gMCwgbiA9IHRoaXMubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XG4gICAgICBpZiAoaSBpbiB0aGlzICYmIGZpbHRlci5jYWxsKHRoYXQsIHYgPSB0aGlzW2ldLCBpLCB0aGlzKSkge1xuICAgICAgICBvdGhlci5wdXNoKHYpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb3RoZXI7XG4gIH07XG59XG5cbmlmICghQXJyYXkuaXNBcnJheSl7XG4gIEFycmF5LmlzQXJyYXkgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gIH07XG59XG5cbnZhciBkbG9jID0gZG9jdW1lbnQubG9jYXRpb247XG5cbmZ1bmN0aW9uIGRsb2NIYXNoRW1wdHkoKSB7XG4gIC8vIE5vbi1JRSBicm93c2VycyByZXR1cm4gJycgd2hlbiB0aGUgYWRkcmVzcyBiYXIgc2hvd3MgJyMnOyBEaXJlY3RvcidzIGxvZ2ljXG4gIC8vIGFzc3VtZXMgYm90aCBtZWFuIGVtcHR5LlxuICByZXR1cm4gZGxvYy5oYXNoID09PSAnJyB8fCBkbG9jLmhhc2ggPT09ICcjJztcbn1cblxudmFyIGxpc3RlbmVyID0ge1xuICBtb2RlOiAnbW9kZXJuJyxcbiAgaGFzaDogZGxvYy5oYXNoLFxuICBoaXN0b3J5OiBmYWxzZSxcblxuICBjaGVjazogZnVuY3Rpb24gKCkge1xuICAgIHZhciBoID0gZGxvYy5oYXNoO1xuICAgIGlmIChoICE9IHRoaXMuaGFzaCkge1xuICAgICAgdGhpcy5oYXNoID0gaDtcbiAgICAgIHRoaXMub25IYXNoQ2hhbmdlZCgpO1xuICAgIH1cbiAgfSxcblxuICBmaXJlOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMubW9kZSA9PT0gJ21vZGVybicpIHtcbiAgICAgIHRoaXMuaGlzdG9yeSA9PT0gdHJ1ZSA/IHdpbmRvdy5vbnBvcHN0YXRlKCkgOiB3aW5kb3cub25oYXNoY2hhbmdlKCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhpcy5vbkhhc2hDaGFuZ2VkKCk7XG4gICAgfVxuICB9LFxuXG4gIGluaXQ6IGZ1bmN0aW9uIChmbiwgaGlzdG9yeSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLmhpc3RvcnkgPSBoaXN0b3J5O1xuXG4gICAgaWYgKCFSb3V0ZXIubGlzdGVuZXJzKSB7XG4gICAgICBSb3V0ZXIubGlzdGVuZXJzID0gW107XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25jaGFuZ2Uob25DaGFuZ2VFdmVudCkge1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBSb3V0ZXIubGlzdGVuZXJzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICBSb3V0ZXIubGlzdGVuZXJzW2ldKG9uQ2hhbmdlRXZlbnQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vbm90ZSBJRTggaXMgYmVpbmcgY291bnRlZCBhcyAnbW9kZXJuJyBiZWNhdXNlIGl0IGhhcyB0aGUgaGFzaGNoYW5nZSBldmVudFxuICAgIGlmICgnb25oYXNoY2hhbmdlJyBpbiB3aW5kb3cgJiYgKGRvY3VtZW50LmRvY3VtZW50TW9kZSA9PT0gdW5kZWZpbmVkXG4gICAgICB8fCBkb2N1bWVudC5kb2N1bWVudE1vZGUgPiA3KSkge1xuICAgICAgLy8gQXQgbGVhc3QgZm9yIG5vdyBIVE1MNSBoaXN0b3J5IGlzIGF2YWlsYWJsZSBmb3IgJ21vZGVybicgYnJvd3NlcnMgb25seVxuICAgICAgaWYgKHRoaXMuaGlzdG9yeSA9PT0gdHJ1ZSkge1xuICAgICAgICAvLyBUaGVyZSBpcyBhbiBvbGQgYnVnIGluIENocm9tZSB0aGF0IGNhdXNlcyBvbnBvcHN0YXRlIHRvIGZpcmUgZXZlblxuICAgICAgICAvLyB1cG9uIGluaXRpYWwgcGFnZSBsb2FkLiBTaW5jZSB0aGUgaGFuZGxlciBpcyBydW4gbWFudWFsbHkgaW4gaW5pdCgpLFxuICAgICAgICAvLyB0aGlzIHdvdWxkIGNhdXNlIENocm9tZSB0byBydW4gaXQgdHdpc2UuIEN1cnJlbnRseSB0aGUgb25seVxuICAgICAgICAvLyB3b3JrYXJvdW5kIHNlZW1zIHRvIGJlIHRvIHNldCB0aGUgaGFuZGxlciBhZnRlciB0aGUgaW5pdGlhbCBwYWdlIGxvYWRcbiAgICAgICAgLy8gaHR0cDovL2NvZGUuZ29vZ2xlLmNvbS9wL2Nocm9taXVtL2lzc3Vlcy9kZXRhaWw/aWQ9NjMwNDBcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICB3aW5kb3cub25wb3BzdGF0ZSA9IG9uY2hhbmdlO1xuICAgICAgICB9LCA1MDApO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHdpbmRvdy5vbmhhc2hjaGFuZ2UgPSBvbmNoYW5nZTtcbiAgICAgIH1cbiAgICAgIHRoaXMubW9kZSA9ICdtb2Rlcm4nO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIC8vXG4gICAgICAvLyBJRSBzdXBwb3J0LCBiYXNlZCBvbiBhIGNvbmNlcHQgYnkgRXJpayBBcnZpZHNvbiAuLi5cbiAgICAgIC8vXG4gICAgICB2YXIgZnJhbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpZnJhbWUnKTtcbiAgICAgIGZyYW1lLmlkID0gJ3N0YXRlLWZyYW1lJztcbiAgICAgIGZyYW1lLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGZyYW1lKTtcbiAgICAgIHRoaXMud3JpdGVGcmFtZSgnJyk7XG5cbiAgICAgIGlmICgnb25wcm9wZXJ0eWNoYW5nZScgaW4gZG9jdW1lbnQgJiYgJ2F0dGFjaEV2ZW50JyBpbiBkb2N1bWVudCkge1xuICAgICAgICBkb2N1bWVudC5hdHRhY2hFdmVudCgnb25wcm9wZXJ0eWNoYW5nZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBpZiAoZXZlbnQucHJvcGVydHlOYW1lID09PSAnbG9jYXRpb24nKSB7XG4gICAgICAgICAgICBzZWxmLmNoZWNrKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgd2luZG93LnNldEludGVydmFsKGZ1bmN0aW9uICgpIHsgc2VsZi5jaGVjaygpOyB9LCA1MCk7XG5cbiAgICAgIHRoaXMub25IYXNoQ2hhbmdlZCA9IG9uY2hhbmdlO1xuICAgICAgdGhpcy5tb2RlID0gJ2xlZ2FjeSc7XG4gICAgfVxuXG4gICAgUm91dGVyLmxpc3RlbmVycy5wdXNoKGZuKTtcblxuICAgIHJldHVybiB0aGlzLm1vZGU7XG4gIH0sXG5cbiAgZGVzdHJveTogZnVuY3Rpb24gKGZuKSB7XG4gICAgaWYgKCFSb3V0ZXIgfHwgIVJvdXRlci5saXN0ZW5lcnMpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgbGlzdGVuZXJzID0gUm91dGVyLmxpc3RlbmVycztcblxuICAgIGZvciAodmFyIGkgPSBsaXN0ZW5lcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgIGlmIChsaXN0ZW5lcnNbaV0gPT09IGZuKSB7XG4gICAgICAgIGxpc3RlbmVycy5zcGxpY2UoaSwgMSk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIHNldEhhc2g6IGZ1bmN0aW9uIChzKSB7XG4gICAgLy8gTW96aWxsYSBhbHdheXMgYWRkcyBhbiBlbnRyeSB0byB0aGUgaGlzdG9yeVxuICAgIGlmICh0aGlzLm1vZGUgPT09ICdsZWdhY3knKSB7XG4gICAgICB0aGlzLndyaXRlRnJhbWUocyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuaGlzdG9yeSA9PT0gdHJ1ZSkge1xuICAgICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKHt9LCBkb2N1bWVudC50aXRsZSwgcyk7XG4gICAgICAvLyBGaXJlIGFuIG9ucG9wc3RhdGUgZXZlbnQgbWFudWFsbHkgc2luY2UgcHVzaGluZyBkb2VzIG5vdCBvYnZpb3VzbHlcbiAgICAgIC8vIHRyaWdnZXIgdGhlIHBvcCBldmVudC5cbiAgICAgIHRoaXMuZmlyZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBkbG9jLmhhc2ggPSAoc1swXSA9PT0gJy8nKSA/IHMgOiAnLycgKyBzO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICB3cml0ZUZyYW1lOiBmdW5jdGlvbiAocykge1xuICAgIC8vIElFIHN1cHBvcnQuLi5cbiAgICB2YXIgZiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzdGF0ZS1mcmFtZScpO1xuICAgIHZhciBkID0gZi5jb250ZW50RG9jdW1lbnQgfHwgZi5jb250ZW50V2luZG93LmRvY3VtZW50O1xuICAgIGQub3BlbigpO1xuICAgIGQud3JpdGUoXCI8c2NyaXB0Pl9oYXNoID0gJ1wiICsgcyArIFwiJzsgb25sb2FkID0gcGFyZW50Lmxpc3RlbmVyLnN5bmNIYXNoOzxzY3JpcHQ+XCIpO1xuICAgIGQuY2xvc2UoKTtcbiAgfSxcblxuICBzeW5jSGFzaDogZnVuY3Rpb24gKCkge1xuICAgIC8vIElFIHN1cHBvcnQuLi5cbiAgICB2YXIgcyA9IHRoaXMuX2hhc2g7XG4gICAgaWYgKHMgIT0gZGxvYy5oYXNoKSB7XG4gICAgICBkbG9jLmhhc2ggPSBzO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICBvbkhhc2hDaGFuZ2VkOiBmdW5jdGlvbiAoKSB7fVxufTtcblxudmFyIFJvdXRlciA9IGV4cG9ydHMuUm91dGVyID0gZnVuY3Rpb24gKHJvdXRlcykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgUm91dGVyKSkgcmV0dXJuIG5ldyBSb3V0ZXIocm91dGVzKTtcblxuICB0aGlzLnBhcmFtcyAgID0ge307XG4gIHRoaXMucm91dGVzICAgPSB7fTtcbiAgdGhpcy5tZXRob2RzICA9IFsnb24nLCAnb25jZScsICdhZnRlcicsICdiZWZvcmUnXTtcbiAgdGhpcy5zY29wZSAgICA9IFtdO1xuICB0aGlzLl9tZXRob2RzID0ge307XG5cbiAgdGhpcy5faW5zZXJ0ID0gdGhpcy5pbnNlcnQ7XG4gIHRoaXMuaW5zZXJ0ID0gdGhpcy5pbnNlcnRFeDtcblxuICB0aGlzLmhpc3RvcnlTdXBwb3J0ID0gKHdpbmRvdy5oaXN0b3J5ICE9IG51bGwgPyB3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUgOiBudWxsKSAhPSBudWxsXG5cbiAgdGhpcy5jb25maWd1cmUoKTtcbiAgdGhpcy5tb3VudChyb3V0ZXMgfHwge30pO1xufTtcblxuUm91dGVyLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKHIpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLmhhbmRsZXIgPSBmdW5jdGlvbihvbkNoYW5nZUV2ZW50KSB7XG4gICAgdmFyIG5ld1VSTCA9IG9uQ2hhbmdlRXZlbnQgJiYgb25DaGFuZ2VFdmVudC5uZXdVUkwgfHwgd2luZG93LmxvY2F0aW9uLmhhc2g7XG4gICAgdmFyIHVybCA9IHNlbGYuaGlzdG9yeSA9PT0gdHJ1ZSA/IHNlbGYuZ2V0UGF0aCgpIDogbmV3VVJMLnJlcGxhY2UoLy4qIy8sICcnKTtcbiAgICBzZWxmLmRpc3BhdGNoKCdvbicsIHVybC5jaGFyQXQoMCkgPT09ICcvJyA/IHVybCA6ICcvJyArIHVybCk7XG4gIH07XG5cbiAgbGlzdGVuZXIuaW5pdCh0aGlzLmhhbmRsZXIsIHRoaXMuaGlzdG9yeSk7XG5cbiAgaWYgKHRoaXMuaGlzdG9yeSA9PT0gZmFsc2UpIHtcbiAgICBpZiAoZGxvY0hhc2hFbXB0eSgpICYmIHIpIHtcbiAgICAgIGRsb2MuaGFzaCA9IHI7XG4gICAgfSBlbHNlIGlmICghZGxvY0hhc2hFbXB0eSgpKSB7XG4gICAgICBzZWxmLmRpc3BhdGNoKCdvbicsICcvJyArIGRsb2MuaGFzaC5yZXBsYWNlKC9eKCNcXC98I3xcXC8pLywgJycpKTtcbiAgICB9XG4gIH1cbiAgZWxzZSB7XG4gICAgdmFyIHJvdXRlVG8gPSBkbG9jSGFzaEVtcHR5KCkgJiYgciA/IHIgOiAhZGxvY0hhc2hFbXB0eSgpID8gZGxvYy5oYXNoLnJlcGxhY2UoL14jLywgJycpIDogbnVsbDtcbiAgICBpZiAocm91dGVUbykge1xuICAgICAgd2luZG93Lmhpc3RvcnkucmVwbGFjZVN0YXRlKHt9LCBkb2N1bWVudC50aXRsZSwgcm91dGVUbyk7XG4gICAgfVxuXG4gICAgLy8gUm91dGVyIGhhcyBiZWVuIGluaXRpYWxpemVkLCBidXQgZHVlIHRvIHRoZSBjaHJvbWUgYnVnIGl0IHdpbGwgbm90XG4gICAgLy8geWV0IGFjdHVhbGx5IHJvdXRlIEhUTUw1IGhpc3Rvcnkgc3RhdGUgY2hhbmdlcy4gVGh1cywgZGVjaWRlIGlmIHNob3VsZCByb3V0ZS5cbiAgICBpZiAocm91dGVUbyB8fCB0aGlzLnJ1bl9pbl9pbml0ID09PSB0cnVlKSB7XG4gICAgICB0aGlzLmhhbmRsZXIoKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cblJvdXRlci5wcm90b3R5cGUuZXhwbG9kZSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHYgPSB0aGlzLmhpc3RvcnkgPT09IHRydWUgPyB0aGlzLmdldFBhdGgoKSA6IGRsb2MuaGFzaDtcbiAgaWYgKHYuY2hhckF0KDEpID09PSAnLycpIHsgdj12LnNsaWNlKDEpIH1cbiAgcmV0dXJuIHYuc2xpY2UoMSwgdi5sZW5ndGgpLnNwbGl0KFwiL1wiKTtcbn07XG5cblJvdXRlci5wcm90b3R5cGUuc2V0Um91dGUgPSBmdW5jdGlvbiAoaSwgdiwgdmFsKSB7XG4gIHZhciB1cmwgPSB0aGlzLmV4cGxvZGUoKTtcblxuICBpZiAodHlwZW9mIGkgPT09ICdudW1iZXInICYmIHR5cGVvZiB2ID09PSAnc3RyaW5nJykge1xuICAgIHVybFtpXSA9IHY7XG4gIH1cbiAgZWxzZSBpZiAodHlwZW9mIHZhbCA9PT0gJ3N0cmluZycpIHtcbiAgICB1cmwuc3BsaWNlKGksIHYsIHMpO1xuICB9XG4gIGVsc2Uge1xuICAgIHVybCA9IFtpXTtcbiAgfVxuXG4gIGxpc3RlbmVyLnNldEhhc2godXJsLmpvaW4oJy8nKSk7XG4gIHJldHVybiB1cmw7XG59O1xuXG4vL1xuLy8gIyMjIGZ1bmN0aW9uIGluc2VydEV4KG1ldGhvZCwgcGF0aCwgcm91dGUsIHBhcmVudClcbi8vICMjIyMgQG1ldGhvZCB7c3RyaW5nfSBNZXRob2QgdG8gaW5zZXJ0IHRoZSBzcGVjaWZpYyBgcm91dGVgLlxuLy8gIyMjIyBAcGF0aCB7QXJyYXl9IFBhcnNlZCBwYXRoIHRvIGluc2VydCB0aGUgYHJvdXRlYCBhdC5cbi8vICMjIyMgQHJvdXRlIHtBcnJheXxmdW5jdGlvbn0gUm91dGUgaGFuZGxlcnMgdG8gaW5zZXJ0LlxuLy8gIyMjIyBAcGFyZW50IHtPYmplY3R9ICoqT3B0aW9uYWwqKiBQYXJlbnQgXCJyb3V0ZXNcIiB0byBpbnNlcnQgaW50by5cbi8vIGluc2VydCBhIGNhbGxiYWNrIHRoYXQgd2lsbCBvbmx5IG9jY3VyIG9uY2UgcGVyIHRoZSBtYXRjaGVkIHJvdXRlLlxuLy9cblJvdXRlci5wcm90b3R5cGUuaW5zZXJ0RXggPSBmdW5jdGlvbihtZXRob2QsIHBhdGgsIHJvdXRlLCBwYXJlbnQpIHtcbiAgaWYgKG1ldGhvZCA9PT0gXCJvbmNlXCIpIHtcbiAgICBtZXRob2QgPSBcIm9uXCI7XG4gICAgcm91dGUgPSBmdW5jdGlvbihyb3V0ZSkge1xuICAgICAgdmFyIG9uY2UgPSBmYWxzZTtcbiAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKG9uY2UpIHJldHVybjtcbiAgICAgICAgb25jZSA9IHRydWU7XG4gICAgICAgIHJldHVybiByb3V0ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgfTtcbiAgICB9KHJvdXRlKTtcbiAgfVxuICByZXR1cm4gdGhpcy5faW5zZXJ0KG1ldGhvZCwgcGF0aCwgcm91dGUsIHBhcmVudCk7XG59O1xuXG5Sb3V0ZXIucHJvdG90eXBlLmdldFJvdXRlID0gZnVuY3Rpb24gKHYpIHtcbiAgdmFyIHJldCA9IHY7XG5cbiAgaWYgKHR5cGVvZiB2ID09PSBcIm51bWJlclwiKSB7XG4gICAgcmV0ID0gdGhpcy5leHBsb2RlKClbdl07XG4gIH1cbiAgZWxzZSBpZiAodHlwZW9mIHYgPT09IFwic3RyaW5nXCIpe1xuICAgIHZhciBoID0gdGhpcy5leHBsb2RlKCk7XG4gICAgcmV0ID0gaC5pbmRleE9mKHYpO1xuICB9XG4gIGVsc2Uge1xuICAgIHJldCA9IHRoaXMuZXhwbG9kZSgpO1xuICB9XG5cbiAgcmV0dXJuIHJldDtcbn07XG5cblJvdXRlci5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uICgpIHtcbiAgbGlzdGVuZXIuZGVzdHJveSh0aGlzLmhhbmRsZXIpO1xuICByZXR1cm4gdGhpcztcbn07XG5cblJvdXRlci5wcm90b3R5cGUuZ2V0UGF0aCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHBhdGggPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWU7XG4gIGlmIChwYXRoLnN1YnN0cigwLCAxKSAhPT0gJy8nKSB7XG4gICAgcGF0aCA9ICcvJyArIHBhdGg7XG4gIH1cbiAgcmV0dXJuIHBhdGg7XG59O1xuZnVuY3Rpb24gX2V2ZXJ5KGFyciwgaXRlcmF0b3IpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyBpICs9IDEpIHtcbiAgICBpZiAoaXRlcmF0b3IoYXJyW2ldLCBpLCBhcnIpID09PSBmYWxzZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBfZmxhdHRlbihhcnIpIHtcbiAgdmFyIGZsYXQgPSBbXTtcbiAgZm9yICh2YXIgaSA9IDAsIG4gPSBhcnIubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XG4gICAgZmxhdCA9IGZsYXQuY29uY2F0KGFycltpXSk7XG4gIH1cbiAgcmV0dXJuIGZsYXQ7XG59XG5cbmZ1bmN0aW9uIF9hc3luY0V2ZXJ5U2VyaWVzKGFyciwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gIGlmICghYXJyLmxlbmd0aCkge1xuICAgIHJldHVybiBjYWxsYmFjaygpO1xuICB9XG4gIHZhciBjb21wbGV0ZWQgPSAwO1xuICAoZnVuY3Rpb24gaXRlcmF0ZSgpIHtcbiAgICBpdGVyYXRvcihhcnJbY29tcGxldGVkXSwgZnVuY3Rpb24oZXJyKSB7XG4gICAgICBpZiAoZXJyIHx8IGVyciA9PT0gZmFsc2UpIHtcbiAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgY2FsbGJhY2sgPSBmdW5jdGlvbigpIHt9O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29tcGxldGVkICs9IDE7XG4gICAgICAgIGlmIChjb21wbGV0ZWQgPT09IGFyci5sZW5ndGgpIHtcbiAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGl0ZXJhdGUoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9KSgpO1xufVxuXG5mdW5jdGlvbiBwYXJhbWlmeVN0cmluZyhzdHIsIHBhcmFtcywgbW9kKSB7XG4gIG1vZCA9IHN0cjtcbiAgZm9yICh2YXIgcGFyYW0gaW4gcGFyYW1zKSB7XG4gICAgaWYgKHBhcmFtcy5oYXNPd25Qcm9wZXJ0eShwYXJhbSkpIHtcbiAgICAgIG1vZCA9IHBhcmFtc1twYXJhbV0oc3RyKTtcbiAgICAgIGlmIChtb2QgIT09IHN0cikge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIG1vZCA9PT0gc3RyID8gXCIoWy5fYS16QS1aMC05LV0rKVwiIDogbW9kO1xufVxuXG5mdW5jdGlvbiByZWdpZnlTdHJpbmcoc3RyLCBwYXJhbXMpIHtcbiAgdmFyIG1hdGNoZXMsIGxhc3QgPSAwLCBvdXQgPSBcIlwiO1xuICB3aGlsZSAobWF0Y2hlcyA9IHN0ci5zdWJzdHIobGFzdCkubWF0Y2goL1teXFx3XFxkXFwtICVAJl0qXFwqW15cXHdcXGRcXC0gJUAmXSovKSkge1xuICAgIGxhc3QgPSBtYXRjaGVzLmluZGV4ICsgbWF0Y2hlc1swXS5sZW5ndGg7XG4gICAgbWF0Y2hlc1swXSA9IG1hdGNoZXNbMF0ucmVwbGFjZSgvXlxcKi8sIFwiKFtfLigpIVxcXFwgJUAmYS16QS1aMC05LV0rKVwiKTtcbiAgICBvdXQgKz0gc3RyLnN1YnN0cigwLCBtYXRjaGVzLmluZGV4KSArIG1hdGNoZXNbMF07XG4gIH1cbiAgc3RyID0gb3V0ICs9IHN0ci5zdWJzdHIobGFzdCk7XG4gIHZhciBjYXB0dXJlcyA9IHN0ci5tYXRjaCgvOihbXlxcL10rKS9pZyksIGNhcHR1cmUsIGxlbmd0aDtcbiAgaWYgKGNhcHR1cmVzKSB7XG4gICAgbGVuZ3RoID0gY2FwdHVyZXMubGVuZ3RoO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIGNhcHR1cmUgPSBjYXB0dXJlc1tpXTtcbiAgICAgIGlmIChjYXB0dXJlLnNsaWNlKDAsIDIpID09PSBcIjo6XCIpIHtcbiAgICAgICAgc3RyID0gY2FwdHVyZS5zbGljZSgxKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0ciA9IHN0ci5yZXBsYWNlKGNhcHR1cmUsIHBhcmFtaWZ5U3RyaW5nKGNhcHR1cmUsIHBhcmFtcykpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gc3RyO1xufVxuXG5mdW5jdGlvbiB0ZXJtaW5hdG9yKHJvdXRlcywgZGVsaW1pdGVyLCBzdGFydCwgc3RvcCkge1xuICB2YXIgbGFzdCA9IDAsIGxlZnQgPSAwLCByaWdodCA9IDAsIHN0YXJ0ID0gKHN0YXJ0IHx8IFwiKFwiKS50b1N0cmluZygpLCBzdG9wID0gKHN0b3AgfHwgXCIpXCIpLnRvU3RyaW5nKCksIGk7XG4gIGZvciAoaSA9IDA7IGkgPCByb3V0ZXMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgY2h1bmsgPSByb3V0ZXNbaV07XG4gICAgaWYgKGNodW5rLmluZGV4T2Yoc3RhcnQsIGxhc3QpID4gY2h1bmsuaW5kZXhPZihzdG9wLCBsYXN0KSB8fCB+Y2h1bmsuaW5kZXhPZihzdGFydCwgbGFzdCkgJiYgIX5jaHVuay5pbmRleE9mKHN0b3AsIGxhc3QpIHx8ICF+Y2h1bmsuaW5kZXhPZihzdGFydCwgbGFzdCkgJiYgfmNodW5rLmluZGV4T2Yoc3RvcCwgbGFzdCkpIHtcbiAgICAgIGxlZnQgPSBjaHVuay5pbmRleE9mKHN0YXJ0LCBsYXN0KTtcbiAgICAgIHJpZ2h0ID0gY2h1bmsuaW5kZXhPZihzdG9wLCBsYXN0KTtcbiAgICAgIGlmICh+bGVmdCAmJiAhfnJpZ2h0IHx8ICF+bGVmdCAmJiB+cmlnaHQpIHtcbiAgICAgICAgdmFyIHRtcCA9IHJvdXRlcy5zbGljZSgwLCAoaSB8fCAxKSArIDEpLmpvaW4oZGVsaW1pdGVyKTtcbiAgICAgICAgcm91dGVzID0gWyB0bXAgXS5jb25jYXQocm91dGVzLnNsaWNlKChpIHx8IDEpICsgMSkpO1xuICAgICAgfVxuICAgICAgbGFzdCA9IChyaWdodCA+IGxlZnQgPyByaWdodCA6IGxlZnQpICsgMTtcbiAgICAgIGkgPSAwO1xuICAgIH0gZWxzZSB7XG4gICAgICBsYXN0ID0gMDtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJvdXRlcztcbn1cblxuUm91dGVyLnByb3RvdHlwZS5jb25maWd1cmUgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubWV0aG9kcy5sZW5ndGg7IGkrKykge1xuICAgIHRoaXMuX21ldGhvZHNbdGhpcy5tZXRob2RzW2ldXSA9IHRydWU7XG4gIH1cbiAgdGhpcy5yZWN1cnNlID0gb3B0aW9ucy5yZWN1cnNlIHx8IHRoaXMucmVjdXJzZSB8fCBmYWxzZTtcbiAgdGhpcy5hc3luYyA9IG9wdGlvbnMuYXN5bmMgfHwgZmFsc2U7XG4gIHRoaXMuZGVsaW1pdGVyID0gb3B0aW9ucy5kZWxpbWl0ZXIgfHwgXCIvXCI7XG4gIHRoaXMuc3RyaWN0ID0gdHlwZW9mIG9wdGlvbnMuc3RyaWN0ID09PSBcInVuZGVmaW5lZFwiID8gdHJ1ZSA6IG9wdGlvbnMuc3RyaWN0O1xuICB0aGlzLm5vdGZvdW5kID0gb3B0aW9ucy5ub3Rmb3VuZDtcbiAgdGhpcy5yZXNvdXJjZSA9IG9wdGlvbnMucmVzb3VyY2U7XG4gIHRoaXMuaGlzdG9yeSA9IG9wdGlvbnMuaHRtbDVoaXN0b3J5ICYmIHRoaXMuaGlzdG9yeVN1cHBvcnQgfHwgZmFsc2U7XG4gIHRoaXMucnVuX2luX2luaXQgPSB0aGlzLmhpc3RvcnkgPT09IHRydWUgJiYgb3B0aW9ucy5ydW5faGFuZGxlcl9pbl9pbml0ICE9PSBmYWxzZTtcbiAgdGhpcy5ldmVyeSA9IHtcbiAgICBhZnRlcjogb3B0aW9ucy5hZnRlciB8fCBudWxsLFxuICAgIGJlZm9yZTogb3B0aW9ucy5iZWZvcmUgfHwgbnVsbCxcbiAgICBvbjogb3B0aW9ucy5vbiB8fCBudWxsXG4gIH07XG4gIHJldHVybiB0aGlzO1xufTtcblxuUm91dGVyLnByb3RvdHlwZS5wYXJhbSA9IGZ1bmN0aW9uKHRva2VuLCBtYXRjaGVyKSB7XG4gIGlmICh0b2tlblswXSAhPT0gXCI6XCIpIHtcbiAgICB0b2tlbiA9IFwiOlwiICsgdG9rZW47XG4gIH1cbiAgdmFyIGNvbXBpbGVkID0gbmV3IFJlZ0V4cCh0b2tlbiwgXCJnXCIpO1xuICB0aGlzLnBhcmFtc1t0b2tlbl0gPSBmdW5jdGlvbihzdHIpIHtcbiAgICByZXR1cm4gc3RyLnJlcGxhY2UoY29tcGlsZWQsIG1hdGNoZXIuc291cmNlIHx8IG1hdGNoZXIpO1xuICB9O1xufTtcblxuUm91dGVyLnByb3RvdHlwZS5vbiA9IFJvdXRlci5wcm90b3R5cGUucm91dGUgPSBmdW5jdGlvbihtZXRob2QsIHBhdGgsIHJvdXRlKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgaWYgKCFyb3V0ZSAmJiB0eXBlb2YgcGF0aCA9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICByb3V0ZSA9IHBhdGg7XG4gICAgcGF0aCA9IG1ldGhvZDtcbiAgICBtZXRob2QgPSBcIm9uXCI7XG4gIH1cbiAgaWYgKEFycmF5LmlzQXJyYXkocGF0aCkpIHtcbiAgICByZXR1cm4gcGF0aC5mb3JFYWNoKGZ1bmN0aW9uKHApIHtcbiAgICAgIHNlbGYub24obWV0aG9kLCBwLCByb3V0ZSk7XG4gICAgfSk7XG4gIH1cbiAgaWYgKHBhdGguc291cmNlKSB7XG4gICAgcGF0aCA9IHBhdGguc291cmNlLnJlcGxhY2UoL1xcXFxcXC8vaWcsIFwiL1wiKTtcbiAgfVxuICBpZiAoQXJyYXkuaXNBcnJheShtZXRob2QpKSB7XG4gICAgcmV0dXJuIG1ldGhvZC5mb3JFYWNoKGZ1bmN0aW9uKG0pIHtcbiAgICAgIHNlbGYub24obS50b0xvd2VyQ2FzZSgpLCBwYXRoLCByb3V0ZSk7XG4gICAgfSk7XG4gIH1cbiAgcGF0aCA9IHBhdGguc3BsaXQobmV3IFJlZ0V4cCh0aGlzLmRlbGltaXRlcikpO1xuICBwYXRoID0gdGVybWluYXRvcihwYXRoLCB0aGlzLmRlbGltaXRlcik7XG4gIHRoaXMuaW5zZXJ0KG1ldGhvZCwgdGhpcy5zY29wZS5jb25jYXQocGF0aCksIHJvdXRlKTtcbn07XG5cblJvdXRlci5wcm90b3R5cGUuZGlzcGF0Y2ggPSBmdW5jdGlvbihtZXRob2QsIHBhdGgsIGNhbGxiYWNrKSB7XG4gIHZhciBzZWxmID0gdGhpcywgZm5zID0gdGhpcy50cmF2ZXJzZShtZXRob2QsIHBhdGgsIHRoaXMucm91dGVzLCBcIlwiKSwgaW52b2tlZCA9IHRoaXMuX2ludm9rZWQsIGFmdGVyO1xuICB0aGlzLl9pbnZva2VkID0gdHJ1ZTtcbiAgaWYgKCFmbnMgfHwgZm5zLmxlbmd0aCA9PT0gMCkge1xuICAgIHRoaXMubGFzdCA9IFtdO1xuICAgIGlmICh0eXBlb2YgdGhpcy5ub3Rmb3VuZCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICB0aGlzLmludm9rZShbIHRoaXMubm90Zm91bmQgXSwge1xuICAgICAgICBtZXRob2Q6IG1ldGhvZCxcbiAgICAgICAgcGF0aDogcGF0aFxuICAgICAgfSwgY2FsbGJhY2spO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKHRoaXMucmVjdXJzZSA9PT0gXCJmb3J3YXJkXCIpIHtcbiAgICBmbnMgPSBmbnMucmV2ZXJzZSgpO1xuICB9XG4gIGZ1bmN0aW9uIHVwZGF0ZUFuZEludm9rZSgpIHtcbiAgICBzZWxmLmxhc3QgPSBmbnMuYWZ0ZXI7XG4gICAgc2VsZi5pbnZva2Uoc2VsZi5ydW5saXN0KGZucyksIHNlbGYsIGNhbGxiYWNrKTtcbiAgfVxuICBhZnRlciA9IHRoaXMuZXZlcnkgJiYgdGhpcy5ldmVyeS5hZnRlciA/IFsgdGhpcy5ldmVyeS5hZnRlciBdLmNvbmNhdCh0aGlzLmxhc3QpIDogWyB0aGlzLmxhc3QgXTtcbiAgaWYgKGFmdGVyICYmIGFmdGVyLmxlbmd0aCA+IDAgJiYgaW52b2tlZCkge1xuICAgIGlmICh0aGlzLmFzeW5jKSB7XG4gICAgICB0aGlzLmludm9rZShhZnRlciwgdGhpcywgdXBkYXRlQW5kSW52b2tlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5pbnZva2UoYWZ0ZXIsIHRoaXMpO1xuICAgICAgdXBkYXRlQW5kSW52b2tlKCk7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHVwZGF0ZUFuZEludm9rZSgpO1xuICByZXR1cm4gdHJ1ZTtcbn07XG5cblJvdXRlci5wcm90b3R5cGUuaW52b2tlID0gZnVuY3Rpb24oZm5zLCB0aGlzQXJnLCBjYWxsYmFjaykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBhcHBseTtcbiAgaWYgKHRoaXMuYXN5bmMpIHtcbiAgICBhcHBseSA9IGZ1bmN0aW9uKGZuLCBuZXh0KSB7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShmbikpIHtcbiAgICAgICAgcmV0dXJuIF9hc3luY0V2ZXJ5U2VyaWVzKGZuLCBhcHBseSwgbmV4dCk7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBmbiA9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgZm4uYXBwbHkodGhpc0FyZywgZm5zLmNhcHR1cmVzLmNvbmNhdChuZXh0KSk7XG4gICAgICB9XG4gICAgfTtcbiAgICBfYXN5bmNFdmVyeVNlcmllcyhmbnMsIGFwcGx5LCBmdW5jdGlvbigpIHtcbiAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjay5hcHBseSh0aGlzQXJnLCBhcmd1bWVudHMpO1xuICAgICAgfVxuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIGFwcGx5ID0gZnVuY3Rpb24oZm4pIHtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KGZuKSkge1xuICAgICAgICByZXR1cm4gX2V2ZXJ5KGZuLCBhcHBseSk7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBmbiA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIHJldHVybiBmbi5hcHBseSh0aGlzQXJnLCBmbnMuY2FwdHVyZXMgfHwgW10pO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgZm4gPT09IFwic3RyaW5nXCIgJiYgc2VsZi5yZXNvdXJjZSkge1xuICAgICAgICBzZWxmLnJlc291cmNlW2ZuXS5hcHBseSh0aGlzQXJnLCBmbnMuY2FwdHVyZXMgfHwgW10pO1xuICAgICAgfVxuICAgIH07XG4gICAgX2V2ZXJ5KGZucywgYXBwbHkpO1xuICB9XG59O1xuXG5Sb3V0ZXIucHJvdG90eXBlLnRyYXZlcnNlID0gZnVuY3Rpb24obWV0aG9kLCBwYXRoLCByb3V0ZXMsIHJlZ2V4cCwgZmlsdGVyKSB7XG4gIHZhciBmbnMgPSBbXSwgY3VycmVudCwgZXhhY3QsIG1hdGNoLCBuZXh0LCB0aGF0O1xuICBmdW5jdGlvbiBmaWx0ZXJSb3V0ZXMocm91dGVzKSB7XG4gICAgaWYgKCFmaWx0ZXIpIHtcbiAgICAgIHJldHVybiByb3V0ZXM7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGRlZXBDb3B5KHNvdXJjZSkge1xuICAgICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzb3VyY2UubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgcmVzdWx0W2ldID0gQXJyYXkuaXNBcnJheShzb3VyY2VbaV0pID8gZGVlcENvcHkoc291cmNlW2ldKSA6IHNvdXJjZVtpXTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGFwcGx5RmlsdGVyKGZucykge1xuICAgICAgZm9yICh2YXIgaSA9IGZucy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShmbnNbaV0pKSB7XG4gICAgICAgICAgYXBwbHlGaWx0ZXIoZm5zW2ldKTtcbiAgICAgICAgICBpZiAoZm5zW2ldLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgZm5zLnNwbGljZShpLCAxKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKCFmaWx0ZXIoZm5zW2ldKSkge1xuICAgICAgICAgICAgZm5zLnNwbGljZShpLCAxKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgdmFyIG5ld1JvdXRlcyA9IGRlZXBDb3B5KHJvdXRlcyk7XG4gICAgbmV3Um91dGVzLm1hdGNoZWQgPSByb3V0ZXMubWF0Y2hlZDtcbiAgICBuZXdSb3V0ZXMuY2FwdHVyZXMgPSByb3V0ZXMuY2FwdHVyZXM7XG4gICAgbmV3Um91dGVzLmFmdGVyID0gcm91dGVzLmFmdGVyLmZpbHRlcihmaWx0ZXIpO1xuICAgIGFwcGx5RmlsdGVyKG5ld1JvdXRlcyk7XG4gICAgcmV0dXJuIG5ld1JvdXRlcztcbiAgfVxuICBpZiAocGF0aCA9PT0gdGhpcy5kZWxpbWl0ZXIgJiYgcm91dGVzW21ldGhvZF0pIHtcbiAgICBuZXh0ID0gWyBbIHJvdXRlcy5iZWZvcmUsIHJvdXRlc1ttZXRob2RdIF0uZmlsdGVyKEJvb2xlYW4pIF07XG4gICAgbmV4dC5hZnRlciA9IFsgcm91dGVzLmFmdGVyIF0uZmlsdGVyKEJvb2xlYW4pO1xuICAgIG5leHQubWF0Y2hlZCA9IHRydWU7XG4gICAgbmV4dC5jYXB0dXJlcyA9IFtdO1xuICAgIHJldHVybiBmaWx0ZXJSb3V0ZXMobmV4dCk7XG4gIH1cbiAgZm9yICh2YXIgciBpbiByb3V0ZXMpIHtcbiAgICBpZiAocm91dGVzLmhhc093blByb3BlcnR5KHIpICYmICghdGhpcy5fbWV0aG9kc1tyXSB8fCB0aGlzLl9tZXRob2RzW3JdICYmIHR5cGVvZiByb3V0ZXNbcl0gPT09IFwib2JqZWN0XCIgJiYgIUFycmF5LmlzQXJyYXkocm91dGVzW3JdKSkpIHtcbiAgICAgIGN1cnJlbnQgPSBleGFjdCA9IHJlZ2V4cCArIHRoaXMuZGVsaW1pdGVyICsgcjtcbiAgICAgIGlmICghdGhpcy5zdHJpY3QpIHtcbiAgICAgICAgZXhhY3QgKz0gXCJbXCIgKyB0aGlzLmRlbGltaXRlciArIFwiXT9cIjtcbiAgICAgIH1cbiAgICAgIG1hdGNoID0gcGF0aC5tYXRjaChuZXcgUmVnRXhwKFwiXlwiICsgZXhhY3QpKTtcbiAgICAgIGlmICghbWF0Y2gpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAobWF0Y2hbMF0gJiYgbWF0Y2hbMF0gPT0gcGF0aCAmJiByb3V0ZXNbcl1bbWV0aG9kXSkge1xuICAgICAgICBuZXh0ID0gWyBbIHJvdXRlc1tyXS5iZWZvcmUsIHJvdXRlc1tyXVttZXRob2RdIF0uZmlsdGVyKEJvb2xlYW4pIF07XG4gICAgICAgIG5leHQuYWZ0ZXIgPSBbIHJvdXRlc1tyXS5hZnRlciBdLmZpbHRlcihCb29sZWFuKTtcbiAgICAgICAgbmV4dC5tYXRjaGVkID0gdHJ1ZTtcbiAgICAgICAgbmV4dC5jYXB0dXJlcyA9IG1hdGNoLnNsaWNlKDEpO1xuICAgICAgICBpZiAodGhpcy5yZWN1cnNlICYmIHJvdXRlcyA9PT0gdGhpcy5yb3V0ZXMpIHtcbiAgICAgICAgICBuZXh0LnB1c2goWyByb3V0ZXMuYmVmb3JlLCByb3V0ZXMub24gXS5maWx0ZXIoQm9vbGVhbikpO1xuICAgICAgICAgIG5leHQuYWZ0ZXIgPSBuZXh0LmFmdGVyLmNvbmNhdChbIHJvdXRlcy5hZnRlciBdLmZpbHRlcihCb29sZWFuKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZpbHRlclJvdXRlcyhuZXh0KTtcbiAgICAgIH1cbiAgICAgIG5leHQgPSB0aGlzLnRyYXZlcnNlKG1ldGhvZCwgcGF0aCwgcm91dGVzW3JdLCBjdXJyZW50KTtcbiAgICAgIGlmIChuZXh0Lm1hdGNoZWQpIHtcbiAgICAgICAgaWYgKG5leHQubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGZucyA9IGZucy5jb25jYXQobmV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMucmVjdXJzZSkge1xuICAgICAgICAgIGZucy5wdXNoKFsgcm91dGVzW3JdLmJlZm9yZSwgcm91dGVzW3JdLm9uIF0uZmlsdGVyKEJvb2xlYW4pKTtcbiAgICAgICAgICBuZXh0LmFmdGVyID0gbmV4dC5hZnRlci5jb25jYXQoWyByb3V0ZXNbcl0uYWZ0ZXIgXS5maWx0ZXIoQm9vbGVhbikpO1xuICAgICAgICAgIGlmIChyb3V0ZXMgPT09IHRoaXMucm91dGVzKSB7XG4gICAgICAgICAgICBmbnMucHVzaChbIHJvdXRlc1tcImJlZm9yZVwiXSwgcm91dGVzW1wib25cIl0gXS5maWx0ZXIoQm9vbGVhbikpO1xuICAgICAgICAgICAgbmV4dC5hZnRlciA9IG5leHQuYWZ0ZXIuY29uY2F0KFsgcm91dGVzW1wiYWZ0ZXJcIl0gXS5maWx0ZXIoQm9vbGVhbikpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmbnMubWF0Y2hlZCA9IHRydWU7XG4gICAgICAgIGZucy5jYXB0dXJlcyA9IG5leHQuY2FwdHVyZXM7XG4gICAgICAgIGZucy5hZnRlciA9IG5leHQuYWZ0ZXI7XG4gICAgICAgIHJldHVybiBmaWx0ZXJSb3V0ZXMoZm5zKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufTtcblxuUm91dGVyLnByb3RvdHlwZS5pbnNlcnQgPSBmdW5jdGlvbihtZXRob2QsIHBhdGgsIHJvdXRlLCBwYXJlbnQpIHtcbiAgdmFyIG1ldGhvZFR5cGUsIHBhcmVudFR5cGUsIGlzQXJyYXksIG5lc3RlZCwgcGFydDtcbiAgcGF0aCA9IHBhdGguZmlsdGVyKGZ1bmN0aW9uKHApIHtcbiAgICByZXR1cm4gcCAmJiBwLmxlbmd0aCA+IDA7XG4gIH0pO1xuICBwYXJlbnQgPSBwYXJlbnQgfHwgdGhpcy5yb3V0ZXM7XG4gIHBhcnQgPSBwYXRoLnNoaWZ0KCk7XG4gIGlmICgvXFw6fFxcKi8udGVzdChwYXJ0KSAmJiAhL1xcXFxkfFxcXFx3Ly50ZXN0KHBhcnQpKSB7XG4gICAgcGFydCA9IHJlZ2lmeVN0cmluZyhwYXJ0LCB0aGlzLnBhcmFtcyk7XG4gIH1cbiAgaWYgKHBhdGgubGVuZ3RoID4gMCkge1xuICAgIHBhcmVudFtwYXJ0XSA9IHBhcmVudFtwYXJ0XSB8fCB7fTtcbiAgICByZXR1cm4gdGhpcy5pbnNlcnQobWV0aG9kLCBwYXRoLCByb3V0ZSwgcGFyZW50W3BhcnRdKTtcbiAgfVxuICBpZiAoIXBhcnQgJiYgIXBhdGgubGVuZ3RoICYmIHBhcmVudCA9PT0gdGhpcy5yb3V0ZXMpIHtcbiAgICBtZXRob2RUeXBlID0gdHlwZW9mIHBhcmVudFttZXRob2RdO1xuICAgIHN3aXRjaCAobWV0aG9kVHlwZSkge1xuICAgICBjYXNlIFwiZnVuY3Rpb25cIjpcbiAgICAgIHBhcmVudFttZXRob2RdID0gWyBwYXJlbnRbbWV0aG9kXSwgcm91dGUgXTtcbiAgICAgIHJldHVybjtcbiAgICAgY2FzZSBcIm9iamVjdFwiOlxuICAgICAgcGFyZW50W21ldGhvZF0ucHVzaChyb3V0ZSk7XG4gICAgICByZXR1cm47XG4gICAgIGNhc2UgXCJ1bmRlZmluZWRcIjpcbiAgICAgIHBhcmVudFttZXRob2RdID0gcm91dGU7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHJldHVybjtcbiAgfVxuICBwYXJlbnRUeXBlID0gdHlwZW9mIHBhcmVudFtwYXJ0XTtcbiAgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkocGFyZW50W3BhcnRdKTtcbiAgaWYgKHBhcmVudFtwYXJ0XSAmJiAhaXNBcnJheSAmJiBwYXJlbnRUeXBlID09IFwib2JqZWN0XCIpIHtcbiAgICBtZXRob2RUeXBlID0gdHlwZW9mIHBhcmVudFtwYXJ0XVttZXRob2RdO1xuICAgIHN3aXRjaCAobWV0aG9kVHlwZSkge1xuICAgICBjYXNlIFwiZnVuY3Rpb25cIjpcbiAgICAgIHBhcmVudFtwYXJ0XVttZXRob2RdID0gWyBwYXJlbnRbcGFydF1bbWV0aG9kXSwgcm91dGUgXTtcbiAgICAgIHJldHVybjtcbiAgICAgY2FzZSBcIm9iamVjdFwiOlxuICAgICAgcGFyZW50W3BhcnRdW21ldGhvZF0ucHVzaChyb3V0ZSk7XG4gICAgICByZXR1cm47XG4gICAgIGNhc2UgXCJ1bmRlZmluZWRcIjpcbiAgICAgIHBhcmVudFtwYXJ0XVttZXRob2RdID0gcm91dGU7XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9IGVsc2UgaWYgKHBhcmVudFR5cGUgPT0gXCJ1bmRlZmluZWRcIikge1xuICAgIG5lc3RlZCA9IHt9O1xuICAgIG5lc3RlZFttZXRob2RdID0gcm91dGU7XG4gICAgcGFyZW50W3BhcnRdID0gbmVzdGVkO1xuICAgIHJldHVybjtcbiAgfVxuICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIHJvdXRlIGNvbnRleHQ6IFwiICsgcGFyZW50VHlwZSk7XG59O1xuXG5cblxuUm91dGVyLnByb3RvdHlwZS5leHRlbmQgPSBmdW5jdGlvbihtZXRob2RzKSB7XG4gIHZhciBzZWxmID0gdGhpcywgbGVuID0gbWV0aG9kcy5sZW5ndGgsIGk7XG4gIGZ1bmN0aW9uIGV4dGVuZChtZXRob2QpIHtcbiAgICBzZWxmLl9tZXRob2RzW21ldGhvZF0gPSB0cnVlO1xuICAgIHNlbGZbbWV0aG9kXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGV4dHJhID0gYXJndW1lbnRzLmxlbmd0aCA9PT0gMSA/IFsgbWV0aG9kLCBcIlwiIF0gOiBbIG1ldGhvZCBdO1xuICAgICAgc2VsZi5vbi5hcHBseShzZWxmLCBleHRyYS5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xuICAgIH07XG4gIH1cbiAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgZXh0ZW5kKG1ldGhvZHNbaV0pO1xuICB9XG59O1xuXG5Sb3V0ZXIucHJvdG90eXBlLnJ1bmxpc3QgPSBmdW5jdGlvbihmbnMpIHtcbiAgdmFyIHJ1bmxpc3QgPSB0aGlzLmV2ZXJ5ICYmIHRoaXMuZXZlcnkuYmVmb3JlID8gWyB0aGlzLmV2ZXJ5LmJlZm9yZSBdLmNvbmNhdChfZmxhdHRlbihmbnMpKSA6IF9mbGF0dGVuKGZucyk7XG4gIGlmICh0aGlzLmV2ZXJ5ICYmIHRoaXMuZXZlcnkub24pIHtcbiAgICBydW5saXN0LnB1c2godGhpcy5ldmVyeS5vbik7XG4gIH1cbiAgcnVubGlzdC5jYXB0dXJlcyA9IGZucy5jYXB0dXJlcztcbiAgcnVubGlzdC5zb3VyY2UgPSBmbnMuc291cmNlO1xuICByZXR1cm4gcnVubGlzdDtcbn07XG5cblJvdXRlci5wcm90b3R5cGUubW91bnQgPSBmdW5jdGlvbihyb3V0ZXMsIHBhdGgpIHtcbiAgaWYgKCFyb3V0ZXMgfHwgdHlwZW9mIHJvdXRlcyAhPT0gXCJvYmplY3RcIiB8fCBBcnJheS5pc0FycmF5KHJvdXRlcykpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBwYXRoID0gcGF0aCB8fCBbXTtcbiAgaWYgKCFBcnJheS5pc0FycmF5KHBhdGgpKSB7XG4gICAgcGF0aCA9IHBhdGguc3BsaXQoc2VsZi5kZWxpbWl0ZXIpO1xuICB9XG4gIGZ1bmN0aW9uIGluc2VydE9yTW91bnQocm91dGUsIGxvY2FsKSB7XG4gICAgdmFyIHJlbmFtZSA9IHJvdXRlLCBwYXJ0cyA9IHJvdXRlLnNwbGl0KHNlbGYuZGVsaW1pdGVyKSwgcm91dGVUeXBlID0gdHlwZW9mIHJvdXRlc1tyb3V0ZV0sIGlzUm91dGUgPSBwYXJ0c1swXSA9PT0gXCJcIiB8fCAhc2VsZi5fbWV0aG9kc1twYXJ0c1swXV0sIGV2ZW50ID0gaXNSb3V0ZSA/IFwib25cIiA6IHJlbmFtZTtcbiAgICBpZiAoaXNSb3V0ZSkge1xuICAgICAgcmVuYW1lID0gcmVuYW1lLnNsaWNlKChyZW5hbWUubWF0Y2gobmV3IFJlZ0V4cChcIl5cIiArIHNlbGYuZGVsaW1pdGVyKSkgfHwgWyBcIlwiIF0pWzBdLmxlbmd0aCk7XG4gICAgICBwYXJ0cy5zaGlmdCgpO1xuICAgIH1cbiAgICBpZiAoaXNSb3V0ZSAmJiByb3V0ZVR5cGUgPT09IFwib2JqZWN0XCIgJiYgIUFycmF5LmlzQXJyYXkocm91dGVzW3JvdXRlXSkpIHtcbiAgICAgIGxvY2FsID0gbG9jYWwuY29uY2F0KHBhcnRzKTtcbiAgICAgIHNlbGYubW91bnQocm91dGVzW3JvdXRlXSwgbG9jYWwpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoaXNSb3V0ZSkge1xuICAgICAgbG9jYWwgPSBsb2NhbC5jb25jYXQocmVuYW1lLnNwbGl0KHNlbGYuZGVsaW1pdGVyKSk7XG4gICAgICBsb2NhbCA9IHRlcm1pbmF0b3IobG9jYWwsIHNlbGYuZGVsaW1pdGVyKTtcbiAgICB9XG4gICAgc2VsZi5pbnNlcnQoZXZlbnQsIGxvY2FsLCByb3V0ZXNbcm91dGVdKTtcbiAgfVxuICBmb3IgKHZhciByb3V0ZSBpbiByb3V0ZXMpIHtcbiAgICBpZiAocm91dGVzLmhhc093blByb3BlcnR5KHJvdXRlKSkge1xuICAgICAgaW5zZXJ0T3JNb3VudChyb3V0ZSwgcGF0aC5zbGljZSgwKSk7XG4gICAgfVxuICB9XG59O1xuXG5cblxufSh0eXBlb2YgZXhwb3J0cyA9PT0gXCJvYmplY3RcIiA/IGV4cG9ydHMgOiB3aW5kb3cpKTsiLCJtb2R1bGUuZXhwb3J0cyA9IFwiPHN0eWxlIHR5cGU9XFxcInRleHQvY3NzXFxcIj5cXG4gICAgLm5vdC1mb3VuZCB7XFxuICAgICAgICB0ZXh0LWFsaWduOiBjZW50ZXI7XFxuICAgICAgICBwYWRkaW5nLXRvcDogMTAwcHg7XFxuICAgIH1cXG48L3N0eWxlPlxcbjxkaXYgY2xhc3M9XFxcIm5vdC1mb3VuZFxcXCI+XFxuICAgIDxoMT40MDQ8L2gxPlxcbiAgICA8cD5Tb3JyeSwgcGFnZSBub3QgZm91bmQuPC9wPlxcbjwvZGl2PlwiO1xuIiwiZnVuY3Rpb24gaW5pdChrbywgY29tcG9uZW50Vmlld01vZGVsKSB7XG4gICAga28uY29tcG9uZW50cy5yZWdpc3Rlcigna29rb0RlZmF1bHQ0MDQnLCB7XG4gICAgICAgIHRlbXBsYXRlOiByZXF1aXJlKCcuLzQwNC5odG1sJyksXG4gICAgICAgIHZpZXdNb2RlbDogY29tcG9uZW50Vmlld01vZGVsKHtcbiAgICAgICAgICAgIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHRoaXMua29rby5zZXRSZWFkeSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgIH0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBpbml0OiBpbml0XG59OyIsInZhciB1cmxSZXNvbHZlciAgPSByZXF1aXJlKCcuL3VybC1yZXNvbHZlcicpO1xudmFyIHV0aWxzICAgICAgICA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbnZhciByb3V0ZXIgICAgICAgPSByZXF1aXJlKCcuL3JvdXRlcicpO1xuXG5mdW5jdGlvbiBpbml0KGtvKSB7XG5cbiAgICBrby5iaW5kaW5nSGFuZGxlcnMua29rb0hyZWYgPSB7XG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uKGVsZW1lbnQpIHtcbiAgICAgICAgICAgIGtvLnV0aWxzLnJlZ2lzdGVyRXZlbnRIYW5kbGVyKGVsZW1lbnQsICdjbGljaycsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgcm91dGVyLm5hdmlnYXRlKGVsZW1lbnQuZ2V0QXR0cmlidXRlKCdocmVmJykpO1xuICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgdXBkYXRlOiBmdW5jdGlvbiAoZWxlbWVudCwgdmFsdWVBY2Nlc3NvciwgaWdub3JlMSwgaWdub3JlMiwgYmluZGluZ0NvbnRleHQpIHtcbiAgICAgICAgICAgIC8qIEV4cGVjdHM6XG4gICAgICAgICAgICAgKiAge1xuICAgICAgICAgICAgICogICAgICBwYXRoOiAncm9vdC51c2VyLWxpc3QudXNlci1kZXRhaWwnLFxuICAgICAgICAgICAgICogICAgICBwYXJhbXM6IHsgdXNlcklkOiAxMjMgfSxcbiAgICAgICAgICAgICAqICAgICAgYWN0aXZhdGU6IHRydWVcbiAgICAgICAgICAgICAqICB9XG4gICAgICAgICAgICAgKiAqL1xuXG4gICAgICAgICAgICB2YXIgb3B0cyA9IHZhbHVlQWNjZXNzb3IoKTtcblxuICAgICAgICAgICAgLy8gU2V0IGhyZWYuXG4gICAgICAgICAgICB2YXIgc3RhdGVOb2RlID0gdXRpbHMuZ2V0U3RhdGVOb2RlRnJvbUNvbnRleHQoYmluZGluZ0NvbnRleHQpO1xuICAgICAgICAgICAgdmFyIGhyZWYgPSB1cmxSZXNvbHZlci5yZXNvbHZlUGF0aFRvVXJsKG9wdHMucGF0aCwgb3B0cy5wYXJhbXMsIHN0YXRlTm9kZSk7XG4gICAgICAgICAgICBlbGVtZW50LnNldEF0dHJpYnV0ZSgnaHJlZicsIGhyZWYpO1xuXG4gICAgICAgICAgICAvLyBPcHRpb25hbGx5IGFkZCBcInNlbGVjdGVkXCIgY2xhc3Mgd2hlbiBocmVmIHRhcmdldCBpcyBhY3RpdmUuXG4gICAgICAgICAgICBpZiAob3B0cy5hY3RpdmF0ZSkge1xuICAgICAgICAgICAgICAgIHZhciBwYXRoTWF0Y2hlc0N1cnJlbnQgPSB1cmxSZXNvbHZlci5wYXRoTWF0Y2hlc0N1cnJlbnQob3B0cy5wYXRoLCBvcHRzLnBhcmFtcywgc3RhdGVOb2RlKTtcbiAgICAgICAgICAgICAgICB1dGlscy50b2dnbGVFbGVtQ2xhc3MoZWxlbWVudCwgJ2FjdGl2ZScsIHBhdGhNYXRjaGVzQ3VycmVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAga28uYmluZGluZ0hhbmRsZXJzLmtva29BY3RpdmF0ZSA9IHtcbiAgICAgICAgdXBkYXRlOiBmdW5jdGlvbiAoZWxlbWVudCwgdmFsdWVBY2Nlc3NvciwgaWdub3JlMSwgaWdub3JlMiwgYmluZGluZ0NvbnRleHQpIHtcbiAgICAgICAgICAgIC8qIEV4cGVjdHM6XG4gICAgICAgICAgICAgKiAge1xuICAgICAgICAgICAgICogICAgICBwYXRoOiAncm9vdC51c2VyLWxpc3QudXNlci1kZXRhaWwnLFxuICAgICAgICAgICAgICogICAgICBwYXJhbXM6IHsgdXNlcklkOiAxMjMgfVxuICAgICAgICAgICAgICogIH1cbiAgICAgICAgICAgICAqICovXG4gICAgICAgICAgICB2YXIgb3B0cyA9IHZhbHVlQWNjZXNzb3IoKTtcblxuICAgICAgICAgICAgLy8gQ29uZGl0aW9uYWxseSBhZGQgdGhlIFwiYWN0aXZlXCIgY2xhc3MuXG4gICAgICAgICAgICB2YXIgc3RhdGVOb2RlID0gdXRpbHMuZ2V0U3RhdGVOb2RlRnJvbUNvbnRleHQoYmluZGluZ0NvbnRleHQpO1xuICAgICAgICAgICAgdmFyIHBhdGhNYXRjaGVzQ3VycmVudCA9IHVybFJlc29sdmVyLnBhdGhNYXRjaGVzQ3VycmVudChvcHRzLnBhdGgsIG9wdHMucGFyYW1zLCBzdGF0ZU5vZGUpO1xuICAgICAgICAgICAgdXRpbHMudG9nZ2xlRWxlbUNsYXNzKGVsZW1lbnQsICdhY3RpdmUnLCBwYXRoTWF0Y2hlc0N1cnJlbnQpO1xuICAgICAgICB9XG4gICAgfTtcblxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBpbml0OiBpbml0XG59OyIsInZhciBrbztcbnZhciB1dGlscyAgICAgICA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbnZhciByb3V0ZXIgICAgICA9IHJlcXVpcmUoJy4vcm91dGVyJyk7XG52YXIgdXJsUmVzb2x2ZXIgPSByZXF1aXJlKCcuL3VybC1yZXNvbHZlcicpO1xuXG5mdW5jdGlvbiBpbml0KGtvXykge1xuICAgIGtvID0ga29fO1xufVxuXG52YXIgQ29tcG9uZW50U3RhdGUgPSB1dGlscy5jcmVhdGVDbGFzcyh7XG4gICAgaW5pdDogZnVuY3Rpb24oc3RhdGVOb2RlKSB7XG4gICAgICAgIHRoaXMuZGlzcG9zYWJsZSA9IFtdO1xuICAgICAgICB0aGlzLmRpc3Bvc2VIYW5kbGVycyA9IFtdO1xuICAgICAgICB0aGlzLnN0YXRlTm9kZSA9IHN0YXRlTm9kZTtcbiAgICAgICAgdGhpcy5yb3V0ZVBhcmFtcyA9IHRoaXMuc3RhdGVOb2RlLnJvdXRlUGFyYW1zO1xuICAgIH0sXG5cbiAgICBzZXRSZWFkeTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuc3RhdGVOb2RlLnNldFJlYWR5KCk7XG4gICAgfSxcblxuICAgIG5hdmlnYXRlVG9QYXRoOiBmdW5jdGlvbihwYXRoLCBwYXJhbXMpIHtcbiAgICAgICAgcm91dGVyLm5hdmlnYXRlKHVybFJlc29sdmVyLnJlc29sdmVQYXRoVG9VcmwocGF0aCwgcGFyYW1zLCB0aGlzLnN0YXRlTm9kZSkpO1xuICAgIH0sXG5cbiAgICBvbjogZnVuY3Rpb24oZXZlbnRUeXBlLCBoYW5kbGVyKSB7XG4gICAgICAgIHN3aXRjaCAoZXZlbnRUeXBlKSB7XG4gICAgICAgICAgICBjYXNlICdjb21wb25lbnREaXNwb3NhbCc6XG4gICAgICAgICAgICAgICAgdGhpcy5kaXNwb3NlSGFuZGxlcnMucHVzaChoYW5kbGVyKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2RlcGVuZGVuY3lDaGFuZ2UnOlxuICAgICAgICAgICAgICAgIHRoaXMuZGlzcG9zYWJsZS5wdXNoKGtvLmNvbXB1dGVkKGhhbmRsZXIpKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yICgnVW5yZWNvZ25pemVkIGV2ZW50IHR5cGUhJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgZGlzcG9zZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIENhbGwgaGFuZGxlcnMuXG4gICAgICAgIHZhciBpO1xuICAgICAgICBmb3IgKGkgaW4gdGhpcy5kaXNwb3NlSGFuZGxlcnMpIHtcbiAgICAgICAgICAgIHRoaXMuZGlzcG9zZUhhbmRsZXJzW2ldKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEaXNwb3NlIGNvbXB1dGVkIG9ic2VydmFibGVzLlxuICAgICAgICBmb3IgKGkgaW4gIHRoaXMuZGlzcG9zYWJsZSkge1xuICAgICAgICAgICAgdGhpcy5kaXNwb3NhYmxlW2ldLmRpc3Bvc2UoKTtcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG5mdW5jdGlvbiBjcmVhdGVDb21wb25lbnRWaWV3TW9kZWwocHJvcHMsIGRvTm90QmluZCkge1xuICAgIGZvciAodmFyIGl0ZW0gaW4gcHJvcHMpIHtcbiAgICAgICAgaWYgKGl0ZW0gPT09ICdkaXNwb3NlJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yICgnVGhlIFwiZGlzcG9zZSgpXCIgbWV0aG9kIGlzIHJlc2VydmVkLiBQbGVhc2UgbmFtZSB5b3VyIGRpc3Bvc2UgaGFuZGxlciBzb21ldGhpbmcgZWxzZS4nKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciBDbGFzcyA9IGZ1bmN0aW9uKGNvbXBvbmVudFBhcmFtcykge1xuICAgICAgICBpZiAoIWRvTm90QmluZCkge1xuICAgICAgICAgICAgdXRpbHMuYmluZE1ldGhvZHModGhpcyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5rb2tvID0gbmV3IENvbXBvbmVudFN0YXRlKGNvbXBvbmVudFBhcmFtcy5zdGF0ZU5vZGUpO1xuICAgICAgICB0aGlzLmRpc3Bvc2UgPSB0aGlzLmtva28uZGlzcG9zZS5iaW5kKHRoaXMua29rbyk7XG4gICAgICAgIGlmICh0aGlzLmluaXQpIHtcbiAgICAgICAgICAgIHRoaXMuaW5pdChjb21wb25lbnRQYXJhbXMucGFyZW50KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBmb3IgKHZhciBuYW1lIGluIHByb3BzKSB7XG4gICAgICAgIENsYXNzLnByb3RvdHlwZVtuYW1lXSA9IHByb3BzW25hbWVdO1xuICAgIH1cbiAgICByZXR1cm4gQ2xhc3M7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGluaXQ6IGluaXQsXG4gICAgY3JlYXRlQ29tcG9uZW50Vmlld01vZGVsOiBjcmVhdGVDb21wb25lbnRWaWV3TW9kZWxcbn07IiwibW9kdWxlLmV4cG9ydHMgPSBcIjwhLS0ga28gZm9yZWFjaDogJHBhcmVudC5rb2tvLnN0YXRlTm9kZS5jaGlsZHJlbiAtLT5cXG48ZGl2IGRhdGEtYmluZD1cXFwiXFxuICAgIGNvbXBvbmVudDoge1xcbiAgICAgICAgbmFtZTogY29tcG9uZW50LFxcbiAgICAgICAgcGFyYW1zOiB7IHN0YXRlTm9kZTogJGRhdGEsIHBhcmVudDogJHBhcmVudHNbMV0gfVxcbiAgICB9LCB2aXNpYmxlOiBpc1Zpc2libGUoKVxcblxcXCI+PC9kaXY+XFxuPCEtLSAva28gLS0+XCI7XG4iLCJmdW5jdGlvbiBpbml0KGtvKSB7XG4gICAga28uY29tcG9uZW50cy5yZWdpc3Rlcigna29rby12aWV3Jywge1xuICAgICAgICB0ZW1wbGF0ZTogcmVxdWlyZSgnLi9rb2tvLXZpZXcuaHRtbCcpXG4gICAgfSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGluaXQ6IGluaXRcbn07IiwidmFyIGRpcmVjdG9yID0gcmVxdWlyZSgnZGlyZWN0b3InKTtcbnZhciB1dGlscyAgICA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxuLypcbiAgICBUaGlzIGlzIGEgbG93LWxldmVsIHJvdXRlciB0aGF0IGNhbGxzIHRoZSBwcm92aWRlZCBjYWxsYmFja1xuICAgIHdoZW5ldmVyIHRoZSB1c2VyIG5hdmlnYXRlcyB0byBhIGNvbmZpZ3VyZWQgcm91dGUuXG4gICAgVGhlIGNhbGxiYWNrIHJlY2VpdmVzIHR3byBwYXJhbWV0ZXJzOlxuICAgICAtIFRoZSByb3V0ZSBtYXRjaGVkIHBhdHRlcm5cbiAgICAgLSBBbiBvYmplY3QgY29udGFpbmluZyB0aGUgcGFyYW1ldGVyIHZhbHVlcyBmb3IgdGhlIHJvdXRlXG4qL1xuXG52YXIgcm91dGVyO1xuXG4vLyBDb25maWcuXG52YXIgcm91dGVzOyAgICAgICAgICAgLy8gQSBhcnJheSBvZiBcIi9yb3V0ZS86cGF0dGVybnNcIlxudmFyIHJvdXRlUGFyYW1zOyAgICAgIC8vIEFuIGFycmF5IG9mIG5hbWVkIHBhcmFtZXRlciBkZWZpbml0aW9uc1xudmFyIHJlZGlyZWN0czsgICAgICAgIC8vIEFuIG9iamVjdCBtYXBwaW5nIFwiYS9yb3V0OnBhdHRlcm5cIiB0byBcImFub3RoZXIvdXJsXCJcblxuZnVuY3Rpb24gbm9ybWFsaXplVXJsRnJhZ21lbnQodXJsKSB7XG4gICAgaWYgKCF1cmwpIHtcbiAgICAgICAgcmV0dXJuICcvJztcbiAgICB9XG4gICAgaWYgKHVybC5zbGljZSgwLCAxKSAhPT0gJy8nKSB7XG4gICAgICAgIHVybCA9ICcvJyArIHVybDtcbiAgICB9XG4gICAgaWYgKHVybC5zbGljZSh1cmwubGVuZ3RoIC0gMSwgMSkgIT09ICcvJykge1xuICAgICAgICB1cmwgKz0gJy8nO1xuICAgIH1cbiAgICByZXR1cm4gdXJsO1xufVxuXG5mdW5jdGlvbiBzdGFydFJvdXRlcihjb25maWcsIGNiKSB7XG4gICAgLy8gVGhlIHJvdXRlciBjYW4gb25seSBiZSBzdGFydGVkIG9uY2UuXG4gICAgaWYgKHJvdXRlcykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZSByb3V0ZXIgaXMgYWxyZWFkeSBzdGFydGVkLicpO1xuICAgIH1cblxuICAgIC8vIFZhbGlkYXRlIGNvbmZpZy5cbiAgICByb3V0ZXMgICAgICAgICAgID0gY29uZmlnLnJvdXRlcztcbiAgICByb3V0ZVBhcmFtcyAgICAgID0gY29uZmlnLnJvdXRlUGFyYW1zO1xuICAgIHJlZGlyZWN0cyAgICAgICAgPSBjb25maWcucmVkaXJlY3RzO1xuICAgIGlmICghcm91dGVzICB8fCAhcm91dGVQYXJhbXMgfHwgIXJlZGlyZWN0cykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IgKCdJbnZhbGlkIGNvbmZpZ3VyYXRpb24nKTtcbiAgICB9XG5cbiAgICAvLyBTdXBwbHkgZGVmYXVsdCByb3V0ZVBhcmFtIHZhbHVlcy5cbiAgICB2YXIgcGFyYW1OYW1lO1xuICAgIHZhciBmbk5vb3AgPSBmdW5jdGlvbiAobykgeyByZXR1cm4gbzsgfTtcbiAgICBmb3IgKHBhcmFtTmFtZSBpbiBjb25maWcucm91dGVQYXJhbXMpIHtcbiAgICAgICAgY29uZmlnLnJvdXRlUGFyYW1zW3BhcmFtTmFtZV0gPSByb3V0ZVBhcmFtc1twYXJhbU5hbWVdIHx8IHt9O1xuICAgICAgICBjb25maWcucm91dGVQYXJhbXNbcGFyYW1OYW1lXS5wYXJzZSA9IHJvdXRlUGFyYW1zW3BhcmFtTmFtZV0ucGFyc2UgfHwgZm5Ob29wO1xuICAgICAgICBjb25maWcucm91dGVQYXJhbXNbcGFyYW1OYW1lXS5yZWdleCA9IHJvdXRlUGFyYW1zW3BhcmFtTmFtZV0ucmVnZXggfHwgLyguKikvZztcbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgcm91dGVyIGluc3RhbmNlLlxuICAgIHJvdXRlciA9IG5ldyBkaXJlY3Rvci5Sb3V0ZXIoKTtcbiAgICByb3V0ZXIuY29uZmlndXJlKHtcbiAgICAgICAgaHRtbDVoaXN0b3J5OiBjb25maWcuaHRtbDVIaXN0b3J5XG4gICAgfSk7XG5cbiAgICAvLyBSZWdpc3RlciBwYXJhbSBuYW1lL3JlZ2V4IHBhaXJzLlxuICAgIC8vIERpcmVjdG9yIHdpbGwgdmFsaWRhdGUgdGhhdCBwYXJhbXMgbWF0Y2ggdGhlIHN1cHBsaWVkIHJlZ2V4LlxuICAgIC8vIElmIHRoZXkgZG9uJ3QsIHRoZSB1c2VyIHdpbGwgc2VlIHRoZSA0MDQgcm91dGUuXG4gICAgZm9yIChwYXJhbU5hbWUgaW4gcm91dGVQYXJhbXMpIHtcbiAgICAgICAgcm91dGVyLnBhcmFtKHBhcmFtTmFtZSwgcm91dGVQYXJhbXNbcGFyYW1OYW1lXS5yZWdleCk7XG4gICAgfVxuXG4gICAgLy8gUmVnaXN0ZXIgcm91dGUgcGF0dGVybnMuXG4gICAgdmFyIHJvdXRlO1xuICAgIGZvciAodmFyIGkgaW4gcm91dGVzKSB7XG4gICAgICAgIHJvdXRlID0gcm91dGVzW2ldO1xuICAgICAgICByb3V0ZXIub24odXRpbHMub3B0aW9uYWxpemVUcmFpbGluZ1NsYXNoKHJvdXRlKSwgb25Sb3V0ZS5iaW5kKHdpbmRvdywgcm91dGUsIGNiKSk7XG4gICAgfVxuXG4gICAgLy8gUmVnaXN0ZXIgcmVkaXJlY3RzLlxuICAgIGZvciAocm91dGUgaW4gcmVkaXJlY3RzKSB7IC8vIGpzaGludCBpZ25vcmU6bGluZVxuICAgICAgICAvKiBqc2hpbnQgLVcwODMgKi9cbiAgICAgICAgcm91dGVyLm9uKHV0aWxzLm9wdGlvbmFsaXplVHJhaWxpbmdTbGFzaChyb3V0ZSksIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgbmF2aWdhdGUocmVkaXJlY3RzW3JvdXRlXSk7XG4gICAgICAgIH0pO1xuICAgICAgICAvKiBqc2hpbnQgK1cwODMgKi9cbiAgICB9XG5cbiAgICAvLyBJZiByb3V0ZSBub3QgZm91bmQsIHNldCB0aGUgY29tcG9uZW50IHBhdGggdG8gYmxhbmsuXG4gICAgcm91dGVyLm9uKCcuKicsIG9uUm91dGUuYmluZCh3aW5kb3csICcnLCBjYikpO1xuXG4gICAgLy8gSWYgd2UgcmVjZWl2ZSBhIHVybCB0aGF0IGxvb2tzIGxpa2UgL3Jvb3Qvc29tZXRoaW5nLyBpbiBhIGJyb3dzZXJcbiAgICAvLyB1c2luZyBoYXNoIGJhc2VkIHJvdXRpbmcsIHdlIHJlZGlyZWN0IHRvIHJvb3QvIy9zb21ldGhpbmdcbiAgICAvLyBOT3RlOiBEaXJlY3RvciBoYW5kbGVzIHRoZSBpbnZlcnNlIHNpdHV0YXRpb24gbmljZWx5LlxuICAgIGlmICghcm91dGVyLmhpc3RvcnkpIHtcbiAgICAgICAgdmFyIHBhdGggPSBub3JtYWxpemVVcmxGcmFnbWVudCh3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUpO1xuICAgICAgICB2YXIgcm9vdCA9IG5vcm1hbGl6ZVVybEZyYWdtZW50KGNvbmZpZy5yb290UGF0aCk7XG4gICAgICAgIGlmIChwYXRoLnNsaWNlKDAsIHJvb3QubGVuZ3RoKSA9PT0gcm9vdCkge1xuICAgICAgICAgICAgcGF0aCA9IHBhdGguc2xpY2Uocm9vdC5sZW5ndGggLSAxKTsgLy8gTGVhdmUgc3RhcnRpbmcgXCIvXCJcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignUGF0aCBkb2VzIG5vdCBzdGFydCB3aXRoIHRoZSBwcm92aWRlZCBcInJvb3RcIiBwYXRoJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBhdGggIT09ICcvJykge1xuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gcm9vdCArICcjJyArIHBhdGg7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICB9XG4gICAgcm91dGVyLmluaXQocm91dGVyLmhpc3RvcnkgPyAnJyA6IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSk7XG59XG5cbmZ1bmN0aW9uIG5hdmlnYXRlKHVybCkge1xuICAgIGlmICh1cmwuc2xpY2UoMCwgMikgPT09ICcvIycpIHtcbiAgICAgICAgdXJsID0gdXJsLnNsaWNlKDIpO1xuICAgIH1cbiAgICByb3V0ZXIuc2V0Um91dGUodXJsKTtcbn1cblxuZnVuY3Rpb24gb25Sb3V0ZShyb3V0ZSwgY2IvKiwgcGFyYW1zICovKSB7XG4gICAgdmFyIHBhcmFtc0xpc3QgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuICAgIHZhciBwYXJhbXNPYmogPSB7fTtcbiAgICB2YXIgcGFyYW1Db3VudCA9IDA7XG4gICAgdXRpbHMucHJvY2Vzc1BhdHRlcm4ocm91dGUsIGZ1bmN0aW9uKHBhcnQsIGlzUGFyYW0pIHtcbiAgICAgICAgaWYgKGlzUGFyYW0pIHtcbiAgICAgICAgICAgIHBhcmFtc09ialtwYXJ0XSA9IHJvdXRlUGFyYW1zW3BhcnRdLnBhcnNlKHBhcmFtc0xpc3RbcGFyYW1Db3VudF0pO1xuICAgICAgICAgICAgcGFyYW1Db3VudCsrO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgY2Iocm91dGUsIHBhcmFtc09iaik7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHN0YXJ0OiBzdGFydFJvdXRlcixcbiAgICBuYXZpZ2F0ZTogbmF2aWdhdGVcbn07IiwidmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG52YXIga287XG52YXIgc3RhdGU7XG52YXIgY29uZmlnO1xuXG5mdW5jdGlvbiBpbml0KGtvXywgY29uZmlnXywgc3RhdGVfKSB7XG4gICAga28gPSBrb187XG4gICAgY29uZmlnID0gY29uZmlnXztcbiAgICBzdGF0ZSA9IHN0YXRlXztcbn1cblxudmFyIFN0YXRlTm9kZSA9IHV0aWxzLmNyZWF0ZUNsYXNzKHtcbiAgICBpbml0OiBmdW5jdGlvbihjb21wb25lbnROYW1lLCBwYXJhbXMsIHBhcmVudE5vZGUpIHtcbiAgICAgICAgdGhpcy5wYXJlbnQgICAgICAgICAgICAgPSBwYXJlbnROb2RlO1xuICAgICAgICB0aGlzLmNvbXBvbmVudCAgICAgICAgICA9IGNvbXBvbmVudE5hbWU7XG4gICAgICAgIHRoaXMuY2hpbGRyZW4gICAgICAgICAgID0ga28ub2JzZXJ2YWJsZUFycmF5KCk7XG4gICAgICAgIHRoaXMuc3RhdHVzICAgICAgICAgICAgID0ga28ub2JzZXJ2YWJsZSgnbG9hZGluZycpOyAvLyBsb2FkaW5nIHwgcGVuZGluZ192aXNpYmxlIHwgdmlzaWJsZSB8IHBlbmRpbmdfcmVtb3ZhbFxuICAgICAgICB0aGlzLnJvdXRlUGFyYW1zID0ge307XG4gICAgICAgIGZvciAodmFyIHBhcmFtTmFtZSBpbiBjb25maWcucm91dGVQYXJhbXMpIHtcbiAgICAgICAgICAgIHRoaXMucm91dGVQYXJhbXNbcGFyYW1OYW1lXSA9IGtvLm9ic2VydmFibGUocGFyYW1zW3BhcmFtTmFtZV0gfHwgbnVsbCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgaXNWaXNpYmxlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc3RhdHVzKCkgPT09ICd2aXNpYmxlJyB8fCB0aGlzLnN0YXR1cygpID09PSAncGVuZGluZ19yZW1vdmFsJztcbiAgICB9LFxuXG4gICAgc2V0UmVhZHk6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodGhpcy5zdGF0dXMoKSA9PT0gJ2xvYWRpbmcnKSB7XG4gICAgICAgICAgICB0aGlzLnN0YXR1cygncGVuZGluZ192aXNpYmxlJyk7XG4gICAgICAgICAgICBzdGF0ZS50cmFuc2l0aW9uSWZSZWFkeSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHVwZGF0ZVJvdXRlUGFyYW1zOiBmdW5jdGlvbiAocm91dGVQYXJhbXMpIHtcbiAgICAgICAgLy8gU2FuaXR5IGNoZWNrLlxuICAgICAgICBpZiAodGhpcy5zdGF0dXMoKSA9PT0gJ3BlbmRpbmdfcmVtb3ZhbCcpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignUGFyYW1zIHNob3VsZCBub3QgYmUgdXBkYXRlZCB3aGlsZSBwZW5kaW5nIHJlbW92YWwnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENsZWFyIG9sZCB2YWx1ZXMuXG4gICAgICAgIHZhciBwYXJhbU5hbWU7XG4gICAgICAgIGZvciAocGFyYW1OYW1lIGluIHRoaXMucm91dGVQYXJhbXMpIHtcbiAgICAgICAgICAgIGlmICghKHBhcmFtTmFtZSBpbiByb3V0ZVBhcmFtcykpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJvdXRlUGFyYW1zW3BhcmFtTmFtZV0obnVsbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgbmV3IHZhbHVlcy5cbiAgICAgICAgZm9yIChwYXJhbU5hbWUgaW4gcm91dGVQYXJhbXMpIHtcbiAgICAgICAgICAgIGlmIChwYXJhbU5hbWUgaW4gdGhpcy5yb3V0ZVBhcmFtcykge1xuICAgICAgICAgICAgICAgIHRoaXMucm91dGVQYXJhbXNbcGFyYW1OYW1lXShyb3V0ZVBhcmFtc1twYXJhbU5hbWVdKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbnJlY29nbml6ZWQgcGFyYW1ldGVyIG5hbWUuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgdHJhbnNpdGlvbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuY2hpbGRyZW4ucmVtb3ZlKGZ1bmN0aW9uKGNoaWxkKSB7XG4gICAgICAgICAgICByZXR1cm4gY2hpbGQuc3RhdHVzKCkgPT09ICdwZW5kaW5nX3JlbW92YWwnO1xuICAgICAgICB9KTtcbiAgICAgICAgaWYgKHRoaXMuY2hpbGRyZW4oKS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMuY2hpbGRyZW4oKVswXS5zdGF0dXMoJ3Zpc2libGUnKTtcbiAgICAgICAgICAgIHRoaXMuY2hpbGRyZW4oKVswXS50cmFuc2l0aW9uKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgZ2V0UGF0aFRvSGVyZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBwYXRoID0gW3RoaXMuY29tcG9uZW50XTtcbiAgICAgICAgdmFyIG5vZGUgPSB0aGlzO1xuICAgICAgICB3aGlsZSAobm9kZS5wYXJlbnQuY29tcG9uZW50KSB7XG4gICAgICAgICAgICBwYXRoLnNwbGljZSgwLCAwLCBub2RlLnBhcmVudC5jb21wb25lbnQpO1xuICAgICAgICAgICAgbm9kZSA9IG5vZGUucGFyZW50O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwYXRoLmpvaW4oJy4nKTtcbiAgICB9LFxuXG4gICAgbG9hZENoaWxkOiBmdW5jdGlvbihjaGlsZENvbXBvbmVudE5hbWUpIHtcbiAgICAgICAgLy8gVGhlIGNoaWxkIGlzIGFscmVhZHkgbG9hZGVkIC0gTk9PUC5cbiAgICAgICAgdmFyIG1hdGNoaW5nQ2hpbGQgPSB0aGlzLmdldE1hdGNoaW5nQ2hpbGQoY2hpbGRDb21wb25lbnROYW1lKTtcbiAgICAgICAgaWYgKG1hdGNoaW5nQ2hpbGQpIHtcbiAgICAgICAgICAgIHJldHVybiBtYXRjaGluZ0NoaWxkO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVtb3ZlIG90aGVyIGNvbXBvbmVudCBpZiBub3QgcmVhZHkuXG4gICAgICAgIHRoaXMuY2hpbGRyZW4ucmVtb3ZlKGZ1bmN0aW9uKGNoaWxkKSB7XG4gICAgICAgICAgICByZXR1cm4gY2hpbGQuc3RhdHVzKCkgPT09ICdsb2FkaW5nJztcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2FuaXR5IGNoZWNrLlxuICAgICAgICBpZiAodGhpcy5jaGlsZHJlbigpLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdUaGVyZSBzaG91bGQgb25seSBiZSAxIGFjdGl2ZSBjaGlsZCBjb21wb25lbnQgYXQgYSB0aW1lJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBNYXJrIHRoZSBsb2FkZWQgY29tcG9uZW50IGFzIHBlbmRpbmcgcmVtb3ZhbC5cbiAgICAgICAgdGhpcy5jaGlsZHJlbigpLmZvckVhY2goZnVuY3Rpb24oY2hpbGQpIHtcbiAgICAgICAgICAgIGNoaWxkLnN0YXR1cygncGVuZGluZ19yZW1vdmFsJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZCBub2RlLlxuICAgICAgICB2YXIgY2hpbGQgPSBuZXcgU3RhdGVOb2RlKGNoaWxkQ29tcG9uZW50TmFtZSwga28udG9KUyh0aGlzLnJvdXRlUGFyYW1zKSwgdGhpcyk7XG4gICAgICAgIHRoaXMuY2hpbGRyZW4ucHVzaChjaGlsZCk7XG4gICAgICAgIHJldHVybiBjaGlsZDtcbiAgICB9LFxuXG4gICAgaXNCcmFuY2hSZWFkeTogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aGlzLnN0YXR1cygpID09PSAnbG9hZGluZycpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKHZhciBpIGluIHRoaXMuY2hpbGRyZW4oKSkge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmNoaWxkcmVuKClbaV0uaXNCcmFuY2hSZWFkeSgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0sXG5cbiAgICBnZXRNYXRjaGluZ0NoaWxkOiBmdW5jdGlvbihjb21wb25lbnROYW1lKSB7XG4gICAgICAgIHZhciBtYXRjaGluZ0NoaWxkcmVuID0gdGhpcy5jaGlsZHJlbigpLmZpbHRlcihmdW5jdGlvbihjaGlsZCkge1xuICAgICAgICAgICAgcmV0dXJuIGNoaWxkLmNvbXBvbmVudCA9PT0gY29tcG9uZW50TmFtZTtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChtYXRjaGluZ0NoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIG1hdGNoaW5nQ2hpbGRyZW5bMF07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGluaXQ6IGluaXQsXG4gICAgU3RhdGVOb2RlOiBTdGF0ZU5vZGVcbn07IiwidmFyIHN0YXRlTm9kZSA9IHJlcXVpcmUoJy4vc3RhdGUtbm9kZScpO1xuXG52YXIgdHJlZTtcbnZhciBhY3RpdmVQYXRoO1xudmFyIGFjdGl2ZVBhdGhOb3RpZnllcjtcblxuZnVuY3Rpb24gaW5pdCAoa28pIHtcbiAgICB0cmVlID0gbmV3IHN0YXRlTm9kZS5TdGF0ZU5vZGUobnVsbCwge30pO1xuICAgIHRyZWUuc3RhdHVzKCd2aXNpYmxlJyk7XG5cbiAgICAvLyBUaGUgYWN0aXZlIHBhdGggaXMgdXNlZCBieSB0aGUga29rby1hY3RpdmF0ZSBhbmQga29rby1ocmVmIGJpbmRpbmdzLlxuICAgIC8vIFdoZW4gdGhlIGJpbmRpbmdzIGFyZSBpbml0aWxpemVkLCB0aGUgc2hvdWxkIGFsd2F5cyBsb29rIGF0IHRoZSBsYXN0ZXN0IHBhdGguXG4gICAgLy8gV2hlbiB0aGUgcGF0aCBjaGFuZ2VzLCBob3dldmVyLCB3ZSBkb24ndCB3YW50IHRoZSBiaW5kaW5ncyB0byBiZSB1cGRhdGVkXG4gICAgLy8gVW50aWwgdGhlIHRyYW5zaXRpb24gaXMgY29tcGxldGUuIFRvIGFjaGVpdmUgdGhpcywgZ2V0QWN0aXZlUGF0aCgpIHJldHVybnNcbiAgICAvLyB0aGUgY3VycmVudCBwYXRoIGJ1dCBjcmVhdGVzIGEgc3Vic2NyaXB0aW9uIHRvIGFjdGl2ZVBhdGhOb3RpZnllcigpLlxuICAgIC8vIFdoZW5ldmVyIGEgdHJhbnNpdGlvbiBpcyBjb21wbGV0ZSwgd2UgbmVlZCB0byBtYW51YWxseSB1cGRhdGUgYWN0aXZlUGF0aE5vdGlmeWVyKClcbiAgICAvLyBzbyB0aGF0IHRoZSBhcHByb3ByaWF0ZSBiaW5kaW5ncyBhcmUgdXBkYXRlZC5cbiAgICBhY3RpdmVQYXRoID0gJyc7XG4gICAgYWN0aXZlUGF0aE5vdGlmeWVyID0ga28ub2JzZXJ2YWJsZSgpO1xufVxuXG5mdW5jdGlvbiB1cGRhdGUocGF0aCwgcm91dGVQYXJhbXMpIHtcbiAgICB2YXIgbm9kZSA9IHRyZWU7XG4gICAgYWN0aXZlUGF0aCA9IHBhdGg7XG4gICAgcGF0aC5zcGxpdCgnLicpLmZvckVhY2goZnVuY3Rpb24oY29tcG9uZW50TmFtZSkge1xuICAgICAgICBub2RlID0gbm9kZS5sb2FkQ2hpbGQoY29tcG9uZW50TmFtZSk7XG4gICAgICAgIG5vZGUudXBkYXRlUm91dGVQYXJhbXMocm91dGVQYXJhbXMpO1xuICAgIH0pO1xuICAgIGlmIChub2RlLmNoaWxkcmVuKCkubGVuZ3RoKSB7XG4gICAgICAgIG5vZGUuY2hpbGRyZW4ucmVtb3ZlQWxsKCk7XG4gICAgICAgIGFjdGl2ZVBhdGhOb3RpZnllcihhY3RpdmVQYXRoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHRyYW5zaXRpb25JZlJlYWR5ICgpIHtcbiAgICBpZiAodHJlZS5pc0JyYW5jaFJlYWR5KCkpIHtcbiAgICAgICAgdHJlZS50cmFuc2l0aW9uKCk7XG4gICAgICAgIGFjdGl2ZVBhdGhOb3RpZnllcihhY3RpdmVQYXRoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGdldEFjdGl2ZVBhdGgoKSB7XG4gICAgYWN0aXZlUGF0aE5vdGlmeWVyKCk7XG4gICAgcmV0dXJuIGFjdGl2ZVBhdGg7XG59XG5cbmZ1bmN0aW9uIGdldFJvb3QoKSB7XG4gICAgcmV0dXJuIHRyZWU7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGluaXQ6IGluaXQsXG4gICAgdXBkYXRlOiB1cGRhdGUsXG4gICAgdHJhbnNpdGlvbklmUmVhZHk6IHRyYW5zaXRpb25JZlJlYWR5LFxuICAgIGdldEFjdGl2ZVBhdGg6IGdldEFjdGl2ZVBhdGgsXG4gICAgZ2V0Um9vdDogZ2V0Um9vdFxufTsiLCJ2YXIgc3RhdGVUcmVlID0gcmVxdWlyZSgnLi9zdGF0ZS10cmVlJyk7XG52YXIgdXRpbHMgICAgID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG52YXIga287XG52YXIgY29uZmlnO1xuXG5mdW5jdGlvbiBpbml0KGtvXywgY29uZmlnXykge1xuICAgIGtvID0ga29fO1xuICAgIGNvbmZpZyA9IGNvbmZpZ187XG59XG5cbmZ1bmN0aW9uIHJlc29sdmVBYnNvbHV0ZVBhdGhUb1VybChwYXRoLCBwYXJhbXMpIHtcbiAgICAvLyBHZXQgcGF0dGVybi5cbiAgICBwYXJhbXMgPSBwYXJhbXMgfHwge307XG4gICAgdmFyIHBhdHRlcm5zID0gW107XG4gICAgdXRpbHMuZm9yT3duKGNvbmZpZy5yb3V0ZXMsIGZ1bmN0aW9uKHBhdHRlcm4sIF9wYXRoKSB7XG4gICAgICAgIGlmIChfcGF0aCA9PT0gcGF0aCkge1xuICAgICAgICAgICAgcGF0dGVybnMucHVzaChwYXR0ZXJuKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gU3Vic3RpdHV0ZSBwYXJhbWV0ZXJzLlxuICAgIHZhciB1cmxzID0gcGF0dGVybnMubWFwKGZ1bmN0aW9uKHBhdHRlcm4pIHtcbiAgICAgICAgdmFyIHBhcnRzID0gW107XG4gICAgICAgIHZhciBpc01hdGNoID0gdHJ1ZTtcbiAgICAgICAgdXRpbHMucHJvY2Vzc1BhdHRlcm4ocGF0dGVybiwgZnVuY3Rpb24gKHBhcnQsIGlzUGFyYW0pIHtcbiAgICAgICAgICAgIGlmIChpc1BhcmFtKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBhcmFtcy5oYXNPd25Qcm9wZXJ0eShwYXJ0KSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcGFyYW0gPSBwYXJhbXNbcGFydF0gKyAnJztcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlZ2V4ID0gY29uZmlnLnJvdXRlUGFyYW1zW3BhcnRdLnJlZ2V4O1xuICAgICAgICAgICAgICAgICAgICB2YXIgbWF0Y2ggPSBwYXJhbS5tYXRjaChyZWdleCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChtYXRjaCAmJiBtYXRjaFswXSA9PT0gcGFyYW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnRzLnB1c2gocGFyYW1zW3BhcnRdICsgJycpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaXNNYXRjaCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyBTdG9wLlxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaXNNYXRjaCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7IC8vIFN0b3AuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwYXJ0cy5wdXNoKHBhcnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIChpc01hdGNoID8gcGFydHMuam9pbignLycpIDogbnVsbCk7XG4gICAgfSlcbiAgICAuZmlsdGVyKGZ1bmN0aW9uKHVybCkge1xuICAgICAgICByZXR1cm4gdXJsICE9PSBudWxsO1xuICAgIH0pO1xuXG4gICAgLy8gVmFsaWRhdGUgcmVzdWx0LlxuICAgIGlmICh1cmxzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICByZXR1cm4gKGNvbmZpZy5odG1sNUhpc3RvcnkgPyAnJyA6ICcvIycpICsgdXJsc1swXTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgcyA9ICcgZm9yIHBhdGggXCInICsgcGF0aCArICdcIiBhbmQgcGFyYW1zIFwiJyArIEpTT04uc3RyaW5naWZ5KHBhcmFtcykgKyAnXCIuJztcbiAgICAgICAgaWYgKHVybHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvdWxkIG5vdCByZXNvbHZlIHVybCcgKyBzKTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ011bHRwbGUgVVJMcyBtYXRjaCcgKyBzKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHJlc29sdmVQYXRoVG9VcmwocGF0aCwgcGFyYW1zLCBzdGF0ZU5vZGUpIHtcbiAgICBwYXJhbXMgPSBwYXJhbXMgfHwge307XG4gICAgaWYgKGlzUGF0aFJlbGF0aXZlKHBhdGgpKSB7XG4gICAgICAgIC8vIE1ha2UgcGF0aCBhYnNvbHV0ZS5cbiAgICAgICAgcGF0aCA9IHN0YXRlTm9kZS5nZXRQYXRoVG9IZXJlKCkgKyAocGF0aCA9PT0gJy4nID8gJycgOiBwYXRoKTtcblxuICAgICAgICAvLyBVc2UgY3VycmVudCBwYXJhbXMgd2hlcmUgbm90IHN1cHBsaWVkLlxuICAgICAgICB2YXIgY3VyUGFyYW1zID0gc3RhdGVOb2RlLnBhcmFtcztcbiAgICAgICAgZm9yICh2YXIgcGFyYW1OYW1lIGluIGN1clBhcmFtcykge1xuICAgICAgICAgICAgaWYgKCFwYXJhbXNbcGFyYW1OYW1lXSkge1xuICAgICAgICAgICAgICAgIHBhcmFtc1twYXJhbU5hbWVdID0gY3VyUGFyYW1zW3BhcmFtTmFtZV0oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzb2x2ZUFic29sdXRlUGF0aFRvVXJsKHBhdGgsIHBhcmFtcyk7XG59XG5cbmZ1bmN0aW9uIHBhdGhNYXRjaGVzQ3VycmVudChwYXRoLCBwYXJhbXMsIHN0YXRlTm9kZSkge1xuICAgIC8vIHJvb3QudGhpbmcgbWF0Y2hlcyByb290LnRoaW5nLm90aGVyLXRoaW5nIChwYXJ0aWFsIG1hdGNoKS5cbiAgICB2YXIgcHJvdmlkZWRQYXRoID0gcmVzb2x2ZVBhdGhUb1VybChwYXRoLCBwYXJhbXMsIHN0YXRlTm9kZSk7XG4gICAgdmFyIGN1clBhdGggPSByZXNvbHZlQWJzb2x1dGVQYXRoVG9Vcmwoc3RhdGVUcmVlLmdldEFjdGl2ZVBhdGgoKSwga28udG9KUyhzdGF0ZU5vZGUucm91dGVQYXJhbXMpKTtcbiAgICByZXR1cm4gY3VyUGF0aC5pbmRleE9mKHByb3ZpZGVkUGF0aCkgPT09IDA7XG59XG5cbmZ1bmN0aW9uIGlzUGF0aFJlbGF0aXZlIChwYXRoKSB7XG4gICAgcmV0dXJuIHBhdGguaW5kZXhPZignLicpID09PSAwO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBpbml0OiBpbml0LFxuICAgIHJlc29sdmVBYnNvbHV0ZVBhdGhUb1VybDogcmVzb2x2ZUFic29sdXRlUGF0aFRvVXJsLFxuICAgIHJlc29sdmVQYXRoVG9Vcmw6IHJlc29sdmVQYXRoVG9VcmwsXG4gICAgcGF0aE1hdGNoZXNDdXJyZW50OiBwYXRoTWF0Y2hlc0N1cnJlbnQsXG4gICAgaXNQYXRoUmVsYXRpdmU6IGlzUGF0aFJlbGF0aXZlXG59OyIsImZ1bmN0aW9uIHByb2Nlc3NQYXR0ZXJuIChwYXR0ZXJuLCBjYWxsYmFjaykge1xuICAgIHBhdHRlcm4uc3BsaXQoJy8nKS5mb3JFYWNoKGZ1bmN0aW9uKHBhcnQpIHtcbiAgICAgICAgdmFyIGlzUGFyYW0gPSBmYWxzZTtcbiAgICAgICAgaWYgKHBhcnQuaW5kZXhPZignOicpID09PSAwKSB7XG4gICAgICAgICAgICBwYXJ0ID0gcGFydC5yZXBsYWNlKCc6JywgJycpO1xuICAgICAgICAgICAgaXNQYXJhbSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKHBhcnQsIGlzUGFyYW0pO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBvcHRpb25hbGl6ZVRyYWlsaW5nU2xhc2ggKHBhdHRlcm4pIHtcbiAgICBpZiAocGF0dGVybi5zbGljZSgtMSkgPT09ICcvJykge1xuICAgICAgICByZXR1cm4gcGF0dGVybiArICc/JztcbiAgICB9XG4gICAgaWYgKHBhdHRlcm4uc2xpY2UoLTEpID09PSAnLz8nKSB7XG4gICAgICAgIHJldHVybiBwYXR0ZXJuO1xuICAgIH1cbiAgICByZXR1cm4gcGF0dGVybiArICcvPyc7XG59XG5cbmZ1bmN0aW9uIGdldFN0YXRlTm9kZUZyb21Db250ZXh0IChjb250ZXh0KSB7XG4gICAgd2hpbGUgKGNvbnRleHQgJiYgIWdldEtva29Gcm9tQmluZGluZ0NvbnRleHQoY29udGV4dCkpIHtcbiAgICAgICAgY29udGV4dCA9IGNvbnRleHQuJHBhcmVudDtcbiAgICB9XG4gICAgaWYgKCFjb250ZXh0KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQ291bGQgbm90IGZpbmQga29rbyBpbiBjb250ZXh0Jyk7XG4gICAgfVxuICAgIHJldHVybiBnZXRLb2tvRnJvbUJpbmRpbmdDb250ZXh0KGNvbnRleHQpLnN0YXRlTm9kZTtcbn1cblxuZnVuY3Rpb24gZ2V0S29rb0Zyb21CaW5kaW5nQ29udGV4dCAoY29udGV4dCkge1xuICAgIHJldHVybiBjb250ZXh0Lmtva28gfHwgY29udGV4dC4kZGF0YS5rb2tvIHx8IG51bGw7XG59XG5cbmZ1bmN0aW9uIGJpbmRNZXRob2RzKHNlbGYpIHtcbiAgICBmb3IgKHZhciBuYW1lIGluIHNlbGYpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZWxmW25hbWVdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBzZWxmW25hbWVdID0gc2VsZltuYW1lXS5iaW5kKHNlbGYpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzZWxmO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVDbGFzcyhwcm9wcywgZG9Ob3RCaW5kKSB7XG4gICAgdmFyIENsYXNzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICghZG9Ob3RCaW5kKSB7XG4gICAgICAgICAgICBiaW5kTWV0aG9kcyh0aGlzKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5pbml0KSB7XG4gICAgICAgICAgICB0aGlzLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgZm9yICh2YXIgbmFtZSBpbiBwcm9wcykge1xuICAgICAgICBDbGFzcy5wcm90b3R5cGVbbmFtZV0gPSBwcm9wc1tuYW1lXTtcbiAgICB9XG4gICAgcmV0dXJuIENsYXNzO1xufVxuXG5mdW5jdGlvbiBpbkFycmF5KGxpc3QsIGl0ZW0pIHtcbiAgICBmb3IgKHZhciBpIGluIGxpc3QpIHtcbiAgICAgICAgaWYgKGxpc3RbaV0gPT09IGl0ZW0pIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gcmVtb3ZlRnJvbUFycmF5KGxpc3QsIGl0ZW0pIHtcbiAgICBmb3IgKHZhciBpID0gbGlzdC5sZW5ndGggLSAxOyBpID4tIDA7IGktLSkge1xuICAgICAgICBpZiAobGlzdFtpXSA9PT0gaXRlbSkge1xuICAgICAgICAgICAgbGlzdC5zcGxpY2UoaSwgMSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIGFkZENsYXNzVG9FbGVtKGVsZW1lbnQsIGNsYXNzTmFtZSkge1xuICAgIHZhciBjbGFzc2VzID0gZWxlbWVudC5jbGFzc05hbWUuc3BsaXQoJyAnKTtcbiAgICBpZiAoIWluQXJyYXkoY2xhc3NlcywgY2xhc3NOYW1lKSkge1xuICAgICAgICBjbGFzc2VzLnB1c2goY2xhc3NOYW1lKTtcbiAgICAgICAgZWxlbWVudC5jbGFzc05hbWUgPSBjbGFzc2VzLmpvaW4oJyAnKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHJlbW92ZUNsYXNzRnJvbUVsZW0oZWxlbWVudCwgY2xhc3NOYW1lKSB7XG4gICAgdmFyIGNsYXNzZXMgPSBlbGVtZW50LmNsYXNzTmFtZS5zcGxpdCgnICcpO1xuICAgIGlmIChpbkFycmF5KGNsYXNzZXMsIGNsYXNzTmFtZSkpIHtcbiAgICAgICAgcmVtb3ZlRnJvbUFycmF5KGNsYXNzZXMsIGNsYXNzTmFtZSk7XG4gICAgICAgIGVsZW1lbnQuY2xhc3NOYW1lID0gY2xhc3Nlcy5qb2luKCcgJyk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiB0b2dnbGVFbGVtQ2xhc3MoZWxlbWVudCwgY2xhc3NOYW1lLCBib29sKSB7XG4gICAgaWYgKGJvb2wpIHtcbiAgICAgICAgYWRkQ2xhc3NUb0VsZW0oZWxlbWVudCwgY2xhc3NOYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZW1vdmVDbGFzc0Zyb21FbGVtKGVsZW1lbnQsIGNsYXNzTmFtZSk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBmb3JPd24ob2JqZWN0LCBjYikge1xuICAgIGZvciAodmFyIGtleSBpbiBvYmplY3QpIHtcbiAgICAgICAgaWYgKG9iamVjdC5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICBjYihrZXksIG9iamVjdFtrZXldKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gYXNzaWduKGRlc3QsIHNvdXJjZSkge1xuICAgIGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHtcbiAgICAgICAgaWYgKHNvdXJjZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICBkZXN0W2tleV0gPSBzb3VyY2Vba2V5XTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgcHJvY2Vzc1BhdHRlcm46IHByb2Nlc3NQYXR0ZXJuLFxuICAgIG9wdGlvbmFsaXplVHJhaWxpbmdTbGFzaDogb3B0aW9uYWxpemVUcmFpbGluZ1NsYXNoLFxuICAgIGdldFN0YXRlTm9kZUZyb21Db250ZXh0OiBnZXRTdGF0ZU5vZGVGcm9tQ29udGV4dCxcbiAgICBiaW5kTWV0aG9kczogYmluZE1ldGhvZHMsXG4gICAgY3JlYXRlQ2xhc3M6IGNyZWF0ZUNsYXNzLFxuICAgIHRvZ2dsZUVsZW1DbGFzczogdG9nZ2xlRWxlbUNsYXNzLFxuICAgIGFzc2lnbjogYXNzaWduLFxuICAgIGZvck93bjogZm9yT3duXG59OyJdfQ==
