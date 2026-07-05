const { Queue, Worker } = require("bullmq");
const IORedis           = require("ioredis");
const { Complaint, ComplaintAssignment, User, UserRole, Role, Settings } = require('../models');
const { Op }            = require('sequelize');
const nodemailer        = require('nodemailer');
let complaintEscalationQueue;
let escalationWorker;
let escalationSchedulerWorker;

// Email configuration
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, 
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    }
});

async function initializeComplaintEscalationQueue(){
    try{
        const connection = new IORedis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
            maxRetriesPerRequest: null,
            retryDelayOnFailover: 100,
            enableReadyCheck: false,
            lazyConnect: true
        });
        await connection.ping();
        // Queue for bulk escalation processing
        complaintEscalationQueue = new Queue("complaintEscalation", {
            connection,
            defaultJobOptions: {
                removeOnComplete: 50,
                removeOnFail: 100,
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 5000,
                }
            }
        });
        // Worker to process bulk escalations
        escalationWorker = new Worker("complaintEscalation",
            async (job) => {
                return await processBulkEscalation();
            },
            { connection, concurrency: 1 }
        );
        escalationWorker.on('completed', (job, result) => {
            console.log(`✅ Bulk escalation job ${job.id} completed:`, result);
        });
        escalationWorker.on('failed', (job, err) => {
            console.error(`❌ Bulk escalation job ${job.id} failed:`, err.message);
        });
        // Schedule the checker to run every 24 hours (daily at midnight)
        await complaintEscalationQueue.add(
            'bulk-escalation-check',
            {},
            {
                repeat: {
                    pattern: '0 0 * * *' // Daily at midnight
                },
                jobId: 'complaint-bulk-escalation-checker'
            }
        );
        await complaintEscalationQueue.waitUntilReady();
        console.log("✅ Complaint Escalation Queue initialized successfully");
        return { success: true };
    }catch(err){ 
        console.error("❌ Failed to initialize Complaint Escalation Queue:", err);
        throw err;
    }
}

