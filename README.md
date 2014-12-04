# Koko Framework
A client-side routing framework for single-page [Knockout](http://knockoutjs.com/) applications inspired by [Angular UI Router](https://github.com/angular-ui/ui-router).

###Warning
Koko is in the early stages of development. An initial stable release is forthcoming. In the meantime, use at your own risk.

###Why Koko?
A traditional CRUD web application has several components (terminology may vary):

 1. **Router**: Maps a request URL to specific application state
 2. **Model**:  Normalized application data (your database)
 3. **ViewModel**: Denormalized, throwaway data representing the current UI state
 4. **View**: Renders the *ViewModel* as a user interface
 5. **Controller**: 
	 - Updates the *ViewModel* based on UI interactions (e.g. user edits)
	 - Updates the server-side *Model* from the *ViewModel*

Knockout does a great job of simplifying components **3**, **4**, and  **5** via declarative two-way data binding between the *View* and the *ViewModel* as well as a flexible *binding* system for re-usable DOM code. Knockout, however, does **not** help with application routing. 

A routing framework has two basic tasks to perform:

  1. Map a URL to a pre-defined application state
  2. Load and destroy UI components on state change

While many good solutions exist for task **#1** ([Director](https://github.com/flatiron/director), [Crossroads.js](http://millermedeiros.github.io/crossroads.js/), [page.js](http://visionmedia.github.io/page.js/), [EdisonJS](http://appendto.com/2014/02/edisonjs-organized-routing-for-complex-single-page-applications/), etc.), none of these libraries address the arguably more difficult **#2** task of tearing down the old UI state and loading the new. 

Koko does.

In this respect Koko is directly comparable to [Angular UI Router](https://github.com/angular-ui/ui-router).

### Features
 1. Declarative routing with built-in support for nested or parallel nested views
 2. Automatic URL reversal with parameter substitution
 3. Automatic activation and deactivation of links (and other DOM elements) as routes change

### How it Works
Koko is built around Knockout's [Components](http://knockoutjs.com/documentation/component-overview.html) feature. Every route definition maps a specified URL pattern to a sequence of nested components referred to as a **Component Path**. On URL change, Koko uses Knockout observables to tell Knockout which components to tear down and which to load to construct the new Component Path. Any URL parameters are also captured, parsed, and exposed as Knockout observables, making it easy to re-render the UI when URL parameters change.

### The koko-view component
```html
	<div id="todo-list" data-bind="foreach: todos">
		<a>...</a>
	</div>
	<koko-view></koko-view>
```

The `<koko-view>` component can be dropped into any component to indicate where Koko should load sub-components. You'll notice that the `<koko-view>` component makes no assumptions about **which** component will be loaded. This approach makes it easy to build flexible applications with loosely coupled components that can be combined and re-used as needed.

The component loaded into the `<koko-view>` tag must have a "KoKo ViewModel":

```javascript
ko.components.register('todo-list', {
	viewModel: koko.componentViewModel({
		init: function(parent) {
			this.koko.setReady();
		},
		doSomething: function() {...}
	});
	template: '...'
}
```

Read more about `componentViewModel` in the **API** section.

### The koko-href binding
A binding that construct a link using koko's route reversal functionality and optionally adds an `active` class when the route is active.

Example:
```html
	<div id="todo-list" data-bind="foreach: todos">
		<a data-bind="text: name, koko-href: { 
			path: '.todo-detail',
			params: { todoId: id }
			activate: true
		}"></a>
	</div>
```

### The koko-activate binding
Like koko-href, but only handles adding and removing the `active` class. This is useful for activating & deactivating non-link elements.

Example:
```html
	<div id="todo-list" data-bind="foreach: todos">
	    <div id="todo" data-bind="koko-activate: {path: '.todo-detail', params: {todoId: id}">
	        ...
	    </div>
	</div>
```


### API

####koko.init(ko)
This must be called before any other Koko members are exposed. Provides Koko with a handle to the *Knockout* library.

####koko.run(options)
Starts a Koko application. Must be called before any other Koko members (except `koko.component`) are exposed. 

Example usage:
```javacript
koko.run({
    routes: {
        '/todos':        'todo-list',
        '/todo/:todoId': 'todo-list.todo-detail',
        '/login':        'login',
        '/logout':       'logout',
        '/404':          '404'
    },
    redirects: {
        '/shortcut': { 
	        path: 'todo-list.todo-detail',
	        params: {
		        todoId: 1
		    } 
	    }
    },
    routeParams: {
        todoId: {
	        regex: /[0123456789]+/,
	        parse: function(str) { 
		        return parseInt(str); 
		    }
        }
    },
    notFoundRedirect: '404'
});
```

`options.routes` **(required)** - maps a URL pattern (with ":" prefixed params) to a "." delimited list of Knockout component names. Koko will load each component in order, nesting each component within the previous via the `koko-view` component.

`options.redirect` **(optional)** - maps a hard-coded source URL to a target component path supplying optional parameters. Koko will use its URL reversal feature to find a matching route and redirect accordingly.

`options.routeParams` **(optional)** - Lets you

 - Specify the expected format of the URL parameter via a `regex` setting. If the parameter does not match the supplied regex, the route will not be loaded. 

 - Supply a `parse()` function that accepts the string parameter and returns a normalized value that will be exposed via `koko.state.params` (see below).

`options.notFoundRedirect` - A `404` component to redirect to. **TODO:** This should be a component to load, rather than a redirect. 

####koko.componentViewModel(componentPrototype, doNotBind)
A souped up Knockout component.

The `componentViewModel(props, doNotBind)` method does the following:

 - Calls the provided `init(parent)` method when the component is loaded, passing in the parent component binding context.

 - Adds a `this.koko` object to the component with the following:
	 - `this.koko.setReady()`
	    Koko will not transition to a new component path until all loaded components are ready
	    
	 - `this.koko.navigate(path, params)`
	    Navigate to a different applicaiton state. Relative paths beginning in `"."` are supported.

	 - `this.koko.on('dependencyChange', handler)`
		Creates a `computed` wrapping `handler` and handles disposal when the component is disposed.
		
	 - `this.koko.on('componentDisposal', handler)`
	    Use this instead of the standard `.dispose()` method as KoKo uses the `dispose()` method for cleanup

	 - `this.koko.routeParams`
        A may of parameter name to an observable containing the parameter's value.
        
 - Binds all methods to the component. To turn off this functionality, provide a `doNotBind` value of `true`.

### About Disposal
Short story: If you use `ko.computed()` in a `koko` app, dragons will probably eat you.

A Knockout computed observable is a function that will get re-evaluated (called) every time an observable it depends on is modified. Knockout computed observables have two primary use cases:

 1. **View rendering** - Calculate a value to render in the view that will get re-calculated whenever observables `x`, `y`, or `z` change.

 2. **Event handling** - Conditionally **do something** whenever observables `x`, `y`, or `z` change.

For scenario **#1** you should ALWAYS use a *pure computed observable*. This way, the computed observable will be disposed of when its component is disposed of.

For scenario **2**, you can't easily use a *pure computed observable*. Since nothing "depends" on the event handler, Knockout would immediately trash the computed observable.

In this case, `ko.observable()` (or manual subscriptions) are the way to go, but this puts the onus on the developer to remember to call `dispose()` when the viewModel is disposed of. 

To handle this, Koko provides the handy `this.koko.on('dependencyChange, ...)` helper that creates the computed observable and automatically disposes it alongside the component.

### Credits
- Created by [Alden Daniels](http://www.aldendaniels.me) at [OneSpot, Inc.](https://www.onespot.com/)

- Uses Flatiron's [director](https://github.com/flatiron/director/blob/master/build/director.js) project to handle low-level url-to-function routing.
