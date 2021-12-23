import { to } from 'wix-location';
import { formFactor } from 'wix-window';
import { artistsDisplayPageLinkField, defaultArtistImageUrl, maxImageUploads, 
	MosaicArtistPortfolioDisplayType, ThumbnailsDisplayType } from 'public/constants';
import { elipsisText, showSpinner, stopSpinner} from 'public/aopr-utils';
import { updateArtistImagesOnServer } from 'backend/artist-gallery';
import { createAndSaveNewImage, getSlug, parseWixImageUrl } from 'public/images';

 /**
  * @typedef {import('public/type-defs.js').Artist} Artist
  * @typedef {import('public/type-defs.js').ImageInfo} ImageInfo
  * @typedef {import('public/type-defs.js').UploadedImageResult} UploadedImageResult
  *
  */

  /** 
   * TypeDefs local to this file
   *
   * @typedef {ImageInfo & ImageInfoExtension} ImageInfoX - ImageInfo extended for use in this file.
   *
   * @typedef {object} ImageInfoExtension - extensions to ImageInfo that are local to this file. Not in store. Not saved.
   * @property {string} [_id] - id of the item in a repeater, derived from the slug which must be unique.
   * @property {string} [filename] - the original filename (for display in repeater and image table)
   * @property {string} [image] - copy of `src` referenced by images table which morphs it.
   * @property {string} [name] - for display in images table only.
   */

let blockImageUpload = false;
const blockImageUploadMsg = 'You cannot upload more images because you used up your quota. Contact support@artsofpointrichmond.com';

/** @type {wix_dataset.Dataset} */
let dataset;

let errMsgTimeoutId;

const maxPortfolioImages = 10; // TODO: move to constants?

/** @type {$w.Repeater} */
let portfolioRepeater;

$w.onReady(function () {
	dataset = $w("#dataset");
	dataset.onReady(datasetReady)
	$w("#saveStrip").scrollTo();

	if (formFactor === 'Mobile') {
		$w('#clearArtistPhotoButton').label = 'Clear';
		$w('#setArtistPhotoFromImagesButton').label = 'Set from WIX photos';
	}
});

/** Add missing artist photo and portfolio images to the artist item "images" array
 * Also update the image title from the portofolio title if it exists and is different.
 * Matching portfolio images and artist photo should be in "images" but things happen,
 * e.g., someone messed around with the collections directly via the Admin console.
 * TODO: save updated images immediately
 * @param {Artist} artist - artist gallery item
 */
function addMissingImages(artist) {
	const { artistPhoto, images = [], gallery: portfolio = [] } = artist;
	let saveImages = false;

    const artistPhotoSlug = getSlug(artistPhoto);
	if (artistPhoto !== defaultArtistImageUrl && null == images.find(img => img.slug === artistPhotoSlug)) {
		const img = createImageInfoFromUrl(artistPhoto, 'The Artist');
		if (img) {
			// Append artist photo to images (as it should have been there already)
			images.push(img);
			saveImages = true;
		}
	}

	portfolio.forEach(p => {
		const img = images.find(img => img.slug === p.slug)
		if (img) {
			const pTitle = p.title.trim();
			if (pTitle && pTitle !== img.title) {
				img.title = pTitle; // update image with title from portfolio
				saveImages = true;
			}
		} else {
			images.push(p); // Add portfolio image to images (as it should have been there already)
			saveImages = true;
		}
	})
	
	if (saveImages) {
		dataset.setFieldValue('images', images);
		updateArtistImagesOnServer(artist._id, images).catch(err => console.error('addMissingImages() - ' + err));
	}
}

export function clearArtistPhotoButton_click(event) {
	dataset.setFieldValue('artistPhoto', defaultArtistImageUrl);
	refreshArtistImageTable();
}

