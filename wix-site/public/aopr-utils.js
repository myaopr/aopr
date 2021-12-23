import { currentMember } from 'wix-members';
import { openLightbox, viewMode } from 'wix-window';
import wixData from 'wix-data';
import wixLocation from 'wix-location';
import wixStorage from 'wix-storage';

import { artistGalleryCollectionName, siteOwnerId } from 'public/constants';

 /** @typedef {import('public/type-defs.js').ArtistMemberInfo} ArtistMemberInfo
  * @typedef {import('public/type-defs.js').MemberInfo} MemberInfo
  * @typedef {import('public/type-defs.js').MemberRole} MemberRole
  * @typedef {import('public/type-defs.js').SpinnerLightboxOptions} SpinnerLightboxOptions
  */

/** Default WIX dataset filter for non-logged-in visitors of the artist gallery */
export const artistGalleryDefaultFilter = wixData.filter().ne('hidden', true).ne('blocked', true);

/** Constrain text to maxLength, appending elipsis unless inMiddle is true in which case put elipsis in the middle
 * @param {string} text - to constrain
 * @param {number} maxLength - of allowed result
 * @param {boolean} [inMiddle] - true if elipsis goes in the middle, else at the end (default)
 * @returns {string}
 */
export function elipsisText(text, maxLength, inMiddle) {
    if (!text) {
        return '';
    } else if (text.length <= maxLength) {
        return text;
    } else if (inMiddle) {
        const middle = Math.ceil(maxLength / 2);
        return text.substring(0, middle) + '...' + text.substring(text.length - (middle - 4));
    } else {
        return text.substring(0, maxLength - 3) + '...';
    }
}

/** Get info about the current signed in member
 * If fails to get member, returns the default, not-logged-in, memberInfo with error: true.
 * @returns {Promise<MemberInfo>} of MemberInfo
 */
export function getMemberInfo() {
    // default, not-logged-in
    // @type {MemberInfo}
    let memberInfo = {
        id: '',
        isAdmin: false,
        isApproved: false,
        isLoggedIn: false,
        isSiteOwner: false,
        member: undefined,
        name: '',
        roles: [],
        error: false,
    };
    if (viewMode === 'Preview') {
        // console.warn('Cannot get current member in Preview Mode ("Ambassador client"); continuing as not-logged-in.');
        // memberInfo.isAdmin = true; // depending on testing scenarios
        return Promise.resolve(memberInfo);
    } else {
        return currentMember.getMember({fieldsets: ['FULL']})
        .then(member => {
            // console.warn('** RETURN from currentMember.getMember', member);
            if (member) {
                const id = member._id;
                const isSiteOwner = id === siteOwnerId;
                memberInfo = Object.assign(memberInfo, {
                    isLoggedIn: true,
                    member,
                    name: member.profile.nickname || '',
                    id,
                    isAdmin: isSiteOwner,
                    isApproved: member.status === 'APPROVED',
                    isSiteOwner,
                    // Roles: TODO. get them
                    error: false,  
                });
                return currentMember.getRoles().then(
                    roles => {
                        memberInfo.roles = roles;
                        memberInfo.isAdmin = isSiteOwner || roles.some(r => r.title === 'Admin');
                        return memberInfo;
                    },
                    err => memberInfo // TODO: report error.
                )
            }
            return memberInfo;
        })
        .catch(err => {
            console.error(`Failed to fetch currentMember`, err);
            memberInfo.error = true;
            return memberInfo;
        }); 
    }
}


/** Get MemberInfo about the current signed in member, extended with info needed in Artist Gallery 
 * Sets the artist gallery defaultFilter based on member permissions
 * @returns {Promise<ArtistMemberInfo>}
 */
export function getArtistMemberInfo() {
    return getMemberInfo().then(mi => {
        /** @type ArtistMemberInfo */
        let memberInfo = { ...mi, canAdd: false, defaultFilter: artistGalleryDefaultFilter };
        const id = mi.id;
        if (!id) {
            // console.warn('Cannot add because not logged in');
            return memberInfo;
        } else if (memberInfo.isSiteOwner) {
            /** @type {any} */
            memberInfo.defaultFilter  = wixData.filter(); // siteOwner sees all but cannot add within this UI
            return memberInfo;
        } else { 
            // extend the filter to include the owner's own item even if it is hidden or blocked
            memberInfo.defaultFilter = artistGalleryDefaultFilter.or(wixData.filter().eq('_owner', id));
            return wixData.query(artistGalleryCollectionName).eq('_owner', id).count().then(
                c => { 
                    memberInfo.canAdd = c === 0;
                    // console.warn(`Can add is ${memberInfo.canAdd} because count is ${c}`);
                    return memberInfo;
                },
                err => {
                    console.error(`Artist Gallery failed to get count for member ${id}`, err);
                    return memberInfo;
                }
            )
        }
    });   
}

/** Get the link to the previous page.
 * The information about the previous page is in Session storage under the 'pageInfo' key.
 * That value is maintained by masterPage.js
 * @param {string} [targetElementId] - optional WIX element id for target of "#" reference (the hash)
 * @param {string} [defaultUrl] - where to go if the back location cannot be determined. Defaults to HOME.
 * @returns {string} the back link for navigation by wixLocation.to()
 */
export function getBackLink(targetElementId, defaultUrl) {
    defaultUrl = defaultUrl || '/home';
    if (viewMode === 'Preview') {
        return defaultUrl;
    } else {
        /** @type {string} */
        const pi = wixStorage.session.getItem('pageInfo');
        /** @type {{current?: string, previous?: string}} */
        let pageInfo;
        try {
            pageInfo = JSON.parse(pi || '{}');
        }
        catch {
            pageInfo = {};
        }
        const link = pageInfo.previous;
        return link 
            ? link + (targetElementId ? `#${targetElementId}` : '') 
            : defaultUrl;
    }
}
/** Navigates via link from getBackLink
 * @param {string} [targetElementId] - optional WIX element id for target of "#" reference (the hash)
 * @param {string} [defaultUrl] - where to go if the back location cannot be determined
 */
export function goBack(targetElementId, defaultUrl) {
    const link = getBackLink(targetElementId, defaultUrl) 
    wixLocation.to(link);
}

/** Show the spinner lightbox
 * @param {SpinnerLightboxOptions} [options] 
 * @returns {Promise<object>} - Resolved when lightbox closed; the data object is irrelevant.
 */
export function showSpinner(options) {
    return openLightbox('Spinner', options);
}

/** Close  the spinner lightbox 
 * @param {SpinnerLightboxOptions} [options]
 * @returns {Promise<object>} - Resolved when lightbox closed; the data object is irrelevant.
*/
export function stopSpinner(options) {
    // Trick: WIX allows only one lightbox at a time
    // "LightboxCloser" is a do nothing lightbox that closes itself as soon as possible
    return openLightbox('LightboxCloser', options);
}
