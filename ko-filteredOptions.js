/********************
 * 'filteredOptions' binding for knockout.js
 * by Sílvia Mur Blanch aka PchiwaN
 * https://github.com/pchiwan/ko-filteredOptions
 ********************/

//#region FILTERED OPTIONS BINDING
 
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
        if (ko.exposed.tagNameLower(element) !== 'select') {
            throw new Error('options binding applies only to SELECT elements');
        }

        var selectWasPreviouslyEmpty = element.length === 0;
        var previousSelectedValues = ko.utils.arrayMap(ko.utils.arrayFilter(element.childNodes, function (node) {
            return node.tagName && (ko.exposed.tagNameLower(node) === 'option') && node.selected;
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
                ko.exposed.setTextContent(option, optionText);

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
                    ko.exposed.setOptionNodeSelectionState(newOptions[i], true);
                    countSelectionsRetained++;
                }
            }

            element.scrollTop = previousScrollTop;

            if (selectWasPreviouslyEmpty && ('value' in allBindings)) {
                // Ensure consistency between model value and selected option.
                // If the dropdown is being populated for the first time here (or was otherwise previously empty),
                // the dropdown selection state is meaningless, so we preserve the model value.
                ko.exposed.ensureDropdownSelectionIsConsistentWithModelValue(element, ko.utils.peekObservable(allBindings['value']), /* preferModelValue */true);
            }

            // Workaround for IE9 bug
            ko.exposed.ensureSelectElementIsRenderedCorrectly(element);
        }
    }
};

//#endregion

//#region EXTENDERS

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

//#endregion

//#region EXPOSED UTILS FUNCTIONS 

ko.exposed = {
	dependencyDetection: (function () {
		var _frames = [];

		return {
			begin: function (callback) {
				_frames.push({ callback: callback, distinctDependencies:[] });
			},

			end: function () {
				_frames.pop();
			},

			registerDependency: function (subscribable) {
				if (!ko.isSubscribable(subscribable)) {
					throw new Error("Only subscribable things can act as dependencies");
				}
				if (_frames.length > 0) {
					var topFrame = _frames[_frames.length - 1];
					if (!topFrame || ko.utils.arrayIndexOf(topFrame.distinctDependencies, subscribable) >= 0) {
						return;
					}
					topFrame.distinctDependencies.push(subscribable);
					topFrame.callback(subscribable);
				}
			},

			ignore: function(callback, callbackTarget, callbackArgs) {
				try {
					_frames.push(null);
					return callback.apply(callbackTarget, callbackArgs || []);
				} finally {
					_frames.pop();
				}
			}
		};
	})(),
	
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
            ko.exposed.dependencyDetection.ignore(ko.utils.triggerEvent, null, [element, 'change']);
        }
    },
	
	ensureSelectElementIsRenderedCorrectly: function(selectElement) {
		// Workaround for IE9 rendering bug - it doesn't reliably display all the text in dynamically-added select boxes unless you force it to re-render by updating the width.
		// (See https://github.com/SteveSanderson/knockout/issues/312, http://stackoverflow.com/questions/5908494/select-only-shows-first-char-of-selected-option)
		if (ko.exposed.getIEVersion() >= 9) {
			var originalWidth = selectElement.style.width;
			selectElement.style.width = 0;
			selectElement.style.width = originalWidth;
		}
	},
	
	forceRefresh: function(node) {
		// Workaround for an IE9 rendering bug - https://github.com/SteveSanderson/knockout/issues/209		
		if (ko.exposed.getIEVersion() >= 9) {
			// For text nodes and comment nodes (most likely virtual elements), we will have to refresh the container
			var elem = node.nodeType == 1 ? node : node.parentNode;
			if (elem.style)
				elem.style.zoom = elem.style.zoom;
		}
	},
	
	getIEVersion: function() {
		var version = 3, div = document.createElement('div'), iElems = div.getElementsByTagName('i');
		// Keep constructing conditional HTML blocks until we hit one that resolves to an empty fragment
		while (
			div.innerHTML = '<!--[if gt IE ' + (++version) + ']><i></i><![endif]-->',
			iElems[0]
		);
		return version > 4 ? version : undefined;
	},
	
	setTextContent: function(element, textContent) {
		var value = ko.utils.unwrapObservable(textContent);
		if ((value === null) || (value === undefined))
			value = "";

		if (element.nodeType === 3) {
			element.data = value;
		} else {
			// We need there to be exactly one child: a text node.
			// If there are no children, more than one, or if it's not a text node,
			// we'll clear everything and create a single text node.
			var innerTextNode = ko.virtualElements.firstChild(element);
			if (!innerTextNode || innerTextNode.nodeType != 3 || ko.virtualElements.nextSibling(innerTextNode)) {
				ko.virtualElements.setDomNodeChildren(element, [document.createTextNode(value)]);
			} else {
				innerTextNode.data = value;
			}

			ko.exposed.forceRefresh(element);
		}
	},
	
	setOptionNodeSelectionState: function (optionNode, isSelected) {
		// IE6 sometimes throws "unknown error" if you try to write to .selected directly, whereas Firefox struggles with setAttribute. Pick one based on browser.
		if (ko.exposed.getIEVersion() < 7)
			optionNode.setAttribute("selected", isSelected);
		else
			optionNode.selected = isSelected;
	},
	
	tagNameLower: function(element) {
		// For HTML elements, tagName will always be upper case; for XHTML elements, it'll be lower case.
		// Possible future optimization: If we know it's an element from an XHTML document (not HTML),
		// we don't need to do the .toLowerCase() as it will always be lower case anyway.
		return element && element.tagName && element.tagName.toLowerCase();
	}
};

//#endregion