function datasetReady() {
	stopSpinner();
	const artist = getArtist();
	const {gallery: portfolio, images} = artist;

	if (!artist.galleryDisplayType) {
		artist.galleryDisplayType = ThumbnailsDisplayType;
		dataset.setFieldValue('galleryDisplayType', ThumbnailsDisplayType);
	}

	addMissingImages(artist);
	blockAddingToPortfolio(portfolio);
	maxUploadsGuard(images.length);

	displayHideRecordCheckboxes();
	dataset.onItemValuesChanged(displayHideRecordCheckboxes);

    initializeArtistImageTable();
	initializePortfolioRepeater();
	initializePortfolioImageTable();
	setPortfolioDisplay(artist.galleryDisplayType);
}

/** Switch between the two checkboxes based on the current state of "Hidden" checkbox 
 * that measn "this artist record is hidden from the gallery".
 * Because WIX prevents styling HTML, we switch between two overlapping checkboxes, 
 * one for when the record is hidden (red) and 
 * one for when the record is public (blue, not hiddent)
 */
function displayHideRecordCheckboxes() {
	if ($w("#hideCheckboxHidden").checked) {
		$w("#hideCheckboxHidden").show();
		$w("#hideCheckboxNotHidden").hide();
	} else {
		$w("#hideCheckboxHidden").hide();
		$w("#hideCheckboxNotHidden").show();
	}
}

/** get artist item from the dataset
 * @return {Artist}
 */
function getArtist() {
	const artist = dataset.getCurrentItem();
	let {gallery, images} = artist;
	if (!gallery || !images) {
		// Must be arrays (and should have been on creation)
		artist.gallery = gallery = gallery || [];
		artist.images = images = images || [];
		dataset.setFieldValues({images, gallery});
	}
	return artist;
}

export function saveButton_click(event) {
	showSpinner({message: 'Saving ...'});
	dataset.save().then(updated => {
		// setErrorMessage('Save succeeded').then(() => {
		to(updated[artistsDisplayPageLinkField]);
		// });
	}).catch(err => {
		const emsg = 'Save failed';
		setErrorMessage(emsg);
		console.error(emsg, err);
	}).finally(_ => stopSpinner());
}

function setErrorMessage(message) {
	clearTimeout(errMsgTimeoutId);
	$w("#errorMessage").text = message;
	$w("#messageStrip").expand();
	return new Promise((resolve, reject) => {
		errMsgTimeoutId = setTimeout(() => {
			$w("#messageStrip").collapse();
			resolve();
		}, 3000);
	})
}

// #region image tables
export function addToPortfolioFromImagesButton_click(event) {
	$w("#porfolioImageTableBox").collapsed 
		? showPortfolioImageTable()
		// .then(_ => {
		// 	$w("#addToPortfolioFromImagesButton").scrollTo()
		// }) 
		: hidePortfolioImageTable();
}

export function artistImageCloseButton_click(event) {
	hideArtistImageTable();
}

function getUnusedImagesForArtistPhoto(startRow, endRow) {
	return new Promise( (resolve, reject) => {
		getUnusedImageRows(resolve, false /*not for portfolio*/)
	});
}

function getUnusedImagesForPortfolio(startRow, endRow) {
	return new Promise( (resolve, reject) => {
		getUnusedImageRows(resolve, true /*for portfolio*/)
	});
}

/** Get rows of images that have not been used in the pertinent context
 * @param {function} resolve - promise resolver
 * @param {boolean} forPortfolio - true if the context is the artist portfolio; false if it's the artist photo
 */
function getUnusedImageRows(resolve, forPortfolio) {
	const artist = getArtist();
	const artistPhotoSlug = getSlug(artist.artistPhoto);
	const { images = [], gallery:portfolio = [] } = artist;
	const rows = images.reduce((result, img) => {
		// If for portfolio, used if in portfolio; if for artist photo, used if matches current artist photo
		const isUsed = forPortfolio ? portfolio.some(port => port.slug === img.slug) : artistPhotoSlug === img.slug;
		if (!isUsed) {
			/** @type {ImageInfoX} */
			const imgX = { ...img }; // clone to prevent WIX table from mutating
			const {slug, filename} = parseWixImageUrl(img.src);
			imgX.alt = imgX.alt || imgX.title;
			imgX.slug = imgX.slug || slug;
			// Added fields
			imgX.image = imgX.src; // table will replace img.image with parsed version; preserve original src
			imgX.name = elipsisText(imgX.title, 60) || elipsisText(filename, 60, true) || '';
			result.push(imgX)
		}
		return result;
	}, [])
	.sort((l, r) => l.name < r.name ? -1 : l.name > r.name ? 1 : 0);
	
	// console.log('rows', rows);

	// resolve to DataRequested object
	resolve({
		pageRows: rows,
		totalRowsCount: rows.length
	});
}

