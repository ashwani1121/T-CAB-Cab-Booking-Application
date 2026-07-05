const { sequelize, Sequelize }  = require('../config/db');
const User                      = require('./userModel');
const Role                      = require('./roleModel');
const UserRole                  = require('./userRoleModel');
const Trips                     = require('./tripsModel');
const Settings                  = require('./settingsModel');
const Vehicles                  = require('./vehiclesModel');
const Vehicletypes              = require('./vehicleTypesModel');
const Vehicleprices             = require('./vehiclePricesModel');
const Coupon                    = require('./couponsModel');
const RefreshToken              = require('./refreshTokenModel'); 
const DriverDetails             = require('./driverDetailsModel');
const DriverDeposit             = require('./driverDepositModel');
const DriverLocation            = require('./driverLocationModel');
const RideRequests              = require('./rideRequestModel'); 
const UserCoupons               = require('./userCouponsModel');
const PromoUsages               = require('./promoUsagesModel');
const SavedAddress              = require('./savedAddressModel');
const Feedback                  = require('./feedbackModel');
const Wallets                   = require('./walletModel');
const WalletTransactions        = require('./walletTransactionsModel');
const Services                  = require('./servicesModel');
const Sos                       = require('./sosModel');
const Permission                = require('./permissionModel');
const Notification              = require('./notificationModel');
const State                     = require('./stateModel');
const Package                   = require('./packagesModel');
const ReservationAdvancePayment = require('./reservationAdvancePaymentModel');
const CancellationPolicy        = require('./cancellationPolicyModel');
const RidePaymentOrder          = require('./ridePaymentOrderModel'); 
const BankDetails               = require('./bankDetailsModel'); 
const catComplaint              = require('./catComplaintsModel'); 
const subCatComplaint           = require('./subCatComplaintsModel'); 
const Complaint                 = require('./complaintsModel'); 
const ComplaintAssignment       = require('./complainAssignmentModel'); 
const Subscription              = require('./subscriptionsModel'); 
const DriverSubscriptions       = require('./driverSubscriptionsModel');
const SubscriptionUsageHistory  = require('./subscriptionUsageHistoryModel');
const Licensing                 = require('./licensingModel'); 
const Otp                       = require('./otpModel'); 

// USER-ROLE ASSOCIATIONS
User.belongsToMany(Role, {
    through: UserRole,
    foreignKey: 'user_id',
    otherKey: 'role_id',
});

Role.belongsToMany(User, {
    through: UserRole,
    foreignKey: 'role_id',
    otherKey: 'user_id',
});

// DIRECT USERROLE ASSOCIATIONS
User.hasMany(UserRole, {
    foreignKey: 'user_id',
    sourceKey: 'id',
});

UserRole.belongsTo(User, {
    foreignKey: 'user_id',
    targetKey: 'id',
});

Role.hasMany(UserRole, {
    foreignKey: 'role_id',
    sourceKey: 'id',
});

UserRole.belongsTo(Role, {
    foreignKey: 'role_id',
    targetKey: 'id',
});

// REFRESH TOKEN ASSOCIATIONS
User.hasMany(RefreshToken, {
    foreignKey: 'user_id',
    sourceKey: 'id',
    onDelete: 'CASCADE',
});

RefreshToken.belongsTo(User, {
    foreignKey: 'user_id',
    targetKey: 'id',
});

// VEHICLE AND VEHICLE TYPES ASSOCIATIONS
Vehicles.hasMany(Vehicletypes, {
    foreignKey: 'vehicle_id',
    sourceKey: 'id',
});

Vehicletypes.belongsTo(Vehicles, {
    foreignKey: 'vehicle_id',
    targetKey: 'id',
});

// VEHICLE TYPES AND VEHICLE PRICES ASSOCIATIONS
Vehicletypes.hasMany(Vehicleprices, {
    foreignKey: 'vehicle_type_id',
    sourceKey: 'id',
    as: 'prices'
});

Vehicleprices.belongsTo(Vehicletypes, {
    foreignKey: 'vehicle_type_id',
    targetKey: 'id',
    as: 'vehicleType'
});

