Helper Bindings
===============

The kokoHref binding
---------------------

The ``kokoHref`` binding constructs a link using Koko’s route reversal
functionality and optionally adds an ``active`` class when the route is
active:

.. code-block:: html

        <div id="user-list" data-bind="foreach: users">
            <a data-bind="text: name, koko-href: { 
                path: '.user-detail',
                params: { userId: id }
                activate: true
            }"></a>
        </div>

Relative paths begin with a ``.``

The kokoActivate binding
-------------------------

The ``kokoActivate`` binding adds an ``active`` class when the target path
is active:

.. code-block:: html

        <div id="user-list" data-bind="foreach: users">
            <div id="user" data-bind="koko-activate: {
                path: '.user-detail', 
                params: {userId: id
            }">
            ...
            </div>
        </div>


The kokoLoading binding
-------------------------
Coming soon.