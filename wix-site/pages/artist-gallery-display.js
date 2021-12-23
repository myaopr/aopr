// HIDING NAVIGATION STRIP because cannot (yet) find a way to show only items that satisfy the filter.
// If enabled, it shows hidden and blocked records.

import { formFactor } from 'wix-window';
import { MosaicArtistPortfolioDisplayType } from 'public/constants';
import { getArtistMemberInfo, stopSpinner } from 'public/aopr-utils';
import { getNextPreviousArtists } from 'backend/artist-gallery'

/**
 * @typedef {import('public/type-defs.js').Artist} Artist
 * @typedef {import('public/type-defs.js').ArtistMemberInfo} ArtistMemberInfo
 * @typedef {import('public/type-defs.js').NextPrev} NextPrev
 */

/** @type ArtistMemberInfo */
let memberInfo;

/** @type boolean */
let isMobile;

$w.onReady(function () {
	isMobile = formFactor === 'Mobile';
	$w("#editButton").collapse();
	$w("#dataset").onReady(datasetReady)
	$w("#navigationStrip").scrollTo();
	$w("#portfolioStrip").collapse();
	if (!isMobile) {
		$w("#backToListStrip2").collapse(); // not defined in mobile
	}
});

function datasetReady() {
	setTimeout(stopSpinner); // in case it stalled after Edit page save.
	setNextPreviousButtons();	
	showCurrentItem();
	showEditButton();
}

function setNextPreviousButtons() {
	/** @type {Artist} */
	const artist = $w("#dataset").getCurrentItem();
	const nextButton = $w("#nextButton");
	const previousButton = $w("#previousButton");
	getNextPreviousArtists(artist._id).then((/** @type {NextPrev} */ {next, previous} ) => {
		if (next) {
			nextButton.link = next['link-copy-of-artist-gallery-name'];
			nextButton.show();
		} else {
			nextButton.hide();				
		}
		if (previous) {
			previousButton.link = previous['link-copy-of-artist-gallery-name'];
			previousButton.show();
		} else {
			previousButton.hide();				
		}
	});
}

function showCurrentItem() {
	const item = $w("#dataset").getCurrentItem();

    if (item.blocked) { $w("#blockedBox").expand(); }
	if (item.hidden) { $w("#hiddenBox").expand(); }

	if (!item.artistPhoto) { $w("#artistPhoto").collapse(); }
	if (!item.statement) { $w("#statement").collapse(); }
    if (!item.name) { $w('#name').text = 'Unnamed Artist'; }
	if (!item.title) { $w("#title").collapse(); }

	if (!item.media) { $w("#media").collapse(); $w("#mediaLabel").collapse(); }
	if (!item.email) { $w("#email").collapse(); $w("#emailLabel").collapse(); }
	if (!item.website) { $w("#website").collapse(); $w("#websiteLabel").collapse(); }

	const instagramEl = $w("#instagram");
	const instagram = (item.instagram || '').trim();
	if (instagram) { 
		const style = `color: #AC4100; font-family: poppins-extralight, poppins, sans-serif; font-weight: bold;font-size: 14px; text-decoration: underline;`;
		const url = /instagram\.com/i.test(instagram)
			? instagram : 'https://www.instagram.com/' + instagram;
		instagramEl.html = `<a href="${url}" style="${style}" >${instagram}</a>`;
		instagramEl.expand(); 
		$w("#instagramLabel").expand(); 
	} else {
		instagramEl.collapse(); 
		$w("#instagramLabel").collapse(); 
	}

	/** @type {array} */
	const portfolio = item.gallery;
	if (!portfolio || !portfolio.length) {
		$w("#portfolioStrip").collapse();
		if (!isMobile) {
			$w("#backToListStrip2").collapse(); // not defined in mobile
		}
	} else {
		if (item.portfolioDisplayType === MosaicArtistPortfolioDisplayType) {
			$w("#portfolio1").collapse();
			$w("#portfolio2").expand();
		} else {
			$w("#portfolio1").expand();
			$w("#portfolio2").collapse();
		}
		$w("#portfolioStrip").expand();
		if (!isMobile) {
			$w("#backToListStrip2").expand(); // not defined in mobile
		}
	}
}

function showEditButton() {
	/** @type {Artist} */
	const artist = $w("#dataset").getCurrentItem();
	getArtistMemberInfo().then(mi => {
		artist._owner === mi.id || mi.isAdmin ? $w("#editButton").expand() : $w("#editButton").collapse();
	});
}
