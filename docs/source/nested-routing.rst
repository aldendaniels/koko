Nested Routing
==============

What is nested routing?
-----------------------
Nested routing makes it easy to build a complex UI built from 
loosely coupled components that can be combined in a flexible way.
Imagine the following scenario: 

.. code-block:: text
    
         --------------------------------------------------
        | http://www.myapp.com/users/123                   |
        |--------------------------------------------------
        | John Smith (*)       | Name: John Smith          |
        | ---------------------|                           |
        | Sally Jones          | Age: 39                   |
        | ---------------------|                           |
        | ...                  | Occupation: Explorer      |
         --------------------------------------------------

The left pane shows a list of users. The right pane shows details about
the user selected in the left pane. Which user is selected should
be encoded in the URL and the right pane needs to update automatically
as the user navigates to different users. 

Nested routing accomplishes this by dynamically loading the **person 
detail component** (right pane)  inside the **person-list component**
(left pane) based on the current application state (URL).


The Parent Component
--------------------
Add the ``<koko-view>`` tag to the parent component:

.. code-block:: html

        <!-- In the "prerson-list" component view -->
        <div id="person-list" data-bind="foreach: person">
            <a data-bind="koko-href: {...}"></a>
        </div>
        <koko-view></koko-view>

The root-level ``<koko-view>`` tag (See :doc:`getting-started`) tells
Koko where to load the target component at the root level. Similarly, this
``<koko-view>`` tag tells Koko where to load children of this component.

The Child Component
--------------------
The child component doesn't need anything special to be nested inside the parent.
Nesting is managed by the routing configuration (see below). 

The child component ViewModel's ``init()`` function, however, will be passed the
parent component's ViewModel as a parameter:

.. code-block:: javascript

    koko.componentViewModel({
        init: function(parent) {
            // If nested, then "parent" is the parent component's viewModel. 
            // Otherwise "parent" is null.
        }
    });

Route Configuration
-------------------
Once you've created the nestable components, all you need to do is tell Koko
how to nest them. See :doc:`route-configuration` for details.

Benefit
--------
The benefit of this approach to nested routing is that the components
themselves have no knowledge of how they're going to be nested. Any 
component can be used standalone or nested under any other component
via a ``<koko-view>`` tag.


By making the composition of components independent of the definition
of components, Koko maintains a separation of concerns.

Implementation Notes
----------------------
1. There is no limit on how deeply you can nest components.
2. On navigation, Koko will wait to render a component until that component
   and all its descendents have called the ``this.setReady()`` method. This
   avoids jumpy page loads.


