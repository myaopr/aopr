$w.onReady(function () {
});

/** Code for the PayPal DONATE HTML component
 * Configured as a Donation Page on PayPal itself. 
 * There all the behaviors are hard coded
 * including the return to this page upon success or cancellation.
 * Edit that configuration on PayPal by clicking this link:
 * https://www.paypal.com/donate/buttons/manage/8BSA6GP4TQ7FQ
 */
const donateHtmlCode = `
<form action="https://www.paypal.com/donate" method="post" target="_top">
<input type="hidden" name="hosted_button_id" value="8BSA6GP4TQ7FQ" />
<input type="image" src="https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif" border="0" name="submit" title="PayPal - The safer, easier way to pay online!" alt="Donate with PayPal button" />
<img alt="" border="0" src="https://www.paypal.com/en_US/i/scr/pixel.gif" width="1" height="1" />
</form>
`;