// TRIPS AND VEHICLE PRICES ASSOCIATIONS
Trips.hasMany(Vehicleprices, {
    foreignKey: 'trip_id',
    sourceKey: 'id',
    as: 'Vehicleprices'
});

Vehicleprices.belongsTo(Trips, {
    foreignKey: 'trip_id',
    targetKey: 'id',
    as: 'trip'
});

// STATE AND VEHICLE PRICES ASSOCIATIONS
State.hasMany(Vehicleprices, {
    foreignKey: 'state_id',
    sourceKey: 'id',
    as: 'Vehicleprices'
});

Vehicleprices.belongsTo(State, {
    foreignKey: 'state_id',
    targetKey: 'id',
    as: 'state'
});

// STATE ASSOCIATIONS FOR RIDE REQUESTS
State.hasMany(RideRequests, {
    foreignKey: 'pickup_state_id',
    sourceKey: 'id',
    as: 'pickupRides'
});

RideRequests.belongsTo(State, {
    foreignKey: 'pickup_state_id',
    targetKey: 'id',
    as: 'pickupState'
});

State.hasMany(RideRequests, {
    foreignKey: 'dropoff_state_id',
    sourceKey: 'id',
    as: 'dropRides'
});

RideRequests.belongsTo(State, {
    foreignKey: 'dropoff_state_id',
    targetKey: 'id',
    as: 'dropState'
});

// DRIVER DETAILS ASSOCIATIONS
User.hasOne(DriverDetails, {
    foreignKey: 'user_id',
    sourceKey: 'id',
    onDelete: 'CASCADE',
});

DriverDetails.belongsTo(User, {
    foreignKey: 'user_id',
    targetKey: 'id',
    as: 'user'
});

// DRIVERDETAILS TO VEHICLES ASSOCIATION
Vehicles.hasMany(DriverDetails, {
    foreignKey: 'vehicle_id',
    sourceKey: 'id',
});

DriverDetails.belongsTo(Vehicles, {
    foreignKey: 'vehicle_id',
    targetKey: 'id',
    as: 'vehicle',
});

// DRIVER DETAILS TO VEHICLE TYPE ASSOCIATIONS
Vehicletypes.hasMany(DriverDetails, {
    foreignKey: 'vehicle_type_id',
    sourceKey: 'id',
});

DriverDetails.belongsTo(Vehicletypes, {
    foreignKey: 'vehicle_type_id',
    targetKey: 'id',
    as: 'vehicleType',
});

// DRIVER LOCATION ASSOCIATIONS
User.hasOne(DriverLocation, {
    foreignKey: 'driver_id',
    sourceKey: 'id',
    onDelete: 'CASCADE',
});

DriverLocation.belongsTo(User, {
    foreignKey: 'driver_id',
    targetKey: 'id',
    as: 'driver',
});

// RIDE REQUESTS ASSOCIATIONS
User.hasMany(RideRequests, {
    foreignKey: 'user_id',
    sourceKey: 'id',
    onDelete: 'CASCADE',
});

RideRequests.belongsTo(User, {
    foreignKey: 'user_id',
    targetKey: 'id',
    as: 'passenger', 
});

// DRIVER ASSOCIATIONS 
RideRequests.belongsTo(User, {
    foreignKey: 'driver_id',
    targetKey: 'id',
    as: 'driver',
});

User.hasMany(RideRequests, {
    foreignKey: 'driver_id',
    sourceKey: 'id',
    as: 'assignedRides',
});

// TRIP ASSOCIATIONS
Trips.hasMany(RideRequests, {
    foreignKey: 'trip_id',
    sourceKey: 'id',
});

RideRequests.belongsTo(Trips, {
    foreignKey: 'trip_id',
    targetKey: 'id',
    as: 'trip',
});

// VEHICLE TYPE ASSOCIATIONS FOR RIDE REQUESTS
Vehicletypes.hasMany(RideRequests, {
    foreignKey: 'vehicle_type_id',
    sourceKey: 'id',
});