function hideArtistImageTable() {
	const tableBox = $w("#artistImageTableBox");
	if (!tableBox.collapsed) {
		return $w("#innerArtistImageTableBox").hide('roll', { direction: 'top'})
			.then(_ => 	tableBox.collapse()); 
	} else {
		return Promise.resolve();
	}
}

function hidePortfolioImageTable() {
	const tableBox = $w("#porfolioImageTableBox");
	if (!tableBox.collapsed) {
		return $w("#innerPortfolioImageTableBox").hide('roll', { direction: 'top'})
			.then(_ => 	tableBox.collapse()); 
	} else {
		return Promise.resolve();
	}
}

function initializeArtistImageTable() {
	const table = $w("#artistImageTable") ;
	const cols = [
		{id: 'image', dataPath: 'image', label: 'Image', type: 'image', width: 100,  visible: true, },
		{id: 'name', dataPath: 'name', label: 'Name', type: 'string', width: 180, visible: true, },
	];
	table.columns = cols;
	table.dataFetcher = getUnusedImagesForArtistPhoto;
	table.onRowSelect(event => {
		const selectedImg = table.rows[event.rowIndex];
		if (selectedImg) {
			dataset.setFieldValue('artistPhoto', selectedImg.src); 
			refreshArtistImageTable();
		}
	});
}

function initializePortfolioImageTable() {
	const table = $w("#portfolioImageTable") ;
	const cols = [
		{id: 'image', dataPath: 'image', label: 'Image', type: 'image', width: 100,  visible: true, },
		{id: 'name', dataPath: 'name', label: 'Name', type: 'string', width: 200, visible: true, },
	];
	table.columns = cols;
	table.dataFetcher = getUnusedImagesForPortfolio;
	table.onRowSelect(event => {
		const selectedImg = table.rows[event.rowIndex];
		if (selectedImg) {
			addImageToPortfolio(selectedImg.slug);
		}
	});
}

export function portfolioImageCloseButton_click(event) {
	hidePortfolioImageTable();
}

function refreshArtistImageTable() {
	setTimeout(_ => $w("#artistImageTable").refresh(), 10); // for iPad
}

function refreshPortfolioImageTable() {
	setTimeout(_ => $w("#portfolioImageTable").refresh(),10); // for iPad
}

export function setArtistPhotoFromImagesButton_click(event) {
	$w("#artistImageTableBox").collapsed 
		? showArtistImageTable()
		: hideArtistImageTable();
}

function showArtistImageTable() {
	const tableBox = $w("#artistImageTableBox");
	if (tableBox.collapsed) {
		refreshArtistImageTable();
		return tableBox.expand()
			.then(_ => $w("#innerArtistImageTableBox").show('roll', { direction: 'top'})); 
	} else {
		return Promise.resolve();
	}
}

function showPortfolioImageTable() {
	const tableBox = $w("#porfolioImageTableBox");
	if (tableBox.collapsed) {
		refreshPortfolioImageTable();
		return tableBox.expand()
			.then(_ => $w("#innerPortfolioImageTableBox").show('roll', { direction: 'top'})); 
	} else {
		return Promise.resolve();
	}
}
// #endregion image tables

// #region portfolio
/** Add image from artist images to its portfolio.
 * @param {string} slug - that identifies the image in the images
 */
