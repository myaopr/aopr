import { ok, notFound, forbidden, next, redirect  } from 'wix-router';
import { artistsDisplayPageLinkField } from 'public/constants';

/** 
 * https://www.wix.com/velo/reference/wix-router/wixrouterrequest
 * @typedef {wix_router.WixRouterRequest} WixRouterRequest
 * 
 * https://www.wix.com/velo/reference/wix-router/wixrouterresponse
 * @typedef {wix_router.WixRouterResponse} WixRouterResponse
 * 
 * https://www.wix.com/velo/reference/wix-router/wixrouterresponse/head
 * @typedef {wix_router.WixRouterResponse.HeadOptions} HeadOptions
 */
/**
 * @typedef {import('public/type-defs.js').Artist} Artist
 */

/** AfterRouter interceptor for all pages with routes beginning 'artistgallery'
 * 
 * IMPORTANT: Router code is NOT called for page launched in EDITOR PREVIEW!
 * Navigate away and then back to invoke router method.
 * @param {WixRouterRequest} request
 * @param {WixRouterResponse} response
 * @return {WixRouterResponse | Promise<WixRouterResponse>}
 */
export function artistgallery_afterRouter(request, response) {
    // console.info('*** artistgallery_afterRouter', request, response);
    // Ex: /artistgallery/edit/bob-colin/29ff347e-6c0b-4e71-8286-1f6ed858ce3d
    // path = ['edit', 'bob-colin', '29ff347e-6c0b-4e71-8286-1f6ed858ce3d'], prefix = 'artistgallery'
    const {path, prefix} = request;
 
    if (response.status === 404 && !!path[0]) { // going somewhere other than the 'Display All' page.
        // Old link? The artist gallery record was likely removed by an Admin.
        const redirectUrl = `${prefix}`; // to  Display all artists
        console.warn(`artistgallery_afterRouter - routing to '${path.join('/')}' is forbidden because not found; redirecting to '${redirectUrl}'`);
        return redirect(redirectUrl)
    } else if (path[0] === 'edit') {
        return artistgallery_edit_afterRouter(request, response, 'artistgallery_afterRouter');
    } else {
        return response;
    }
}

/** AfterRouter interceptor for the artist gallery edit page.
 * NOT called directly because routers only work for the base prefix (e.g. artstgallery
 * This method is called indirectly via artistgallery_afterRouter. Exported only for testing.
 * 
 * Relying on the afterRouter because the artist data (needed for validity checks) 
 * are not available in beforeRouter (there is no response argument).
 * 
 * IMPORTANT: Router code is NOT called for page launched in EDITOR PREVIEW!
 * Navigate away and then back to invoke router method.
 * 
 * WILL NOT REROUTE in editor preview mode. Verify rerouting logic with a test site.
 * @param {WixRouterRequest} request
 * @param {WixRouterResponse} response
 * @return {WixRouterResponse | Promise<WixRouterResponse>}
 */
 export function artistgallery_edit_afterRouter(request, response, caller) {
    const methodName = 'artistgallery_edit_afterRouter';
    // Ex: /artistgallery/edit/bob-colin/29ff347e-6c0b-4e71-8286-1f6ed858ce3d
    // path = ['edit', 'bob-colin', '29ff347e-6c0b-4e71-8286-1f6ed858ce3d'], prefix = 'artistgallery'
    const {path, prefix, user} = request;
    const artistPath = path[1] + '/' + path[2];
    const userId = user ? user.id : '<none>'; // The user is an Admin in Editor Preview.
    const userRole = user ? user.role: 'not logged in';
    const status = response.status;
    // console.info(`**** ${methodName} called (status: ${status} for artist '${artistPath}' by user ${userId} (${userRole}) ${caller ? 'within ' + caller : 'by itself'}`);
    if (status === 200) {
        /** @type {Artist} */
        const artist = response.data && response.data.items ? response.data.items[0] : undefined;
        // console.info(`${methodName} response item`, artist);
        const reason = !artist ? 'no artist record in the response' 
           : artist._owner !== userId && userRole !== 'Admin' ? 'user is not the owner of the artist record nor an admin' 
           : artist.blocked ? 'the artist record is blocked'
           : '';
        if (reason) {
            if (isPreviewMode(request)) {
                console.warn(`${methodName} - Editing '${artistPath}'' is forbidden because ${reason}.`);
                // can't redirect successfully in Preview Mode
                return forbidden(reason); 
            } else {
                const redirectUrl = (artist && artist[artistsDisplayPageLinkField]) || `${prefix}`;
                console.warn(`${methodName} - Editing '${artistPath}'' is forbidden because ${reason}; redirecting to '${redirectUrl}'`);
                return redirect(redirectUrl); 
            }
        } else {
            return response;
        }
    } else {
        return response;
    }
}

/** 
 * @param {wix_router.WixRouterRequest} request
 * @returns {boolean} true if running Wix Preview
*/
function isPreviewMode(request) {
    return request.baseUrl.includes('editor.wix.com');
} 
