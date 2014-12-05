Route Configuration
===================

.. role:: raw-html(raw)
   :format: html

Overview
--------

Conguring routes for a Koko application is done via the ``koko.config()`` method.
This must be called before any other Koko members (except ``koko.componentViewModel``) 
are exposed. 

.. hint::

  After calling ``koko.config()``, you still need to apply bindings for Koko
  to work. See :doc:`getting-started` **step 5**.

Example:

.. code-block:: javascript

    koko.config({
        routes: {
            '/users':        'user-list',
            '/user/:userId': 'user-list.user-detail',
            '/login':        'login',
            '/logout':       'logout'
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
        notFoundComponent: '404',
        html5History: true
    });

Routes
--------------

.. code-block:: javascript

    options.routes = [Object];

Maps a URL pattern (with ``:`` prefixed params) to a **component path**. 
The component path is a  ``.`` delimited list of Component names. 
Koko will load each component in order, nesting each component within the 
previous via the ``koko-view`` tag.

Redirects
----------------

.. code-block:: javascript

    options.redirects = [Object];

Maps a hard-coded source URL to a target component path supplying optional parameters. 
Koko will use its URL resolution feature to find a matching route and redirect accordingly.

Route Parameters
-------------------

.. code-block:: javascript

    options.routeParams = [Object];

Use to:

1.  Specify the expected format of the URL parameter via a ``regex``
    setting. If the parameter does not match the supplied regex, the
    route will not be loaded. :raw-html:`<br/><br/>`

2.  Supply a ``parse()`` function that accepts the string parameter and
    returns a normalized value that will be exposed via
    ``koko.state.params`` (see below).

Every parameter used in the ``routes`` object MUST have an entry here.

Not Found Component
------------------------

.. code-block:: javascript

    options.notFoundComponent = [String];

A component to load when the user navigates to an unrecognized URL. If this is not provided
Koko will display a generic 404 component.

HTML5 History
------------------------

.. code-block:: javascript

    options.html5History = [Boolean];

Setting this option to ``true`` will make Koko use HTML5History-based
routing for browsers that support the HTML5History API. Koko will fall
back to hashtag based routing for older browsers.

.. Hint::

    When you enable HTML5History-based routing, you'll need to configure
    your server to always serve up the your ``index.html`` file for whatever
    path is requested.

