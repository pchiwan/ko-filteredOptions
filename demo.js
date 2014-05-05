
/////////////view models for example 1
function Guest(name, isVegan) {	
	this.Name = ko.observable(name ? name : '');
	this.IsVegan = ko.observable(isVegan ? isVegan : false);
	this.SelectedMeal = ko.observable();
}

function Meal(name, isApt) {
	this.Id = ko.observable();
	this.Name = ko.observable(name ? name : '');
	this.IsAptForVegans = ko.observable(isApt ? isApt : false);
}

/////////////view models for example 2
function Attendee(name, show) {
	this.Name = ko.observable(name ? name : '');
	this.SelectedShow = ko.observable(show ? show : null).extend({ track: true });
}

function Show(name, isAvailable) {
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
		new Guest('Ernie', false),
		new Guest('Bert', false),
		new Guest('Cookie monster', true)		
	]);
	
	//define the meals array
	this.Meals = ko.observableArray([
		new Meal('Pepperoni pizza', false),
		new Meal('Chicken fingers', false),
		new Meal('Chocolate cookies', true),
		new Meal('Cheese burger', false),
		new Meal('Fruit salad', true)
	]);
	
	//assign an integer Id to each meal
	for (var i=0; i<self.Meals().length; i++) {
		self.Meals()[i].Id(i + 1);
	}	
	
	/////////////setup for example 2
	this.Attendees = ko.observableArray([
		new Attendee('John', 1),
		new Attendee('Paul', 2),
		new Attendee('George', 3),
		new Attendee('Ringo', 4)
	]);
	
	this.Shows = ko.observableArray([
		new Show('Grease', true),
		new Show('Mamma mia!', true),
		new Show('The phantom of the opera', true),
		new Show('We will rock you', true)
	]);
	
	//assign an integer Id to each show
	for (i=0; i<self.Shows().length; i++) {
		self.Shows()[i].Id(i + 1);
	}
}

//apply ko!
ko.applyBindings(new AppViewModel());
