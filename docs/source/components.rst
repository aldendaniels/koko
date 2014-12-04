Creating Components
=========

Overview
--------
A Koko component is a `Knockout Component`_ with a few extras. 
The only requirement when creating a Koko component is that the 
viewModel be created using ``koko.componentViewModel()``.


.. code-block:: javascript

    ko.components.register('my-component', {

        viewModel: koko.componentViewModel({
            init: function(parent) {
                ...
            },
            ...
        }, /* optional: doNotBind */),

        template: '<div>...</div>'
    });


**koko.componentViewModel()** does the following:

- Calls the ``init()`` method on viewModel instantiation.
- Passes the parent ``viewModel`` object (if any) to ``init()``
- Adds ``this.koko`` to the component (see below).
- Optionally binds all methods to the component viewModel 


this.koko.setReady()
--------------------
Koko will not transition to a new component until the component and all 
it's children are "ready". As soon as a compnent is ready to be displayed,
call ``this.koko.setReady()``. 

this.koko.navigateToPath()
-------------------------
.. code-block:: javascript

    this.koko.navigateToPath(path, params);


Does a reverse lookup on a component path + params compbination and redirects
the browser to the target URL. ``path`` can either be an absolute path or a 
relative path beginning with a ``.`` Relative paths are resolved relative to 
the component path of current component.


this.koko.on('componentDisposal')
---------------------------------
.. code-block:: javascript

    this.koko.on('componentDisposal', handler);

Calls ``handler`` when the component is disposed of. Use this instead of the standard ``.dispose()`` method as Koko uses the ``dispose()`` method for cleanup.

this.koko.on('dependencyChange')
---------------------------------
.. code-block:: javascript

    this.koko.on('dependencyChange', handler);

Creates a Knockout **computed observable** wrapping the ``handler`` function
so that the handler function will be called whenever any obersable
it depends on changes. This is better than calling ``ko.computed()``
yourself because Koko will automatically dispose computed observable
along-side the component. This avoids memory leaks.

this.koko.routeParams
---------------------------------
An object mapping every URL parameter name to a Knockout observable 
containing the parameter value or ``null`` if not defined.

.. code-block:: javascript
    
    {
        accountId: ko.obserable(123),
        userId: ko.observable(null),
        ...
    }

If the parameter definition provided a ``parse()`` method, then the 
value of the parameter will be the return value of the ``parse()`` 
method.

About Disposal
--------------

If you use ``ko.computed()`` in a ``koko`` app, then dragons will eat you.

A Knockout computed observable is a function that will get re-evaluated
(called) every time an observable it depends on is updated. Knockout
computed observables have two primary use cases:

1. **View rendering** - Update the UI when dependencies change

2. **Event handling** - Do something when dependencies change

For scenario **#1** you should ALWAYS use a *pure computed observable*.
This way, the computed observable will be disposed of when its component
is disposed of.

For scenario **#2**, you can’t use a *pure computed observable*.
Since nothing “depends” on the event handler, Knockout would immediately
trash the computed observable. In this case, ``ko.observable()`` 
(or manual subscriptions) are the way to go. This, however, puts the 
onus on the developer to remember to call the computed's ``dispose()``
method when the viewModel is disposed of.

To handle this, Koko provides the handy
``this.koko.on('dependencyChange, ...)`` helper  (see above).

.. _Knockout Component: http://knockoutjs.com/documentation/component-binding.html