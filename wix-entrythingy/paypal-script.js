// Kenoli - we will add this script file to our website.
// For SDK and button config options; see https://developer.paypal.com/docs/checkout/reference/customize-sdk

/**
Assumes that you paste the following HTML string AS A SINGLE LINE into the settings,
"Default Instructions for Entrants After Entry is Submitted", below the word "PAYPAL".


Please select your fee option and click a payment button:<div id='smart-button-container'><span class='radio-group'><input id='minOption' type='radio' name='fee-options' fee='10'><label for='minOption'></label></span><span class='radio-group'><input id='suggestedOption' type='radio' name='fee-options' fee='10' donation='10' checked><label for='suggestedOption'></label></span><div id='paypal-button-container'></div></div><div id='paid-message'></div>


Do this for EACH new EntryThingy Entry (aka Call for Art).
For different entry fee and donation amounts, change the corresponding values in that HTML string.

If the entry fee is $0, set the fee attribute in each <input> to "0"; a blank or invalid fee will be set to the default entry fee ($10)

$0 entry fees and donations are not sent to PayPal. If both values are $0, the PayPal button exists immediately.
A predefined option with $0 entry fees and donation is hidden.

Note that the text of each <label> tag text is generated by this code from the radio button fee and donation attribute values.
It replaces completely the label text in the string above.
*/

