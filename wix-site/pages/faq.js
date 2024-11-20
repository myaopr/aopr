import wixWindowFrontend from "wix-window-frontend";

$w.onReady(function () {

	const isMobile = wixWindowFrontend.formFactor === "Mobile";

    $w('#collapseButton').onClick( async(event) => clicked(event) );

	if (!isMobile) {
    	$w('#minusSign').onClick( async(event) => clicked(event) );
   		$w('#plusSign').onClick( async(event) => clicked(event) );
	}

	async function clicked(event) {
        const $item = $w.at(event.context);
		const box = $item('#answerCollapsibleBox');
		const plus = isMobile ? null : $item('#plusSign');
		const minus = isMobile ? null : $item('#minusSign');

        if (box.hidden) {
			await box.expand();
			await box.show('fade');
			if (plus) { plus.hide(); }
			if (minus) { minus.show(); }
		} else {
			await box.hide('fade', {duration: 500});
			box.collapse();
			if (plus) { plus.show(); }
			if (minus) { minus.hide(); }
		}
	}
});
