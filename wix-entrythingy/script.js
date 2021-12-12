/**
 * Our supplemental JS to process page after EntryThingy loads
 */
var OurCode = OurCode ? OurCode : {};
(function(){
  OurCode.start = start;

  function addFirstNamePlaceholder() {
	addPlaceholder('et.first_name', 'ex: Kenoli')
  }

  function addPlaceholder(inputId, placeholderValue) {
	const input = document.getElementById(inputId);
	if (input) {
	  input.setAttribute('placeholder', placeholderValue);
	}
  }

  /** Remove brackets around link-texts such as "[" */
  function removeLinkBrackets() {
	const links = document.querySelectorAll('a nobr');
	for (let i = 0; i < links.length; i++) {
	  const t = links[i].innerText;
	  const last = t.length-1;
	  if (t[0] === '[' && t[last]=== ']') {
		links[i].innerText = t.substr(1, last - 1 );
	  }
	}
  }


  function start() {
	console.log("Our code starts");
	OurCode.initPayPalButton(); // first time; also invoked by et_load override.
	// addFirstNamePlaceholder(); // demo
  }
})();
