/** Override functions of entrythingy.js */
// Example of JS override. All variables are global to the page
(function (){
  // w_.l29 = "Given Name"; // DONT DO THIS
  
  w_.i7 = "Media";
  w_.s94 = "Media";
  w_.m5 = "Dimensions (include frame if framed) Enter dimensions in this form: 18x24";

  // Replaces "Statement specific to entry" with "Website for QR Code"
  // w_.entrystatement = "Website for QR code";
  // w_.s42a = "Ask for website for QR code";
  // w_.s48b = "Maximum length of website for QR code";


  // Override load function to initialize paypal button (if needed)
  var orig_et_load = et_load;
  et_load = function() {
    orig_et_load.apply(orig_et_load, arguments);
    OurCode.initPayPalButton();
  }
}());