export function addImageToPortfolio(slug) {
	let { artist, portfolio } = moveButtonPramble();
	if (blockAddingToPortfolio(portfolio)) {
		return; 
	}
	const images = artist.images;
	const image = images.find(img => img.slug === slug);
	// Prepend slug-matched image to portfolio if it isn't already in the portfolio
	if (image && portfolio.every(p => p.slug !== slug)) {
		portfolio.unshift(image); // add image to the front of the portfolio.
		updatePortfolio(portfolio);
		refreshPortfolioRepeater(portfolio);
		blockAddingToPortfolio(portfolio); // block if now at the limit
	}
}

/** If number of images in portfolio is at limit, block adding more. If not, remove the block.
 * @param {ImageInfo[]} portfolio
 */
function blockAddingToPortfolio(portfolio) {
	let blocked = false;
	let message = '';
	if (portfolio.length >= maxPortfolioImages) {
		blocked = true;
		message = `The maximum number of images in a portfolio is ${maxPortfolioImages}. Remove some before adding more.`
		$w('#uploadToPortfolioButton').disable();
	} else {
		blocked = false;
		if (blockImageUpload) {
			message = blockImageUploadMsg;
		} else {
			$w('#uploadToPortfolioButton').enable();
			if (portfolio.length === 0) {
				message = 'No images in your portfolio. Why not add some?'
				$w("#portfolioRepeater").collapse();
			} else {
				message = '';
				$w("#portfolioRepeater").expand();
			}
		}
	}
	setPortfolioChangeMessage(message);
	return blocked;
}

export function closePortfolioEditBox(event) {
	let $item = $w.at(event.context);
	$item('#portfolioEditBox').hide('fade', { duration: 500 });
}

export function editButton_click(event) {
	const $item = $w.at(event.context);
	$item('#portfolioEditBox').show('fade', { duration: 500 }).then(_ => $item("#portfolioImageTitleInput").focus());
}

function initializePortfolioRepeater() {
	portfolioRepeater = $w("#portfolioRepeater");
	portfolioRepeater.onItemReady(($item, /** @type ImageInfoX */ itemData, index) => {
		$item('#imageContainer').background.src = itemData.src;
		$item('#filenameText').text = elipsisText(itemData.filename, 40, true);
		const title = itemData.title.trim();
		$item('#titleText').text = $item('#portfolioImageTitleInput').value = title;
		title ? $item('#editInstruction').collapse() : $item('#editInstruction').expand();
	});
	refreshPortfolioRepeater();
}

function moveButtonPramble(event) {
	const artist = getArtist();
	const portfolio = artist.gallery;
	const itemCount = portfolio.length;

	const clickedId = event ? event.context.itemId : '';
	const items = portfolioRepeater.data;
	const ix = clickedId ? items.findIndex(img => img._id === clickedId) : -1;
	return { artist, items, itemCount, ix, portfolio };
}

export function moveDownButton_click(event) {
	const { items, itemCount, ix, portfolio } = moveButtonPramble(event);
	if (ix > -1 && ix < itemCount - 1) {
		let moved = portfolio[ix];
		portfolio[ix] = portfolio[ix + 1];
		portfolio[ix + 1] = moved;
		updatePortfolio(portfolio);

		moved = items[ix];
		items[ix] = items[ix + 1];
		items[ix + 1] = moved;
		portfolioRepeater.data = items;
		setAllUpDownButtons();
	}
}

export function moveUpButton_click(event) {
	const { items, ix, portfolio } = moveButtonPramble(event);
	if (ix > 0) {
		let moved = portfolio[ix];
		portfolio[ix] = portfolio[ix - 1];
		portfolio[ix - 1] = moved;
		updatePortfolio(portfolio);

		moved = items[ix];
		items[ix] = items[ix - 1];
		items[ix - 1] = moved;
		portfolioRepeater.data = items;
		setAllUpDownButtons();
	}
}

