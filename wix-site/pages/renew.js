// renew.js - same as dues.js
$w.onReady(function () {
});

/**
 * Adds an event handler that runs when an input element's value is changed.
 * [Read more](https://www.wix.com/corvid/reference/$w.ValueMixin.html#onChange)
 * @param {$w.Event} event - ignored
 */
export function duesAmount_change(event) {
	// This function was added from the Properties & Events panel. To learn more, visit http://wix.to/UcBnC-4
	// Add your code for this event here: 
	let index = $w("#duesAmount").selectedIndex;  // "first_value";
	// console.log('dues amount index is ' + index);
	let individualButton = $w("#paypalIndividualButton");
	let coupleButton = $w("#paypalCoupleButton");
	let limitedButton = $w("#paypalLimitedIncomeButton");
	individualButton.collapse();
	coupleButton.collapse();
	limitedButton.collapse();
    if (index == null) {
		index = $w("#duesAmount").selectedIndex = 0;
	}
	if (index === 1) {
		coupleButton.expand();
	} else if (index === 2) {
		limitedButton.expand();
	} else {
		individualButton.expand();
	}
}
