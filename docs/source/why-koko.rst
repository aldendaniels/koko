Why Koko?
=========

Single-page web apps usually include (terminology may vary):

1. **Router**: Maps a request URL to an application state
2. **Model**: Normalized application data (your database)
3. **ViewModel**: Denormalized data representing the UI state
4. **View**: Renders the ViewModel as a user interface
5. **Controller**:

   a) Updates the ViewModel based on UI interactions
   b) Updates the Model from the ViewModel

`Knockout`_ does a great job of simplifying items **3**, **4**, and
**5** via declarative two-way data binding between the View and the
ViewModel. Knockout, however, does **not** help with application routing.

Koko performs several tasks:

1. Maps a URL to a pre-defined application state
2. Loads and destroys UI components on state change
3. Facilitates the creation and updating of internal links

.. _Knockout: http://knockoutjs.com/
.. _Angular UI Router: https://github.com/angular-ui/ui-router