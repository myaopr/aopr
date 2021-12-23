/** Type Definitions shared across this site */

/** @typedef {object} Artist
 * @property {string} _id - id of the Artist Gallery record
 * @property {string} _owner
 * @property {string} artistPhoto - url of the artist's photo
 * @property {boolean} blocked - artist is blocked from display and edit
 * @property {boolean} hidden - hide this artist record from the public gallery
 * @property {ImageInfo[]} images - all images uploaded by the artist ever. They're all in the Media Manager
 * @property {ImageInfo[]} gallery - all images in the artist's portofolio
 * @property {string} galleryDisplayType - how to present the portfolio on the display page
 * @property {string} name - full name
 * @property {string} title - ex: Photographer
 */

 /** @typedef {MemberInfo & ArtistMemberExtension} ArtistMemberInfo
  * 
  * @typedef {object} ArtistMemberExtension;
  * @property {boolean} [canAdd] - true if member can add record for this member to the Artists Gallery
  * @property {object} defaultFilter - default filter of Artist Gallery items for WIX datasets
  */

/** @typedef {object} ImageInfo - for an item in a WIX Media Manager field
 * @property {string} alt - the alt attribute for accessibility
 * @property {string} description - of the image
 * @property {object} settings
 * @property {string} slug - WIX's unique identifier of the image
 * @property {string} src - the WIX image uri
 * @property {string} title - of the image
 * @property {string} type - should be 'image'
 */

/** @typedef {object} MemberInfo
 * @property {string} id - id of the member which should be the _owner for records owned by this member.
 * @property {boolean} isAdmin - true if member has admin role or if siteOwner
 * @property {boolean} isApproved - true if the member status is known to be "APPROVED"
 * @property {boolean} isLoggedIn - true if member is currently logged-in.
 * @property {boolean} isSiteOwner - true if this member is the site owner (MyAopr)
 * @property {object} member - data from the WIX getMember() function.
 * @property {string} name - member nickname
 * @property {MemberRole[]} [roles] - members roles
 * @property {boolean} [error] - if there was an error getting the member (that would have been reported during the fetch)
 */ 

 /** @typedef {object} MemberRole
 * @property {string} _id - Role Id
 * @property {string} title - Role name as defined in the site's Member Permissions page or one of "Admin" or "Member".
 * @property {string} [description] - Role description, if defined in the site's dashboard.
 * @property {Date} [_createdDate] - Date and time the role was created.
 */ 

/** @typedef {object} NextPrev
 * @property {Artist | null} next
 * @property {Artist | null} previous
 */

 /** @typedef {object} SpinnerLightboxOptions
 * @property {string} [message] - message to display in spinner 
 * @property {number} [safetyTimeout] - safety timeout override in case spinner/closer doesn't close [not sure it works]
 * @property {number} [timeout] - timeout override for closer
 */

/** @typedef {object} UploadedImageResult - Result of uploading an Artist image to the server. See createAndSaveNewImage()
 * @property {string} fileUrl - the url from the result of thethe WIX uploadFiles(), needed for ArtistPhoto
 * @property {ImageInfo} image - the new image as it should be in a Media Manager field such as `gallery` or `images`
 * @property {ImageInfo[]} images - the array of all images uploaded by this artist, including the new image.
 */
 export const pi = 3.1416; // need to export *something* concrete to make this file available