// Process all complaints that need escalation and send ONE consolidated email
async function processBulkEscalation() {
    try{
        console.log("🔍 Checking for complaints requiring escalation...");
        const twentyFourHoursAgo = new Date(Date.now() - (24 * 60 * 60 * 1000));
        // Find all open complaints older than 24 hours
        const complaintsToEscalate = await Complaint.findAll({
            where: {
                status: 'open',
                created_at: {
                    [Op.lte]: twentyFourHoursAgo
                }
            },
            attributes: ['id', 'ticket_no', 'title', 'description', 'created_at'],
            include: [
                {
                    model: User,
                    as: 'passenger',
                    attributes: ['id', 'name', 'email', 'mobile']
                },
                {
                    model: ComplaintAssignment,
                    as: 'assignments',
                    where: { is_active: true },
                    required: false,
                    include: [
                        {
                            model: User,
                            as: 'assignedUser',
                            attributes: ['id', 'name', 'email']
                        }
                    ]
                }
            ],
            order: [['created_at', 'ASC']]
        });
        if(complaintsToEscalate.length === 0){
            console.log("✅ No complaints require escalation at this time");
            return {
                success: true,
                complaints_checked: 0,
                complaints_escalated: 0,
                emails_sent: 0
            };
        }
        console.log(`⚠️ Found ${complaintsToEscalate.length} complaints requiring escalation`);
        // Update all complaints to escalated status
        const complaintIds = complaintsToEscalate.map(c => c.id);
        await Complaint.update(
            {
                status: 'escalate',
                status_color: '#F59E0B',
                escalated_at: new Date()
            },
            {
                where: {
                    id: { [Op.in]: complaintIds }
                }
            }
        );
        // Get escalation role IDs from settings
        const adminSettings = await Settings.findOne({
            where: { role: 'admin' }
        });
        if(!adminSettings || !adminSettings.complain_escalation_roles) {
            console.warn(`⚠️ No escalation roles configured in settings`);
            return {
                success: true,
                complaints_checked: complaintsToEscalate.length,
                complaints_escalated: complaintsToEscalate.length,
                emails_sent: 0,
                reason: 'No escalation roles configured'
            };
        }
        // Parse role IDs (format: "1,4")
        const roleIds = adminSettings.complain_escalation_roles
            .split(',')
            .map(id => parseInt(id.trim()))
            .filter(id => !isNaN(id));
        
        if(roleIds.length === 0){
            console.warn(`⚠️ Invalid escalation role IDs in settings`);
            return {
                success: true,
                complaints_checked: complaintsToEscalate.length,
                complaints_escalated: complaintsToEscalate.length,
                emails_sent: 0,
                reason: 'Invalid escalation role configuration'
            };
        }
        // Get users with escalation roles
        const escalationManagers = await User.findAll({
            attributes: ['id', 'name', 'email'],
            include: [
                {
                    model: UserRole,
                    as: 'UserRoles',
                    required: true,
                    include: [
                        {
                            model: Role,
                            as: 'Role',
                            where: {
                                id: { [Op.in]: roleIds }
                            }
                        }
                    ]
                }
            ],
            where: {
                status: 1,
                email: { [Op.ne]: null }
            }
        });
        if(escalationManagers.length === 0){
            console.warn(`⚠️ No active users found with escalation roles`);
            return {
                success: true,
                complaints_checked: complaintsToEscalate.length,
                complaints_escalated: complaintsToEscalate.length,
                emails_sent: 0,
                reason: 'No users with escalation roles found'
            };
        }
        // Send ONE consolidated email to all managers
        const emailResults = await sendConsolidatedEscalationEmail(complaintsToEscalate, escalationManagers);
        console.log(`✅ ${complaintsToEscalate.length} complaints escalated successfully`);
        console.log(`📧 Sent ${emailResults.sent} consolidated emails to escalation managers`);
        return {
            success: true,
            complaints_checked: complaintsToEscalate.length,
            complaints_escalated: complaintsToEscalate.length,
            emails_sent: emailResults.sent,
            emails_failed: emailResults.failed,
            managers_notified: escalationManagers.length,
            timestamp: new Date().toISOString()
        };
    }catch(error){
        console.error("❌ Error in processBulkEscalation:", error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Send ONE consolidated email with table of all open complaints
async function sendConsolidatedEscalationEmail(complaints, managers){
    const results = {
        sent: 0,
        failed: 0,
        errors: []
    };
    // Generate table rows for all complaints
    const tableRows = complaints.map(complaint => {
        const assignedTo = complaint.assignments && complaint.assignments.length > 0
            ? complaint.assignments.map(a => a.assignedUser.name).join(', ')
            : 'Unassigned';
        const hoursOpen = Math.floor((Date.now() - new Date(complaint.created_at).getTime()) / (1000 * 60 * 60));
        return `
            <tr>
                <td style="padding: 12px; border: 1px solid #ddd;">${complaint.ticket_no}</td>
                <td style="padding: 12px; border: 1px solid #ddd;">${complaint.title}</td>
                <td style="padding: 12px; border: 1px solid #ddd;">${complaint.passenger.name}<br/><small>${complaint.passenger.mobile}</small></td>
                <td style="padding: 12px; border: 1px solid #ddd;">${assignedTo}</td>
                <td style="padding: 12px; border: 1px solid #ddd; text-align: center;">
                    <span style="background-color: ${hoursOpen > 48 ? '#333' : '#333'}; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;">
                        ${hoursOpen}h
                    </span>
                </td>
                <td style="padding: 12px; border: 1px solid #ddd; font-size: 12px;">
                    ${new Date(complaint.created_at).toLocaleString()}
                </td>
            </tr>
        `;
    }).join('');
    const emailContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    line-height: 1.6; 
                    color: #1a1a1a; 
                    margin: 0; 
                    padding: 0; 
                    background-color: #f5f5f5;
                }
                .container { 
                    max-width: 1000px; 
                    background-color: #ffffff;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                }
                .header { 
                    background-color: #f8f8f8;
                    padding: 22px 40px;
                    border-bottom: 4px solid #1a1a1a;
                    position: relative;
                }
                .header::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 8px;
                    background: linear-gradient(to right, #1a1a1a 0%, #666666 100%);
                }
                .header h2 {
                    margin: 0 0 8px 0;
                    font-size: 28px;
                    font-weight: 600;
                    color: #1a1a1a;
                }
                .header p {
                    margin: 0;
                    font-size: 14px;
                    color: #666666;
                }
                .content { 
                    background-color: #ffffff;
                    padding: 20px;
                }
                .content h3 {
                    margin: 0 0 24px 0;
                    font-size: 18px;
                    font-weight: 600;
                    color: #2c2c2c;
                }
                .footer { 
                    background-color: #f8f8f8;
                    color: #666666;
                    padding: 20px 40px;
                    text-align: center;
                    font-size: 13px;
                    border-top: 1px solid #e5e5e5;
                }
                .footer p {
                    margin: 0;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse;
                    background-color: #ffffff;
                    border: 1px solid #e5e5e5;
                }
                th { 
                    background-color: #2c2c2c;
                    color: #ffffff;
                    padding: 14px 16px;
                    text-align: left;
                    font-size: 13px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    border: none;
                }
                td { 
                    padding: 16px;
                    border-bottom: 1px solid #e5e5e5;
                    font-size: 14px;
                    color: #333333;
                }
                tr:last-child td {
                    border-bottom: none;
                }
                tr:hover { 
                    background-color: #f8f8f8;
                    transition: background-color 0.2s ease;
                }
                .hours-badge {
                    display: inline-block;
                    background-color: #1a1a1a;
                    color: #ffffff;
                    padding: 4px 12px;
                    border-radius: 4px;
                    font-weight: 600;
                    font-size: 13px;
                }
                .ticket-number {
                    font-family: 'Courier New', monospace;
                    font-weight: 600;
                    color: #1a1a1a;
                }
                .unassigned {
                    color: #999999;
                    font-style: italic;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>Complaint Escalation Report</h2>
                    <p>Generated: ${new Date().toLocaleString()}</p>
                </div>
                <div class="content">
                    <p style="
                        font-size: 15px; 
                        line-height: 1.6; 
                        color: #444; 
                        margin-bottom: 28px;
                    ">
                        The following complaints have remained unresolved for over 
                        <strong>24 hours</strong> and now require immediate attention. 
                        Please review each case and take appropriate action to ensure 
                        timely resolution and improve customer satisfaction.
                    </p>
                    <h3>Complaints Requiring Immediate Attention</h3>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 120px;">Ticket No.</th>
                                <th>Title</th>
                                <th style="width: 150px;">Customer</th>
                                <th style="width: 130px;">Assigned To</th>
                                <th style="width: 100px;">Hours Open</th>
                                <th style="width: 160px;">Created At</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                    <div style="
                        margin-top: 32px;
                        padding: 28px;
                        border-radius: 12px;
                        background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
                        border: 1px solid #e5e7eb;
                        box-shadow: 0 4px 14px rgba(0,0,0,0.06);
                    ">
                        <div style="display: flex; align-items: center; margin-bottom: 12px;">
                            <h3 style="
                                margin: 0 0 0 14px;
                                font-size: 18px; 
                                color: #111827; 
                                font-weight: 600;
                            ">
                                Escalation Workflow Summary
                            </h3>
                        </div>
                        <p style="
                            font-size: 15px; 
                            color: #374151; 
                            line-height: 1.7; 
                            margin-bottom: 18px;
                        ">
                            To maintain high service quality, the complaint system performs an automatic
                            review every 24 hours. Any complaint that remains <strong>unresolved</strong> beyond
                            the allowed threshold is escalated to your assigned escalation managers.
                        </p>
                        <div style="
                            background: #fff;
                            border-radius: 10px;
                            border: 1px solid #e5e7eb;
                            padding: 18px 22px;
                            margin-top: 10px;
                            box-shadow: inset 0 0 0 1px #f3f4f6;
                        ">
                            <ul style="margin: 0; padding-left: 18px; color: #4b5563; font-size: 14px; line-height: 1.7;">
                                <li><strong>24-Hour Rule:</strong> Any complaint still in <em>open</em> status after 24 hours is escalated.</li>
                                <li><strong>Escalation Levels:</strong> Complaints move to the next escalation tier based on system configuration.</li>
                                <li><strong>Manager Notification:</strong> All escalation managers receive a consolidated daily report.</li>
                                <li><strong>Auto-Assignment:</strong> Unassigned complaints are highlighted to avoid bottlenecks.</li>
                            </ul>
                        </div>
                        <p style="
                            margin-top: 18px;
                            font-size: 14px;
                            color: #6b7280;
                        ">
                            Staying aligned with the escalation workflow ensures faster resolutions and improved customer satisfaction.
                        </p>
                    </div>
                </div>
                <div class="footer">
                    <p>This is an automated daily escalation report from your Nefacabs</p>
                </div>
            </div>
        </body>
        </html>
    `;
    // Send to all managers
    for(const manager of managers){
        try{
            const mailOptions = {
                from: process.env.SMTP_FROM || '"Support Team" <support@yourapp.com>',
                to: manager.email,
                subject: `Complaint Escalation Report: ${complaints.length} Open Complaint${complaints.length > 1 ? 's' : ''} Require Attention`,
                html: emailContent
            };
            await transporter.sendMail(mailOptions);
            results.sent++;
            console.log(`✅ Consolidated escalation email sent to ${manager.name} (${manager.email})`);
        }catch(error){
            results.failed++;
            results.errors.push({
                manager: manager.email,
                error: error.message
            });
            console.error(`❌ Failed to send email to ${manager.email}:`, error.message);
        }
    }
    return results;
}

// Manual trigger for testing
async function manualEscalationCheck(){
    return await processBulkEscalation();
}

async function shutdownEscalationQueue(){
    try{
        if(escalationWorker){
            await escalationWorker.close();
        }
        if(complaintEscalationQueue){
            await complaintEscalationQueue.close();
        }
        console.log("✅ Complaint escalation queue shut down successfully");
    }catch(error){
        console.error("❌ Error during escalation queue shutdown:", error);
    }
}

module.exports = {
    initializeComplaintEscalationQueue,
    processBulkEscalation,
    manualEscalationCheck,
    shutdownEscalationQueue
};