export function portfolioImageTitleInput_change(event) {
	/** @type {string} */
	const title = event.target.value = (event.target.value || '').trim();
	const items = portfolioRepeater.data;
    const item = items.find(item => item._id === event.context.itemId);
	if (item.title !== title) {
		const { gallery: portfolio, images } = getArtist();
		const port = portfolio.find(p => p.slug === item.slug);
		const img = images.find(img => img.slug === item.slug);
		if (port || img) {
			// This part is crazy. Consider switching to a dedicated dataset for the portfolio repeater
			port.alt = port.title = title;
		    img.alt = img.title = title;
			item.alt = item.title = title;
			portfolioRepeater.data = items;
			portfolioRepeater.forItems([item._id], $item => {
				$item('#titleText').text = title;
				title ? $item('#editInstruction').collapse() : $item('#editInstruction').expand();
			});
			dataset.setFieldValues({ gallery: portfolio, images });
		}
	}
}

export function portfolioImageTitleInput_keyPress(event) {
	if (event.key === 'Enter') {
		// Note: unable (as yet) to defeat the "cannot read properties of null (reading 'click')" error in the console
		// which is annoying to me but has no apparent ill effect.
		closePortfolioEditBox(event);
	}
}

/** Refresh the Portfolio Repeater based on current state of the artist's portfolio images.
 * Maps from portfolio images to the repeater's image format and sets the up/down buttons
 * @param {ImageInfo[] | null | undefined} [portfolio] - artist's portfolio images. If missing, get from the artist data.
 */
function refreshPortfolioRepeater(portfolio) {
	portfolio = portfolio || getArtist().gallery;
	// console.log('portfolio', portfolio);
	const items = portfolio.map(toPortfolioImage)
	// console.log('image items', items);
	portfolioRepeater.data = items;
	setAllUpDownButtons();
}

export function removeButton_click(event){
	let { items, ix, portfolio } = moveButtonPramble(event);
	portfolio = portfolio.filter((_, i) => i != ix);
	updatePortfolio(portfolio);
	blockAddingToPortfolio(portfolio); // will unblock if removing image freed room for more

	items = items.filter((_, i) => i != ix);
	portfolioRepeater.data = items;		
	setAllUpDownButtons();
}

export function portfolioDisplaySelect_change(event) {
	const value = $w("#portfolioDisplaySelect").value;
	setPortfolioDisplay(value)
	dataset.setFieldValue("galleryDisplayType", value);
}

function setPortfolioDisplay(value) {
	if (value === MosaicArtistPortfolioDisplayType) {
		$w("#thumbnailsGallery").collapse();
		$w("#mosaicGallery").expand();
	} else {
		$w("#thumbnailsGallery").expand();
		$w("#mosaicGallery").collapse();	
	}
}

function setAllUpDownButtons() {
	const count = portfolioRepeater.data.length;
	portfolioRepeater.forEachItem(($item, itemData, index) => {
		setUpDownButtons($item, index, count);
	});	
}

function setUpDownButtons($item, index, itemCount) {
	index < itemCount - 1 ? $item('#moveDownButton').enable() : $item('#moveDownButton').disable();
	index > 0 ? $item('#moveUpButton').enable() : $item('#moveUpButton').disable();
}

/** Convert image from gallery/portfolio to an image in the portfolio repeater 
 * @param {ImageInfo} image - portfolio image
 * @returns {ImageInfoX}
*/
function toPortfolioImage(image) {
	/** @type {ImageInfoX} */
	const img = { ...image }; // clone to avoid mutating original
	const {slug, filename} = parseWixImageUrl(img.src);
	img.alt = img.alt || img.title;
	img.description = img.description || '';
	img.slug = img.slug || slug;
	img.title = img.title || ''
	// Added fields for display
	img._id = img.slug.replace(/[^a-zA-Z0-9-]/g, '-'); // convert to valid repeater id
	img.filename = filename;
	return img;
}

/** Update the portfolio in the dataset 
 * @param {object[]} portfolio;
 */
function updatePortfolio(portfolio) {
	dataset.setFieldValue('gallery', portfolio);
	refreshPortfolioImageTable();
}

export function uploadToPortfolioButton_focus(event) {
	hidePortfolioImageTable();
}
// #endregion portfolio

// #region upload image

