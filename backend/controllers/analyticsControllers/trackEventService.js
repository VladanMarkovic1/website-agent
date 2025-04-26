import ChatAnalytics from '../../models/ChatAnalytics.js';

/**
 * Updates chat analytics for a given business
 */
export const trackChatEvent = async (businessId, eventType, data = {}) => {
    try {
        console.log(`[AnalyticsService] Tracking event: ${eventType} for business: ${businessId}, Data: ${JSON.stringify(data)}`);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let todayOps = {}; 
        let allTimeOps = {}; 

        // --- Perform Lead Increment Separately --- 
        if (eventType === 'LEAD_GENERATED') {
             // Similar to NEW_LEAD but potentially triggered after lead save confirmation
             try {
                  await ChatAnalytics.updateOne({ businessId, date: today }, { $inc: { totalLeads: 1 } }, { upsert: true });
                  await ChatAnalytics.updateOne({ businessId, date: null }, { $inc: { totalLeads: 1 } }, { upsert: true });
              } catch (leadIncError) {
                   console.error('[AnalyticsService] Error during separate totalLeads increment for LEAD_GENERATED:', leadIncError);
              }
        }
        // --- End Separate Lead Increment ---

        // Now build the remaining ops for other event types or service counts
        switch (eventType) {
            case 'NEW_CONVERSATION':
                todayOps = { $inc: { totalConversations: 1 } };
                allTimeOps = { $inc: { totalConversations: 1 } };
                break;
            case 'CONVERSATION_COMPLETED':
                todayOps = { $inc: { completedConversations: 1 } };
                allTimeOps = { $inc: { completedConversations: 1 } };
                break;
            case 'NEW_LEAD': // Only handle service count here now
            case 'LEAD_GENERATED': // Also handle service count for this event
                if (data.service) {
                    const serviceKey = `leadsByService.${data.service.replace(/[.$]/g, "_")}`;
                    todayOps = { $inc: { [serviceKey]: 1 } }; 
                    allTimeOps = { $inc: { [serviceKey]: 1 } }; 
                }
                break;
            case 'LEAD_STATUS_UPDATE':
                if (data.oldStatus && data.newStatus && data.oldStatus !== data.newStatus) {
                    todayOps = {
                        $inc: {
                            [`leadStatus.${data.oldStatus}`]: -1,
                            [`leadStatus.${data.newStatus}`]: 1
                        }
                    };
                    allTimeOps = {
                        $inc: {
                            [`leadStatus.${data.oldStatus}`]: -1,
                            [`leadStatus.${data.newStatus}`]: 1
                        }
                    };
                }
                break;
            case 'HOURLY_ACTIVITY':
                const hour = new Date().getHours().toString();
                todayOps = { $inc: { [`hourlyActivity.${hour}`]: 1 } };
                allTimeOps = { $inc: { [`hourlyActivity.${hour}`]: 1 } };
                break;
            default:
                 break;
        } // End switch

        // Execute remaining updates if any operations were defined
        if (Object.keys(todayOps).length > 0 || Object.keys(allTimeOps).length > 0) {
            await Promise.all([
                Object.keys(todayOps).length > 0 ? 
                    ChatAnalytics.updateOne({ businessId, date: today }, todayOps, { upsert: true }) : 
                    Promise.resolve(),
                
                Object.keys(allTimeOps).length > 0 ?
                    ChatAnalytics.updateOne({ businessId, date: null }, allTimeOps, { upsert: true }) :
                    Promise.resolve()
            ]);
        }

        // --- Fetch final data and Calculate Conversion Rate --- 
        const [finalToday, finalAllTime] = await Promise.all([
             ChatAnalytics.findOne({ businessId, date: today }),
             ChatAnalytics.findOne({ businessId, date: null })
        ]);
        
        const currentAllTimeLeads = finalAllTime?.totalLeads || 0;
        const currentAllTimeConversations = finalAllTime?.totalConversations || 0;

        if (currentAllTimeConversations > 0) {
            const conversionRate = Math.min((currentAllTimeLeads / currentAllTimeConversations) * 100, 100);
            await Promise.all([
                 ChatAnalytics.updateOne({ businessId, date: today }, { $set: { conversionRate } }),
                 ChatAnalytics.updateOne({ businessId, date: null }, { $set: { conversionRate } })
            ]);
        }
        // --- End Conversion Rate --- 

        return { today: finalToday, allTime: finalAllTime };

    } catch (error) {
        console.error('[AnalyticsService] Error tracking chat event:', error);
        throw error;
    }
}; 