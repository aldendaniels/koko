Helper Bindings
===============

The kokoHref binding
---------------------

The ``kokoHref`` binding constructs a link using koko’s route reversal
functionality and optionally adds an ``active`` class when the route is
active.

Example:

.. code-block:: html

        <div id="todo-list" data-bind="foreach: todos">
            <a data-bind="text: name, koko-href: { 
                path: '.todo-detail',
                params: { todoId: id }
                activate: true
            }"></a>
        </div>

Relative paths begin with a ``.``

The kokoActivate binding
-------------------------

The ``kokoActivate`` binding adds an ``active`` class when the target path is 
active and removes it when the target path is ``inactive``. This can be applied 
to any element.

Example:

.. code-block:: html

        <div id="todo-list" data-bind="foreach: todos">
            <div id="todo" data-bind="koko-activate: {
                path: '.todo-detail', 
                params: {todoId: id
            }">
            ...
            </div>
        </div>


The kokoLoading binding
-------------------------
Coming soon.