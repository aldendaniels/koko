Why Koko?
=========

A traditional web application has several components (terminology
may vary):

1. **Router**: Maps a request URL to a specific application state
2. **Model**: Normalized application data (your database)
3. **ViewModel**: Denormalized data representing the UI state
4. **View**: Renders the ViewModel as a user interface
5. **Controller**:

   a) Updates the ViewModel based on UI interactions (e.g. user edits)
   b) Updates the server-side Model from the ViewModel

`Knockout`_ does a great job of simplifying components **3**, **4**, and
**5** via declarative two-way data binding between the *View* and the
ViewModel. Knockout, however, does **not** help with application routing.

A routing framework has two basic tasks to perform:

1. Map a URL to a pre-defined application state
2. Load and destroy UI components on state change

While many good solutions exist for task **#1** (`Director`_,
`Crossroads.js`_, `page.js`_, `EdisonJS`_, etc.), none of these
libraries address task **#2** - tearing
down the old UI state and loading the new.

This is what Koko does.

.. _Knockout: http://knockoutjs.com/
.. _Angular UI Router: https://github.com/angular-ui/ui-router
.. _Director: https://github.com/flatiron/director
.. _Crossroads.js: http://millermedeiros.github.io/crossroads.js/
.. _page.js: http://visionmedia.github.io/page.js/
.. _EdisonJS: http://appendto.com/2014/02/edisonjs-organized-routing-for-complex-single-page-applications/