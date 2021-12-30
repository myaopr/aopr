/**
 * Our supplemental JS to process page after EntryThingy loads
 */
var OurCode = OurCode ? OurCode : {};
(function(){
  OurCode.start = start;
	OurCode.removeRequireAoprDiv = removeRequireAoprDiv;

  function addFirstNamePlaceholder() {
		addPlaceholder('et.first_name', 'ex: Kenoli');
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

	/** Hide all "require AOPR website Call For Art page" instruction divs
	 * in the "dashboard items" listing unless an Admin.
	 * Called by extension of `displayDashboardItems()` method. See entrythingy-override.js
	*/
	function removeRequireAoprDiv() {
		if (currperm < PERM_SHOWADMIN) { // not an admin
			const instrucEls = document.querySelectorAll('div.require-aopr');
			if (instrucEls) {
				for (var i = 0; i < instrucEls.length; i++) {
					instrucEls[i].style.display = 'none';
				}
			}
		}
	}

  function start() {
		console.log("AOPR code code starts");
		OurCode.initPayPalButton(); // first time; also invoked by et_load override.
		// addFirstNamePlaceholder(); // demo
  }
})();