RideRequests.belongsTo(Vehicletypes, {
    foreignKey: 'vehicle_type_id',
    targetKey: 'id',
    as: 'vehicleType',
});

// COUPON ASSOCIATIONS
Coupon.hasMany(RideRequests, {
    foreignKey: 'coupon_id',
    sourceKey: 'id',
});

RideRequests.belongsTo(Coupon, {
    foreignKey: 'coupon_id',
    targetKey: 'id',
    as: 'coupon',
});

// USER COUPONS ASSOCIATIONS
User.hasMany(UserCoupons, {
    foreignKey: 'user_id',
    sourceKey: 'id',
    onDelete: 'CASCADE'
});

UserCoupons.belongsTo(User, {
    foreignKey: 'user_id',
    targetKey: 'id',
    as: 'user'
});

Coupon.hasMany(UserCoupons, {
    foreignKey: 'promo_id',
    sourceKey: 'id',
    onDelete: 'CASCADE'
});

UserCoupons.belongsTo(Coupon, {
    foreignKey: 'promo_id',
    targetKey: 'id',
    as: 'promo' 
});

// PROMO USAGES ASSOCIATIONS
User.hasMany(PromoUsages, {
    foreignKey: 'user_id',
    sourceKey: 'id',
    onDelete: 'CASCADE'
});

PromoUsages.belongsTo(User, {
    foreignKey: 'user_id',
    targetKey: 'id',
    as: 'user'
});

Coupon.hasMany(PromoUsages, {
    foreignKey: 'promo_id',
    sourceKey: 'id',
    onDelete: 'CASCADE'
});

PromoUsages.belongsTo(Coupon, {
    foreignKey: 'promo_id',
    targetKey: 'id',
    as: 'promo'
});

RideRequests.hasMany(PromoUsages, {
    foreignKey: 'ride_id',
    sourceKey: 'id',
    onDelete: 'CASCADE'
});

PromoUsages.belongsTo(RideRequests, {
    foreignKey: 'ride_id',
    targetKey: 'id',
    as: 'ride'
});

// SAVED ADDRESS ASSOCIATIONS
User.hasMany(SavedAddress, {
    foreignKey: 'user_id',
    sourceKey: 'id',
    onDelete: 'CASCADE',
    as: 'savedAddresses'
});

SavedAddress.belongsTo(User, {
    foreignKey: 'user_id',
    targetKey: 'id',
    as: 'owner' 
});

// WALLET ASSOCIATIONS
User.hasOne(Wallets, {
    foreignKey: 'user_id',
    sourceKey: 'id',
    onDelete: 'CASCADE'
});

Wallets.belongsTo(User, {
    foreignKey: 'user_id',
    targetKey: 'id',
    as: 'user'
});

// WALLET TRANSACTIONS ASSOCIATIONS
Wallets.hasMany(WalletTransactions, {
    foreignKey: 'wallet_id',
    sourceKey: 'id',
    onDelete: 'CASCADE'
});

WalletTransactions.belongsTo(Wallets, {
    foreignKey: 'wallet_id',
    targetKey: 'id',
    as: 'wallet'
});

User.hasMany(WalletTransactions, {
    foreignKey: 'user_id',
    sourceKey: 'id',
    onDelete: 'CASCADE'
});

WalletTransactions.belongsTo(User, {
    foreignKey: 'user_id',
    targetKey: 'id',
    as: 'user'
});

// SOS ASSOCIATIONS
Sos.belongsTo(User, {
    foreignKey: 'user_id',
    targetKey: 'id',
    as: 'passenger'
});

Sos.belongsTo(RideRequests, {
    foreignKey: 'ride_request_id',
    targetKey: 'id',
    as: 'rideRequest'
});

User.hasMany(Sos, {
    foreignKey: 'user_id',
    sourceKey: 'id',
    as: 'sosReports'
});

RideRequests.hasMany(Sos, {
    foreignKey: 'ride_request_id',
    sourceKey: 'id',
    as: 'sosAlerts'
});

