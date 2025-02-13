function main() {
/**
 * Google Ads MCC Script - Update Tracking Templates
 *
 * This script updates the Tracking Template for all Google Ads accounts managed under an MCC (My Client Center).
 * 
 * 🔹 What does it do?
 * - Iterates through all child accounts under the MCC.
 * - Updates the Tracking Template at the campaign level for both Standard and Performance Max campaigns.
 * - Optionally adds `utm_adgroupid={adgroupid}` at the ad group level for Standard campaigns.
 *
 * 🔹 How does it work?
 * 1️⃣ The script retrieves all managed accounts under the MCC.
 * 2️⃣ It selects each account and applies the tracking template updates.
 * 3️⃣ Campaigns will receive `utm_campaign={campaignid}` in their tracking template.
 * 4️⃣ Standard campaign ad groups will receive `utm_adgroupid={adgroupid}` if enabled.
 *
 * 🔹 Customization:
 * - `includePaused`: Set to `true` to update paused campaigns as well.
 * - `includeAdGroupId`: Set to `true` to add the `utm_adgroupid={adgroupid}` parameter at the ad group level.
 *
 * 🚀 Run this script from an MCC account to ensure tracking consistency across all linked accounts.
 * 
 * Copyright: Paolo Bietolini - 2025
 * paolobietolini.com
 */

    var trackingTemplateCampaign = "{lpurl}?utm_source=google&utm_medium=cpc&utm_campaign={campaignid}";
    var includeAdGroupId = false; 
    var includePaused = false; 

    var accounts = AdsManagerApp.accounts().get();
    
    while (accounts.hasNext()) {
      var account = accounts.next();
      Logger.log("Accessing account: " + account.getCustomerId());
  
      AdsManagerApp.select(account);
      processAccount();
    }
  }
  
  function processAccount() {
    var trackingTemplateAdGroup = trackingTemplateCampaign + "&utm_adgroupid={adgroupid}";

    var condition = includePaused ? "Status IN ['ENABLED', 'PAUSED']" : "Status = 'ENABLED'";
  
    const CTYPES = ['performanceMaxCampaigns', 'campaigns'];
    for (const type of CTYPES) {
      var campaigns = AdsApp[type]()
        .withCondition(condition)
        .get();
  
      while (campaigns.hasNext()) {
        var campaign = campaigns.next();
        Logger.log("Update Tracking Template for the campaign: " + campaign.getName());
        campaign.urls().setTrackingTemplate(trackingTemplateCampaign);
      }
    }
  
    if (includeAdGroupId) {
      var adGroups = AdsApp.adGroups()
        .withCondition(condition)
        .get();
  
      while (adGroups.hasNext()) {
        var adGroup = adGroups.next();
        Logger.log("Update Tracking Template for the ad group: " + adGroup.getName());
        adGroup.urls().setTrackingTemplate(trackingTemplateAdGroup);
      }
    }
  
    Logger.log("Tracking Template updated for account: " + AdsApp.currentAccount().getCustomerId());
  }