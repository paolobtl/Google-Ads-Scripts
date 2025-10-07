/**
 * Google Ads Broken Link Checker
 * Checks all ad URLs in the account and logs broken links to Google Sheets.
 * Ads with broken links will be paused.
 *
 *
 * Paolo Bietolini 2025
 * paolobietolini.com
 */

// CONFIGURATION - Update these values
var SPREADSHEET_URL = 'YOUR_SPREADSHEET_URL_HERE'; // Replace with your Google Sheets URL
var SHEET_NAME = 'Google Ads Broken Links'; // Name of the sheet tab
var AUTO_PAUSE_ADS = true; // Set to false if you don't want to auto-pause broken ads

function main() {
  Logger.log('Starting broken link check...');
  
  var brokenLinks = [];
  var checkedUrls = {}; // Cache to avoid checking the same URL multiple times
  
  // Get all enabled campaigns
  var campaignIterator = AdsApp.campaigns()
    .withCondition('Status = ENABLED')
    .get();
  
  Logger.log('Found ' + campaignIterator.totalNumEntities() + ' enabled campaigns');
  
  // Iterate through campaigns
  while (campaignIterator.hasNext()) {
    var campaign = campaignIterator.next();
    var campaignName = campaign.getName();
    
    Logger.log('Checking campaign: ' + campaignName);
    
    // Get all ads in the campaign
    var adIterator = campaign.ads()
      .withCondition('Status = ENABLED')
      .get();
    
    // Check each ad
    while (adIterator.hasNext()) {
      var ad = adIterator.next();
      var adType = ad.getType();
      
      // Get final URL (works for most ad types)
      var finalUrl = ad.urls().getFinalUrl();
      
      if (finalUrl) {
        // Skip if we've already checked this URL
        if (checkedUrls[finalUrl]) {
          if (checkedUrls[finalUrl].isBroken) {
            var wasPaused = false;
            
            // Auto-pause the ad if enabled
            if (AUTO_PAUSE_ADS) {
              try {
                ad.pause();
                wasPaused = true;
                Logger.log('Ad paused: ' + ad.getId() + ' in campaign: ' + campaignName);
              } catch (e) {
                Logger.log('Failed to pause ad: ' + ad.getId() + ' - ' + e.message);
              }
            }
            
            brokenLinks.push({
              campaign: campaignName,
              adId: ad.getId(),
              adType: adType,
              url: finalUrl,
              statusCode: checkedUrls[finalUrl].statusCode,
              error: checkedUrls[finalUrl].error,
              paused: wasPaused
            });
          }
          continue;
        }
        
        // Check URL status
        var urlStatus = checkUrlStatus(finalUrl);
        checkedUrls[finalUrl] = urlStatus;
        
        // If broken, add to list
        if (urlStatus.isBroken) {
          var wasPaused = false;
          
          // Auto-pause the ad if enabled
          if (AUTO_PAUSE_ADS) {
            try {
              ad.pause();
              wasPaused = true;
              Logger.log('Ad paused: ' + ad.getId() + ' in campaign: ' + campaignName);
            } catch (e) {
              Logger.log('Failed to pause ad: ' + ad.getId() + ' - ' + e.message);
            }
          }
          
          brokenLinks.push({
            campaign: campaignName,
            adId: ad.getId(),
            adType: adType,
            url: finalUrl,
            statusCode: urlStatus.statusCode,
            error: urlStatus.error,
            paused: wasPaused
          });
          
          Logger.log('Broken link found: ' + finalUrl + ' (Status: ' + urlStatus.statusCode + ')');
        }
      }
    }
  }
  
  // Write results to Google Sheets
  if (brokenLinks.length > 0) {
    Logger.log('Found ' + brokenLinks.length + ' broken links');
    
    if (AUTO_PAUSE_ADS) {
      var pausedCount = brokenLinks.filter(function(link) { return link.paused; }).length;
      Logger.log('Paused ' + pausedCount + ' ads with broken links');
    }
    
    writeToSheet(brokenLinks);
    Logger.log('Results written to Google Sheets');
  } else {
    Logger.log('No broken links found!');
  }
}

/**
 * Check if a URL returns 200 status code
 */
function checkUrlStatus(url) {
  try {
    var options = {
      'muteHttpExceptions': true,
      'followRedirects': true,
      'validateHttpsCertificates': false,
      'timeout': 10 // 10 second timeout
    };
    
    var response = UrlFetchApp.fetch(url, options);
    var statusCode = response.getResponseCode();
    
    return {
      isBroken: statusCode !== 200,
      statusCode: statusCode,
      error: statusCode !== 200 ? 'HTTP ' + statusCode : null
    };
    
  } catch (e) {
    Logger.log('Error checking URL: ' + url + ' - ' + e.message);
    return {
      isBroken: true,
      statusCode: 'ERROR',
      error: e.message
    };
  }
}

/**
 * Write broken links to Google Sheets
 */
function writeToSheet(brokenLinks) {
  var spreadsheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
  var sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  // Create sheet if it doesn't exist
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }
  
  // Clear existing data
  sheet.clear();
  
  // Write headers
  var headers = ['Date Checked', 'Campaign', 'Ad ID', 'Ad Type', 'URL', 'Status Code', 'Error', 'Auto-Paused'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  
  // Write data
  var now = new Date();
  var data = brokenLinks.map(function(link) {
    return [
      now,
      link.campaign,
      link.adId,
      link.adType,
      link.url,
      link.statusCode,
      link.error || '',
      link.paused ? 'YES' : 'NO'
    ];
  });
  
  if (data.length > 0) {
    sheet.getRange(2, 1, data.length, headers.length).setValues(data);
    
    // Auto-resize columns
    for (var i = 1; i <= headers.length; i++) {
      sheet.autoResizeColumn(i);
    }
    
    // Freeze header row
    sheet.setFrozenRows(1);
  }
  
  Logger.log('Wrote ' + brokenLinks.length + ' broken links to sheet');
}