// PERMISSION ASSOCIATIONS
Permission.belongsTo(Role, {
    foreignKey: 'role_id',
    as: 'role'
});

Role.hasMany(Permission, {
    foreignKey: 'role_id',
    as: 'permissions'
});

// NOTIFICATION ASSOCIATIONS
User.hasMany(Notification, {
    foreignKey: 'user_id',
    sourceKey: 'id',
    onDelete: 'CASCADE'
});

Notification.belongsTo(User, {
    foreignKey: 'user_id',
    targetKey: 'id',
    as: 'user'
});

// DRIVER DEPOSIT TRANSACTION ASSOCIATIONS
User.hasMany(DriverDeposit, {
    foreignKey: 'driver_id',
    sourceKey: 'id',
    onDelete: 'CASCADE',
    as: 'depositTransactions'
});

DriverDeposit.belongsTo(User, {
    foreignKey: 'driver_id',
    targetKey: 'id',
    as: 'driver'
});

RideRequests.hasMany(DriverDeposit, {
    foreignKey: 'ride_request_id',
    sourceKey: 'id',
    onDelete: 'SET NULL',
    as: 'depositTransactions'
});

DriverDeposit.belongsTo(RideRequests, {
    foreignKey: 'ride_request_id',
    targetKey: 'id',
    as: 'rideRequest'
});

// PACKAGE AND VEHICLE PRICES ASSOCIATIONS
Package.hasMany(Vehicleprices, {
    foreignKey: 'package_id',
    sourceKey: 'id',
    as: 'vehiclePrices'
});

Vehicleprices.belongsTo(Package, {
    foreignKey: 'package_id',
    targetKey: 'id',
    as: 'package'
});

// PACKAGE AND RIDE REQUESTS ASSOCIATIONS
Package.hasMany(RideRequests, {
    foreignKey: 'package_id',
    sourceKey: 'id',
    as: 'rideRequests'
});

RideRequests.belongsTo(Package, {
    foreignKey: 'package_id',
    targetKey: 'id',
    as: 'package'
});

// RESERVATION ADVANCE PAYMENT ASSOCIATIONS
User.hasMany(ReservationAdvancePayment, {
    foreignKey: 'user_id',
    sourceKey: 'id',
    onDelete: 'CASCADE',
    as: 'advancePayments'
});

ReservationAdvancePayment.belongsTo(User, {
    foreignKey: 'user_id',
    targetKey: 'id',
    as: 'user'
});

Package.hasMany(ReservationAdvancePayment, {
    foreignKey: 'package_id',
    sourceKey: 'id',
    as: 'advancePayments'
});

ReservationAdvancePayment.belongsTo(Package, {
    foreignKey: 'package_id',
    targetKey: 'id',
    as: 'package'
});

Vehicletypes.hasMany(ReservationAdvancePayment, {
    foreignKey: 'vehicle_type_id',
    sourceKey: 'id',
    as: 'advancePayments'
});

ReservationAdvancePayment.belongsTo(Vehicletypes, {
    foreignKey: 'vehicle_type_id',
    targetKey: 'id',
    as: 'vehicleType'
});

RideRequests.hasOne(ReservationAdvancePayment, {
    foreignKey: 'ride_request_id',
    sourceKey: 'id',
    as: 'advancePayment'
});

ReservationAdvancePayment.belongsTo(RideRequests, {
    foreignKey: 'ride_request_id',
    targetKey: 'id',
    as: 'rideRequest'
});

// ============================================================
// RIDE PAYMENT ORDER ASSOCIATIONS
// ============================================================
RideRequests.hasMany(RidePaymentOrder, {
    foreignKey: 'ride_request_id',
    sourceKey: 'id',
    as: 'paymentOrders'
});

RidePaymentOrder.belongsTo(RideRequests, {
    foreignKey: 'ride_request_id',
    targetKey: 'id',
    as: 'rideRequest'
});

// BANK DETAILS ASSOCIATIONS
User.hasMany(BankDetails, {
    foreignKey: 'user_id',
    sourceKey: 'id',
    onDelete: 'CASCADE',
    as: 'bankDetails'
});

