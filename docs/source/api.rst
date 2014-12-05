API
==============

.. role:: raw-html(raw)
   :format: html

koko.init()
-----------

Example:

.. code-block:: javascript

  koko.init(ko);

The ``koko.init()`` must be called before any other Koko members are exposed. 
This is how Koko gets access to the Knockout library. This approach means that
Koko doesn't need to know how you loaded Knockout - global variable? AMD? 
CommonJS? Koko doesn't care.

koko.config()
----------

Configures a Koko application. See :doc:`route-configuration` for more details.

koko.componentViewModel()
-------------------------
Defines the ViewModel object for any component that Koko will be responsible for loading.
See the :doc:`components` documentation for more details.

.. _resolve:

koko.resolve()
---------------------

.. code-block:: javascript

    koko.resolve('user-list.user-detail', { 'userId': 123 });

Does a reverse lookup on the defined routes to find a route that mathes
the provded ``path``. If such a route exists, the provided parameters
are substituted and the resulting URL is returned.


koko.navigateToUrl()
--------------------

.. code-block:: javascript

    koko.navigateToUrl('/users/123');

Redirects the browser to the desired URL. This normalizes the URL to work
correctly whehter using HTML5History routing or hashtag-based routing.

koko.navigateToPath()
---------------------

.. code-block:: javascript

    koko.navigateToUrl('a.component.path', { 'paramName': 123 });

Uses Koko's URL reversal logic (see :ref:`resolve`) to determine the 
URL matching the provided component path and parameter values. Then, navigates 
to the URL.

koko.root
---------------------
Binding state that needs to be provided when calling ``applyBindings()``:

.. code-block:: javascript

    ko.applyBindings({ 'koko': koko.root });

See :doc:`getting-started` **step 6** for more details.
