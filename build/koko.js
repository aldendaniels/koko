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