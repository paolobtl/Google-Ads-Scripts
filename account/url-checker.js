/**
 * Google Ads Broken Link Checker
 * Checks all ad URLs in the account and logs broken links to Google Sheets
 * Paolo Bietolini - 2025
 * paolobietolini.com
 */

// CONFIGURATION - Update these values
var SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/#########/edit?gid=000000#gid=#####'; // Replace with your Google Sheets URL
var SHEET_NAME = 'Google Ads Broken Links'; // Name of the sheet tab

function main() {
  Logger.log('Starting broken link check...');
  
  var brokenLinks = [];
  var checkedUrls = {}; // Cache to avoid checking the same URL multiple times
  
  var campaignIterator = AdsApp.campaigns()
    .withCondition('Status = ENABLED')
    .get();
  
  Logger.log('Found ' + campaignIterator.totalNumEntities() + ' enabled campaigns');
  
  while (campaignIterator.hasNext()) {
    var campaign = campaignIterator.next();
    var campaignName = campaign.getName();
    
    Logger.log('Checking campaign: ' + campaignName);
    
    var adIterator = campaign.ads()
      .withCondition('Status = ENABLED')
      .get();
    
    while (adIterator.hasNext()) {
      var ad = adIterator.next();
      var adType = ad.getType();
      
      // Get final URL (works for most ad types)
      var finalUrl = ad.urls().getFinalUrl();
      
      if (finalUrl) {
        if (checkedUrls[finalUrl]) {
          if (checkedUrls[finalUrl].isBroken) {
            brokenLinks.push({
              campaign: campaignName,
              adId: ad.getId(),
              adType: adType,
              url: finalUrl,
              statusCode: checkedUrls[finalUrl].statusCode,
              error: checkedUrls[finalUrl].error
            });
          }
          continue;
        }
        
        var urlStatus = checkUrlStatus(finalUrl);
        checkedUrls[finalUrl] = urlStatus;
        
        if (urlStatus.isBroken) {
          brokenLinks.push({
            campaign: campaignName,
            adId: ad.getId(),
            adType: adType,
            url: finalUrl,
            statusCode: urlStatus.statusCode,
            error: urlStatus.error
          });
          
          Logger.log('Broken link found: ' + finalUrl + ' (Status: ' + urlStatus.statusCode + ')');
        }
      }
    }
  }
  
  if (brokenLinks.length > 0) {
    Logger.log('Found ' + brokenLinks.length + ' broken links');
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
  
  sheet.clear();
  
  var headers = ['Date Checked', 'Campaign', 'Ad ID', 'Ad Type', 'URL', 'Status Code', 'Error'];
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
      link.error || ''
    ];
  });
  
  if (data.length > 0) {
    sheet.getRange(2, 1, data.length, headers.length).setValues(data);
    
    for (var i = 1; i <= headers.length; i++) {
      sheet.autoResizeColumn(i);
    }
    
    sheet.setFrozenRows(1);
  }
  
  Logger.log('Wrote ' + brokenLinks.length + ' broken links to sheet');
}