BankDetails.belongsTo(User, {
    foreignKey: 'user_id',
    targetKey: 'id',
    as: 'user'
});

// CATEGORY COMPLAINTS ASSOCIATIONS
User.hasMany(catComplaint, {
    foreignKey: 'created_by',
    sourceKey: 'id',
    as: 'createdCategories'
});

catComplaint.belongsTo(User, {
    foreignKey: 'created_by',
    targetKey: 'id',
    as: 'creator'
});

User.hasMany(catComplaint, {
    foreignKey: 'updated_by',
    sourceKey: 'id',
    as: 'updatedCategories'
});

catComplaint.belongsTo(User, {
    foreignKey: 'updated_by',
    targetKey: 'id',
    as: 'updater'
});

// SUBCATEGORY COMPLAINTS ASSOCIATIONS
catComplaint.hasMany(subCatComplaint, {
    foreignKey: 'category_id',
    sourceKey: 'id',
    as: 'subcategories'
});

subCatComplaint.belongsTo(catComplaint, {
    foreignKey: 'category_id',
    targetKey: 'id',
    as: 'category'
});

User.hasMany(subCatComplaint, {
    foreignKey: 'created_by',
    sourceKey: 'id',
    as: 'createdSubcategories'
});

subCatComplaint.belongsTo(User, {
    foreignKey: 'created_by',
    targetKey: 'id',
    as: 'creator'
});

User.hasMany(subCatComplaint, {
    foreignKey: 'updated_by',
    sourceKey: 'id',
    as: 'updatedSubcategories'
});

subCatComplaint.belongsTo(User, {
    foreignKey: 'updated_by',
    targetKey: 'id',
    as: 'updater'
});

// COMPLAINT ASSOCIATIONS
User.hasMany(Complaint, {
    foreignKey: 'user_id',
    sourceKey: 'id',
    onDelete: 'CASCADE',
    as: 'complaints'
});

Complaint.belongsTo(User, {
    foreignKey: 'user_id',
    targetKey: 'id',
    as: 'passenger'
});

User.hasMany(Complaint, {
    foreignKey: 'resolved_by',
    sourceKey: 'id',
    as: 'resolvedComplaints'
});

Complaint.belongsTo(User, {
    foreignKey: 'resolved_by',
    targetKey: 'id',
    as: 'resolver'
});

User.hasMany(Complaint, {
    foreignKey: 'created_by',
    sourceKey: 'id',
    as: 'createdComplaints'
});

Complaint.belongsTo(User, {
    foreignKey: 'created_by',
    targetKey: 'id',
    as: 'creator'
});

User.hasMany(Complaint, {
    foreignKey: 'updated_by',
    sourceKey: 'id',
    as: 'updatedComplaints'
});

Complaint.belongsTo(User, {
    foreignKey: 'updated_by',
    targetKey: 'id',
    as: 'updater'
});

catComplaint.hasMany(Complaint, {
    foreignKey: 'category_id',
    sourceKey: 'id',
    as: 'complaints'
});

Complaint.belongsTo(catComplaint, {
    foreignKey: 'category_id',
    targetKey: 'id',
    as: 'category'
});

subCatComplaint.hasMany(Complaint, {
    foreignKey: 'subcategory_id',
    sourceKey: 'id',
    as: 'complaints'
});

Complaint.belongsTo(subCatComplaint, {
    foreignKey: 'subcategory_id',
    targetKey: 'id',
    as: 'subcategory'
});

// Ride Request association
RideRequests.hasMany(Complaint, {
    foreignKey: 'ride_id',
    sourceKey: 'id',
    as: 'complaints'
});

Complaint.belongsTo(RideRequests, {
    foreignKey: 'ride_id',
    targetKey: 'id',
    as: 'ride'
});

// COMPLAINT ASSIGNMENT ASSOCIATIONS

// Complaint to ComplaintAssignment (one-to-many)
Complaint.hasMany(ComplaintAssignment, {
    foreignKey: 'complaint_id',
    sourceKey: 'id',
    as: 'assignments',
    onDelete: 'CASCADE'
});

