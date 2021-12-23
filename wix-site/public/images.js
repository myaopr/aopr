// Filename: public/images.js
// WIX image utilities

import { updateArtistImagesOnServer } from 'backend/artist-gallery';

/**
 * @typedef {import('public/type-defs.js').Artist} Artist
 * @typedef {import('public/type-defs.js').ImageInfo} ImageInfo
 * @typedef {import('public/type-defs.js').UploadedImageResult} UploadedImageResult
 */


/** Create the WIX image from file upload data and save it on the server.
 * Don't wait and don't worry if save fails. Do report error to browser console.
 * @param {Artist} artist;
 * @param {$w.UploadButton.File} fileInfo - about the file the user selected
 * @param {$w.UploadButton.UploadedFile} uploadedFile - about the file after it was uploaded successfully to WIX server
 * @param {string} [title] - optional title for the image;
 * @returns Promise<{UploadedImageResult}> - uploaded image result data
 */
export function createAndSaveNewImage(artist, fileInfo, uploadedFile, title) {
	const uri = createImageUriFromFileInfo(fileInfo, uploadedFile);
	const image = createImageInfoFromUrl(uri, title || ''); 

	const images = [image].concat(artist.images);

	// Save these images as a side-effect. Don't wait and don't worry if fails.
	updateArtistImagesOnServer(artist._id, images).catch(err => {
		console.error('createAndSaveNewImage() - ' + err);
	});

    /** @type {UploadedImageResult} */
    const result = {fileUrl: uploadedFile.fileUrl, image, images};

	return Promise.resolve(result);
}


/** Create an ImageInfo object from a WIX image uri 
 * @param {string} uri - WIX image uri
 * @param {string} [title] - value for title and alt
 * @returns {ImageInfo}
*/
export function createImageInfoFromUrl(uri, title) {
	const parsed = parseWixImageUrl(uri);
	if (parsed) {
		return {
			alt: title || '',
			description: '',
			settings: {},
			slug: parsed.slug,
			src: uri,
			title: title || '',
			type: 'image',
		};
	} else {
		return null;
	}
}

/** create the WIX image file uri from file upload data
 * @param {$w.UploadButton.UploadedFile} uploadedFile - about the file after it was uploaded successfully to WIX server
 * @param {$w.UploadButton.File} fileInfo - about the file the user selected
 * @returns {string} Image uri in the expected format such as 
 * 'wix:image://v1/5877c2_c965621a7a4e44cb9e74597954bb9132~mv2.png/self-portrait.png#originWidth=755&originHeight=586'
 */
function createImageUriFromFileInfo(fileInfo, uploadedFile) {
	const {fileName:uploadedFileName, height, fileUrl, width} = uploadedFile;
	const baseUri = `${fileUrl.match(/(.*v.\/)/)[1]}${uploadedFileName}`;
	const prefix = baseUri.startsWith('image:') ? 'wix:' : ''; // prepend "wix:" if missing
	const uri = `${prefix}${baseUri}/${fileInfo.name}#originWidth=${width}&originHeight=${height}`;
	return uri;
}

/** Return "slug" from url if it's a WIX Image, else empty string
 * @param {string} url
 * @returns {string}
 */
export function getSlug(url) {
	const parsed = parseWixImageUrl(url);
	return parsed ? parsed.slug : '';
}

/** parse WIX image url to get slug and original file name
 * @param {string} url
 * @returns {{slug: string, filename: string}} or null if no match
 * The filename will be '' if there was no filename in the url.
 * WIX knows the filename but we won't.
 */
export function parseWixImageUrl(url) {
	// convert escaped ~ (7E) to ~.
	// https://static.wixstatic.com/media/1bf8c6_4bbf92a696854fe6a10bb18c7b5d392f%7Emv2.png  ... convert to
    // https://static.wixstatic.com/media/1bf8c6_4bbf92a696854fe6a10bb18c7b5d392f~mv2.png 
	url = url.replace(/%7E/i, '~'); 

    /** RegEx that matches all known styles of wix immage representation */
	const wixRE = /.*(?:image:\/\/v.?\/|wixstatic\.com\/media\/)([a-zA-Z0-9_~]*)\.[\w]*\/?([^#]*)?/;
	// [0] matched string
	// [1] slug (with ~ ... to be removed) 
	// [2] the filename if included ... else undefined

    // Examples:
	// image://v1/5877c2_e5ec955720e74789aadc774513067c21~mv2.jpeg
	// wix:image://v1/5877c2_e5ec955720e74789aadc774513067c21~mv2.jpeg
	// wix:image://v1/5877c2_e5ec955720e74789aadc774513067c21~mv2.jpeg/grand-canyon-sunrise.jpeg#originWidth=698&originHeight=698
	// https://static.wixstatic.com/media/5877c2_35756317067e4267a8366e414c75dc5c~mv2.jpg

	// Give up on anything that doesn't match such as web references like
	// https://graph.facebook.com/10226269010370791/picture?type=large
	// These are displayable but are not stored in WIX Media Manager

	const match = url.match(wixRE);
	if (match) {
		const slug = (match[1] || '').replace(/~/g,''); // omit the '~' char from the slug.
		return {slug, filename: match[2] || ''};
	} else {
		return null; // no match; not a WIX image
	}	
}

/** Return the *updated union* of the new/replacement images and the artist's current images.
 * @param {ImageInfo[]} currentImages - the images from the existing artist record.
 * @param {ImageInfo[]} newImages - the new/replacement images, usually from the client.
 * @returns {ImageInfo[]} The union of the two with new images superceding the old.
 */
export function updateImages(currentImages, newImages) {
    currentImages = currentImages || [];
    if (!newImages || !Array.isArray(newImages) || newImages.length === 0) {
        return currentImages; // nothing to add/update. Preserve current images.
    }
    let notFound = [...currentImages]; // current images that have not yet been not found in the new images.
    newImages.forEach((newImg, ix) => {
        if (!newImg.slug || !newImg.src) {
            console.error(`updateImages() error: newImages[${ix}] is not a proper image.`);
        } else {
            const oldImg = currentImages.find(i => i.slug === newImg.slug);
            if (oldImg) {
                // new image was found in current; remove from `notFound` array
                notFound = notFound.filter(i => i !== oldImg ); 
            }
        }
    })
    // combine new images with the current ones that were not found.
    const result = newImages.concat(notFound); 
    return result;
}