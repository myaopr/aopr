import wixWindow from 'wix-window';

/** Lightbox will not close reliably without waiting at least some amount of time. Guessing at 500ms min. */
const minCloseDelay = 500; 

/** Fake lightbox that a page can open to force another lightbox to close.
 * Relies on the fact that WIX allows only one lightbox at a time.
 * Opening a second lightbox closes the first.
 */
$w.onReady(function () {
	// console.warn('Closer lightbox opened');
	/** @type  {{message?: string, safetyTimeout?: number, timeout?: number}} */
	const context = wixWindow.lightbox.getContext();
	if (context && context.message) {
		$w('#closerMessage').text = context.message;
	}

	// safety timeout after 20 seconds (the minimum) or specified safety timeout sent in context.
	const safetyTimeoutId = setTimeout(() => {
		// console.warn('Closer lightbox timed-out');
		wixWindow.lightbox.close();
	}, context && context.safetyTimeout ? Math.max(context.safetyTimeout, minCloseDelay) : 2000);

	// Lightbox will not close reliably without waiting at least some amount of time. Guessing at 500ms min.
	setTimeout(() => {
		clearTimeout(safetyTimeoutId);
		wixWindow.lightbox.close();
	}, context && context.timeout ? Math.max(context.timeout, minCloseDelay) : minCloseDelay);
});