ComplaintAssignment.belongsTo(Complaint, {
    foreignKey: 'complaint_id',
    targetKey: 'id',
    as: 'complaint'
});

// ComplaintAssignment to User (assigned_to) - who is assigned the complaint
User.hasMany(ComplaintAssignment, {
    foreignKey: 'assigned_to',
    sourceKey: 'id',
    as: 'assignedComplaints'
});

ComplaintAssignment.belongsTo(User, {
    foreignKey: 'assigned_to',
    targetKey: 'id',
    as: 'assignedUser'
});

// ComplaintAssignment to User (assigned_by) - who made the assignment
User.hasMany(ComplaintAssignment, {
    foreignKey: 'assigned_by',
    sourceKey: 'id',
    as: 'complaintAssignmentsMade'
});

ComplaintAssignment.belongsTo(User, {
    foreignKey: 'assigned_by',
    targetKey: 'id',
    as: 'assignedByUser'
});

// Also need to add owner_id association for Complaint (if not already present)
User.hasMany(Complaint, {
    foreignKey: 'owner_id',
    sourceKey: 'id',
    as: 'ownedComplaints'
});

Complaint.belongsTo(User, {
    foreignKey: 'owner_id',
    targetKey: 'id',
    as: 'owner'
});

// ============================================================
// SUBSCRIPTION ASSOCIATIONS
// ============================================================

// User to DriverSubscriptions (one-to-many)
User.hasMany(DriverSubscriptions, {
    foreignKey: 'driver_id',
    sourceKey: 'id',
    as: 'subscriptions',
    onDelete: 'CASCADE'
});

DriverSubscriptions.belongsTo(User, {
    foreignKey: 'driver_id',
    targetKey: 'id',
    as: 'driver'
});

// Subscription Plan to DriverSubscriptions (one-to-many)
Subscription.hasMany(DriverSubscriptions, {
    foreignKey: 'plan_id',
    sourceKey: 'id',
    as: 'subscriptions'
});

DriverSubscriptions.belongsTo(Subscription, {
    foreignKey: 'plan_id',
    targetKey: 'id',
    as: 'plan'
});

// DriverSubscriptions to SubscriptionUsageHistory (one-to-many)
DriverSubscriptions.hasMany(SubscriptionUsageHistory, {
    foreignKey: 'subscription_id',
    sourceKey: 'id',
    as: 'usageHistory',
    onDelete: 'CASCADE'
});

SubscriptionUsageHistory.belongsTo(DriverSubscriptions, {
    foreignKey: 'subscription_id',
    targetKey: 'id',
    as: 'subscription'
});

// RideRequests to SubscriptionUsageHistory (one-to-many)
RideRequests.hasMany(SubscriptionUsageHistory, {
    foreignKey: 'ride_request_id',
    sourceKey: 'id',
    as: 'subscriptionUsages',
    onDelete: 'CASCADE'
});

SubscriptionUsageHistory.belongsTo(RideRequests, {
    foreignKey: 'ride_request_id',
    targetKey: 'id',
    as: 'ride'
});

// EXPORT MODELS
module.exports = {
    sequelize,
    Sequelize,
    Op: Sequelize.Op,
    User,
    Role,
    UserRole,
    Trips,
    Settings,  
    Vehicles,
    Vehicletypes,
    Vehicleprices,
    Coupon,
    RefreshToken,
    DriverDetails,
    DriverDeposit,
    DriverLocation,
    RideRequests,
    UserCoupons,
    PromoUsages,
    SavedAddress,
    Feedback,
    Wallets,
    WalletTransactions,
    Services,
    Sos,
    Permission,
    Notification,
    State,
    Package,
    ReservationAdvancePayment,
    CancellationPolicy,
    RidePaymentOrder,
    BankDetails,
    catComplaint,
    subCatComplaint,
    Complaint,
    ComplaintAssignment,
    Subscription,
    DriverSubscriptions,
    SubscriptionUsageHistory,
    Licensing,
    Otp  
};