/** Guard against uploading more than allowed images 
 * @param {number} [imageCount] - count of artist images (all images uploaded for this artist)
*/
function maxUploadsGuard(imageCount) {
	if (imageCount >= maxImageUploads) {
		blockImageUpload = true;
		$w("#uploadArtistPhotoButton").disable();
		$w("#uploadToPortfolioButton").disable();
		setArtistPhotoChangeMessage(blockImageUploadMsg);
		setPortfolioChangeMessage(blockImageUploadMsg);
	}
}

/** Set and display the artist change message
 * @param {string} message
 */
function setArtistPhotoChangeMessage(message) {
	setImageChangeMessage($w('#artistPhotoChangeMessage'), message);
}

/** Set and display the artist change message
 * @param {string} message
 */
function setPortfolioChangeMessage(message) {
	setImageChangeMessage($w('#portfolioChangeMessage'), message);
}

/** Set and display the pertinent image change message
 * @param {$w.Text} messageEl
 * @param {string} message
 */
function setImageChangeMessage(messageEl, message) {
	message = (message || '').trim();
	messageEl.text = message;
	if (message) {
		messageEl.expand().then(_ => messageEl.show('fade'));
	} else {
		messageEl.hide('fade').then(_ => messageEl.collapse);
	}
}

export function uploadArtistPhotoButton_change(event) {
	const uploadButton = $w("#uploadArtistPhotoButton");
	const preloader = $w("#artistPreloaderBox");
	uploadImage(uploadButton, preloader, setArtistPhotoChangeMessage, 'The Artist').then(result => {
		if (result) {
			const {fileUrl, images} = result;
			dataset.setFieldValues({artistPhoto: fileUrl, images});
			refreshArtistImageTable(); // to add previous image
			refreshPortfolioImageTable(); // to add previous image 
		}
	});
}

export function uploadArtistPhotoButton_focus(event) {
	hideArtistImageTable();
}

export function uploadToPortfolioButton_change(event) {
	const uploadButton = $w("#uploadToPortfolioButton");
	const preloader = $w("#portfolioPreloaderBox");
	uploadImage(uploadButton, preloader, setPortfolioChangeMessage, '').then(result => {
		if (result) {
			const {image, images} = result;
			// update artist's portfolio
			const portfolio = getArtist().gallery;
			portfolio.unshift(image);
			dataset.setFieldValues({gallery: portfolio, images});
			blockAddingToPortfolio(portfolio); // block if at the limit

			refreshPortfolioRepeater(portfolio);

			$w("#artistImageTable").refresh(); // new image is available to become the artist photo
		}
	});
}

/** Upload image to the server; return that image and the Artist images array returned by the server.
 * Only upload one image at a time.
 * @param {$w.UploadButton} uploadButton
 * @param {$w.Box} preloader - WIX box holding the upload spinner.
 * @param {(message)=> void} setMessage - fn to set message for errors or info
 * @param {string} [title] - optional title for the image.
 * @returns {Promise<UploadedImageResult | null>} - Promise of new image result data or null if didn't upload
 */
function uploadImage(uploadButton, preloader, setMessage, title) {
	if (uploadButton.value.length > 0) {
		preloader.show('fade');
		const fileInfo = uploadButton.value[0]; // only upload one at a time.
		uploadButton.disable();

		return uploadButton.uploadFiles()
			.catch(uploadError => {
				const {errorCode, errorDescription} = uploadError;
				const emsg = `Upload failed: (${errorCode}) ${errorDescription}`
				return Promise.reject(emsg);
			})
			.then(uploadedFiles => {
				const artist = getArtist();
				return createAndSaveNewImage(artist, fileInfo, uploadedFiles[0], title).then(_ => {
					maxUploadsGuard(artist.images.length);
				});
			})
			.catch(err => {
				if (typeof err === 'string') {
					setMessage(err);
				} else {
					const emsg = "Something went wrong uploading the photo";
					setMessage(emsg);
					console.error(emsg, err);
				}
				return Promise.resolve(null);
			})
			.finally(() => {
				preloader.hide('fade');
				uploadButton.enable();
			})
	} else {
		// Don't know how can get here because cancel doesn't call this change method
		return Promise.resolve(null);
	}
}

// #endregion upload image
