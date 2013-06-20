/********************
 * 'filteredOptions' binding for knockout.js
 * by Sílvia Mur Blanch aka PchiwaN
 * https://github.com/pchiwan/ko-filteredOptions
 ********************/

//'filteredOptions' binding (shamelessly copied and enhanced from the original 'options' binding)
//Allows us to filter some options from the bound collection, so that they won't be appended to the select control
//Usage: 
//  + accessors are all exactly the same as in the 'options' binding, but I've added an accessor of my own: optionsFiltering
//  + optionsFiltering: a dictionary containing the following properties
//          * propertyName: name of the filtering property in the bound ViewModel (the property which will be checked in order to know if the ViewModel must be ruled out). i.e.: 'IsActive'
//          * propertyValue: value that the filtering property must have in order for the ViewModel to be ruled out. i.e.: false
//          * exceptionValue: value that will exclude the ViewModel from being ruled out even if the filter evaluates true. The exceptionValue is compared with the optionValue
// i.e.: optionsFiltering: { propertyName: 'IsActive', propertyValue: false, exceptionValue: 42 }
ko.bindingHandlers.filteredOptions = {
    update: function (element, valueAccessor, allBindingsAccessor) {
        if (ko.utils.tagNameLower(element) !== 'select') {
            throw new Error('options binding applies only to SELECT elements');
        }

        var selectWasPreviouslyEmpty = element.length === 0;
        var previousSelectedValues = ko.utils.arrayMap(ko.utils.arrayFilter(element.childNodes, function (node) {
            return node.tagName && (ko.utils.tagNameLower(node) === 'option') && node.selected;
        }), function (node) {
            return ko.selectExtensions.readValue(node) || node.innerText || node.textContent;
        });
        var previousScrollTop = element.scrollTop;

        var value = ko.utils.unwrapObservable(valueAccessor());
        var selectedValue = element.value;

        // Remove all existing <option>s.
        // Need to use .remove() rather than .removeChild() for <option>s otherwise IE behaves oddly (https://github.com/SteveSanderson/knockout/issues/134)
        while (element.length > 0) {
            ko.cleanNode(element.options[0]);
            element.remove(0);
        }

        if (value) {
            var allBindings = allBindingsAccessor(),
                includeDestroyed = allBindings['optionsIncludeDestroyed'];

            if (typeof value.length != 'number') {
                value = [value];
            }
            if (allBindings['optionsCaption']) {
                var option = document.createElement('option');
                ko.utils.setHtml(option, allBindings['optionsCaption']);
                ko.selectExtensions.writeValue(option, undefined);
                element.appendChild(option);
            }

            for (var i = 0, j = value.length; i < j; i++) {
                // Skip destroyed items
                var arrayEntry = value[i];
                if (arrayEntry && arrayEntry['_destroy'] && !includeDestroyed) {
                    continue;
                }

                var option = document.createElement('option');

                var applyToObject = function (object, predicate, defaultValue) {
                    var predicateType = typeof predicate;
                    if (predicateType == 'function') {      // Given a function; run it against the data value
                        return predicate(object);
                    } else if (predicateType == 'string') { // Given a string; treat it as a property name on the data value
                        return object[predicate];
                    } else {                                // Given no optionsText arg; use the data value itself
                        return defaultValue;
                    }
                };

                // Apply a value to the option element
                var optionValue = applyToObject(arrayEntry, allBindings['optionsValue'], arrayEntry);
                ko.selectExtensions.writeValue(option, ko.utils.unwrapObservable(optionValue));

                // Apply some text to the option element
                var optionText = applyToObject(arrayEntry, allBindings['optionsText'], optionValue);
                ko.utils.setTextContent(option, optionText);

                //* PCHIWAN ************************************************************************//
                // Hey! Here's where my magic trick begins! 
                // I'll enhance the basic 'options' binding by filtering undesired options, keeping them from being appended to the select control

                var filter = allBindings['optionsFiltering'];
                if (filter) {
                    var propValue;
                    if (filter.propertyName) {      //if a property name was specified, the arrayEntry is a ViewModel
                        propValue = arrayEntry[filter.propertyName];
                    } else {                        //otherwise, the arrayEntry itself is the value
                        propValue = arrayEntry;
                    }

                    //is this an exception?
                    var exception = ko.utils.unwrapObservable(filter.exceptionValue) !== undefined &&
                                    ko.utils.unwrapObservable(optionValue) == ko.utils.unwrapObservable(filter.exceptionValue);

                    if (ko.utils.unwrapObservable(propValue) == ko.utils.unwrapObservable(filter.propertyValue) && !exception) {
                        continue;                   //keep going, don't append this option to the select!
                    }
                }

                //* Fi PCHIWAN *********************************************************************//

                element.appendChild(option);
            }

            // IE6 doesn't like us to assign selection to OPTION nodes before they're added to the document.
            // That's why we first added them without selection. Now it's time to set the selection.
            var newOptions = element.getElementsByTagName('option');
            var countSelectionsRetained = 0;
            for (var i = 0, j = newOptions.length; i < j; i++) {
                if (ko.utils.arrayIndexOf(previousSelectedValues, ko.selectExtensions.readValue(newOptions[i])) >= 0) {
                    ko.utils.setOptionNodeSelectionState(newOptions[i], true);
                    countSelectionsRetained++;
                }
            }

            element.scrollTop = previousScrollTop;

            if (selectWasPreviouslyEmpty && ('value' in allBindings)) {
                // Ensure consistency between model value and selected option.
                // If the dropdown is being populated for the first time here (or was otherwise previously empty),
                // the dropdown selection state is meaningless, so we preserve the model value.
                ko.utils.ensureDropdownSelectionIsConsistentWithModelValue(element, ko.utils.peekObservable(allBindings['value']), /* preferModelValue */true);
            }

            // Workaround for IE9 bug
            ko.utils.ensureSelectElementIsRenderedCorrectly(element);
        }
    }
};

ko.extenders.track = function (target, doTrack) {
	// <summary>Will track property changes -extender courtesy of https://github.com/egonsch</summary>
    // <param name="target" type="Object">The observable</param>
    // <param name="doTrack" type="boolean">true to track the observable, false otherwise</param>
	
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

$.extend(ko.utils, {    
	ensureDropdownSelectionIsConsistentWithModelValue: function (element, modelValue, preferModelValue) {
        if (preferModelValue) {
            if (modelValue !== ko.selectExtensions.readValue(element)) {
                ko.selectExtensions.writeValue(element, modelValue);
            }
        }

        // No matter which direction we're syncing in, we want the end result to be equality between dropdown value and model value.
        // If they aren't equal, either we prefer the dropdown value, or the model value couldn't be represented, so either way,
        // change the model value to match the dropdown.
        if (modelValue !== ko.selectExtensions.readValue(element)) {
            ko.dependencyDetection.ignore(ko.utils.triggerEvent, null, [element, 'change']);
        }
    }
});
