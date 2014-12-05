Getting Started
===============

Step 1 - Install Koko
---------------------

Download the latest `Koko Release`_. Koko includes three builds:

.. code-block:: text

    1. build/koko.js           Non-minified, no source map
    2. build/koko.debug.js     Non-minified with source map
    3. build/koko.min.js       Minified

Koko uses `Browserify`_ to build `UMD`_ modules that play nice
with AMD and CommonJS module systems. Koko also exposes a global
``koko`` variable, allowing you to directly include Koko via
a ``<script>`` tag.

Step 2 - Init Koko
----------------------------

Koko is built on top of Knockout and needs access to the Knockout
library. Call ``koko.init()`` passing in the ``ko`` object before using Koko.

.. code-block:: javascript

  koko.init(ko);


Koko doesn't need to know how you loaded Knockout - global variable? AMD?
CommonJS? Koko doesn't care.


Step 3 - Add the <koko-view> tag
----------------------------

Add a the following tag in the root of your application:

.. code-block:: html

    <koko-view></koko-view>

This tells Koko where to load content when the URL changes. See the
:doc:`nested-routing` section for more detail on how this works.

Step 4 - Define components
--------------------------

Define some **Koko components** for Koko to load. Koko components
are `Knockout components`_ with a few extras. To create a Koko
component, create a Knockout component whose ViewModel is defined
using ``koko.componentViewModel()``:

.. code-block:: javascript

    ko.components.register('my-component', {

        viewModel: koko.componentViewModel({
            init: function(parent) {
                this.koko.setReady();
            },
        }),

        template: '<div>...</div>'
    });

.. Hint::

   In the component, you'll need to call ``this.koko.setReady()`` for the
   component to load.

See :doc:`components` for more detail.

Step 5 - Configure routes
-------------------------

Tell Koko what URL patterns to map to which components:

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

Step 6 - Apply bindings
------------------

For Koko to work, you'll need to apply bindings:

.. code-block:: javascript

    ko.applyBindings({ 'koko': koko.root });

This adds data to the `Binding Context`_ that the Koko :doc:`helper-bindings`
and the ``<koko-view>`` tag need to work.

And that's it! You should now have a working Koko application.

.. _Koko Release: https://github.com/aldendaniels/koko/releases
.. _UMD: https://github.com/umdjs/umd
.. _Knockout Components: http://knockoutjs.com/documentation/component-overview.html
.. _Binding Context: http://knockoutjs.com/documentation/binding-context.html
.. _Browserify: http://browserify.org/