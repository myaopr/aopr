import { ok, notFound, forbidden, next, redirect  } from "wix-router";

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
/**
 * @param {WixRouterRequest} request
 * @param {WixRouterResponse} response
 * @return {WixRouterResponse | Promise<WixRouterResponse>}
 */
export function artistgallery_afterRouter(request, response) {
    // console.info('artistgallery_afterRouter', request, response);
    if (request.path[0] === 'edit') {
        return artistgallery_edit_afterRouter(request, response);
    } else {
        return response;
    }
}

/**
 * @param {WixRouterRequest} request
 * @param {WixRouterResponse} response
 * @return {WixRouterResponse | Promise<WixRouterResponse>}
 */
function artistgallery_edit_afterRouter(request, response) {
    if (response.status === 200) {
        const {path, prefix, user} = request;
        /** @type {Artist} */
        const artist = response.data && response.data.items && response.data.items[0];
        // console.info('artistgallery_edit_afterRouter response item', item);
        const reason = !artist ? 'no artist record in the response' 
           : artist._owner !== user.id && user.role !== 'Admin' ? 'user is not the owner of the artist record nor an admin' 
           : artist.blocked ? 'the artist record is blocked'
           : '';
        if (reason) {
            if (isPreviewMode(request)) {
                console.error(`Editing ${path[1]} is forbidden because ${reason}`);
                // can't redirect successfully in Preview Mode
                return forbidden(reason); 
            } else {
                const redirectUrl = (artist && artist['copy-link-artistsgallery-all']) || `${prefix}/${path[1]}/${path[2]}`;
                console.error(`Editing ${path[1]} is forbidden because ${reason}; redirecting to ${redirectUrl}`);
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
