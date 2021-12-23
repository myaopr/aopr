/***************
 backend/data.js
 ***************

 'backend/data.js' is a reserved Velo file that enables you to create data hooks.

 A data hook is an event handler (function) that runs code before or after interactions with your site's database collections. 
 For example, you may want to intercept an item before it is added to your collection to tweak the data or to perform a final validation.

 ---
 More about Data Hooks: 
 https://support.wix.com/en/article/velo-about-data-hooks

 Using Data Hooks: 
 https://support.wix.com/en/article/velo-using-data-hooks

 Unit Testing Data Hooks:
 https://support.wix.com/en/article/velo-functional-testing-in-the-backend

 API Reference: 
 https://www.wix.com/velo/reference/wix-data/hooks

***************/

import wixData from 'wix-data';

import { siteOwnerId, ThumbnailsDisplayType } from 'public/constants';
import { updateImages } from 'public/images';

/**  
 * @typedef {import('public/type-defs.js').Artist} Artist
 * @typedef {wix_data.Hooks.HookContext} HookContext
 * @typedef {wix_data.Hooks.UpdateHookContext} UpdateHookContext
 */

/** Intercept Artists inserts before it starts
 * Ensure (a) user logged in, (b) insert is by this regular user or admin user, (c) there are no existing artist records for this user if non-admin. 
 * @see https://www.wix.com/velo/reference/wix-data/hooks/beforeinsert
 * @param {Artist} artist - the artist record from the client
 * @param {HookContext} context 
 * @returns {object | Promise<any>} The artist record or a promise of the artist record
 */
export function Artists_beforeInsert(artist, context) {
    const userId = context.userId;
    const admin = isAdmin(context);

    const err = cleanArtistData(artist, context);
    if (err) {
        return Promise.reject('Artist insert rejected because ' + err);
    } else if (!userId || artist._owner !== userId ) {
        return Promise.reject('User not logged in or is not the Artist record _owner');
    } else if (admin) {
        return artist; // admin can always insert, even if no name (but will have to provide a name to update)
    } else if (!artist.name) { 
        return Promise.reject('Artist name cannot be empty');
    } else { // only one artist record can be owned by a regular user
        return wixData.query('Artists').eq('_owner', userId).count().then(count => 
            count === 0 ? artist : Promise.reject('User already has an Artists Gallery record')
        );
    }
}

/** Intercept Artists insert before it starts
 * @param {Artist} artist - the artist record from the client
 * @param {UpdateHookContext} context 
 * @returns {Artist | Promise<Artist>} The artist record or a promise of the artist record
 */
export function Artists_beforeUpdate(artist, context) {
    // console.warn('Artists_beforeUpdate begins:', artist, context);

    const currentArtist = context.currentItem;
    const admin = isAdmin(context)
    if (currentArtist.blocked && !admin) {
        return Promise.reject('Artist blocked; contact info@artsofpointrichmond.com.');
    }
    const err = cleanArtistData(artist, context);
    if (err) {
        return Promise.reject('Artist update rejected because ' + err);
    } else 
    if (!artist.name) {
        return Promise.reject('Artist name cannot be empty');
    } else {
        // When updating, ensure that we keep the current images that are not in the updating artist images.
        // Cannot delete from images through artist update UNLESS you are an ADMIN
        if (!admin) {
            artist.images = updateImages(currentArtist.images, artist.images);
        }

        // TODO: Run this to force a change in the ownerId
        // Make any trivial change to the corresponding artist to invoke it
        // When make a change, be sure to publish. Look at Site Log for the effect
        // forceOwnerToMemberId(artist, context, 'Dee Bell', '39743db8-c19b-434b-92e4-e5736b24b1b4'); // set Dee's artist record to her memberId

        // TODO: DELETE OR COMMENT OUT THIS TEST
        // testOwnerOverride(artist, context);

        return artist;
    }
}

/** Clean up and validate the artist record, ensuring that all of its fields have the correct shape and essential values. 
 * Validate the artist as well; return error message if it fails validation.
 * @param {Artist} artist
 * @param {HookContext} context 
 * @returns {string} invalid artist error message if artist failed validation
*/
function cleanArtistData(artist, context) {
    artist.blocked = artist.blocked == null ? false : artist.blocked;
    artist.gallery = artist.gallery || [];
    artist.galleryDisplayType = artist.galleryDisplayType || ThumbnailsDisplayType;
    artist.hidden = artist.hidden == null ? true : artist.hidden;
    artist.images = artist.images || [];
    artist.name = artist.name ? artist.name.trim() : '';
    artist.title = artist.title ? artist.title.trim() : '';
    artist.website = artist.website ? artist.website.trim() : null;
    // No validations at this time.
    return null;
}

/** Is the current user an admin according to userRole in the
 * @see https://www.wix.com/velo/reference/wix-data/hooks/beforeupdate
 * @param {HookContext} context - hook context
 * @returns {boolean}
 */
function isAdmin(context) {
    const { userId, userRole } = context;
    return userRole === 'siteOwner' || userId === siteOwnerId;
}

/** Force the current artist record's owner to be the given memberId if it matches the artist name.
 * Must be signed in as the siteOwner
 * To run it, uncomment this call in the before_update then
 * make any trivial change to the corresponding artist to invoke it
 * TODO: should query and patch. Unlikely to use this often
 * @param {Artist} artist
 * @param {HookContext} context
 * @param {string} artistName - name to match
 * @param {string} artistMemberId - member ID for the owner of this record. Should be the member Id of the artist!
 * @returns the artist record
 */
function forceOwnerToMemberId(artist, context, artistName, artistMemberId) {
    // console.warn(`forceOwnerToMemberId begins. artist.name: ${artist.name}, artistName: ${artistName}, memberId: ${artistMemberId}, userId is siteOwner: ${context.userId === siteOwnerId}`, 
    //     artist, context, artistName, artistMemberId);

    if (artist.name === artistName && context.userId === siteOwnerId) { 
        artist._owner = artistMemberId;
        // Should show in the Site Log
        console.warn(`forceOwnerToMemberId - Forced ownerId of ${artistName} to ${artistMemberId}`);
    } 
    return artist;
}

/** Playing around in anticipation of fixing the _owner of some Artist Gallery collection records.
 * during the transition. 
 * Delete when done.
 * @param {Artist} artist
 * @param {HookContext} context
 * @returns the artist record
 */
function testOwnerOverride(artist, context) {
    if (artist._owner === '') {
        setItemOwnerToCurrentUser(artist, context) 
    } else if (artist.name === 'xxx') {
        artist.name = artist.name.toUpperCase();
        artist._owner = '';
    }
    return artist;

    /** Overwrite the artist record's owner id with the current user's id.
     * Note that it is not necessary to suppress authorization in this backend code.
     * @param {Artist} artist
     * @param {HookContext} context
     */
    function setItemOwnerToCurrentUser(artist, context) {
        artist._owner = context.userId;
    }
}
