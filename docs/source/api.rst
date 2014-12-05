API
==============

.. role:: raw-html(raw)
   :format: html

koko.init()
-----------

Koko is built on top of Knockout and needs access to the Knockout
library. Call ``koko.init()`` passing in the ``ko`` object before using Koko.

.. code-block:: javascript

  koko.init(ko);


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
correctly whether using HTML5History based routing or hashtag based routing.

koko.navigateToPath()
---------------------

.. code-block:: javascript

    koko.navigateToUrl('a.component.path', { 'paramName': 123 });

Uses Koko's URL reversal logic (see :ref:`resolve`) to determine the 
URL matching the provided component path and parameter values. Then, navigates 
to the URL.

koko.root
---------

Binding state that needs to be provided applying bindings:

.. code-block:: javascript

    ko.applyBindings({ 'koko': koko.root });

See :doc:`getting-started` **step 6** for details.
