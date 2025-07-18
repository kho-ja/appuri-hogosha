import { DatabaseClient } from "./client";
import { NotificationPost } from "../../types/events";

export class DatabaseQueries {
    constructor(private db: DatabaseClient) { }

    async fetchPosts(): Promise<NotificationPost[]> {
        return await this.db.query(
            `SELECT pp.id,
                    pa.arn,
                    po.title,
                    po.description,
                    st.family_name,
                    st.given_name,
                    pses.chat_id,
                    pses.language,
                    pa.phone_number,
                    po.priority,
                    CASE
                        WHEN (po.priority = 'high' AND sc.sms_high = true) OR
                             (po.priority = 'medium' AND sc.sms_medium = true) OR
                             (po.priority = 'low' AND sc.sms_low = true)
                            THEN true
                        ELSE false
                        END AS sms
             FROM PostParent AS pp
                      INNER JOIN Parent AS pa ON pp.parent_id = pa.id
                      INNER JOIN PostStudent AS ps ON pp.post_student_id = ps.id
                      LEFT JOIN Post AS po ON ps.post_id = po.id
                      INNER JOIN Student AS st ON ps.student_id = st.id
                      LEFT JOIN ParentSession AS pses ON pses.parent_id = pa.id
                      INNER JOIN School AS sc ON st.school_id = sc.id
             WHERE pa.arn IS NOT NULL
               AND pp.push = false
               AND pp.viewed_at IS NULL LIMIT 25;`
        );
    }

    // New method - gets posts for SMS notifications (includes users without ARN)
    async fetchPostsForSMS(): Promise<NotificationPost[]> {
        return await this.db.query(
            `SELECT pp.id,
                    pa.arn,                    -- Can be NULL for SMS-only users
                    po.title,
                    po.description,
                    st.family_name,
                    st.given_name,
                    pses.chat_id,
                    pses.language,
                    pa.phone_number,           -- Primary requirement for SMS
                    po.priority,
                    CASE
                        WHEN (po.priority = 'high' AND sc.sms_high = true) OR
                             (po.priority = 'medium' AND sc.sms_medium = true) OR
                             (po.priority = 'low' AND sc.sms_low = true)
                            THEN true
                        ELSE false
                        END AS sms
             FROM PostParent AS pp
                      INNER JOIN Parent AS pa ON pp.parent_id = pa.id
                      INNER JOIN PostStudent AS ps ON pp.post_student_id = ps.id
                      LEFT JOIN Post AS po ON ps.post_id = po.id
                      INNER JOIN Student AS st ON ps.student_id = st.id
                      LEFT JOIN ParentSession AS pses ON pses.parent_id = pa.id
                      INNER JOIN School AS sc ON st.school_id = sc.id
             WHERE pa.phone_number IS NOT NULL
               AND pa.phone_number != ''
               AND pp.push = false
               AND pp.viewed_at IS NULL
               AND (
                   (po.priority = 'high' AND sc.sms_high = true) OR
                   (po.priority = 'medium' AND sc.sms_medium = true) OR
                   (po.priority = 'low' AND sc.sms_low = true)
               ) LIMIT 25;`
        );
    }

    // Combined method - gets all posts for both push and SMS notifications
    async fetchAllNotificationPosts(): Promise<NotificationPost[]> {
        return await this.db.query(
            `SELECT pp.id,
                    pa.arn,
                    po.title,
                    po.description,
                    st.family_name,
                    st.given_name,
                    pses.chat_id,
                    pses.language,
                    pa.phone_number,
                    po.priority,
                    CASE
                        WHEN (po.priority = 'high' AND sc.sms_high = true) OR
                             (po.priority = 'medium' AND sc.sms_medium = true) OR
                             (po.priority = 'low' AND sc.sms_low = true)
                            THEN true
                        ELSE false
                        END AS sms
             FROM PostParent AS pp
                      INNER JOIN Parent AS pa ON pp.parent_id = pa.id
                      INNER JOIN PostStudent AS ps ON pp.post_student_id = ps.id
                      LEFT JOIN Post AS po ON ps.post_id = po.id
                      INNER JOIN Student AS st ON ps.student_id = st.id
                      LEFT JOIN ParentSession AS pses ON pses.parent_id = pa.id
                      INNER JOIN School AS sc ON st.school_id = sc.id
             WHERE (
                 -- Has ARN for push notifications
                 (pa.arn IS NOT NULL AND pa.arn != '') OR
                 -- OR has phone number for SMS notifications (and SMS is enabled)
                 (pa.phone_number IS NOT NULL AND pa.phone_number != '' AND (
                     (po.priority = 'high' AND sc.sms_high = true) OR
                     (po.priority = 'medium' AND sc.sms_medium = true) OR
                     (po.priority = 'low' AND sc.sms_low = true)
                 ))
             )
               AND pp.push = false
               AND pp.viewed_at IS NULL LIMIT 25;`
        );
    }

    // Get SMS-only users (users without ARN but with phone numbers)
    async fetchSMSOnlyPosts(): Promise<NotificationPost[]> {
        return await this.db.query(
            `SELECT pp.id,
                    NULL as arn,               -- No ARN available
                    po.title,
                    po.description,
                    st.family_name,
                    st.given_name,
                    pses.chat_id,
                    pses.language,
                    pa.phone_number,
                    po.priority,
                    true as sms                -- SMS enabled for these posts
             FROM PostParent AS pp
                      INNER JOIN Parent AS pa ON pp.parent_id = pa.id
                      INNER JOIN PostStudent AS ps ON pp.post_student_id = ps.id
                      LEFT JOIN Post AS po ON ps.post_id = po.id
                      INNER JOIN Student AS st ON ps.student_id = st.id
                      LEFT JOIN ParentSession AS pses ON pses.parent_id = pa.id
                      INNER JOIN School AS sc ON st.school_id = sc.id
             WHERE (pa.arn IS NULL OR pa.arn = '')    -- Users without ARN
               AND pa.phone_number IS NOT NULL        -- But with phone numbers
               AND pa.phone_number != ''
               AND pp.push = false
               AND pp.viewed_at IS NULL
               AND (
                   (po.priority = 'high' AND sc.sms_high = true) OR
                   (po.priority = 'medium' AND sc.sms_medium = true) OR
                   (po.priority = 'low' AND sc.sms_low = true)
               ) LIMIT 25;`
        );
    }

    async updateProcessedPosts(ids: number[]): Promise<void> {
        if (!ids.length) return;
        await this.db.execute(`UPDATE PostParent SET push = true WHERE id IN (${ids.join(',')});`);
    }

    async getTokensForAnalysis(limit: number = 20): Promise<any[]> {
        return await this.db.query(`
            SELECT 
                arn as token,
                id,
                phone_number
            FROM Parent 
            WHERE arn IS NOT NULL 
            AND arn != ''
            LIMIT ${limit}
        `);
    }

    async getTokensForTesting(limit: number = 5): Promise<any[]> {
        return await this.db.query(`
            SELECT 
                arn as token,
                id,
                phone_number
            FROM Parent 
            WHERE arn IS NOT NULL 
            AND arn != ''
            LIMIT ${limit}
        `);
    }
}