Getting Started
===============
Follow these instructions to get up and running with Koko in no time!

Step 1 - Install Koko
---------------------

Download the latest `Koko Release`_. Koko includes three builds:

.. code-block:: text

    1. build/koko.js           Non-minified, no source map
    2. build/koko.debug.js     Non-minified with source map
    3. build/koko.min.js       Minified

Koko is a `UMD`_ module and should play nice with AMD and CommonJS
module systems. Koko also exposes a global ``koko`` variable if
you're including it directly via a ``<script>`` tag.

Step 2 - Init Koko
----------------------------
Example:

.. code-block:: javascript

  koko.init(ko);

The ``koko.init()`` must be called before any other Koko members are exposed.
This is how Koko gets access to the Knockout library. This approach means that
Koko doesn't need to know how you loaded Knockout - global variable? AMD?
CommonJS? Koko doesn't care.


Step 3 - Add <koko-view> tag
----------------------------

Add a the following tag in the root of your application:

.. code-block:: html

    <koko-view></koko-view>

This tells Koko where to load content when the URL changes. See the
:doc:`nested-routing` section for more detail on how this works.

Step 4 - Define Components
--------------------------

Define some **Koko components** for Koko to load. Koko components
are `Knockout Components`_ with a few extras. The only requirement
when creating a Koko component is that the ViewModel be created using
``koko.componentViewModel()``.

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

See :doc:`components` for more detail.

Step 5 - Configure Routes
-------------------------

Tell **Koko** what URL patterns to map to which components.

.. code-block:: javascript

    koko.config({
        routes: {
            '/':             'root',
            '/users':        'root.user-list'
        }
    });

This example is simplistic. Koko's route configuration is quite flexible,
supporting :doc:`nested-routing` and URL parameters.

See :doc:`route-configuration` for a full list of options.

.. Hint::

    You can enable HTML5History based routing using the ``html5History`` option.

Step 6 - Start App
------------------

For Koko to work, you'll need to apply bindings:

.. code-block:: javascript

    ko.applyBindings({ 'koko': koko.root });

This provides the necessary state to the `Binding Context`_ that Koko
needs to do its job. That's it! You should now have a working Koko
application.

.. _Koko Release: https://github.com/aldendaniels/koko/releases
.. _UMD: https://github.com/umdjs/umd
.. _Knockout Components: http://knockoutjs.com/documentation/component-overview.html
.. _Binding Context: http://knockoutjs.com/documentation/binding-context.html