/**
 * Google Ads Script - Update Tracking Templates
 *
 * This script updates the Tracking Template for all Google Ads campaigns.
 * 
 * 🔹 What does it do?
 * - Iterates through all campaigns in the account.
 * - Updates the Tracking Template at the campaign level for both Standard and Performance Max campaigns.
 * - Optionally adds `utm_adgroupid={adgroupid}` at the ad group level for Standard campaigns.
 *
 * 🔹 How does it work?
 * 1️⃣ The script retrieves all the campaigns in the account.
 * 2️⃣ It selects each campaign and applies the tracking template updates.
 * 3️⃣ Campaigns will receive `utm_campaign={campaignid}` in their tracking template.
 * 4️⃣ Standard campaign ad groups will receive `utm_adgroupid={adgroupid}` if enabled.
 *
 * 🔹 Customization:
 * - `includePaused`: Set to `true` to update paused campaigns as well.
 * - `includeAdGroupId`: Set to `true` to add the `utm_adgroupid={adgroupid}` parameter at the ad group level.
 *
 * 🚀 Run this script from a Google Ads account to ensure tracking consistency across all campagigns.
 * 
 * Copyright: Paolo Bietolini - 2025
 * paolobietolini.com
 */

var trackingTemplateCampaign = "{lpurl}?utm_source=google&utm_medium=cpc&utm_campaign={campaignid}";
var includeAdGroupId = false; 
var includePaused = false;
const log = (t) => {Logger.log(t)}

function main() {
  processCampaigns();
}

function processCampaigns() {

  var trackingTemplateAdGroup = trackingTemplateCampaign + "&utm_adgroupid={adgroupid}";
  var condition = includePaused ? "Status IN ['ENABLED', 'PAUSED']" : "Status = 'ENABLED'";

  const CTYPES = ['performanceMaxCampaigns', 'campaigns'];
  for (const type of CTYPES) {
    var campaigns = AdsApp[type]()
      .withCondition(condition)
      .get();

    while (campaigns.hasNext()) {
      var campaign = campaigns.next();
      var campaignName = campaign.getName();
      var campaignTrackingTemplate = campaign.urls().getTrackingTemplate();
      if(campaignTrackingTemplate && campaignTrackingTemplate.trim() !== '') {
        log(`${campaignName} - Overwriting: ${campaignTrackingTemplate}`)
      }
      campaign.urls().setTrackingTemplate(trackingTemplateCampaign);
      log(`Updating Tracking Template for the campaign: ${campaignName} [${campaign.getId()}]`);
    }
  }

  if (includeAdGroupId) {
    var adGroups = AdsApp.adGroups()
      .withCondition(condition)
      .get();

    while (adGroups.hasNext()) {
      var adGroup = adGroups.next();
      var adGroupName = adGroup.getName();
      var adgroupTrackingTemplate = adGroup.urls().getTrackingTemplate();
      if(adgroupTrackingTemplate && adgroupTrackingTemplate.trim() !== '') {
        log(`${adGroupName} - Overwriting: ${adgroupTrackingTemplate}`)
      }
      adGroup.urls().setTrackingTemplate(trackingTemplateAdGroup);
      log(`Updating Tracking Template for the ad group: ${adGroupName} [${adGroup.getId()}]`);
    }
  }

  log("Tracking Template updated for account: " + AdsApp.currentAccount().getCustomerId());
}