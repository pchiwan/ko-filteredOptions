
/////////////view models for example 1
function GuestViewModel(name, isVegan) {	
	this.Name = ko.observable(name ? name : '');
	this.IsVegan = ko.observable(isVegan ? isVegan : false);
	this.SelectedMeal = ko.observable();
}

function MealViewModel(name, isApt) {
	this.Id = ko.observable();
	this.Name = ko.observable(name ? name : '');
	this.IsAptForVegans = ko.observable(isApt ? isApt : false);
}

/////////////view models for example 2
function AttendeeViewModel(name, show) {
	this.Name = ko.observable(name ? name : '');
	this.SelectedShow = ko.observable(show ? show : null).extend({ track: true });
}

function ShowViewModel(name, isAvailable) {
	this.Id = ko.observable();
	this.Name = ko.observable(name ? name : '');
	this.IsAvailable = ko.observable(isAvailable ? isAvailable : false);
}

//application view model
function AppViewModel() {
	var self = this;
	
	/////////////setup for example 1
	//define the guests array
	this.Guests = ko.observableArray([
		new GuestViewModel('Ernie', false),
		new GuestViewModel('Bert', false),
		new GuestViewModel('Cookie monster', true)		
	]);
	
	//define the meals array
	this.Meals = ko.observableArray([
		new MealViewModel('Pepperoni pizza', false),
		new MealViewModel('Chicken fingers', false),
		new MealViewModel('Chocolate cookies', true),
		new MealViewModel('Cheese burger', false),
		new MealViewModel('Fruit salad', true)
	]);
	
	//assign an integer Id to each meal
	for (var i=0; i<self.Meals().length; i++) {
		self.Meals()[i].Id(i + 1);
	}	
	
	/////////////setup for example 2
	this.Attendees = ko.observableArray([
		new AttendeeViewModel('John'),
		new AttendeeViewModel('Paul'),
		new AttendeeViewModel('George'),
		new AttendeeViewModel('Ringo')
		// new AttendeeViewModel('John', 1),
		// new AttendeeViewModel('Paul', 2),
		// new AttendeeViewModel('George', 3),
		// new AttendeeViewModel('Ringo', 4)
	]);
	
	this.Shows = ko.observableArray([
		new ShowViewModel('Grease', true),
		new ShowViewModel('Mamma mia!', true),
		new ShowViewModel('The phantom of the opera', true),
		new ShowViewModel('We will rock you', true)
	]);
	
	for (i=0; i<self.Shows().length; i++) {
		self.Shows()[i].Id(i + 1);
	}
}

//apply ko!
ko.applyBindings(new AppViewModel());
