const { sequelize, Sequelize, User, UserRole, Role, Trips, Package, State, SavedAddress, RideRequests, Vehicletypes, Vehicleprices, DriverDetails, Settings } = require('../../models');
const apiController   = require('./apiController');
const { Op }          = require('sequelize');
const puppeteer       = require("puppeteer");
const fs              = require('fs');
const path            = require('path');
const crypto          = require('crypto');
const FirebaseService = require('../../services/firebase'); 
const BASE_URL        = process.env.BASE_URL || 'http://localhost:5000';
const userController  = {

    // Mobile app calls this when user clicks "Share My Ride" button
    generateShareLink: async(req, res) => {
        try{
            const { rideId } = req.params;
            const userId     = req.user.userId; 
            const ride       = await RideRequests.findOne({
                where: { 
                    id: rideId,
                    user_id: userId 
                }
            });
            if(!ride){
                return res.status(404).json({
                    success: false,
                    message: 'Ride not found or you do not have permission'
                });
            }
            // Check if ride is in shareable state
            const shareableStatuses = ['accepted', 'arrived', 'ride_started'];
            if(!shareableStatuses.includes(ride.status)){
                return res.status(403).json({
                    success: false,
                    message: 'Can only share active rides'
                });
            }
            // Generate new token if doesn't exist
            let shareToken = ride.share_token;
            console.log("Existing share token:", shareToken, ride.is_sharing_enabled);
            if(!shareToken || !ride.is_sharing_enabled){
                shareToken = crypto.randomBytes(32).toString('hex');
                console.log("Generated share token:", shareToken);
                await ride.update({
                    share_token: shareToken,
                    share_token_created_at: new Date(),
                    is_sharing_enabled: true
                });
            }
            // Return the shareable URL that opens in browser
            const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
            const shareUrl     = `${FRONTEND_URL}/ride/share/${shareToken}`;
            return res.status(200).json({
                success: true,
                message: 'Share link generated',
                data: {
                    shareUrl, 
                    shareToken
                }
            });
        }catch(err){
            console.error('Failed to generate share link:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong!',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    },

    // View Shared Ride - ONLY for ONGOING rides
    shareRideDetails: async(req, res) => {
        try{
            const { shareToken } = req.params;
            const ride = await RideRequests.findOne({
                where: { 
                    share_token: shareToken,
                    is_sharing_enabled: true 
                },
                include: [
                    {
                        model: User,
                        as: 'passenger',
                        attributes: ['id', 'name', 'mobile', 'email']
                    },
                    {
                        model: User,
                        as: 'driver',
                        attributes: ['id', 'name', 'mobile', 'profile', 'email'],
                        include: [{
                            model: DriverDetails,
                            as: 'DriverDetail',
                            attributes: ['vehicle_number', 'rating']
                        }]
                    },
                    {
                        model: Vehicletypes,
                        as: 'vehicleType',
                        attributes: ['id', 'name', 'image', 'capacity']
                    },
                    {
                        model: Trips,
                        as: 'trip',
                        attributes: ['id', 'trip']
                    },
                    {
                        model: Package,
                        as: 'package',
                        attributes: ['id', 'name', 'km', 'advance']
                    }
                ]
            });

            if(!ride){
                return res.status(404).json({
                    success: false,
                    message: 'Ride not found or sharing has been disabled',
                    statusType: 'inactive'
                });
            }
            // ====== STRICT SECURITY & VISIBILITY CHECK ======
            const now                 = new Date();
            const ongoingStatuses     = ['accepted', 'arrived', 'ride_started'];
            const isOngoing           = ongoingStatuses.includes(ride.status);
            // Check if ride is cancelled
            if(ride.status === 'cancelled'){
                return res.status(403).json({
                    success: false,
                    message: 'This ride has been cancelled',
                    statusType: 'cancelled'
                });
            }
            // Check if ride is completed
            if(ride.status === 'ride_completed'){
                const rideCompletedAt = ride.ride_completed_at ? new Date(ride.ride_completed_at) : null;
                // If completed more than 24 hours ago
                if(rideCompletedAt && (now - rideCompletedAt) > (24 * 60 * 60 * 1000)){
                    return res.status(403).json({
                        success: false,
                        message: 'This shared link has expired (24 hours after ride completion)',
                        statusType: 'expired'
                    });
                }
                // If completed within 24 hours
                return res.status(403).json({
                    success: false,
                    message: 'This ride has been completed',
                    statusType: 'completed'
                });
            }
            // Only allow ONGOING rides
            if(!isOngoing){
                return res.status(403).json({
                    success: false,
                    message: 'This ride is not currently active',
                    statusType: 'inactive'
                });
            }
            // Mask sensitive phone numbers (show only last 4 digits)
            const maskPhone = (phone) => {
                if(!phone) return null;
                return `******${phone.slice(-4)}`;
            };
            // Safely get driver location with null check
            let driver_location = null;
            if(ride.driver_id){
                try{
                    driver_location = await FirebaseService.getDriverLocation(ride.driver_id);
                }catch(err){
                    console.warn(`Failed to get driver location for driver_id ${ride.driver_id}:`, err.message);
                }
            }
            const rideData              = {
                id                      : ride.id,
                status                  : ride.status,
                trip                    : ride.trip ? ride.trip.trip : null,
                trip_type               : ride.trip_type === 1 ? 'intercity' : 'outstation',
                // Pickup Details
                pickup_address          : ride.pickup_address,
                pickup_district         : ride.pickup_district,
                pickup_state            : ride.pickup_state,
                pickup_latitude         : ride.pickup_latitude,
                pickup_longitude        : ride.pickup_longitude,
                // Dropoff Details
                dropoff_address         : ride.dropoff_address,
                dropoff_district        : ride.dropoff_district,
                dropoff_state           : ride.dropoff_state,
                dropoff_latitude        : ride.dropoff_latitude,
                dropoff_longitude       : ride.dropoff_longitude,
                // Stop addresses if any
                stop1_address           : ride.stop1_address,
                stop1_latitude          : ride.stop1_latitude,
                stop1_longitude         : ride.stop1_longitude,
                stop2_address           : ride.stop2_address,
                stop2_latitude          : ride.stop2_latitude,
                stop2_longitude         : ride.stop2_longitude,
                // Distance & Time
                estimated_distance      : ride.estimated_distance,
                actual_distance         : ride.actual_distance,
                estimated_duration      : ride.estimated_duration,
                actual_duration         : ride.actual_duration,
                waiting_time            : ride.waiting_time,
                // Final Payment
                final_fare              : ride.final_fare,
                discount_amount         : ride.discount_amount,
                // Payment
                payment_status          : ride.payment_status,
                payment_method          : ride.payment_method,
                // Timestamps
                requested_at            : ride.requested_at,
                accepted_at             : ride.accepted_at,
                arrived_at              : ride.arrived_at,
                ride_started_at         : ride.ride_started_at,
                ride_completed_at       : ride.ride_completed_at,
                cancelled_at            : ride.cancelled_at,
                cancelled_by            : ride.cancelled_by,
                cancellation_reason     : ride.cancellation_reason,
                // Passenger/Booker Info
                passenger               : ride.passenger ? {
                    id                  : ride.passenger.id,
                    name                : ride.passenger.name,
                    mobile              : maskPhone(ride.passenger.mobile),
                    email               : ride.passenger.email
                } : null,
                // Rider Info (if booking for someone else)
                is_booking_for_other    : ride.is_booking_for_other,
                rider_name              : ride.rider_name,
                rider_mobile            : ride.rider_mobile ? maskPhone(ride.rider_mobile) : null,
                // Driver Info
                driver                  : ride.driver ? {
                    id                  : ride.driver.id,
                    name                : ride.driver.name,
                    mobile              : maskPhone(ride.driver.mobile),
                    email               : ride.driver.email,
                    profile_image       : ride.driver.profile ? `${BASE_URL}/uploads/profile/${ride.driver.profile}` : null,
                    vehicle_number      : ride.driver.DriverDetail?.vehicle_number,
                    rating              : ride.driver.DriverDetail?.rating
                } : null,
                // Vehicle Type
                vehicleType             : ride.vehicleType ? {
                    id                  : ride.vehicleType.id,
                    name                : ride.vehicleType.name,
                    image               : ride.vehicleType.image,
                    capacity            : ride.vehicleType.capacity
                } : null,
                // Package Details (for reservation trips)
                package                 : ride.package ? {
                    id                  : ride.package.id,
                    name                : ride.package.name,
                    km                  : ride.package.km,
                    advance             : ride.package.advance
                } : null,
                is_custom_trip          : ride.is_custom_trip,
                custom_km               : ride.custom_km,
                custom_days             : ride.custom_days,
                
                // Advance Payment Info (for reservation trips)
                advance_payment_id      : ride.advance_payment_id,
                advance_paid_amount     : ride.advance_paid_amount,
                remaining_fare_to_pay   : ride.remaining_fare_to_pay,
                is_advance_paid         : ride.is_advance_paid,
                // Scheduled Ride Info
                is_scheduled            : ride.is_scheduled,
                pickup_date             : ride.pickup_date,
                pickup_time             : ride.pickup_time
            };
            // Safely assign driver location with fallback to null
            if(rideData.driver && ride.driver_id){
                try{
                    const driver_location     = await FirebaseService.getDriverLocation(ride.driver_id);
                    rideData.driver.latitude  = driver_location?.current_latitude || null;
                    rideData.driver.longitude = driver_location?.current_longitude || null;
                }catch(err){
                    console.warn(`Failed to get driver location for driver_id ${ride.driver_id}`);
                }
            }
            res.status(200).json({
                success: true,
                message: 'Ride details retrieved successfully',
                data: rideData
            });
        }catch(err){
            console.error('Failed to share ride details:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    },

    // Get Invoice
    getInvoice: async(req, res) => {
        try{
            const { rideId } = req.params;
            if(!req.user || !req.user.userId){
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized: User not authenticated'
                });
            }
            const userId = req.user.userId;
            if(!userId || !Number.isInteger(userId)){
                return res.status(400).json({
                    success: false,
                    message: 'Valid User ID is required'
                });
            }
            // Check if user exists and has proper role
            const user = await User.findByPk(userId);
            if(!user){
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            // Validate ride ID
            if(!rideId || isNaN(rideId)){
                return res.status(400).json({
                    success: false,
                    message: 'Valid ride ID is required'
                });
            }
            // Get detailed ride information
            const ride = await RideRequests.findOne({
                where: {
                    id: rideId,
                    user_id: userId 
                },
                include: [
                    {
                        model: User,
                        as: 'passenger',
                        attributes: ['id', 'name', 'email', 'mobile']
                    },
                    {
                        model: User,
                        as: 'driver',
                        attributes: ['id', 'name', 'mobile'],
                        include: [{
                            model: DriverDetails,
                            attributes: ['vehicle_number', 'license_number']
                        }]
                    },
                    {
                        model: Vehicletypes,
                        as: 'vehicleType',
                        attributes: ['name'],
                        include: [{
                            model: Vehicleprices,
                            as: 'prices',
                            attributes: ['igst_rate', 'sgst_rate', 'cgst_rate']
                        }]
                    }
                ]
            });
            if(!ride){
                return res.status(404).json({
                    success: false,
                    message: 'No Ride Found'
                });
            }
            // Only allow invoice generation for completed rides
            if(ride.status !== 'ride_completed'){
                return res.status(400).json({
                    success: false,
                    message: 'Invoice can only be generated for completed rides'
                });
            }
            // Get driver settings for fare and charges policy
            const driverSettings = await Settings.findOne({
                where: { role: 'driver' }
            });
            if(!driverSettings){
                return res.status(500).json({
                    success: false,
                    message: 'Driver settings not found. Please contact support.'
                });
            }
            const tripId                  = ride.trip_id;
            const tripType                = ride.trip_type; // 1=intercity, 2=outstation
            const tripTypeLabel           = ride.trip_id === 1 ? 'One Way' : ride.trip_id === 2 ? 'Round Trip' : 'Reservation';
            const invoiceDate             = new Date(ride.ride_completed_at || ride.created_at);
            const bookingDate             = new Date(ride.requested_at);
            const pickupDate              = new Date(ride.pickup_date || ride.ride_started_at);
            const pickupTime              = ride.pickup_time || (ride.ride_started_at ? new Date(ride.ride_started_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : '');
            const bookingTime             = new Date(ride.requested_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
            const passengerName           = ride.passenger?.name || user.name;
            const passengerEmail          = ride.passenger?.email || user.email;
            const passengerMobile         = ride.passenger?.mobile || user.mobile;
            const riderName               = ride.rider_name;
            const riderMobile             = ride.rider_mobile;
            const isBookingForOther       = ride.is_booking_for_other;
            const customerName            = isBookingForOther ? (riderName || passengerName) : passengerName;
            const driverName              = ride.driver?.name || 'N/A';
            const driverMobile            = ride.driver?.mobile || 'N/A';
            const vehicleNumber           = ride.driver?.DriverDetail?.vehicle_number || 'N/A';
            const licenseNumber           = ride.driver?.DriverDetail?.license_number || 'N/A';
            const vehicleType             = ride.vehicleType?.name || 'N/A';
            const pickupAddress           = ride.pickup_address;
            const pickupDistrict          = ride.pickup_district;
            const pickupState             = ride.pickup_state;
            const dropoffAddress          = ride.dropoff_address;
            const dropoffDistrict         = ride.dropoff_district;
            const dropoffState            = ride.dropoff_state;
            const stop1Address            = ride.stop1_address || null;
            const stop2Address            = ride.stop2_address || null;
            const estimatedDistance       = parseFloat(ride.estimated_distance || 0);
            const actualDistance          = parseFloat(ride.actual_distance || ride.estimated_distance || 0);
            const estimatedDuration       = parseInt(ride.estimated_duration || 0);
            const actualDuration          = parseInt(ride.actual_duration || ride.estimated_duration || 0);
            const waitingTime             = parseInt(ride.waiting_time || 0);
            // Assuming ride.bata_time exists or derive it; fallback to actualDuration for demo
            const bataTime                = parseInt(ride.bata_time || actualDuration || 0);
            const estimatedBaseFare       = parseFloat(ride.estimated_base_fare || 0);
            const estimatedDistanceCharge = parseFloat(ride.estimated_distance_charge || 0);
            const estimatedWaitingCharge  = parseFloat(ride.estimated_waiting_charge || 0);
            const estimatedBataCharge     = parseFloat(ride.estimated_bata_charge || 0);
            const estimatedSubtotal       = parseFloat(ride.estimated_subtotal || 0);
            const estimatedTotalGst       = parseFloat(ride.estimated_total_gst_amount || 0);
            const estimatedIgst           = parseFloat(ride.estimated_igst_amount || 0);
            const estimatedSgst           = parseFloat(ride.estimated_sgst_amount || 0);
            const estimatedCgst           = parseFloat(ride.estimated_cgst_amount || 0);
            const estimatedTotalFare      = parseFloat(ride.estimated_fare || 0);
            const actualBaseFare          = parseFloat(ride.actual_base_fare || estimatedBaseFare);
            const actualDistanceCharge    = parseFloat(ride.actual_distance_charge || estimatedDistanceCharge);
            const actualWaitingCharge     = parseFloat(ride.actual_waiting_charge || 0);
            const actualBataCharge        = parseFloat(ride.actual_bata_charge || estimatedBataCharge);
            const actualSubtotal          = parseFloat(ride.actual_subtotal || estimatedSubtotal);
            const actualTotalGst          = parseFloat(ride.actual_total_gst_amount || estimatedTotalGst);
            const actualIgst              = parseFloat(ride.actual_igst_amount || estimatedIgst);
            const actualSgst              = parseFloat(ride.actual_sgst_amount || estimatedSgst);
            const actualCgst              = parseFloat(ride.actual_cgst_amount || estimatedCgst);
            const actualTotalFare         = parseFloat(ride.actual_fare || estimatedTotalFare);
            const discountAmount          = parseFloat(ride.discount_amount || 0);
            const finalFare               = parseFloat(ride.final_fare || 0);
            const couponCode              = ride.coupon_code || null;
            const paymentMethod           = ride.payment_method || 'cash';
            const paymentStatus           = ride.payment_status;
            const isInterstate            = ride.is_interstate || false;
            const gstType                 = isInterstate ? 'IGST' : 'IGST / SGST / CGST';
            const vehiclePriceData        = ride.vehicleType?.prices?.[0];
            const igstRate                = isInterstate ? parseFloat(vehiclePriceData?.igst_rate || 5.00) : 0;
            const sgstRate                = !isInterstate ? parseFloat(vehiclePriceData?.sgst_rate || 2.50) : 0;
            const cgstRate                = !isInterstate ? parseFloat(vehiclePriceData?.cgst_rate || 2.50) : 0;
            const tollCharge              = 0; 
            const farePolicy              = driverSettings?.fare_charges_policy || 'No policy defined. Please contact support for details.';
            let walletDeducted            = 0;
            let cashPaid                  = 0;
            if(paymentMethod === 'wallet'){
                walletDeducted            = finalFare;
                cashPaid                  = 0;
            }else 
            if(paymentMethod === 'cash'){
                walletDeducted            = 0;
                cashPaid                  = finalFare;
            }else 
            if(paymentMethod === 'easebuzz'){
                walletDeducted            = 0;
                cashPaid                  = finalFare;
            }
            // Date formatting function
            const formatDate = (date) => {
                const day    = date.getDate();
                const month  = date.toLocaleDateString('en-GB', { month: 'long' });
                const year   = date.getFullYear();
                return `${day} ${month}, ${year}`;
            };
            const serviceType = `Cab Services, ${vehicleType}`;
            const invoiceNumber = `INVOICE NO. ${String(ride.id).padStart(5, '0')}`;
            const invoiceDateFormatted = formatDate(invoiceDate);
            // Build fare breakup rows dynamically
            const fareBreakupHtml = `
                <div class="breakup-row">
                    <span class="breakup-label">VEHICLE SEGMENT</span>
                    <span class="breakup-center"></span>
                    <span class="breakup-value">${vehicleType}</span>
                </div>
                <div class="breakup-row">
                    <span class="breakup-label">BASE FARE</span>
                    <span class="breakup-center"></span>
                    <span class="breakup-value">${actualBaseFare.toFixed(2)}</span>
                </div>
                <div class="breakup-row">
                    <span class="breakup-label">RIDE KM BOOKED</span>
                    <span class="breakup-center">${actualDistance.toFixed(1)} km</span>
                    <span class="breakup-value">${actualDistanceCharge.toFixed(2)}</span>
                </div>
                <div class="breakup-row">
                    <span class="breakup-label">WAITING TIME</span>
                    <span class="breakup-center">${waitingTime} min</span>
                    <span class="breakup-value">${actualWaitingCharge.toFixed(2)}</span>
                </div>
                <div class="breakup-row">
                    <span class="breakup-label">Bata Charges</span>
                    <span class="breakup-center">${bataTime} min</span>
                    <span class="breakup-value">${actualBataCharge.toFixed(2)}</span>
                </div>
                <div class="breakup-row">
                    <span class="breakup-label">TOLL / MCD</span>
                    <span class="breakup-center">${tollCharge}</span>
                    <span class="breakup-value">${tollCharge.toFixed(2)}</span>
                </div>
                <div class="breakup-row">
                    <span class="breakup-label">Total TAX</span>
                    <span class="breakup-center" style="font-size: 9px; font-weight: normal;">${gstType}</span>
                    <span class="breakup-value">${actualTotalGst.toFixed(2)}</span>
                </div>
                <div class="breakup-row">
                    <span class="breakup-label" style="font-weight: 600;">TOTAL RIDE FARE</span>
                    <span class="breakup-center"></span>
                    <span class="breakup-value">${finalFare.toFixed(2)}</span>
                </div>
            `;
            const taxBreakupHtml = `
                <div class="tax-row">
                    <span class="tax-label">IGST</span>
                    <span class="tax-rate">${igstRate}%</span>
                    <span class="tax-value">${actualIgst.toFixed(2)}</span>
                </div>
                <div class="tax-row">
                    <span class="tax-label">SGST</span>
                    <span class="tax-rate">${sgstRate}%</span>
                    <span class="tax-value">${actualSgst.toFixed(2)}</span>
                </div>
                <div class="tax-row">
                    <span class="tax-label">CGST</span>
                    <span class="tax-rate">${cgstRate}%</span>
                    <span class="tax-value">${actualCgst.toFixed(2)}</span>
                </div>
            `;
            const templatePath = path.join(__dirname, "../../templates/invoiceTemplate.html");
            let htmlTemplate   = fs.readFileSync(templatePath, "utf-8");
            // Convert images to base64
            const logoPath = path.join(__dirname, '../../public/images/logo.png');
            let logoBase64 = '';
            try{
                const logoBuffer = fs.readFileSync(logoPath);
                logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
            }catch(err){
                console.warn('Could not load logo:', err);
            }
            const bgPath = path.join(__dirname, '../../public/images/invoicebg.png');
            let bgBase64 = '';
            try{
                const bgBuffer = fs.readFileSync(bgPath);
                bgBase64 = `data:image/png;base64,${bgBuffer.toString('base64')}`;
            }catch(err){
                console.warn('Could not load background image:', err);
            }
            const thankBgPath = path.join(__dirname, '../../public/images/thankyoubg.png');
            let thankBgBase64 = '';
            try{
                const thankBgBuffer = fs.readFileSync(thankBgPath);
                thankBgBase64 = `data:image/png;base64,${thankBgBuffer.toString('base64')}`;
            }catch(err){
                console.warn('Could not load thank you background image:', err);
            }
            htmlTemplate = htmlTemplate
            .replace("{{backgroundUrl}}", bgBase64)
            .replace("{{logoUrl}}", logoBase64)
            .replace("{{thankUrl}}", thankBgBase64)
            .replace("{{invoiceNumber}}", invoiceNumber)
            .replace("{{invoiceDate}}", invoiceDateFormatted)
            .replace("{{customerName}}", customerName)
            .replace("{{totalFare}}", finalFare.toFixed(2))
            .replace("{{actualDistance}}", actualDistance.toFixed(2))
            .replace("{{actualDuration}}", actualDuration)
            .replace("{{walletDeducted}}", walletDeducted.toFixed(2))
            .replace("{{cashPaid}}", cashPaid.toFixed(2))
            .replace("{{serviceType}}", serviceType)
            .replace("{{tripId}}", tripId)
            .replace("{{bookingDate}}", formatDate(bookingDate))
            .replace("{{bookingTime}}", bookingTime)
            .replace("{{pickupDate}}", formatDate(pickupDate))
            .replace("{{pickupTime}}", pickupTime)
            .replace("{{passengerEmail}}", passengerEmail)
            .replace("{{fareBreakupHtml}}", fareBreakupHtml)
            .replace("{{taxBreakupHtml}}", taxBreakupHtml)
            .replace("{{farePolicy}}", farePolicy)
            .replace("{{pickupAddress}}", pickupAddress)
            .replace("{{dropoffAddress}}", dropoffAddress);
            const headerTemplate = `
            <div style="
                width: 100%;
                height: 80px;
                background-image: url('${bgBase64}');
                background-size: cover;
                background-position: center;
                -webkit-print-color-adjust: exact;
                padding: 10px 37.8px;
                display: flex; justify-content: space-between; align-items: center;
            ">
                <img src="${logoBase64}" style="height: 40px;" />
                <div style="text-align:right; color:#1F1E1A;">
                    <div style="font-weight: bold; font-size: 11px;">${invoiceNumber}</div>
                    <div style="font-size: 9px;">${invoiceDateFormatted}</div>
                </div>
            </div>`;
            const footerTemplate = `
            <div style="
                width: 100%;
                height: 120px;
                background-image: url('${bgBase64}');
                background-size: cover;
                background-position: center;
                -webkit-print-color-adjust: exact;
                padding: 10px 37.8px;
                color:#1F1E1A;
            ">
                <div style="display:flex; justify-content:space-between; font-size:9px;">
                    <div>
                        <p>D Sector, Court Street Road, Naharlgaon,<br/>Arunachal Pradesh – 791110</p>
                        <p>+91 9722808835</p>
                        <p>support@nefacabs.com</p>
                        <p>www.nefacabs.com</p>
                    </div>
                    <div style="text-align:right;">
                        <p>GSTIN: 12AAJCN9280Q1Z8</p>
                        <p>CIN: U79100AR2023PTC014852</p>
                        <p>TAN: SPLN04742D</p>
                        <p>PAN: AAJCN9280Q</p>
                    </div>
                </div>
            </div>`;
            // Save debug file
            const combinedHtml = `
            <!DOCTYPE html>
            <html>
            <head><title>Invoice Debug</title></head>
            <body>
            ${headerTemplate}
            ${htmlTemplate}
            ${footerTemplate}
            </body></html>`;
            fs.writeFileSync("invoice_debug.html", combinedHtml);
            console.log("🔥 Debug HTML saved at → invoice_debug.html");
            let browser;
            try{
                browser = await puppeteer.launch({
                    headless: true,
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                });
            }catch(err){
                console.warn('⚠️ Puppeteer default launch failed, trying system Chrome...', err);
                browser = await puppeteer.launch({
                    headless: true,
                    executablePath: '/usr/bin/google-chrome',
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                });
            }
            const page = await browser.newPage();
            await page.setViewport({ width: 1240, height: 1754 });
            await page.setContent(htmlTemplate, { waitUntil: 'networkidle0' });
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                displayHeaderFooter: true,
                margin: {
                    top: '28mm',      
                    bottom: '32mm', 
                    left: '0mm',
                    right: '0mm'
                },
                headerTemplate,
                footerTemplate
            });
            await browser.close();
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=Invoice_${ride.id}.pdf`);
            res.send(pdfBuffer);
        }catch(err){
            console.error('Failed to download invoice:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },

    // User Profile
    userProfile: async(req, res) => {
        try{
            if(!req.user || !req.user.userId){
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized: User not authenticated'
                });
            }
            const userId = req.user.userId;
            if(!userId || !Number.isInteger(userId)){
                return res.status(400).json({
                    success: false,
                    message: 'Valid User ID is required'
                });
            }
            // Check if driver exists and has proper role
            const user = await User.findByPk(userId);
            if(!user){
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            // Check if user has driver role
            const userRole = await UserRole.findOne({
                where: { 
                    user_id: userId,
                    role_id: 2
                },
                include: [{
                    model: Role,
                    attributes: ['id', 'name']
                }]
            });
            if(!userRole){
                return res.status(403).json({
                    success: false,
                    message: 'User is not authorized'
                });
            }
            // Calculate total rides and distance for the user
            const rideStats = await RideRequests.findAll({
                where: {
                    user_id: userId,
                    status: 'ride_completed' 
                },
                attributes: [
                    [sequelize.fn('COUNT', sequelize.col('id')), 'total_rides'],
                    [sequelize.fn('SUM', sequelize.col('actual_distance')), 'total_distance']
                ],
                raw: true
            });
            const totalRides    = parseInt(rideStats[0]?.total_rides) || 0;
            const totalDistance = parseFloat(rideStats[0]?.total_distance) || 0;
            res.status(200).json({
                success             : true,
                message             : 'User Details',
                data                : {
                    name            : user.name,
                    email           : user.email,
                    gender          : user.gender,
                    mobile          : user.mobile,
                    profile         : user.profile ? `${BASE_URL}/uploads/profile/${user.profile}` : null,
                    total_rides     : totalRides,
                    total_distance  : parseFloat(totalDistance.toFixed(2)) 
                }
            });
        }catch(err){
            console.error('Failed to retrieve user profile:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }   
    },

    // User edit profile
    editProfile: async(req, res) => {
        try{
            const { name, email, gender } = req.body;
            if(!req.user || !req.user.userId){
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized: User not authenticated'
                });
            }
            const userId = req.user.userId;
            if(!userId || !Number.isInteger(userId)){
                return res.status(400).json({
                    success: false,
                    message: 'Valid User ID is required'
                });
            }
            // Check if user exists
            const user = await User.findByPk(userId);
            if(!user){
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            // Check if user has proper role
            const userRole = await UserRole.findOne({
                where: { 
                    user_id: userId,
                    role_id: 2
                },
                include: [{
                    model: Role,
                    attributes: ['id', 'name']
                }]
            });
            if(!userRole){
                return res.status(403).json({
                    success: false,
                    message: 'User is not authorized'
                });
            }
            const updateData = {};
            // Validate and add name if provided
            if(name !== undefined){
                if(typeof name !== 'string' || name.trim().length === 0){
                    return res.status(400).json({
                        success: false,
                        message: 'Name must be a non-empty string'
                    });
                }
                updateData.name = name.trim();
            }
            // Validate and add email if provided
            if(email !== undefined){
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if(!emailRegex.test(email)){
                    return res.status(400).json({
                        success: false,
                        message: 'Please provide a valid email address'
                    });
                }
                // Check if email is already taken by another user
                const existingUser = await User.findOne({
                    where: {
                        email: email,
                        id: { [Op.ne]: userId }
                    }
                });
                if(existingUser){
                    return res.status(409).json({
                        success: false,
                        message: 'Email address is already in use'
                    });
                }
                updateData.email = email.toLowerCase().trim();
            }
            // Validate and add gender if provided
            if(gender !== undefined){
                const validGenders = ['male', 'female', 'other'];
                if(!validGenders.includes(gender.toLowerCase())){
                    return res.status(400).json({
                        success: false,
                        message: 'Gender must be one of: male, female, other'
                    });
                }
                updateData.gender = gender.toLowerCase();
            }
            // Handle profile image upload if present
            if(req.file){
                // Delete old profile image if it exists
                if(user.profile){
                    const fs           = require('fs');
                    const path         = require('path');
                    const oldImagePath = path.join(process.cwd(), 'uploads', 'profile', user.profile);
                    if(fs.existsSync(oldImagePath)){
                        try{
                            fs.unlinkSync(oldImagePath);
                        }catch(deleteErr){
                            console.warn('Failed to delete old profile image:', deleteErr);
                        }
                    }
                }
                // Set new profile image filename
                updateData.profile = req.file.filename;
            }
            // If no fields to update
            if(Object.keys(updateData).length === 0){
                return res.status(400).json({
                    success: false,
                    message: 'No valid fields provided for update'
                });
            }
            await user.update(updateData);
            const updatedUser = await User.findByPk(userId);
            res.status(200).json({
                success: true,
                message: 'Profile updated successfully',
                data: {
                    name    : updatedUser.name,
                    email   : updatedUser.email,
                    gender  : updatedUser.gender,
                    profile : updatedUser.profile ? `${BASE_URL}/uploads/profile/${updatedUser.profile}` : null
                }
            });
        }catch(err){
            console.error('Failed to update profile:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },

    // User Register
    userRegistration: async (req, res) => {
        let transaction;
        try{
            const { name, mobile, email, gender, role, fcm_token } = req.body;
            if(!name){
                return res.status(400).json({
                    success: false,
                    message: "Name is required"
                });
            }
            if(!mobile){
                return res.status(400).json({
                    success: false,
                    message: 'Mobile is required',
                });
            }
            if(!email){
                return res.status(400).json({
                    success: false,
                    message: 'Email is required',
                });
            }
            if(!gender || !['Male', 'Female', 'Others'].includes(gender)){
                return res.status(400).json({
                    success: false,
                    message: 'Valid gender is required (Male, Female, Others)',
                });
            }
            if(!role){
                return res.status(400).json({
                    success: false,
                    message: 'Role is required',
                });
            }
            if(!fcm_token){
                return res.status(400).json({
                    success: false,
                    message: 'Fcm token is required',
                });
            }
            // Check if the specified role exists first
            const roleRecord = await Role.findOne({
                where: { name: role, id: 2 },
            });
            if(!roleRecord){
                return res.status(400).json({
                    success: false,
                    message: 'Invalid role specified',
                });
            }
            // Check if email or mobile already exists for THIS SPECIFIC ROLE
            const existingUser = await User.findOne({
                where: {
                    [Sequelize.Op.or]: [{ email }, { mobile }],
                },
                include: [
                    {
                        model: UserRole,
                        where: {
                            role_id: roleRecord.id  
                        },
                        required: true, 
                    },
                ],
            });
            if(existingUser){
                return res.status(400).json({
                    success: false,
                    message: 'Email or mobile number already registered as ' + roleRecord.name,
                });
            }
            transaction = await sequelize.transaction();
            // Create new user
            const newUser = await User.create(
                {
                    name,
                    email,
                    mobile,
                    gender,
                    password: '',
                    fcm_token,
                    status: 1,
                    created_at: new Date(),
                    updated_at: new Date(),
                },
                { transaction }
            );
            // Associate user with the role
            await UserRole.create(
                {
                    user_id: newUser.id,
                    role_id: roleRecord.id,
                    is_primary: 1,
                    created_at: new Date(),
                    updated_at: new Date(),
                },
                { transaction }
            );
            // Generate tokens
            const payload = {
                userId: newUser.id,
                name: newUser.name,
                email: newUser.email,
                mobile: newUser.mobile,
                role: roleRecord.name,
            };
            const accessToken  = apiController.generateAccessToken(payload);
            const refreshToken = apiController.generateRefreshToken();
            await apiController.storeRefreshToken(newUser.id, refreshToken, transaction);
            await transaction.commit();
            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                accessToken,
                refreshToken,
                user: {
                    id: newUser.id,
                    name: newUser.name,
                    email: newUser.email,
                    mobile: newUser.mobile,
                    gender: newUser.gender,
                    role: roleRecord.name,
                },
            });
        }catch(err){
            if(transaction) await transaction.rollback();
            console.error('Register error:', err);
            // Handle unique constraint errors
            if(err.name === 'SequelizeUniqueConstraintError'){
                return res.status(400).json({
                    success: false,
                    message: 'Email or mobile number already registered in the system',
                });
            }
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },

    // Verify User
    verifyUser: async (req, res) => {
        let transaction;
        try{
            const { mobile, fcm_token } = req.body;
            // Validate mobile
            if(!mobile || typeof mobile !== 'string'){
                return res.status(400).json({
                    success: false,
                    message: 'Mobile number is required and must be a string.',
                });
            }
            if(!/^\d{10}$/.test(mobile.trim())){
                return res.status(400).json({
                    success: false,
                    message: 'Mobile number must be a valid 10-digit number.',
                });
            }
            // Validate fcm token
            if(!fcm_token){
                return res.status(400).json({
                    success: false,
                    message: 'Fcm Token is required.',
                });
            }
            // Check if mobile already exists
            const existingUser = await User.findOne({
                where: {
                    mobile,
                },
                include: [
                    {
                        model: UserRole,
                        where: {
                            role_id: 2
                        },
                        include: [
                            {
                                model: Role,
                                attributes: ['id', 'name'],
                            },
                        ],
                    },
                ],
            });
            if(existingUser){
                transaction   = await sequelize.transaction();
                // Update FCM token
                await User.update(
                    { fcm_token, updated_at: new Date() },
                    { where: { id: existingUser.id }, transaction }
                );
                const role    = existingUser.UserRoles[0]?.Role?.name || 'user';
                const payload = {
                    userId: existingUser.id,
                    email: existingUser.email,
                    mobile: existingUser.mobile,
                    role,
                };
                const accessToken  = apiController.generateAccessToken(payload);
                const refreshToken = apiController.generateRefreshToken();
                await apiController.cleanupExpiredTokens(existingUser.id, transaction);
                await apiController.storeRefreshToken(existingUser.id, refreshToken, transaction);
                await transaction.commit();
                return res.status(200).json({
                    success: true,
                    message: 'User verified successfully. Proceed to homepage.',
                    data: {
                        isRegistered: true,
                        accessToken,
                        refreshToken,
                        user: {
                            id: existingUser.id,
                            name: existingUser.name,
                            email: existingUser.email,
                            mobile: existingUser.mobile,
                            role
                        },
                    },
                });
            }else{
                return res.status(200).json({
                    success: true,
                    message: 'Mobile number is available for registration.',
                    data: {
                        isRegistered: false,
                    },
                });
            }
        }catch(err){
            if(transaction) await transaction.rollback();
            console.error('Verify error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },

    // Ride History
    rideHistory: async (req, res) => {
        try{
            const { page = 1, limit = 10 } = req.query;
            if(!req.user || !req.user.userId){
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized: User not authenticated'
                });
            }
            const userId   = req.user.userId;
            const userRole = req.user.role;
            if(!userId || !Number.isInteger(userId)){
                return res.status(400).json({
                    success: false,
                    message: 'Valid User ID is required'
                });
            }
            if(!userRole){
                return res.status(403).json({
                    success: false,
                    message: 'User role not found'
                });
            }
            // Check if user exists
            const user = await User.findByPk(userId);
            if(!user){
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            const isDriver = userRole.toLowerCase() === 'driver';
            const isUser   = userRole.toLowerCase() === 'user';
            if(!isDriver && !isUser){
                return res.status(403).json({
                    success: false,
                    message: 'User is not authorized'
                });
            }
            // Calculate date 30 days ago
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const offset        = (parseInt(page) - 1) * parseInt(limit);
            let whereCondition  = {
                created_at: {
                    [Op.gte]: thirtyDaysAgo
                }
            };
            if(isDriver){
                whereCondition.driver_id = userId;
            }else 
            if(isUser){
                whereCondition.user_id = userId;
            }
            // Add status filter
            const activeStatuses  = ['ride_completed', 'cancelled'];
            whereCondition.status = {
                [Op.in]: activeStatuses
            };
            // Get rides for the last 30 days
            const { count, rows: rides } = await RideRequests.findAndCountAll({
                where: whereCondition,
                attributes: [
                    'id',
                    'user_id',
                    'driver_id',
                    'pickup_address',
                    'pickup_latitude',
                    'pickup_longitude',
                    'dropoff_address',
                    'dropoff_latitude',
                    'dropoff_longitude',
                    'actual_distance',
                    'actual_duration',
                    'final_fare',
                    'status',
                    'requested_at'
                ],
                order: [['created_at', 'DESC']],
                limit: parseInt(limit),
                offset: offset
            });
            if(!rides || rides.length === 0){
                return res.status(200).json({
                    success : false,
                    message : 'No rides found',
                    data    : {
                        rides           : [],
                        pagination      : {
                            currentPage : parseInt(page),
                            totalPages  : 0,
                            totalRides  : 0,
                            limit       : parseInt(limit),
                            hasNextPage : false,
                            hasPrevPage : false
                        }
                    }
                });
            }
            const formattedRides = rides.map(ride => {
                return {
                    id                : ride.id,
                    pickup_latitude   : ride.pickup_latitude,
                    pickup_longitude  : ride.pickup_longitude,
                    pickup_address    : ride.pickup_address,
                    dropoff_latitude  : ride.dropoff_latitude,
                    dropoff_longitude : ride.dropoff_longitude,
                    dropoff_address   : ride.dropoff_address,
                    distance          : parseFloat(ride.actual_distance) + ' km',
                    duration          : Math.round(ride.actual_duration / 60) + ' minutes',
                    final_fare        : parseFloat(ride.final_fare),
                    status            : ride.status,
                    ride_date         : ride.requested_at
                };
            });
            const totalPages     = Math.ceil(count / parseInt(limit));
            const hasNextPage    = parseInt(page) < totalPages;
            const hasPrevPage    = parseInt(page) > 1;
            res.status(200).json({
                success: true,
                message: 'Ride history retrieved successfully',
                data: {
                    rides: formattedRides,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages,
                        totalRides: count,
                        limit: parseInt(limit),
                        hasNextPage,
                        hasPrevPage
                    }
                }
            });
        }catch(err){
            console.error('Failed to retrieve ride history:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },

    // Get Detailed Ride Information
    getRideDetails: async (req, res) => {
        try{
            const { rideId } = req.params;
            if(!req.user || !req.user.userId){
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized: User not authenticated'
                });
            }
            const userId   = req.user.userId;
            const userRole = req.user.role;
            if(!userId || !Number.isInteger(userId)){
                return res.status(400).json({
                    success: false,
                    message: 'Valid User ID is required'
                });
            }
            if(!userRole){
                return res.status(403).json({
                    success: false,
                    message: 'User role not found'
                });
            }
            // Check if user exists
            const user = await User.findByPk(userId);
            if(!user){
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            // Determine user capabilities based on role
            const isDriver = userRole.toLowerCase() === 'driver';
            const isUser   = userRole.toLowerCase() === 'user';
            if(!isDriver && !isUser){
                return res.status(403).json({
                    success: false,
                    message: 'User is not authorized'
                });
            }
            // Validate ride ID
            if(!rideId || isNaN(rideId)){
                return res.status(400).json({
                    success: false,
                    message: 'Valid ride ID is required'
                });
            }
            // Build where condition 
            let whereCondition = {
                id: rideId
            };
            if(isDriver){
                whereCondition.driver_id = userId;
            }else 
            if(isUser){
                whereCondition.user_id = userId;
            }
            // Add status filter
            const activeStatuses  = ['ride_completed', 'cancelled'];
            whereCondition.status = {
                [Op.in]: activeStatuses
            };
            // Get detailed ride information
            const ride = await RideRequests.findOne({
                where: whereCondition,
                include: [
                    {
                        model      : User,
                        as         : 'driver',
                        attributes : ['id', 'name', 'mobile'],
                        required   : false,
                        include    : [{
                            model  : DriverDetails,
                            attributes : [
                                'rating', 
                            ]
                        }]
                    },
                    {
                        model      : Vehicletypes,
                        as         : 'vehicleType',
                        attributes : ['id', 'name', 'image'],
                        required   : false
                    }
                ]
            });
            if(!ride){
                return res.status(404).json({
                    success: false,
                    message: 'No Ride Found'
                });
            }
            const rideDetails    = {
                id                    : ride.id,
                trip_info             : {
                    trip_id           : ride.trip_id === 1 ? 'One Way' : ride.trip_id === 2 ? 'Round Trip' : ride.trip_id === 3 ? 'Reserve' : 'Unknown',
                    trip_type         : ride.trip_type === 1 ? 'Intercity' : 'Outstation',
                    vehicle_type_id   : ride.vehicle_type_id,
                    ride_status       : ride.status,
                    ride_date         : ride.requested_at
                },
                locations             : {
                    pickup            : {
                        address       : ride.pickup_address,
                        latitude      : parseFloat(ride.pickup_latitude),
                        longitude     : parseFloat(ride.pickup_longitude)
                    },
                    dropoff           : {
                        address       : ride.dropoff_address,
                        latitude      : parseFloat(ride.dropoff_latitude),
                        longitude     : parseFloat(ride.dropoff_longitude)
                    },
                    stops             : []
                },
                fare_details          : {
                    coupon_code       : ride.coupon_code,
                    discount          : ride.discount_amount ? parseFloat(ride.discount_amount) : null,
                    actual_fare       : ride.actual_fare ? parseFloat(ride.actual_fare) : null,
                    subtotal          : ride.actual_subtotal ? parseFloat(ride.actual_subtotal) : null,
                    gst               : ride.actual_gst_amount ? parseFloat(ride.actual_gst_amount) : null,
                    final_fare        : ride.final_fare ? parseFloat(ride.final_fare) : null,
                    breakdown         : ride.actual_fare_breakdown ? parseFloat(ride.actual_fare_breakdown) : null,
                },
                distance_duration     : {
                    actual_distance   : ride.actual_distance ? parseFloat(ride.actual_distance) : null,
                    actual_duration   : ride.actual_duration ? parseFloat(ride.actual_duration) : null
                },
                feedback: {
                    rating            : ride.rating,
                    feedback          : ride.feedback
                }
            };
            if(isUser){
                rideDetails.driver_info = {
                    driver_id         : ride.driver ? ride.driver.id : null,
                    driver_name       : ride.driver ? ride.driver.name : null,
                    driver_mobile     : ride.driver ? ride.driver.mobile : null,
                    driver_rating     : ride.driver && ride.driver.DriverDetail ? ride.driver.DriverDetail.rating : null,
                    vehicle_type_name : ride.vehicleType ? ride.vehicleType.name : null,
                    vehicle_type_image: ride.vehicleType ? `${BASE_URL}/uploads/vehicle-types/${ride.vehicleType.image}` : null
                };
            }
            if(ride.stop1_address){
                rideDetails.locations.stops.push({
                    stop_number: 1,
                    address    : ride.stop1_address,
                    latitude   : parseFloat(ride.stop1_latitude),
                    longitude  : parseFloat(ride.stop1_longitude)
                });
            }
            if(ride.stop2_address){
                rideDetails.locations.stops.push({
                    stop_number: 2,
                    address  : ride.stop2_address,
                    latitude : parseFloat(ride.stop2_latitude),
                    longitude: parseFloat(ride.stop2_longitude)
                });
            }
            res.status(200).json({
                success: true,
                message: 'Ride details retrieved successfully',
                data   : rideDetails
            });
        }catch(err){
            console.error('Failed to retrieve ride details:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    },

    // Favourite address by user 
    savedAddress: async (req, res) => {
        let transaction = null;
        try{
            const { type, title, address, latitude, longitude } = req.body;
            // Authentication check
            if(!req.user || !req.user.userId){
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized: User not authenticated'
                });
            }
            const userId = req.user.userId;
            if(!userId || !Number.isInteger(userId)){
                return res.status(400).json({
                    success: false,
                    message: 'Valid User ID is required'
                });
            }
            transaction = await sequelize.transaction();
            // Check if user exists
            const user = await User.findByPk(userId, { transaction });
            if(!user){
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            // Check if user has driver role
            const userRole = await UserRole.findOne({
                where: { 
                    user_id: userId,
                    role_id: 2
                },
                include: [{
                    model: Role,
                    attributes: ['id', 'name']
                }],
                transaction
            });
            if(!userRole){
                await transaction.rollback();
                return res.status(403).json({
                    success: false,
                    message: 'User is not authorized'
                });
            }
            // Validation
            if(!type || !title || !address){
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Type, title, and address are required fields'
                });
            }
            // Check if address type is valid
            if(!['home', 'work', 'other', 'search'].includes(type)){
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Invalid address type. Must be home, work, other, or search'
                });
            }
            let favoriteAddress;
            let isUpdated = false;
            // For home and work - only one allowed per user (update if exists)
            if(type === 'home' || type === 'work'){
                const existingAddress = await SavedAddress.findOne({
                    where: {
                        user_id: userId,
                        type: type,
                        status: 1
                    },
                    transaction
                });
                if(existingAddress){
                    favoriteAddress = await existingAddress.update({
                        title,
                        address,
                        latitude: latitude || null,
                        longitude: longitude || null,
                        frequency_count: sequelize.literal('frequency_count + 1'),
                        last_used_at: new Date()
                    }, { transaction });
                    isUpdated = true;
                }else{
                    favoriteAddress = await SavedAddress.create({
                        user_id: userId,
                        type,
                        title,
                        address,
                        latitude: latitude || null,
                        longitude: longitude || null,
                        frequency_count: 1,
                        last_used_at: new Date()
                    }, { transaction });
                }
            }
            // For other and search - check for same lat/long first
            else 
            if(type === 'other' || type === 'search'){
                let existingAddress = null;
                // Only check for existing coordinates if latitude and longitude are provided
                if(latitude && longitude){
                    existingAddress = await SavedAddress.findOne({
                        where: {
                            user_id  : userId,
                            type     : type,
                            latitude : latitude,
                            longitude: longitude,
                            status   : 1
                        },
                        transaction
                    });
                }
                if(existingAddress){
                    // Update existing address with same coordinates
                    favoriteAddress = await existingAddress.update({
                        title,
                        address,
                        latitude: latitude || null,
                        longitude: longitude || null,
                        frequency_count: sequelize.literal('frequency_count + 1'),
                        last_used_at: new Date()
                    }, { transaction });
                    isUpdated = true;
                }else{
                    // Create new address
                    favoriteAddress = await SavedAddress.create({
                        user_id: userId,
                        type,
                        title,
                        address,
                        latitude: latitude || null,
                        longitude: longitude || null,
                        frequency_count: 1,
                        last_used_at: new Date()
                    }, { transaction });
                }
            }
            await transaction.commit();
            res.status(200).json({
                success: true,
                message: isUpdated ? 'Address updated successfully' : 'Address added successfully',
                data: favoriteAddress
            });
        }catch(err){
            // Ensure transaction is rolled back
            if(transaction){
                try{
                    await transaction.rollback();
                }catch(rollbackError){
                    console.error('Transaction rollback error:', rollbackError);
                }
            }
            console.error('Favourite address error:', err);
            // Handle specific Sequelize timeout errors
            if(err.name === 'ConnectionAcquireTimeoutError' || 
            err.name === 'SequelizeConnectionAcquireTimeoutError'){
                return res.status(503).json({
                    success: false,
                    message: 'Database connection timeout. Please try again.',
                });
            }
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },

    // Get saved addresses by type 
    getSavedAddresses: async (req, res) => {
        try{
            const { type } = req.params; 
            if(!req.user || !req.user.userId){
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized: User not authenticated'
                });
            }
            const userId = req.user.userId;
            if(!userId || !Number.isInteger(userId)){
                return res.status(400).json({
                    success: false,
                    message: 'Valid User ID is required'
                });
            }
            // Check if driver exists and has proper role
            const user = await User.findByPk(userId);
            if(!user){
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            // Check if user has driver role
            const userRole = await UserRole.findOne({
                where: { 
                    user_id: userId,
                    role_id: 2
                },
                include: [{
                    model: Role,
                    attributes: ['id', 'name']
                }]
            });
            if(!userRole){
                return res.status(403).json({
                    success: false,
                    message: 'User is not authorized'
                });
            }
            // Validation for type parameter
            if(!type){
                return res.status(400).json({
                    success: false,
                    message: 'Address type is required'
                });
            }
            // Check if address type is valid
            if(!['home', 'work', 'other', 'search', 'all'].includes(type)){
                return res.status(400).json({
                    success: false,
                    message: 'Invalid address type. Must be home, work, other, search, or all'
                });
            }
            let addresses;
            let responseMessage;
            // Handle 'all' type - fetch home, work, and other addresses
            if(type === 'all'){
                const whereConditions = {
                    user_id: userId,
                    type: ['home', 'work', 'other'],
                    status: 1
                };
                addresses = await SavedAddress.findAll({
                    where: whereConditions,
                    order: [
                        ['frequency_count', 'DESC'],
                        ['last_used_at', 'DESC'],
                        ['created_at', 'DESC']
                    ],
                    limit: 10,
                    attributes: [
                        'id',
                        'type',
                        'title',
                        'address',
                        'latitude',
                        'longitude',
                        'frequency_count',
                        'last_used_at',
                        'created_at',
                        'updated_at'
                    ]
                });
                responseMessage = 'All saved addresses retrieved successfully';
            }
            // Handle 'search' type - fetch last 5 search addresses
            else 
            if(type === 'search'){
                const whereConditions = {
                    user_id: userId,
                    type: 'search',
                    status: 1
                };
                addresses = await SavedAddress.findAll({
                    where: whereConditions,
                    order: [
                        ['frequency_count', 'DESC'],
                        ['last_used_at', 'DESC'],
                        ['created_at', 'DESC']
                    ],
                    limit: 5,
                    attributes: [
                        'id',
                        'type',
                        'title',
                        'address',
                        'latitude',
                        'longitude',
                        'frequency_count',
                        'last_used_at',
                        'created_at',
                        'updated_at'
                    ]
                });
                responseMessage = 'Recent search addresses retrieved successfully';
            }
            // Handle specific types - home, work, or other
            else{
                const whereConditions = {
                    user_id: userId,
                    type: type,
                    status: 1
                };
                addresses = await SavedAddress.findAll({
                    where: whereConditions,
                    order: [
                        ['frequency_count', 'DESC'],
                        ['last_used_at', 'DESC'],
                        ['created_at', 'DESC']
                    ],
                    limit: 10,
                    attributes: [
                        'id',
                        'type',
                        'title',
                        'address',
                        'latitude',
                        'longitude',
                        'frequency_count',
                        'last_used_at',
                        'created_at',
                        'updated_at'
                    ]
                });
                responseMessage = `${type.charAt(0).toUpperCase() + type.slice(1)} addresses retrieved successfully`;
            }
            res.status(200).json({
                success: true,
                message: responseMessage,
                data: {
                    type: type,
                    count: addresses.length,
                    addresses: addresses
                }
            });
        }catch(err){
            console.error('Get saved addresses error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },

    // Delete saved address by ID (hard delete)
    deleteSavedAddress: async (req, res) => {
        const transaction = await sequelize.transaction();
        try{
            const { id } = req.params;
            if(!req.user || !req.user.userId){
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized: User not authenticated'
                });
            }
            const userId = req.user.userId;
            if(!userId){
                return res.status(400).json({
                    success: false,
                    message: 'Valid User ID is required'
                });
            }
            // Check if user exists
            const user = await User.findByPk(userId);
            if(!user){
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            // Check if user has driver role
            const userRole = await UserRole.findOne({
                where: { user_id: userId, role_id: 2 },
                include: [{
                    model: Role,
                    attributes: ['id', 'name']
                }]
            });
            if(!userRole){
                return res.status(403).json({
                    success: false,
                    message: 'User is not authorized'
                });
            }
            // Validate ID
            if(!id || isNaN(id)){
                return res.status(400).json({
                    success: false,
                    message: 'Valid address ID is required'
                });
            }
            // Find address
            const address = await SavedAddress.findOne({
                where: {
                    id: id,
                    user_id: userId
                }
            });
            if(!address){
                return res.status(404).json({
                    success: false,
                    message: 'Address not found'
                });
            }
            // Hard delete
            await SavedAddress.destroy({
                where: {
                    id: id,
                    user_id: userId
                },
                transaction
            });
            await transaction.commit();
            res.status(200).json({
                success: true,
                message: 'Address deleted successfully'
            });
        }catch(err){
            if(transaction) await transaction.rollback();
            console.error('Delete saved address error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    },

    // User last ride
    lastRide: async (req,res) => {
        try{
            if(!req.user || !req.user.userId){
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized: User not authenticated'
                });
            }
            const userId = req.user.userId;
            if(!userId || !Number.isInteger(userId)){
                return res.status(400).json({
                    success: false,
                    message: 'Valid User ID is required'
                });
            }
            // Check if user exists and has proper role
            const user = await User.findByPk(userId);
            if(!user){
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            // Check if user has user role
            const userRole = await UserRole.findOne({
                where: { 
                    user_id: userId,
                    role_id: 2
                },
                include: [{
                    model: Role,
                    attributes: ['id', 'name']
                }]
            });
            if(!userRole){
                return res.status(403).json({
                    success: false,
                    message: 'User is not authorized'
                });
            }
            // First, check for any ongoing rides
            const ongoingRide = await RideRequests.findOne({
                where: {
                    user_id     : userId,
                    status      : {
                        [Op.in] : [
                            'pending',
                            'searching_driver', 
                            'accepted',
                            'arrived',
                            'ride_started'
                        ]
                    }
                },
                order: [['created_at', 'DESC']]
            });
            // If there's an ongoing ride, return it
            if(ongoingRide){
                return res.status(200).json({
                    success: true,
                    message: 'Ongoing ride found',
                    data: {
                        ride_id         : ongoingRide.id,
                        status          : ongoingRide.status,
                        pickup_address  : ongoingRide.pickup_address,
                        dropoff_address : ongoingRide.dropoff_address
                    }
                });
            }
            // If no ongoing rides, look for the last completed or cancelled ride
            const lastCompletedRide = await RideRequests.findOne({
                where       : {
                    user_id : userId,
                    status  : {
                        [Op.in]: ['ride_completed', 'cancelled']
                    }
                },
                order: [['created_at', 'DESC']]
            });
            if(!lastCompletedRide){
                return res.status(404).json({
                    success: false,
                    message: 'No rides found for this user'
                });
            }
            return res.status(200).json({
                success : true,
                message : "ride retrieved successfully",
                data                : {
                    ride_id         : lastCompletedRide.id,
                    status          : lastCompletedRide.status,
                    pickup_address  : lastCompletedRide.pickup_address,
                    dropoff_address : lastCompletedRide.dropoff_address,
                    created_at      : lastCompletedRide.created_at
                }
            });
        }catch(error){
            console.error('Error fetching last ride:', error);
            return res.status(500).json({
                success: false,
                message: 'Something went wrong. please try again later!'
            });
        }
    },

    // User rating to driver
    userRating: async (req, res) => {
        try{
            const { ride_request_id, rating, feedback } = req.body;
            
            // Check if user is authenticated
            if(!req.user || !req.user.userId){
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized: User not authenticated'
                });
            }
            const userId = req.user.userId;
            // Validate userId
            if(!userId || !Number.isInteger(userId)){
                return res.status(400).json({
                    success: false,
                    message: 'Valid User ID is required'
                });
            }
            // Validate required fields
            if(!ride_request_id){
                return res.status(400).json({
                    success: false,
                    message: 'Ride request ID is required'
                });
            }
            // Validate rating
            if(rating === undefined || rating === null){
                return res.status(400).json({
                    success: false,
                    message: 'Rating is required'
                });
            }
            // Validate rating range (assuming 1-5 stars)
            if(!Number.isInteger(rating) || rating < 1 || rating > 5){
                return res.status(400).json({
                    success: false,
                    message: 'Rating must be an integer between 1 and 5'
                });
            }
            // Check if user exists
            const user = await User.findByPk(userId);
            if(!user){
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            // Check if user has proper role
            const userRole = await UserRole.findOne({
                where: { 
                    user_id: userId,
                    role_id: 2 
                },
                include: [{
                    model: Role,
                    attributes: ['id', 'name']
                }]
            });
            if(!userRole){
                return res.status(403).json({
                    success: false,
                    message: 'User is not authorized to rate rides'
                });
            }
            // Check if ride request exists
            const rideRequest = await RideRequests.findOne({
                where: { 
                    id: ride_request_id
                }
            });
            if(!rideRequest){
                return res.status(404).json({
                    success: false,
                    message: 'Ride request not found'
                });
            }
            // Verify that the user is associated with this ride request
            if(rideRequest.user_id !== userId){
                return res.status(403).json({
                    success: false,
                    message: 'You are not authorized to rate this ride'
                });
            }
            // Check if the ride is completed 
            if(rideRequest.status !== 'ride_completed'){
                return res.status(400).json({
                    success: false,
                    message: 'You can only rate completed rides'
                });
            }
            // Check if already rated
            if(rideRequest.rating !== null){
                return res.status(400).json({
                    success: false,
                    message: 'This ride has already been rated'
                });
            }
            // Update ride request with rating and feedback
            const [updatedRows] = await RideRequests.update({
                rating   : rating,
                feedback : feedback || null,
                is_rated : 1
            }, {
                where: { id: ride_request_id }
            });
            // Check if update was successful
            if(updatedRows === 0){
                return res.status(400).json({
                    success: false,
                    message: 'Failed to update rating'
                });
            }
            return res.status(200).json({
                success : true,
                message : 'Rating submitted successfully',
                data    : {
                    ride_request_id : ride_request_id,
                    rating          : rating,
                    feedback        : feedback
                }
            });
        }catch(error){
            console.error('Failed to update rating:', error);
            return res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    },

    // User account deletion
    accountDeletion: async(req, res) => {
        try{
            if(!req.user || !req.user.userId){
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized: User not authenticated'
                });
            }
            const userId = req.user.userId;
            if(!userId || !Number.isInteger(userId)){
                return res.status(400).json({
                    success: false,
                    message: 'Valid User ID is required'
                });
            }
            // Check if user exists and has proper role
            const user = await User.findByPk(userId);
            if(!user){
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            // Check if user has any ongoing rides
            const activeRide = await RideRequests.findOne({
                where: {
                    user_id: userId,
                    status: ['ride_started', 'accepted','arrived'] 
                }
            });
            if(activeRide){
                return res.status(400).json({
                    success: false,
                    message: 'You cannot delete your account while you have an active ride.'
                });
            }
            // Update user status to 0 (soft delete)
            user.status = 0;
            await user.save();
            return res.status(200).json({
                success: true,
                message: 'Your account has been deactivated successfully.'
            });
        }catch(err){
            console.error('Failed to delete you account:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    }
};
module.exports = userController;