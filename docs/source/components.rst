Creating Components
=========

Overview
--------
A Koko component is a `Knockout component`_ with a few extras. To create a Koko
component, create a Knockout component whose ViewModel is defined
using ``koko.componentViewModel()``:

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

- Calls the ``init()`` method on ViewModel instantiation.
- Passes the parent ``ViewModel`` object (if any) to ``init()``.
- Optionally binds any methods defined to the component ViewModel.
- Adds ``this.koko`` to the component (see below).

this.koko.setReady()
--------------------
Koko will not transition to a new component until the component and all 
its children are "ready". As soon as a component is ready to be displayed,
call:

.. code-block:: javascript

    this.koko.setReady();

this.koko.navigateToPath()
-------------------------
.. code-block:: javascript

    koko.resolve('.user-detail', { 'userId': 123 });

Does a reverse lookup on the defined routes to find a route that matches
the provided ``path``. If such a route exists, it will navigate to the URL.
This is exactly like the global ``koko.navigateToPath()`` (see :doc:`api`),
except that this can resolve relative (dot-prefixed) paths.

this.koko.on('componentDisposal')
---------------------------------
.. code-block:: javascript

    this.koko.on('componentDisposal', handler);

Calls ``handler`` when the component is disposed of. Use this instead of
the standard ``.dispose()`` method since Koko uses the ``dispose()`` method
for cleanup.

this.koko.on('dependencyChange')
---------------------------------
.. code-block:: javascript

    this.koko.on('dependencyChange', handler);

Creates a Knockout **computed observable** wrapping the ``handler`` function
so that the handler function will be called whenever any observable
it depends on changes. This is better than calling ``ko.computed()``
yourself because Koko will automatically dispose the computed observable
alongside the component. This avoids memory leaks.

this.koko.routeParams
---------------------------------
An object mapping every URL parameter to a Knockout observable.
The observable will contain the parameter value or ``null`` if not defined.

.. code-block:: javascript
    
    {
        accountId: ko.observable(123),
        userId: ko.observable(null),
        ...
    }

If the parameter definition provided a ``parse()`` method
(see :doc:`route-configuration`), then the value of the parameter observable
will be the return value of the ``parse()`` method.

About Disposal
--------------

Short story: If you use ``ko.computed()`` in a Koko app, then dragons will eat you.

A Knockout `computed observable`_ is a function that will get re-evaluated
(called) every time an observable it depends on is updated. Knockout
computed observables have two primary use cases:

1. **View rendering** - Update the UI when dependencies change

2. **Event handling** - Do something when dependencies change

For scenario **#1** you should ALWAYS use a `pure computed observable`_.
This way, the computed observable will be disposed of when its component
is disposed of.

For scenario **#2**, you can’t use a pure computed observable.
Since nothing “depends” on the event handler, Knockout would immediately
trash the computed observable. In this case, ``ko.observable()`` 
(or manual subscriptions) are the way to go. This, however, puts the 
onus on the developer to remember to call the computed's ``dispose()``
method when the component is disposed of.

To handle this, Koko provides the handy
``this.koko.on('dependencyChange, ...)`` helper  (see above).

.. _Knockout component: http://knockoutjs.com/documentation/component-binding.html
.. _pure computed observable: http://knockoutjs.com/documentation/computed-pure.html
.. _computed observable: http://knockoutjs.com/documentation/computedObservables.html