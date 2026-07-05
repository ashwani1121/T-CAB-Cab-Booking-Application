const express                  = require('express');
const cors                     = require('cors');
const dotenv                   = require('dotenv');
const path                     = require('path');
const { sequelize }            = require('./config/db');
const { connectRedis }         = require('./utils/redisClient'); 
const { initializeBullMQ, shutdown: shutdownScheduledRides }          = require('./utils/scheduledRides');
const { initializeComplaintEscalationQueue, shutdownEscalationQueue } = require('./utils/escalationComplaints');
const { initializeSubscriptionQueue, shutdownSubscriptionQueue }      = require('./utils/subscriptionActivation');
const adminRoutes              = require('./routes/admin');
const apiRoutes                = require('./routes/api');
const settingsRoutes           = require('./routes/settings');
const tripsRoutes              = require('./routes/trips');
const vehiclePricesRoutes      = require('./routes/vehiclePrices');
const vehicleTypesRoutes       = require('./routes/vehicleTypes');
const vehicleRoutes            = require('./routes/vehicles');
const couponsRoutes            = require('./routes/coupons');
const driversRoutes            = require('./routes/drivers');
const passengerRoutes          = require('./routes/passenger');
const servicesRoutes           = require('./routes/services');
const sosRoutes                = require('./routes/sos');
const teamRoutes               = require('./routes/team');
const notificationRoutes       = require('./routes/notification');
const rideRequestRoutes        = require('./routes/rideRequest');
const feedbackRoutes           = require('./routes/feedback');
const permissionRoutes         = require('./routes/permission');
const rankingsRoutes           = require('./routes/rankings');
const roleRoutes               = require('./routes/role');
const packageRoutes            = require('./routes/packages');
const earningRoutes            = require('./routes/earnings');
const reservationRoutes        = require('./routes/reservation');
const transactionRoutes        = require('./routes/transactions');
const cancellationPolicyRoutes = require('./routes/cancellationPolicy');
const catComplaintsRoutes      = require('./routes/categoryComplaints');
const subCatComplaintsRoutes   = require('./routes/subCategoryComplaints');
const complaints               = require('./routes/complaints');
const subscriptions            = require('./routes/subscriptions');
const masterSettings           = require('./routes/masterSettings');
const licensing                = require('./routes/licensing');
dotenv.config();
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Serve static files (user-generated files)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve static public assets (frontend files, logos, etc.)
app.use('/public', express.static(path.join(__dirname, 'public')));

// Mount routes
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);
app.use('/admin/settings', settingsRoutes);
app.use('/admin/trips', tripsRoutes);
app.use('/admin/vehicle-types', vehicleTypesRoutes);
app.use('/admin/vehicle-prices', vehiclePricesRoutes);
app.use('/admin/vehicles', vehicleRoutes);
app.use('/admin/coupons', couponsRoutes);
app.use('/admin/passenger', passengerRoutes);
app.use('/admin/drivers', driversRoutes);
app.use('/admin/services', servicesRoutes);
app.use('/admin/sos', sosRoutes);
app.use('/admin/team', teamRoutes);
app.use('/admin/notification', notificationRoutes);
app.use('/admin/ride-requests', rideRequestRoutes);
app.use('/admin/feedback', feedbackRoutes);
app.use('/admin/permission', permissionRoutes);
app.use('/admin/rankings', rankingsRoutes);
app.use('/admin/role', roleRoutes);
app.use('/admin/packages', packageRoutes);
app.use('/admin/earnings', earningRoutes);
app.use('/admin/reservation', reservationRoutes);
app.use('/admin/transactions', transactionRoutes);
app.use('/admin/cancellation-policy', cancellationPolicyRoutes); 
app.use('/admin/category-complaints', catComplaintsRoutes); 
app.use('/admin/subcategory-complaints', subCatComplaintsRoutes);
app.use('/admin/complaints', complaints); 
app.use('/admin/subscriptions', subscriptions);
app.use('/admin/master-settings', masterSettings);
app.use('/admin/licensing', licensing);
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        message: 'Route not found' 
    });
});
// Connect to database and start server
const startServer = async () => {
    try{
        await sequelize.authenticate();
        console.log('✅ Database connected');
        // await sequelize.sync({}); // {alter : true}
        await connectRedis(); 
        await initializeBullMQ();
        await initializeComplaintEscalationQueue();
        await initializeSubscriptionQueue();
        const port = process.env.PORT || 5000;
        app.listen(port, '0.0.0.0', () => {
            console.log(`✅ Server running on port ${port}`);
        });
    }catch(err){
        console.error('❌ DB error:', err);
        process.exit(1);
    }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    await shutdownScheduledRides();
    await shutdownEscalationQueue();
    await shutdownSubscriptionQueue(); 
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully...');
    await shutdownScheduledRides();
    await shutdownEscalationQueue();
    await shutdownSubscriptionQueue();
    process.exit(0);
});

startServer();