import wixWindow from 'wix-window';

/** Spinner lightbox runs until (a) another lightbox opens [see LightboxCloser], (b) host page navigates away, (c) it times-out and closes itself */
$w.onReady(function () {
	// console.warn('Spinner lightbox opened');
	/** @type  {{message?: string, safetyTimeout?: number}} */
	const context = wixWindow.lightbox.getContext();
	if (context && context.message) {
		$w('#spinnerMessage').text = context.message;
	}

	// safety timeout after 1 minute or safetyTimeout sent in context.
	setTimeout(() => {
		// console.warn('Spinner lightbox timed-out');
		wixWindow.lightbox.close();
	}, context && context.safetyTimeout ? context.safetyTimeout : 60000);
});
