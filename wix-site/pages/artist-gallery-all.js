import wixData from 'wix-data';
import wixLocation from 'wix-location';
import { artistsEditPageLinkField, artistGalleryCollectionName, defaultArtistImageUrl } from 'public/constants';
import { artistGalleryDefaultFilter, getArtistMemberInfo, showSpinner, stopSpinner } from 'public/aopr-utils';

/**
 * @typedef {import('public/aopr-utils.js').ArtistMemberInfo} ArtistMemberInfo
 */

let debounceTimer;
let lastSearchValue;
/** @type {ArtistMemberInfo} */
let memberInfo;
/** @type {$w.Pagination} */
let paginationBar;
/** @type {$w.Repeater} */
let repeater;
/** @type {$w.Box} */
let searchBox;

$w.onReady(function () {
    $w("#pageTitle").scrollTo();
    $w("#dataset").setPageSize(150);
    paginationBar = $w("#paginationBar");
    repeater = $w("#artistGalleryRepeater");
    searchBox = $w("#searchBox");
    showHideItemIcons();

    repeater.collapse(); // don't show until first official fetch

    getArtistMemberInfo().then(mi => {
        memberInfo = mi;
        memberInfo.canAdd ? $w('#addButton').expand() : $w('#addButton').collapse();
        $w('#dataset').setFilter(memberInfo.defaultFilter || artistGalleryDefaultFilter).then(afterFetch);
    });
});

export function addButton_click(event) {
    const name =  (memberInfo.name || '').trim();
    if (name) {
        const member = memberInfo.member;
        const profilePhoto = member.profile.profilePhoto;
        const artistPhoto = profilePhoto ? profilePhoto.url : defaultArtistImageUrl;
        const toInsert = {
            name,
            email: member.loginEmail || '',
            artistPhoto,
            hidden: true,
        };
        showSpinner({message: 'Creating your gallery'});
        wixData.insert(artistGalleryCollectionName, toInsert).then(
            item => {
                wixLocation.to(item[artistsEditPageLinkField]);
            },
            err => {
                console.error(`Failed trying to insert new artist: ${JSON.stringify(toInsert)}`, err);
                stopSpinner({message: 'Unable to create your gallery', timeout: 3000});
            }
        );
    } else {
        console.error('Cannot insert new artist for a member without a nickname');
    }
}

/** Adjust display after fetching data, usually after Dataset.setFilter()
 * @returns {number} Count of retrieved page of artist records
 */
function afterFetch() {
    const itemCount = $w("#dataset").getTotalCount();
    // console.log(`After filter the count is ${itemCount}`);
    if (itemCount) {
        $w('#noItemsText').collapse();
        repeater.expand().then(_ => repeater.show('fade'));
    } else {
        $w('#noItemsText').expand();
        paginationBar.hide('fade').then(_ => paginationBar.collapse());
        repeater.hide('fade').then(_ => repeater.collapse());
    }
    return itemCount;
}

export function clearSearchButton_click(event) {
    $w('#searchInput').value = '';
    search('');
}

export function dataset_ready() {

}

export function searchInput_keyPress(event) {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = undefined;
    }

    debounceTimer = setTimeout(() => {
    	search($w("#searchInput").value);
    }, 200);
}

/** Reset the filter based on the searchValue. Do nothing if searchValue unchanged.
 * @param {string} searchValue
 * @returns {Promise<number>} The number of artist records returned after applying the filter
 */
function search(searchValue) {
    if (lastSearchValue !== searchValue) {
        lastSearchValue = searchValue;
        let dataFilter = memberInfo.defaultFilter;
        if (searchValue) {
            $w("#clearSearchButton").show();
            dataFilter = dataFilter.contains('name', searchValue);
        } else {
            $w("#clearSearchButton").hide();
        }
        return $w("#dataset").setFilter(dataFilter).then(afterFetch);
    }
}

function showHideItemIcons() {
    repeater.onItemReady(($wInRepeater, itemData) => {
    const {blocked, hidden} = itemData;
    blocked ? $wInRepeater('#blocked').expand() : $wInRepeater('#blocked').collapse() 
    hidden ? $wInRepeater('#hidden').expand() : $wInRepeater('#hidden').collapse() 
  })
}