var OurCode = OurCode ? OurCode : {};
(function() {

	var defaultEntryFee = 10; // Default Entry Fee for AOPR when no entry fee specified.
	// var quantity = 1; // only ever 1
	var shipping = 0; // there is never anything to ship
	var tax = 0; // No CA sales tax for event tickets or donations

	var paypalButtons;
	var hasRenderedPaypalButtons = false; 

	OurCode.initPayPalButton = initPayPalButton;

	function initPayPalButton() {
		// Prevents PayPal's detach error
		// See https://github.com/paypal/paypal-checkout-components/issues/1506
		if (paypalButtons && paypalButtons.close ) {  
			paypalButtons.close();
			hasRenderedPaypalButtons = false;
		}
		
		// Find all the radio buttons for fee options. If none, not on a page with PayPal button for entry fee
		var feeOptions = document.querySelectorAll('#smart-button-container input[name="fee-options"]');
		if (!feeOptions || feeOptions.length === 0){
			return; // bail out because no PayPal smart buttons on this page
		} else {

			var maxFee = 0;
		  for(var i = 0; i < feeOptions.length; i++) {
				var option = feeOptions[i];
				var entryFee = getEntryFeeFromAttribute(option);
				maxFee = Math.max(maxFee, entryFee); // pick the largest fee from among the options
				var donation = parseFloat(option.getAttribute('donation')) || 0;
				option.hidden = !entryFee && !donation; // hide option if $0 for both fee and donation
				var label = option.nextSibling;
				if (label.tagName === 'LABEL') {
					label.innerText = 
						(entryFee ? '$' + entryFee + ' Entry fee' : '') +
						(entryFee && donation ? ' + ' : '') +
						(donation ? '$' + donation + (entryFee ? ' donation' : ' Donation') : '');
				} else {
					console.error('Expected label to follow the radio button for input with id=' + option.id);
				}
			}
			addCustomDonationOption(maxFee, feeOptions);
 		}

		function addCustomDonationOption(entryFee, feeOptions) {
			if (document.getElementById('custom-donation')) {
				return; // don't add it again
			}

			var customDonationOptionSpan = document.createElement('span')
			customDonationOptionSpan.className = 'radio-group';

			// Custom donation amount input, wrapped in span
			var customDonationInputSpan = document.createElement('span');
			customDonationInputSpan.innerHTML='&nbsp;$';

			var customDonationInput = document.createElement('input');
			customDonationInput.id = 'custom-donation-input';
			customDonationInput.setAttribute('type', 'number');
			customDonationInput.value = '20'; // default initial value is 20

			customDonationInputSpan.appendChild(customDonationInput);
			customDonationInputSpan.hidden = true; // start hidden; revealed when radio button clicked.
		

			// Custom Donation radio button
			var customDonationRadio = document.createElement('input')
			customDonationRadio.id ='custom-donation';
			customDonationRadio.setAttribute('type', 'radio');
			customDonationRadio.setAttribute('name', 'fee-options'); // the radio button group
			customDonationRadio.setAttribute('donation', customDonationInput.value);

			// Custom Donation radio button label
			var customDonationInputLabel = document.createElement('label')
			customDonationInputLabel.setAttribute('for', 'custom-donation');
			var feeText = (entryFee ? '$' + entryFee + ' Entry fee + ' : '');
			customDonationInputLabel.innerHTML = feeText + (entryFee ? ' donation' : 'Donation') + ' of your choice';


			// Set Custom Donation radio button "donation" attribute when amount changes
			customDonationInput.addEventListener('change', function () {
				var value = parseFloat(customDonationInput.value) || 0;
				if (value < 0) {
					customDonationInput.value = value = 0;
				}
				customDonationRadio.setAttribute('donation', value);
			});

			// Add show-on-click to the custom option
			function showDonationInputSpan() { customDonationInputSpan.hidden = false; }

			customDonationRadio.onclick = showDonationInputSpan
			customDonationInputLabel.onclick = showDonationInputSpan

			// Add hide-on-click to the other options
			function hideDonationInputSpan() { customDonationInputSpan.hidden = true; }

			for(var i = 0; i < feeOptions.length; i++) {
				var option = feeOptions[i];
				option.onclick = hideDonationInputSpan;
				var label = option.nextSibling;
				if (label.tagName === 'LABEL') {
					label.onclick = hideDonationInputSpan;
				}
			}

			// Append new elements to options container in the DOM
			customDonationOptionSpan.appendChild(customDonationRadio);
			customDonationOptionSpan.appendChild(customDonationInputLabel);
			customDonationOptionSpan.appendChild(customDonationInputSpan);

			var container = document.getElementById('smart-button-container');
			var payPalButtonContainer = document.getElementById('paypal-button-container');
			container.insertBefore(customDonationOptionSpan, payPalButtonContainer);
		}

		function getEntryFeeFromAttribute(option) {
			var entryFee = parseFloat(option.getAttribute('fee'));
			return isNaN(entryFee) ? defaultEntryFee : entryFee;
		}

		paypalButtons = paypal.Buttons({
			style: {
				shape: 'pill',
				color: 'gold',
				layout: 'vertical',
				label: 'paypal',
			},

			createOrder: function(data, actions) {	
				var showTitle = curritem ? (curritem.show_name || '') : 'Test Show'; // curritem is ET's global for info about the currently selected show.
				var orderDescription = 'Artist\'s Entry Fee for "' + showTitle + '"'; 

				var feeOptions = document.querySelectorAll('#smart-button-container input[name="fee-options"]');
				var selectedOption;
				for(var i = 0; i < feeOptions.length; i++) {
					if (feeOptions[i].checked) {
						selectedOption = feeOptions[i];
						break;
					}
				}
				if (!selectedOption) {
					return; // Huh? Somehow none are selected; bail out.
				}
				var entryFee = getEntryFeeFromAttribute(selectedOption);
				var donation = parseFloat(selectedOption.getAttribute('donation')) || 0;
				var selectedItemTotal = entryFee + donation;
				if (!selectedItemTotal) {
					return; //  nothing to purchase.
				}
				var itemTotalValue = Math.round((selectedItemTotal) * 100) / 100; // pretax
				var priceTotal = itemTotalValue + tax + shipping; // should equal itemTotalValue
				priceTotal = Math.round(itemTotalValue * 100) / 100; // with shipping and tax

				var items = [];
				var createOptions = {
					purchase_units: [
						{
							description: orderDescription,
							amount: {
								currency_code: 'USD',
								value: priceTotal,
								breakdown: {
									item_total: {
										currency_code: 'USD',
										value: itemTotalValue
									},
									shipping: {
										currency_code: 'USD',
										value: shipping
									},
									tax_total: {
										currency_code: 'USD',
										value: tax
									}
								}
							},
							items,
						}
					]
				}
				if (entryFee) {
					items.push({
							name: 'Entry Fee - ' + showTitle,
							unit_amount: { currency_code: 'USD', value: entryFee },
							quantity: 1
					});
				}
				if (donation) {
					items.push({
							name: 'Donation - ' + showTitle,
							unit_amount: { currency_code: 'USD', value: donation },
							quantity: 1
					});
				}
				return actions.order.create(createOptions);
			},

			onApprove: function(data, actions) {
				return actions.order.capture().then(function(orderData) {
					// Full available details
					console.log(
					'Capture result',
					orderData,
					JSON.stringify(orderData, null, 2)
					);

					// Show a success message within this page, e.g.
					const paidMsg = '<h3>Thank you for your payment!</h3><p>We will update your Entry status to "Paid" as soon as we can.</p>';
					const paidEl = document.getElementById('paid-message');
					const element = document.getElementById('paypal-button-container');
					if (paidEl) {
						element.innerHTML = '';
						paidEl.innerHTML = paidMsg;
					} else {
						element.innerHTML = '<div id="paid-message">' + paidMsg + "</div>";
					}

					// Or go to another URL:  actions.redirect('thank_you.html');

					// Kenoli - we can decide what to do here.
					// If we can't actually update the artist's record
					// we should let the user know that PayPal approved the payment and
					// we will update the entry status soon.
				});
			},

			onError: function(err) {
			  console.log(err);
			}
		});

		paypalButtons.render('#paypal-button-container').then(function() {
			hasRenderedPaypalButtons = true;
		});
	}
}());