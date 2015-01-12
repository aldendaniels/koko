Helper Bindings
===============

The kokoHref binding
--------------------

Normal Usage
^^^^^^^^^^^^
Constructs an internal link using Koko’s route reversal functionality 
and optionally adds an ``active`` class when the route is active. Will
intercept navigation (see below).


.. code-block:: html

        <div id="user-list" data-bind="foreach: users">
            <a data-bind="text: name, koko-href: { 
                path: '.user-detail',
                params: { userId: id }
                activate: true
            }"></a>
        </div>

Relative paths begin with a ``.``


Without URL reversal
^^^^^^^^^^^^^^^^^^^^
Sets the ``href`` of the link to the provided string. Will intercept navigation (see below).

.. code-block:: html

    <a data-bind="koko-href: '/some/url'"></a>

    
Navigation Interception
^^^^^^^^^^^^^^^^^^
Koko Intercepts clicks on internal links created using the ``kokoHref`` binding.
For internal links, Koko will cancel the default browser navigation and perform
the navigation internally. This avoids unecessary full page reloads. For links to
external domains, ``kokoHref`` will allow the default browser navigation to occur.


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