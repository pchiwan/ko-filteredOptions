ko-filteredOptions
==================

A custom Knockout binding based on the 'options' binding: it allows to filter certain items of a bound collection, keeping them from being attached to the `<select>` control.

# Introduction
This is a quite simple custom Knockout binding that I implemented due to a particular need I had with the project my colleague [@codecoding](https://github.com/codecoding/) and I were working on at the time.

We had a `<select>` control the source of which was retrieved from server on page load by means of an AJAX request that populated the observable array which was data-bound to the `<select>` control through the 'options' binding. This control was part of a form that was, in turn, also data-bound to a viewmodel.

For some reason we needed that, at some point, some of the `<option>` elements in our `<select>` control could be hidden, filtered out, so that they could not be selected. Removing these `<option>` elements by removing the respective objects from their bound data-source was not an acceptable solution: our data-sources had to remain unchanged. These options had to be filtered out according to a particular value of a certain property in the source collection's objects, so we came up with the idea for our own custom 'options' binding.

# So, what does it do?
It's probably easier to understand with an example so here it goes. We define two viewmodels, _Attendee_ and _Show_.
```javascript
var Attendee = function (name, show) {
  this.Name = ko.observable(name ? name : '');
  this.SelectedShow = ko.observable(show ? show : null);
};

var Show = function(name, isAvailable) {
  this.Id = ko.observable();
  this.Name = ko.observable(name ? name : '');
  this.IsAvailable = ko.observable(isAvailable ? isAvailable : false);
};
```
As you can see, when instantiating an _Attendee_ we must specify the attendees's name and, optionally, a show identifier. In turn, when instantiating a _Show_ we must specify its name and whether it is available or not. Next we define a collection of _Attendees_ and a collection of _Shows_. 

```javascript
this.Attendees = ko.observableArray([
  new Attendee('John'),
  new Attendee('Paul'),
  new Attendee('George'),
  new Attendee('Ringo')
]);
	
this.Shows = ko.observableArray([
  new Show('Grease', true),
  new Show('Mamma mia!', true),
  new Show('The phantom of the opera', true),
  new Show('We will rock you', true)
]);
```
Now, as you may have already imagined, our intention is to pair each _Attendee_ with a _Show_. The collection of shows available to the attendees will be filtered according to whether or not the _Show_'s property `IsAvailable` is set to `true`. Head to [this fiddle](http://jsfiddle.net/pchiwan/z7EYc/) to see it working. Here's the snippet of html code where you can see the our custom data binding 'filteredOptions'.
```html
<div class="example2">
  <div class="left">
    <!-- ko foreach: { data: Attendees(), as: 'attendee' } -->
    <div class="attendee"> 
      <b>Attendee: </b><span data-bind="text: attendee.Name"></span><br>	
      <b>Selected show: </b><select data-bind="filteredOptions: $root.Shows, optionsFiltering: { propertyName: 'IsAvailable', propertyValue: false }, optionsValue: 'Id', optionsText: 'Name', optionsCaption: 'Choose a show', value: attendee.SelectedShow"></select>
    </div>
    <!-- /ko -->
  </div>
  <div class="right">
    <!-- ko foreach: { data: Shows(), as: 'show' } -->
    <div class="show">	
      <b>Show: </b><span data-bind="text: show.Name"></span><br>	
      <b>Is available? </b><input type="checkbox" data-bind="checked: show.IsAvailable"></input>
    </div>
    <!-- /ko -->
  </div>
</div>
```

# How does it work?
Basically I copied the code of the original 'options' binding and enhanced it by adding the tiny snippet of logic that does our magic trick. And the trick consists in evaluating a certain property in the source collection's objects and, depending on this property's value, keep these objects from being appended as `<option>` elements to the `<select>` control or not.

The only drawback is that we also had to copy some Knockout's private utility methods in order to expose them (because they are not exposed in the production version).

# Before we get into detail...
Following up on the previous example fiddle, imagine this situation: we have a collection of _Attendee_, we select a _Show_ for each of them, and save the form. Assuming there is a stock of available tickets for each _Show_, when a _Show_ is sold out we should mark it as not available by setting `IsAvailable` to `false`. 

Doing this will trigger an update in the 'filteredOptions' data binding, causing the source to be re-evaluated and, therefore, the `<option>` elements to be first removed from and then re-attached to their respective data-bound `<select>` controls. Thus, a _Show_ that had been previously selected for an _Attendee_ before becoming unavailable will suddenly disappear from the data-bound `<select>` control's available options; in short: the _Show_ is no longer a selectable option to any of the _Attendee_, even those who had selected the _Show_ when it was still available. And that's not ok!

I worked around this issue thanks to a very simple but very powerful Knockout extender implemented by my colleague [@codecoding](https://github.com/pchiwan/), so the credit for the following snippet of code goes to him.
```javascript
ko.extenders.track = function (target, doTrack) {
  ///<summary>Will track property changes</summary>
  ///<param name="target" type="Object">The observable</param>
  ///<param name="doTrack" type="boolean">true to track the observable, false otherwise</param>
  
  if (doTrack) {
    target.isTracked = true;
    //keep the observable's original value
    target.originalValue = target();
    //in order to keep track of whether the observable is modified or not
    target.subscribe(function(newValue) {
      if (newValue == target.originalValue) {
        target.modified = false;
      } else {
        target.modified = true;
      }
    });
  } else {
    target.isTracked = false;
  }
  return target;
};
```
This extender allows us to keep track of the original value of an observable. Let's apply it to our current example; here's how we modify the definition of our _Attendee_ viewmodel by including the tracking extender.
```javascript
var Attendee = function (name, show) {
  this.Name = ko.observable(name ? name : '');
  this.SelectedShow = ko.observable(show ? show : null).extend({ track: true });
};
```
Now, when declaring our collection of attendees, we pass in an initial value -a selected show id- when instantiating each _Attendee_. The updated fiddle to try this out is [here](http://jsfiddle.net/pchiwan/R8AKP/).
```javascript
this.Attendees = ko.observableArray([
  new Attendee('John', 1),
  new Attendee('Paul', 2),
  new Attendee('George', 3),
  new Attendee('Ringo', 4)
]);
```
We also need to update the markup accordingly: we must add another parameter to the 'filteredOptions' data binding.
```html
<select data-bind="filteredOptions: $root.Shows, optionsFiltering: { propertyName: 'IsAvailable', propertyValue: false, exceptionValue: attendee.SelectedShow.originalValue }, optionsValue: 'Id', optionsText: 'Name', optionsCaption: 'Choose a show', value: attendee.SelectedShow"></select>
```
As you can see for yourself in the fiddle, when making a _Show_ unavailable, the corresponding `<option>` will disappear from every `<select>` control except for those which had that `<option>` selected from the very beginning. We achieve this through the use of the 'tracked' extender, along with the parameter `exceptionValue`. Keep reading to learn...

# How do I use it?
The data binding parameters you'll be using are those of the 'options' binding, plus a few more we've added. The examples provided are related to the previously referenced fiddle. These are our custom parameters:
### __filteredOptions__. 
Use this instead of the original 'options' binding. Keep in mind, though, that in order for our data binding to work, the data source must necessarily be a collection of JavaScript objects, a collection of strings won't do! 

### __optionsFiltering__. 
A dictionary holding the following parameters.

#### __propertyValue__. 
An __expression__ the resulting value of which should cause objects to be ruled out when their property with specified `propertyName` is evaluated. Mind this is negative logic: if the property's value is equal to this expression's value, the object will NOT be attached to the `<select>` control.  I.e.: 
`propertyValue: false`
`propertyValue: var1`
`propertyValue: [var1, var2]`
`propertyValue: func() == false`
`propertyValue: var1 == true ? var2 : var3`
`propertyValue: var4.indexOf(42)`

#### __propertyName__. 
__Optional__. It's the name of the property in the source collection's objects that will be evaluated to determine whether or not they must be attached to the `<select>` control. It must be written between single quotes. I.e.: 
`propertyName: 'IsAvailable'`
`propertyName: 'IsEnabled'`
`propertyName: 'MeaningOfLife'`

#### __exceptionValue__. 
__Optional__. An __expression__ the resulting value of which should be an exception to the filtering. When the property with specified `propertyName` is evaluated, if its value is equal to this expression's value, the object will be attached to the `<select>` control regardless of what `propertyValue` says. I.e.: 
`exceptionValue: attendee.SelectedShow.originalValue`
`exceptionValue: false`
`exceptionValue: var1`
`exceptionValue: [var1, var2]`
`exceptionValue: func() == false`
`exceptionValue: var1 == true ? var2 : var3`
`exceptionValue: var4.indexOf(42)`

# Another example
Here's another usage example, the fiddle for which you will find [here](http://jsfiddle.net/pchiwan/c55g2/). We start by defining, again, two viewmodels: _Guest_ and _Meal_.
```javascript
var Guest = function (name, isVegan) {	
  this.Name = ko.observable(name ? name : '');
  this.IsVegan = ko.observable(isVegan ? isVegan : false);
  this.SelectedMeal = ko.observable();
};

var Meal function = (name, isApt) {
  this.Id = ko.observable();
  this.Name = ko.observable(name ? name : '');
  this.IsAptForVegans = ko.observable(isApt ? isApt : false);
}
```
As you can see, when instantiating a _Guest_ we must specify the guest's name and whether he/she is vegan or not. In turn, when instantiating a _Meal_ we must specify its name and whether it is apt for vegans or not. Next we define a collection of _Guests_ and a collection of _Meals_. 
```javascript
this.Guests = ko.observableArray([
  new Guest('Ernie', false),
  new Guest('Bert', false),
  new Guest('Cookie monster', true)		
]);
	
this.Meals = ko.observableArray([
  new Meal('Pepperoni pizza', false),
  new Meal('Chicken fingers', false),
  new Meal('Chocolate cookies', true),
  new Meal('Cheese burger', false),
  new Meal('Fruit salad', true)
]);
```

See the html code below.
```html
<!-- ko foreach: { data: Guests(), as: 'guest' } -->
<div class="guest">
  <div class="left">
    <b>Guest: </b><span data-bind="text: guest.Name"></span><br>
    <b>Is vegan? </b><input type="checkbox" data-bind="checked: guest.IsVegan"></input>
  </div>
  <div class="right">
    <span><b>Meal of choice:</b></span><br>
    <select data-bind="filteredOptions: $root.Meals, optionsFiltering: { propertyName: 'IsAptForVegans', propertyValue: !guest.IsVegan() }, optionsValue: 'Id', optionsText: 'Name', optionsCaption: 'Choose a meal', value: guest.SelectedMeal"></select>
  </div>
</div>
<!-- /ko -->
```
