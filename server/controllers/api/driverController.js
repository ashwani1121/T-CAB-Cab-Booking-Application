const { sequelize, Sequelize, User, UserRole, Role, RideRequests, Settings, Wallets, Vehicles, Vehicletypes, Vehicleprices, DriverDetails, DriverLocation, Package, ReservationAdvancePayment } = require("../../models");
const apiController    = require("./apiController");
const { Op }           = require("sequelize");
const FirebaseService  = require("../../services/firebase");
const BASE_URL         = process.env.BASE_URL || "http://localhost:5000";
const driverController = {

	// Reservation Pending count within 1hr
	reservationCount: async (req, res) => {
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
			const timeFrameHours   = 1;
			const currentTime      = new Date();
			const startTime        = new Date(currentTime - (timeFrameHours * 60 * 60 * 1000));
			const currentDate      = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format
			const pendingCount     = await RideRequests.count({
				where: {
					trip_id		      : 3,
					is_custom_trip    : 0,
					status		      : {
						[Op.in]       : ['pending', 'searching_driver', 'no_drivers_available']
					},
					created_at	      : {
						[Op.between]  : [startTime, currentTime]
					},
					[Op.or]           : [
						{ pickup_date : { [Op.gte]: currentDate } }
					]
				}
			});
			return res.status(200).json({
				success		  : true,
				message		  : "Reservation pending count retrieved successfully",
				pending_count : pendingCount,
				
			});
		}catch(error){
			console.error("Failed to retrieve reservation pending count", error);
			return res.status(500).json({
				success: false,
				message: "Something went wrong. Please try again later!",
			});
		}
	},

	// Reservation Pending 
	reservationRide: async (req, res) => {
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
			const timeFrameHours     = 40;
			const currentTime        = new Date();
			const startTime          = new Date(currentTime - (timeFrameHours * 60 * 60 * 1000));
			const currentDate        = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format
			const pendingRides       = await RideRequests.findAll({
				where: {
					trip_id          : 3,
					is_custom_trip   : 0,
					status           : {
						[Op.in]      : ['pending', 'searching_driver', 'no_drivers_available']
					},
					created_at       : {
						[Op.between] : [startTime, currentTime]
					},
					[Op.or]          : [
						{ pickup_date: { [Op.gte]: currentDate } }
					]
				},
				include              : [
					{
						model        : User,
						as           : 'passenger',
						attributes   : ['id', 'name', 'email', 'mobile'],
						required     : false
					},
					{
						model        : User,
						as           : 'driver',
						attributes   : ['id', 'name', 'email', 'mobile'],
						required     : false
					},
					{
						model        : Vehicletypes,
						as           : 'vehicleType',
						attributes   : ['id', 'name', 'image'],
						required     : false
					},
					{
						model        : Package,
						as           : 'package',
						attributes   : ['id', 'name', 'km'],
						required     : false
					}
				],
				order                : [['created_at', 'DESC']],
				attributes           : {
					exclude			 : ['fare_breakdown', 'actual_fare_breakdown', 'metadata', 'notified_drivers']
				}
			});
			const formattedRides     = pendingRides.map(ride => {
				const rideData       = ride.toJSON();
				return {
					ride_id						: rideData.id,
					trip_details				: {
						trip_type				: rideData.trip_type,
						status					: rideData.status,
						pickup_date				: rideData.pickup_date,
						pickup_time				: rideData.pickup_time
					},
					location					: {
						pickup					: {
							address				: rideData.pickup_address,
							district			: rideData.pickup_district,
							state				: rideData.pickup_state,
							latitude			: rideData.pickup_latitude,
							longitude			: rideData.pickup_longitude
						},
						dropoff					: {
							address				: rideData.dropoff_address,
							district			: rideData.dropoff_district,
							state				: rideData.dropoff_state,
							latitude			: rideData.dropoff_latitude,
							longitude			: rideData.dropoff_longitude
						}
					},
					vehicle						: rideData.vehicleType,
					package						: rideData.package,
					fare_details				: {
						advance_paid_amount		: rideData.advance_paid_amount,
						is_advance_paid			: rideData.is_advance_paid,
						remaining_fare_to_pay	: rideData.remaining_fare_to_pay
					},
					created_at					: rideData.created_at,
					requested_at				: rideData.requested_at
				};
			});
			return res.status(200).json({
				success		: true,
				message		: "Reservation pending rides retrieved successfully",
				total_count : pendingRides.length,
				rides		: formattedRides
			});
		}catch(error){
			console.error("Failed to retrieve reservation pending ride", error);
			return res.status(500).json({
				success: false,
				message: "Something went wrong. Please try again later!",
			});
		}
	},

	// Driver Account Deletion
	accountDeletion: async (req, res) =>{
		try{
            if(!req.user || !req.user.userId){
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized: User not authenticated'
                });
            }
            const userId 	 = req.user.userId;
        	const { reason } = req.body;
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
			// Check if user is already inactive
			if(user.status === 0){
				return res.status(400).json({
					success: false,
					message: 'Your account is already inactive'
				});
			}
			// Get driver details
			const driverDetails = await DriverDetails.findOne({
				where: { user_id: userId }
			});
			if(!driverDetails){
				return res.status(404).json({
					success: false,
					message: 'Driver details not found'
				});
			}
			// Check if deletion request already exists
			if(driverDetails.deletion_request === 1){
				return res.status(400).json({
					success: false,
					message: 'A deletion request is already pending approval'
				});
			}
            // Check if user has any ongoing rides
            const activeRide = await RideRequests.findOne({
                where: {
                    driver_id : userId,
                    status: ['ride_started', 'accepted','arrived'] 
                }
            });
            if(activeRide){
                return res.status(400).json({
                    success: false,
                    message: 'You cannot delete your account while you have an active ride.'
                });
            }
			// Update driver details with deletion request
			driverDetails.deletion_request = 1;
			driverDetails.deletion_requested_at = new Date();
			if(reason){
				driverDetails.deletion_reason = reason;
			}
			await driverDetails.save();
			return res.status(200).json({
				success: true,
				message: 'Your account deletion request has been submitted successfully. An administrator will review your request shortly.'
			});
		}catch(error){
			console.error("Failed to delete driver", error);
			return res.status(500).json({
				success : false,
				message : "Something went wrong. Please try again later!",
			});
		}
	},

	// Total Earnings per day by driver
	earningsPerday: async (req, res) => {
		try{
			if(!req.user || !req.user.userId){
				return res.status(401).json({
					success: false,
					message: "Unauthorized: Driver not authenticated"
				});
			}
			const driver_id = req.user.userId;
			// Validate driver exists
			const driver = await User.findByPk(driver_id);
			if(!driver){
				return res.status(404).json({
					success: false,
					message: "Driver not found"
				});
			}
			// Check if user has driver role
			const driverRole = await UserRole.findOne({
				where: {
					user_id: driver_id,
					role_id: 3,
				},
				include: [
				{
					model: Role,
					attributes: ["id", "name"],
				},
				],
			});
			if(!driverRole){
				return res.status(403).json({
					success: false,
					message: "User is not authorized as a driver"
				});
			}
			// Get today's date range (start and end of today)
			const today      = new Date();
			const startOfDay = new Date(
				today.getFullYear(),
				today.getMonth(),
				today.getDate()
			);
			const endOfDay = new Date(
				today.getFullYear(),
				today.getMonth(),
				today.getDate() + 1
			);
			// Calculate total earnings for today
			const dailyEarnings = await RideRequests.findAll({
				where: {
					driver_id         : driver_id,
					status            : "ride_completed",
					payment_status    : "paid",
					ride_completed_at : {
						[Op.gte] : startOfDay,
						[Op.lt]  : endOfDay,
					},
				},
				attributes: [
					[sequelize.fn("SUM", sequelize.col("final_fare")), "total_earnings"],
					[sequelize.fn("COUNT", sequelize.col("id")), "total_rides"],
					[
						sequelize.fn("SUM", sequelize.col("actual_distance")),
						"total_distance",
					],
				],
				raw: true,
			});
			const earnings = dailyEarnings[0];
			return res.status(200).json({
				success : true,
				message : "Daily earnings retrieved successfully",
				data    : {
				date    : today.toDateString(),
					driver_id      : driver_id,
					driver_name    : driver.name || driver.first_name + " " + driver.last_name,
					total_earnings : parseFloat(earnings.total_earnings || 0).toFixed(2),
					total_rides    : parseInt(earnings.total_rides || 0),
					total_distance : parseFloat(earnings.total_distance || 0).toFixed(2)
				},
			});
		}catch(error){
			console.error("Failed to retrieve total earnings per day:", error);
			return res.status(500).json({
				success : false,
				message : "Something went wrong. Please try again later!",
			});
		}
	},

	// Nearby driver
	nearbyDriver: async (req, res) => {
		try{
			const { vehicle_type_id, pickup } = req.body;
			// Validate vehicle type
			if(!vehicle_type_id){
				return res.status(400).json({
					success: false,
					message: "Valid vehicle type ID is required."
				});
			}
			// Validate pickup location
			if(!pickup || typeof pickup !== "object"){
				return res.status(400).json({
					success: false,
					message: "Pickup location is required and must be an object with address, latitude, and longitude.",
				});
			}
			if(!pickup.address || !pickup.latitude || !pickup.longitude){
				return res.status(400).json({
					success: false,
					message: "Pickup location must include address, latitude, and longitude."
				});
			}
			if(!isValidCoordinate(pickup.latitude, pickup.longitude)){
				return res.status(400).json({
					success: false,
					message: "Pickup location contains invalid coordinates."
				});
			}
			const nearbyDrivers = await FirebaseService.findNearbyDriversforUser( pickup, vehicle_type_id );
			if(nearbyDrivers.length === 0){
				return res.status(200).json({
					success: false,
					message: "No drivers available in your area at the moment. Please try again later.",
				});
			}
			return res.status(200).json({
				success : true,
				message : "Nearby drivers fetched successfully",
				data    : {
					drivers         : nearbyDrivers,
					total_drivers   : nearbyDrivers.length,
					search_location : pickup
				},
			});
		}catch(error){
			console.error("Error fetching nearby drivers:", error);
			return res.status(500).json({
				success: false,
				message: "Something went wrong. Please try again later!",
			});
		}
	},

	// Verify Driver
	verifyDriver: async (req, res) => {
		try{
			const { mobile, fcm_token } = req.body;
			// Validate mobile
			if(!mobile || typeof mobile !== "string"){
				return res.status(400).json({
					success: false,
					message: "Mobile number is required and must be a string."
				});
			}
			if(!/^\d{10}$/.test(mobile.trim())){
				return res.status(400).json({
					success: false,
					message: "Mobile number must be a valid 10-digit number."
				});
			}
			// Validate fcm token
			if(!fcm_token){
				return res.status(400).json({
					success: false,
					message: "Fcm Token is required."
				});
			}
			// Check if mobile already exists
			const existingUser = await User.findOne({
				where: { mobile },
				include: [
				{
					model: UserRole,
					where: {
						role_id: 3
					},
					include: [
					{
						model: Role,
						attributes: ["id", "name"],
					},
					],
				},
				],
			});
			if(existingUser){
				transaction = await sequelize.transaction();
				// Update FCM token
				await User.update(
					{ 
						fcm_token, 
						updated_at: new Date() 
					},
					{ 
						where: { 
							id: existingUser.id 
						}, transaction 
					}
				);
				const role = existingUser.UserRoles[0]?.Role?.name || "Driver";
				// Check reservation fare availability
				let hasReservationFare = false;
				if(role === 'Driver'){
					// Fetch driver details including vehicle type
					const driverDetails = await DriverDetails.findOne({
						where: { user_id: existingUser.id },
						attributes: ['vehicle_id', 'vehicle_type_id']
					});
					if(driverDetails && driverDetails.vehicle_type_id){
						// Check if reservation fare exists for this vehicle type
						const vehicleFare = await Vehicleprices.findOne({
							where: {
								vehicle_type_id: driverDetails.vehicle_type_id,
								trip_id: 3, 
								status: 1
							},
							attributes: ['id']
						});
						hasReservationFare = vehicleFare !== null;
					}
				}
				const payload = {
					userId : existingUser.id,
					email  : existingUser.email,
					mobile : existingUser.mobile,
					role,
				};
				const accessToken  = apiController.generateAccessToken(payload);
				const refreshToken = apiController.generateRefreshToken();
				await apiController.cleanupExpiredTokens(existingUser.id, transaction);
				await apiController.storeRefreshToken(
					existingUser.id,
					refreshToken,
					transaction
				);
				await transaction.commit();
				return res.status(200).json({
					success : true,
					message : "Driver verified successfully.",
					data    : {
						accessToken,
						refreshToken,
						driver: {
							id     		: existingUser.id,
							name   		: existingUser.name,
							email  		: existingUser.email,
							mobile 		: existingUser.mobile,
							reservation : hasReservationFare,
							role,
						},
					},
				});
			}else{
				return res.status(200).json({
					success: false,
					message: "Driver Not Found!"
				});
			}
		}catch(err){
			if(transaction) await transaction.rollback();
			console.error("Verify error:", err);
			res.status(500).json({
				success: false,
				message: "Something went wrong. Please try again later!",
			});
		}
	},

	// Driver Status
	driverStatus: async (req, res) => {
		try{
			if(!req.user || !req.user.userId){
				return res.status(401).json({
					success: false,
					message: "Unauthorized: Driver not authenticated"
				});
			}
			const driver_id = req.user.userId;
			// Validate driver exists
			const driver = await User.findByPk(driver_id);
			if(!driver){
				return res.status(404).json({
					success: false,
					message: "Driver not found"
				});
			}
			// Check if user has driver role
			const driverRole = await UserRole.findOne({
				where: {
					user_id: driver_id,
					role_id: 3,
				},
				include: [
					{
						model: Role,
						attributes: ["id", "name"],
					},
				],
			});
			if(!driverRole){
				return res.status(403).json({
					success: false,
					message: "User is not authorized as a driver"
				});
			}
			// Retrieve Status From DB
			const driverLocation = await DriverLocation.findOne({
				where: {
					driver_id: driver_id
				},
			});
			if(driverLocation){
				return res.status(200).json({
					success   : true,
					message   : "Driver status retrieved successfully",
					is_online : driverLocation.is_online,
					data      : {
						driver_id    : driver_id,
						is_online    : driverLocation.is_online,
						last_updated : driverLocation.updatedAt,
						latitude     : driverLocation.latitude || null,
						longitude    : driverLocation.longitude || null,
					},
				});
			}else{
				// Driver location record doesn't exist, create one with default offline status
				const newDriverLocation = await DriverLocation.create({
					driver_id : driver_id,
					is_online : 0,
					latitude  : null,
					longitude : null
				});
				return res.status(200).json({
					success : true,
					message : "Driver status initialized successfully",
					data    : {
						driver_id    : driver_id,
						is_online    : 0,
						latitude     : null,
						longitude    : null,
						last_updated : newDriverLocation.createdAt,
					}
				});
			}
		}catch(error){
			console.error("Driver status error:", error);
			return res.status(500).json({
				success: false,
				message: "Something went wrong. Please try again later!",
			});
		}
	},

	// Toggle driver online/offline status
	toggleDriverStatus: async (req, res) => {
		try {
			// Authentication validation
			if(!req.user || !req.user.userId){
				return res.status(401).json({
					success: false,
					message: "Unauthorized: Driver not authenticated"
				});
			}
			// Role validation
			if(req.user.role !== "Driver"){
				return res.status(403).json({
					success: false,
					message: "Access denied: User is not authorized as a driver"
				});
			}
			const driver_id = req.user.userId;
			const { is_online, latitude, longitude } = req.body;
			// If going online, validate location
			if(is_online && (!latitude || !longitude)){
				return res.status(400).json({
					success: false,
					message: "Location (latitude and longitude) is required when going online"
				});
			}
			// Validate location coordinates if provided
			if((latitude !== undefined && latitude !== null) && (isNaN(latitude) || latitude < -90 || latitude > 90)){
				return res.status(400).json({
					success: false,
					message: "Invalid latitude. Must be between -90 and 90"
				});
			}
			if((longitude !== undefined && longitude !== null) && (isNaN(longitude) || longitude < -180 || longitude > 180)){
				return res.status(400).json({
					success: false,
					message: "Invalid longitude. Must be between -180 and 180"
				});
			}
			// Check if driver exists
			const driver = await User.findByPk(driver_id);
			if(!driver){
				return res.status(404).json({
					success: false,
					message: "Driver not found"
				});
			}
			// Check driver details and status
			const driverDetails = await DriverDetails.findOne({
				where: { user_id: driver_id }
			});
			if(!driverDetails){
				return res.status(404).json({
					success: false,
					message: "Driver details not found"
				});
			}
			// Validate rules acceptance 
			if(!driverDetails.rules_accepted){
				return res.status(400).json({
					success: false,
					message: "Cannot go online: Please accept the rules and regulations first",
					require_rules_acceptance: true
				});
			}
			// Validate deposit status
			if(driverDetails.deposit_status !== "paid"){
				return res.status(400).json({ 
					success: false,
					message: "Cannot go online: Deposit payment is required"
				});
			}
			// Validate driver approval status
			if(driverDetails.status !== "approved"){
				return res.status(400).json({
					success: false,
					message: "Cannot go online: Driver approval is pending"
				});
			}
			// Check wallet balance if going online
			if(is_online){
				// Fetch admin settings for wallet negative limit
				const adminSettings = await Settings.findOne({
					where: { role: 'admin' }
				});
				if(!adminSettings){
					return res.status(500).json({
						success: false,
						message: 'Admin settings not found. Please contact support.'
					});
				}
				const walletNegativeLimit = parseFloat(adminSettings.wallet_negative_limit || 0);
				// Fetch driver's wallet
				const driverWallet = await Wallets.findOne({
					where: { 
						user_id: driver_id, 
						status: 'active' 
					}
				});
				if(!driverWallet){
					return res.status(404).json({
						success: false,
						message: 'Driver wallet not found'
					});
				}
				const currentBalance = parseFloat(driverWallet.balance);
				if(currentBalance < -walletNegativeLimit){
					return res.status(400).json({
						success: false,
						message: `Your wallet balance (${currentBalance.toFixed(2)}) is below the minimum allowed (-${walletNegativeLimit.toFixed(2)}). Please top up to go online.`,
						current_balance: currentBalance,
						min_allowed: -walletNegativeLimit
					});
				}
			}
			// Prepare update data
			let updateData = {
				is_online: is_online,
				last_updated_at: new Date(),
			};
			// Only update location if valid coordinates are provided
			if (latitude !== undefined && latitude !== null && longitude !== undefined && longitude !== null) {
				updateData.latitude  = parseFloat(latitude);
				updateData.longitude = parseFloat(longitude);
			}
			// Set appropriate timestamps
			if(is_online){
				updateData.last_online_at = new Date();
			}else{
				updateData.last_offline_at = new Date();
			}
			// Update or create driver location record
			const[driverLocation, created] = await DriverLocation.upsert(
				{ driver_id: driver_id, ...updateData },
				{ returning: true }
			);
			return res.status(200).json({
				success: true,
				message: `Driver status updated successfully: Now ${is_online ? "online" : "offline"}`,
				data: {
					driver_id : driver_id,
					is_online : is_online,
				}
			});
		}catch(error){
			console.error("Toggle driver status error:", error);
			return res.status(500).json({
				success : false,
				message : "Something went wrong. Please try again later!",
			});
		}
	},

	// Accept rules and regulations
	acceptRulesAndRegulations: async (req, res) => {
		try{
			// Authentication validation
			if(!req.user || !req.user.userId){
				return res.status(401).json({
					success: false,
					message: "Unauthorized: Driver not authenticated"
				});
			}
			// Role validation
			if(req.user.role !== "Driver"){
				return res.status(403).json({
					success: false,
					message: "Access denied: User is not authorized as a driver"
				});
			}
			const driver_id = req.user.userId;
			// Find driver details
			const driverDetails = await DriverDetails.findOne({
				where: { user_id: driver_id }
			});
			if(!driverDetails){
				return res.status(404).json({
					success: false,
					message: "Driver details not found"
				});
			}
			// Update rules acceptance
			await driverDetails.update({
				rules_accepted: true,
				rules_accepted_at: new Date()
			});
			return res.status(200).json({
				success: true,
				message: "Rules and regulations accepted successfully"
			});
		}catch(error){
			console.error("Accept rules error:", error);
			return res.status(500).json({
				success : false,
				message : "Something went wrong. Please try again later!",
			});
		}
	},

	// Driver Register
	driverRegistration: async (req, res) => {
		let transaction;
		try{
			const {
				name,
				email,
				mobile,
				gender,
				mobile_code = "+91",
				dob,
				vehicle_id,
				vehicle_type_id,
				aadhar_no,
				license_number,
				vehicle_rc_no,
				fcm_token,
				deposit_amount
			} = req.body;
			if(!name){
				return res.status(400).json({
					success: false,
					message: "Name is required"
				});
			}
			if(!email){
				return res.status(400).json({
					success: false,
					message: "Email is required"
				});
			}
			if(!mobile){
				return res.status(400).json({
					success: false,
					message: "Mobile is required"
				});
			}
			if(!gender || !["Male", "Female", "Others"].includes(gender)){
				return res.status(400).json({
					success: false,
					message: "Valid gender is required (Male, Female, Others)"
				});
			}
			if(!dob){
				return res.status(400).json({
					success: false,
					message: "Date of birth is required"
				});
			}
			if(!vehicle_id){
				return res.status(400).json({
					success: false,
					message: "Vehicle ID is required"
				});
			}
			if(!vehicle_type_id){
				return res.status(400).json({
					success: false,
					message: "Vehicle type ID is required"
				});
			}
			if(!aadhar_no){
				return res.status(400).json({
					success: false,
					message: "Aadhar number is required"
				});
			}
			if(!license_number){
				return res.status(400).json({
					success: false,
					message: "License number is required"
				});
			}
			if(!vehicle_rc_no){
				return res.status(400).json({
					success: false,
					message: "Vehicle RC number is required"
				});
			}
			if(!fcm_token){
				return res.status(400).json({
					success: false,
					message: "Fcm token is required"
				});
			}
			
			const files = req.files;
			if(!files){
				return res.status(400).json({
					success : false,
					message : "All required documents must be uploaded"
				});
			}
			const requiredFiles = [
				"aadhar_front_image",
				"aadhar_back_image",
				"license_front_image",
				"license_back_image",
				"vehicle_rc_front_image",
				"vehicle_rc_back_image",
				"driver_face_image",
			];
			for(const fileField of requiredFiles){
				if(!files[fileField] || files[fileField].length === 0){
					return res.status(400).json({
						success: false,
						message: `${fileField.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())} is required`,
					});
				}
			}
			// Validate vehicle images (max 5)
			if(!files.vehicle_images || files.vehicle_images.length === 0){
				return res.status(400).json({
					success: false,
					message: "At least one vehicle image is required"
				});
			}
			if(files.vehicle_images.length > 5){
				return res.status(400).json({
					success: false,
					message: "Maximum 5 vehicle images are allowed"
				});
			}
			// Check if the specified driver role exists first
			const driverRole = await Role.findOne({
				where: { name: "Driver" },
			});
			if(!driverRole){
				return res.status(400).json({
					success: false,
					message: "Driver role not found in system"
				});
			}
			// Check if email or mobile already exists as a DRIVER
			const existingUser = await User.findOne({
				where: {
					[Sequelize.Op.or]: [{ email }, { mobile }],
				},
				include: [
					{
						model: UserRole,
						where: {
							role_id: driverRole.id 
						},
						required: true,
					},
				],
			});
			if(existingUser){
				return res.status(400).json({
					success: false,
					message: "Email or mobile number already registered as driver"
				});
			}
			// Check if aadhar, license, or RC number already exists
			const existingDriver = await DriverDetails.findOne({
				where: {
					[Sequelize.Op.or]: [
						{ aadhar_no },
						{ license_number },
						{ vehicle_rc_no },
					],
				},
			});
			if(existingDriver){
				let conflictField = '';
				if(existingDriver.aadhar_no === aadhar_no){
					conflictField = 'Aadhar number';
				}else if(existingDriver.license_number === license_number){
					conflictField = 'License number';
				}else if(existingDriver.vehicle_rc_no === vehicle_rc_no){
					conflictField = 'Vehicle RC number';
				}
				return res.status(400).json({
					success: false,
					message: `${conflictField} is already registered`
				});
			}
			// Check if vehicle and vehicle type exist
			const vehicle = await Vehicles.findByPk(vehicle_id);
			if(!vehicle){
				return res.status(400).json({
					success: false,
					message: "Invalid vehicle selected"
				});
			}
			const vehicleType = await Vehicletypes.findByPk(vehicle_type_id);
			if(!vehicleType){
				return res.status(400).json({
					success: false,
					message: "Invalid vehicle type selected"
				});
			}
			// Check if reservation fare exists for this vehicle type
			let hasReservationFare = false;
			const vehicleFare = await Vehicleprices.findOne({
				where: {
					vehicle_type_id: vehicle_type_id,
					trip_id: 3, // Reservation trip ID
					status: 1
				},
				attributes: ['id']
			});
			hasReservationFare = vehicleFare !== null;
			transaction = await sequelize.transaction();
			// Process file uploads and get file paths
			const aadharFrontPath  = files.aadhar_front_image[0].filename;
			const aadharBackPath   = files.aadhar_back_image[0].filename;
			const licenseFrontPath = files.license_front_image[0].filename;
			const licenseBackPath  = files.license_back_image[0].filename;
			const rcFrontPath      = files.vehicle_rc_front_image[0].filename;
			const rcBackPath       = files.vehicle_rc_back_image[0].filename;
			const driverFacePath   = files.driver_face_image[0].filename;
			// Create new user first
			const newUser = await User.create(
				{
					name,
					email,
					mobile,
					gender,
					password   : "",
					profile    : driverFacePath,
					fcm_token,
					status: 1,
					created_at : new Date(),
					updated_at : new Date()
				},
				{ transaction }
			);
			// Associate user with driver role
			await UserRole.create(
				{
					user_id    : newUser.id,
					role_id    : driverRole.id,
					is_primary : 1,
					created_at : new Date(),
					updated_at : new Date()
				},
				{ transaction }
			);
			// Process vehicle images and convert to JSON string
			const vehicleImagePaths = files.vehicle_images.map(
				(file) => file.filename
			);
			const vehicleImagesJSON = JSON.stringify(vehicleImagePaths);
			// Create driver details record
			await DriverDetails.create(
				{
					user_id                : newUser.id,
					mobile_code,
					dob,
					vehicle_id,
					vehicle_type_id,
					aadhar_no,
					aadhar_front_image     : aadharFrontPath,
					aadhar_back_image      : aadharBackPath,
					license_number,
					license_front_image    : licenseFrontPath,
					license_back_image     : licenseBackPath,
					vehicle_rc_no,
					vehicle_rc_front_image : rcFrontPath,
					vehicle_rc_back_image  : rcBackPath,
					vehicle_images         : vehicleImagesJSON,
					status                 : "pending",
					deposit_status         : "pending",
					deposit_balance        : deposit_amount,
					created_at             : new Date(),
					updated_at             : new Date(),
				},
				{ transaction }
			);

			// Check or create wallet
			let wallet = await Wallets.findOne({
				where: { user_id: newUser?.id }
			});
			if(!wallet){
				wallet = await Wallets.create({
					user_id          : newUser?.id,
					balance          : 0.00,
					reserved_balance : 0.00,
					total_earned     : 0.00,
					total_spent      : 0.00,
					currency         : 'INR',
					status           : 'active',
					created_at       : new Date(),
					updated_at       : new Date()
				});
			}

			// Generate tokens
			const accessToken  = apiController.generateAccessToken({
				userId : newUser.id,
				name   : newUser.name,
				email  : newUser.email,
				mobile : newUser.mobile,
				role   : driverRole.name
			});
			const refreshToken = apiController.generateRefreshToken();
			// Store refresh token in database
			await apiController.storeRefreshToken(newUser.id, refreshToken, transaction);
			await transaction.commit();
			res.status(200).json({
				success    : true,
				message    : "Driver registration submitted successfully. Your application is under review.",
				accessToken,
				refreshToken,
				reservation: hasReservationFare,
			});
		}catch(err){
			if(transaction) await transaction.rollback();
			console.error("Driver registration error:", err);
			// Handle specific database errors
			if(err.name === "SequelizeUniqueConstraintError"){
				// Try to identify which field caused the constraint violation
				const fields = err.fields || {};
				let fieldName = Object.keys(fields)[0] || 'information';
				// Make the field name more readable
				if(fieldName === 'email'){
					fieldName = 'Email';
				}else if(fieldName === 'mobile'){
					fieldName = 'Mobile number';
				}
				return res.status(400).json({
					success : false,
					message : `${fieldName} is already registered in the system`,
				});
			}
			res.status(500).json({
				success: false,
				message: "Something went wrong. Please try again later!",
			});
		}
	},

	// Get driver profile with stats
	getDriverProfile: async (req, res) => {
		try{
			const { id } = req.params;
			const driver = await User.findOne({
				where   : { id, status: 1 },
				include : [
					{
						model    : UserRole,
						where    : { role_id: 3 },
						required : true,
					},
					{
						model    : DriverDetails,
						required : true,
					},
				],
			});
			if(!driver){
				return res.status(404).json({
					success: false,
					message: "Driver not found"
				});
			}
			// Calculate stats from RideRequests
			const totalTrips      = await RideRequests.count({
				where: { driver_id: id },
			});
			const completedTrips  = await RideRequests.count({
				where: { driver_id: id, status: "ride_completed" },
			});
			const cancelledTrips  = await RideRequests.count({
				where: { driver_id: id, status: "cancelled" },
			});
			const completionRate  = totalTrips > 0 ? Math.round((completedTrips / totalTrips) * 100) : 0;
			const ratings         = driver.DriverDetail?.rating ? parseFloat(driver.DriverDetail?.rating) : 0;
			let vehicleImageUrls  = [];
			if(driver.DriverDetail.vehicle_images){
				try{
					const vehicleImages = JSON.parse(driver.DriverDetail.vehicle_images);
					vehicleImageUrls    = vehicleImages.map(imageName => 
						`${BASE_URL}/uploads/drivers/vehicles/${imageName}`
					);
				}catch(parseErr){
					console.warn('Failed to parse vehicle_images JSON:', parseErr);
					// If it's not JSON, treat as single image filename
					vehicleImageUrls = [`${BASE_URL}/uploads/drivers/vehicles/${driver.DriverDetail.vehicle_images}`];
				}
			}
			const formattedDriver = {
				id             : driver.id,
				name           : driver.name,
				email          : driver.email,
				mobile         : driver.mobile,
				gender         : driver.gender,
				profile        : driver.profile ? `${BASE_URL}/uploads/profile/${driver.profile}`: null,
				joined_on      : driver.created_at,
				status         : driver.status,
				created_at     : driver.created_at,
				updated_at     : driver.updated_at,
				driver_details : {
					id                     : driver.DriverDetail.id,
					mobile_code            : driver.DriverDetail.mobile_code,
					dob                    : driver.DriverDetail.dob,
					vehicle_id             : driver.DriverDetail.vehicle_id,
					vehicle_type_id        : driver.DriverDetail.vehicle_type_id,
					aadhar_no              : driver.DriverDetail.aadhar_no,
					aadhar_front_image     : driver.DriverDetail.aadhar_front_image ? `${BASE_URL}/uploads/drivers/aadhar/${driver.DriverDetail.aadhar_front_image}` : null,
					aadhar_back_image      : driver.DriverDetail.aadhar_back_image ? `${BASE_URL}/uploads/drivers/aadhar/${driver.DriverDetail.aadhar_back_image}` : null,
					license_number         : driver.DriverDetail.license_number,
					license_front_image    : driver.DriverDetail.license_front_image ? `${BASE_URL}/uploads/drivers/license/${driver.DriverDetail.license_front_image}` : null,
					license_back_image     : driver.DriverDetail.license_back_image ? `${BASE_URL}/uploads/drivers/license/${driver.DriverDetail.license_back_image}` : null,
					vehicle_rc_no          : driver.DriverDetail.vehicle_rc_no,
					vehicle_rc_front_image : driver.DriverDetail.vehicle_rc_front_image ? `${BASE_URL}/uploads/drivers/vehicle-rc/${driver.DriverDetail.vehicle_rc_front_image}`: null,
					vehicle_rc_back_image  : driver.DriverDetail.vehicle_rc_back_image ? `${BASE_URL}/uploads/drivers/vehicle-rc/${driver.DriverDetail.vehicle_rc_back_image}` : null,
					vehicle_images         : vehicleImageUrls,
					deposit_amount         : driver.DriverDetail.deposit_amount,
					deposit_status         : driver.DriverDetail.deposit_status,
					status                 : driver.DriverDetail.status,
					reason                 : driver.DriverDetail.reason,
					rating                 : ratings,
				},
				stats                      : {
					trips_received         : totalTrips,
					trips_completed        : completedTrips,
					trips_cancelled        : cancelledTrips,
					completion_rate        : `${completionRate}%`,
					ratings: ratings
				},
			};
			res.status(200).json({
				success : true,
				message : "Driver profile retrieved successfully",
				data    : formattedDriver,
			});
		}catch(err){
			console.error("getDriverProfile error:", err);
			res.status(500).json({
				success : false,
				message : "Failed to retrieve driver profile"
			});
		}
	},

	// Edit driver profile
	editProfile: async (req, res) => {
		let transaction;
		try{
			const { id } = req.params;
			const { name, email, mobile } = req.body;
			// Find the driver
			const driver = await User.findOne({
				where: { id },
				include: [
				{
					model    : UserRole,
					where    : { role_id: 3 },
					required : true,
				},
				],
			});
			if(!driver){
				return res.status(404).json({
					success: false,
					message: "Driver not found"
				});
			}
			const updates = {};
			if(name) updates.name = name;
			if(email){
				// Check if email is already in use by another user with user role 3
				const existingEmail = await User.findOne({
					where: { 
						email, 
						id: { 
							[Sequelize.Op.ne]: id 
						} 
					},
				});
				if(existingEmail){
					return res.status(400).json({
						success: false,
						message: "Email is already in use"
					});
				}
				updates.email = email;
			}
			if(mobile){
				// Check if mobile is already in use by another user
				const existingMobile = await User.findOne({
					where: { mobile, id: { [Sequelize.Op.ne]: id } },
					include: [
						{
						model: UserRole,
						where: { role_id: 3 },
						required: true,
						},
					]
				});
				if(existingMobile){
					return res.status(400).json({
						success: false,
						message: "Mobile number is already in use"
					});
				}
				updates.mobile = mobile;
			}
            // Handle profile image upload if present
			if(req.file){
				// Delete old profile image using correct property
				if(driver.profile){
					const fs           = require('fs');
					const path         = require('path');
					const oldImagePath = path.join(process.cwd(), 'uploads', 'profile', driver.profile);
					if(fs.existsSync(oldImagePath)){
						try{
							fs.unlinkSync(oldImagePath);
						}catch(deleteErr){
							console.warn('Failed to delete old profile image:', deleteErr);
						}
					}
				}
				// Set new profile image filename
				updates.profile = req.file.filename;
			}
			if(Object.keys(updates).length === 0){
				return res.status(400).json({
					success: false,
					message: "No fields provided to update"
				});
			}
			transaction = await sequelize.transaction();
			// Update user
			await User.update(updates,{
				where: { id },
				transaction,
			});
			await transaction.commit();
			// Fetch updated driver
			const updatedDriver = await User.findByPk(id);
			res.status(200).json({
				success     : true,
				message     : "Driver profile updated successfully",
				data        : {
					id      : updatedDriver.id,
					name    : updatedDriver.name,
					email   : updatedDriver.email,
					mobile  : updatedDriver.mobile,
                	profile : updatedDriver.profile ? `${BASE_URL}/uploads/profile/${updatedDriver.profile}` : null
				},
			});
		}catch(err){
			if(transaction) await transaction.rollback();
			console.error("editProfile error:", err);
			res.status(500).json({
				success: false,
				message: "Failed to update driver profile"
			});
		}
	},

	// Earnings chart for driver
	earningsChart: async (req, res) => {
		try{
			if(!req.user || !req.user.userId){
				return res.status(401).json({
					success: false,
					message: "Unauthorized: Driver not authenticated"
				});
			}
			const driver_id = req.user.userId;
			const { period = 'today' } = req.params;
			// Validate driver exists
			const driver = await User.findByPk(driver_id);
			if(!driver){
				return res.status(404).json({
					success: false,
					message: "Driver not found"
				});
			}
			// Validate period parameter
			const validPeriods = ['today', 'weekly', 'monthly'];
			if(!validPeriods.includes(period.toLowerCase())){
				return res.status(400).json({
					success: false,
					message: "period must be one of: today, weekly, monthly",
				});
			}
			// Get date range based on period
			const { startDate, endDate, chartData } = getDateRangeAndStructure(period);
			const earningsData = await RideRequests.findAll({
				where: {
					driver_id         : driver_id,
					status            : 'ride_completed',
					ride_completed_at : {
						[Op.between]  : [startDate, endDate]
					}
				},
				attributes: [
					'final_fare',
					'ride_completed_at',
					'actual_duration'
				],
				order: [['ride_completed_at', 'ASC']]
			});
			// Get all ride requests for the driver in the period (for metrics calculation)
			const allRideRequests = await RideRequests.findAll({
				where: {
					driver_id: driver_id,
					created_at: {
						[Op.between]: [startDate, endDate]
					}
				},
				attributes: [
					'id',
					'status',
					'rating',
					'accepted_at',
					'cancelled_at',
					'cancellation_reason',
					'created_at'
				]
			});
			const metrics             = calculateDriverMetrics(allRideRequests, earningsData);
			const processedData       = processEarningsData(earningsData, period, chartData);
			const totalTrips          = earningsData.length;
			const totalEarnings       = earningsData.reduce((sum, ride) => sum + parseFloat(ride.final_fare || 0), 0);
			const totalOnlineMinutes  = earningsData.reduce((sum, ride) => sum + parseInt(ride.actual_duration || 0), 0);
			const onlineHours         = Math.round(totalOnlineMinutes / 60);
			const lastEarning         = earningsData.length > 0 ? parseFloat(earningsData[earningsData.length - 1].final_fare || 0) : 0;
			const response            = {
				success                    : true,
				data                       : {
					period                 : period,
					chart                  : processedData.chart,
					summary                : {
						trips              : totalTrips,
						online_hrs         : `${onlineHours}hrs`,
						last_earning       : Math.round(lastEarning)
					},
					breakdown              : {
						net_fare           : Math.round(totalEarnings),
						commission         : 0,
						total_earning      : Math.round(totalEarnings)
					},
					metrics: {
						average_rating     : metrics.averageRating,
						acceptance_rate    : metrics.acceptanceRate,
						cancellation_rate  : metrics.cancellationRate,
						total_requests     : metrics.totalRequests,
						accepted_requests  : metrics.acceptedRequests,
						cancelled_requests : metrics.cancelledRequests,
						rated_rides        : metrics.ratedRides
					}
				}
			};
			res.status(200).json(response);
		}catch(err){
			console.error("Earnings chart error:", err);
			res.status(500).json({
				success: false,
				message: "Failed to retrieve earnings chart"
			});
		}
	},

	// Driver upcoming Bookings
	upcomingBooking: async (req, res) => {
		try{
			const { page = 1, limit = 10 } = req.query;
			if(parseInt(page) < 1 || parseInt(limit) < 1 || parseInt(limit) > 100){
				return res.status(400).json({
					success: false,
					message: 'Invalid pagination parameters'
				});
			}
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
			const today = new Date();
			today.setHours(0, 0, 0, 0); 
			const thirtyDaysFromNow = new Date();
			thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
			thirtyDaysFromNow.setHours(23, 59, 59, 999); 
			const offset = (parseInt(page) - 1) * parseInt(limit);
			const driverStatusFilter 		  = ['accepted', 'arrived'];
			const userReservationStatusFilter = ['searching_driver','pending', 'no_drivers_available', 'timeout', 'expired', 'accepted', 'arrived'];
			const userRegularStatusFilter 	  = ['pending', 'accepted', 'arrived'];
			let whereCondition = {
				[Op.or]: [
					{
						trip_id: [2, 3],
						[Op.or]: [
							{
								pickup_date: {
									[Op.between]: [today.toISOString().split('T')[0], thirtyDaysFromNow.toISOString().split('T')[0]]
								}
							},
							{
								pickup_date: null,
								requested_at: {
									[Op.between]: [today, thirtyDaysFromNow]
								}
							}
						]
					},
					{
						trip_id: 1,
						is_scheduled: 1,
						[Op.or]: [
							{
								pickup_date: {
									[Op.between]: [today.toISOString().split('T')[0], thirtyDaysFromNow.toISOString().split('T')[0]]
								}
							},
							{
								pickup_date: null,
								requested_at: {
									[Op.between]: [today, thirtyDaysFromNow]
								}
							}
						]
					}
				]
			};
			// Apply role-based filters
			if(isDriver){
				whereCondition.driver_id = userId;
				whereCondition.status = driverStatusFilter;
			}else 
			if(isUser){
				whereCondition.user_id = userId;
				const orConditions = [];
				// Reservation trips (trip_id = 3) - include pending and error statuses
				orConditions.push({
					trip_id: 3,
					status: userReservationStatusFilter,
					[Op.or]: [
						{
							pickup_date: {
								[Op.between]: [today.toISOString().split('T')[0], thirtyDaysFromNow.toISOString().split('T')[0]]
							}
						},
						{
							pickup_date: null,
							requested_at: {
								[Op.between]: [today, thirtyDaysFromNow]
							}
						}
					]
				});
				// Round trip (trip_id = 2) - regular status filter
				orConditions.push({
					trip_id: 2,
					status: userRegularStatusFilter,
					[Op.or]: [
						{
							pickup_date: {
								[Op.between]: [today.toISOString().split('T')[0], thirtyDaysFromNow.toISOString().split('T')[0]]
							}
						},
						{
							pickup_date: null,
							requested_at: {
								[Op.between]: [today, thirtyDaysFromNow]
							}
						}
					]
				});
				// One way scheduled (trip_id = 1, is_scheduled = 1) - regular status filter
				orConditions.push({
					trip_id: 1,
					is_scheduled: 1,
					status: userRegularStatusFilter,
					[Op.or]: [
						{
							pickup_date: {
								[Op.between]: [today.toISOString().split('T')[0], thirtyDaysFromNow.toISOString().split('T')[0]]
							}
						},
						{
							pickup_date: null,
							requested_at: {
								[Op.between]: [today, thirtyDaysFromNow]
							}
						}
					]
				});
				whereCondition[Op.or] = orConditions;
			}
			// Get upcoming rides for the next 30 days
			const { count, rows: rides } = await RideRequests.findAndCountAll({
				where: whereCondition,
				attributes: [
					'id',
					'pickup_address',
					'dropoff_address',
					'stop1_address',
					'stop2_address',
					'final_fare',
					'estimated_fare',
					'pickup_date',
					'pickup_time',
					'requested_at',
					'accepted_at',
					'special_instructions',
					'trip_id',
					'trip_type',
					'status',
					'is_advance_paid',
					'advance_paid_amount',
					'remaining_fare_to_pay'
				],
				order: [
					['pickup_date', 'ASC'],
					['pickup_time', 'ASC'],
					['requested_at', 'ASC']
				],
				limit: parseInt(limit),
				offset: offset
			});
			if(!rides || rides.length === 0){
				return res.status(200).json({
					success: true,
					message: 'No upcoming rides found',
					data: {
						rides: [],
						pagination: {
							currentPage: parseInt(page),
							totalPages: 0,
							totalRides: 0,
							limit: parseInt(limit),
							hasNextPage: false,
							hasPrevPage: false
						}
					}
				});
			}
			// Format the rides data
			const formattedRides = rides.map(ride => ({
				id: ride.id,
				pickup: {
					address: ride.pickup_address,
					date: ride.pickup_date,
					time: ride.pickup_time
				},
				dropoff: {
					address: ride.dropoff_address
				},
				stops: [
					ride.stop1_address ? { address: ride.stop1_address } : null,
					ride.stop2_address ? { address: ride.stop2_address } : null
				].filter(Boolean),
				fare: {
					final_fare: ride.final_fare,
					estimated_fare: ride.estimated_fare,
					...(ride.trip_id === 3 && {
						is_advance_paid: ride.is_advance_paid,
						advance_paid_amount: ride.advance_paid_amount,
						remaining_fare_to_pay: ride.remaining_fare_to_pay
					})
				},
				trip_id: getTripTypeName(ride.trip_id),
				trip_type: ride.trip_type === 2 ? 'Outstation' : 'Intercity',
				status: ride.status,
				special_instructions: ride.special_instructions,
				accepted_at: ride.accepted_at,
				requested_at: ride.requested_at
			}));
			const totalPages = Math.ceil(count / parseInt(limit));
			return res.status(200).json({
				success: true,
				message: 'Upcoming rides retrieved successfully',
				data: {
					rides: formattedRides,
					pagination: {
						currentPage: parseInt(page),
						totalPages: totalPages,
						totalRides: count,
						limit: parseInt(limit),
						hasNextPage: parseInt(page) < totalPages,
						hasPrevPage: parseInt(page) > 1
					}
				}
			});
		}catch(err){
			console.error("Upcoming bookings error:", err);
			res.status(500).json({
				success: false,
				message: "Failed to retrieve booking data"
			});
		}
	},

	// Get particular ride upcoming Bookings
	getBookingDetails: async (req, res) =>{
		try{
        	const { rideId } = req.params;
			if(!req.user || !req.user.userId){
				return res.status(401).json({
					success: false,
					message: 'Unauthorized: User not authenticated'
				});
			}
			// Fetch admin settings for wallet negative limit
			const adminSettings = await Settings.findOne({
				where: { role: 'admin' }
			});
			if(!adminSettings){
				return res.status(500).json({
					success: false,
					message: 'Admin settings not found. Please contact support.'
				});
			}
			const company_phone = parseFloat(adminSettings.company_phone || null);
			const userId    	= req.user.userId;
			const userRole  	= req.user.role;
        	const rideIdNum 	= parseInt(rideId);
			if(!rideId || !Number.isInteger(rideIdNum) || rideIdNum < 1){
				return res.status(400).json({
					success: false,
					message: 'Valid Ride ID is required'
				});
			}
			// Role validation
			const isDriver = userRole.toLowerCase() === 'driver';
			const isUser   = userRole.toLowerCase() === 'user';
			if(!isDriver && !isUser){
				return res.status(403).json({
					success: false,
					message: 'User is not authorized'
				});
			}
			let whereCondition = {
				id: rideId,
				[Op.or]: [
					{
						trip_id: [2, 3]
					},
					{
						trip_id: 1,
						is_scheduled: 1
					}
				]
			};
			if(isDriver){
				whereCondition.driver_id = userId;
			}else 
			if(isUser){
				whereCondition.user_id = userId;
			}
			// Get specific ride details
			const ride = await RideRequests.findOne({
            	where: whereCondition,
				include: [
					{
						model: Vehicletypes, 
						as: 'vehicleType',
						attributes: ['id', 'name', 'description','image','capacity']
					},
					{
						model: Package,
						as: 'package',
						attributes: ['id', 'name', 'km', 'status'],
						required: false
					},
					{
						model: ReservationAdvancePayment,
						as: 'advancePayment',
						attributes: [
							'id',
							'advance_amount',
							'payment_status',
							'transaction_id',
							'paid_at',
							'created_at'
						],
						required: false
					}
				]
			});
			if(!ride){
				const entityType = isDriver ? 'driver' : 'user';
				return res.status(404).json({
					success: false,
					message: `Ride not found or not assigned to this ${entityType}`
				});
			}    
			let fareBreakdown       = null;
        	let actualFareBreakdown = null;
			try{
				if(ride.fare_breakdown){
					fareBreakdown   = JSON.parse(ride.fare_breakdown);
				}
				if(ride.actual_fare_breakdown){
					actualFareBreakdown = JSON.parse(ride.actual_fare_breakdown);
				}
			}catch(parseErr){
				console.error('Error parsing fare breakdown:', parseErr);
			}    
			let reservationDetails = null;
			if(ride.trip_id === 3){
				reservationDetails = {
					is_custom_trip		: ride.is_custom_trip,
					package				: ride.package ? {
						id				: ride.package.id,
						name			: ride.package.name,
						kilometers		: ride.package.km,
						status			: ride.package.status
					} : null,
					custom_trip_details	: ride.is_custom_trip ? {
						custom_km		: ride.custom_km,
						custom_days		: ride.custom_days
					} : null,
					advance_payment		: ride.is_advance_paid && ride.advancePayment ? {
						id				: ride.advancePayment.id,
						advance_amount	: ride.advancePayment.advance_amount,
						payment_status	: ride.advancePayment.payment_status,
						paid_at			: ride.advancePayment.paid_at
					} : null,
					advance_paid_amount	: ride.advance_paid_amount,
					remaining_fare      : ride.remaining_fare_to_pay,
					is_advance_paid		: ride.is_advance_paid
				};
			}
			const rideDetails = {
				id                      : ride.id,
				trip_id              	: getTripTypeName(ride.trip_id),
				trip_type               : ride.trip_type,
				trip_type_name          : ride.trip_type === 2 ? 'Outstation' : 'Intercity',
				is_scheduled			: ride.is_scheduled,
				vehicle                 : {
					id                  : ride.vehicle_type_id,
					name                : ride.vehicleType?.name,
					description         : ride.vehicleType?.description,
					capacity            : ride.vehicleType?.capacity,
                    image               : ride.vehicleType ? `${BASE_URL}/uploads/vehicle-types/${ride.vehicleType.image}` : null
				},
				pickup                  : {
					address             : ride.pickup_address,
					latitude            : ride.pickup_latitude,
					longitude           : ride.pickup_longitude,
					date                : ride.pickup_date,
					time                : ride.pickup_time
				},
				dropoff                 : {
					address             : ride.dropoff_address,
					latitude            : ride.dropoff_latitude,
					longitude           : ride.dropoff_longitude
				},
				stops                   : [
					ride.stop1_address ? { address: ride.stop1_address, latitude : ride.stop1_latitude, longitude: ride.stop1_longitude} : null,
					ride.stop2_address ? { address: ride.stop2_address, latitude: ride.stop2_latitude, longitude: ride.stop2_longitude} : null
				].filter(Boolean),
				...(reservationDetails && { reservation_details: reservationDetails }),
				fare_details            : {
					estimated           : {
						total_fare      : ride.estimated_fare,
						base_fare       : ride.estimated_base_fare,
						distance_charge : ride.estimated_distance_charge,
						waiting_charge  : ride.estimated_waiting_charge,
						bata_charge     : ride.estimated_bata_charge,
						subtotal        : ride.estimated_subtotal,
						gst_amount      : ride.estimated_gst_amount,
						breakdown       : fareBreakdown
					},
					actual              : ride.actual_fare ? {
						total_fare      : ride.actual_fare,
						base_fare       : ride.actual_base_fare,
						distance_charge : ride.actual_distance_charge,
						waiting_charge  : ride.actual_waiting_charge,
						bata_charge     : ride.actual_bata_charge,
						subtotal        : ride.actual_subtotal,
						gst_amount      : ride.actual_gst_amount,
						breakdown       : actualFareBreakdown
					} : null,
					final_fare          : ride.final_fare,
					discount_amount     : ride.discount_amount
				},
				payment                 : {
					status              : ride.payment_status
				},
				special_instructions    : ride.special_instructions,
				timestamps: {
					requested_at        : ride.requested_at,
					accepted_at         : ride.accepted_at,
					arrived_at   		: ride.arrived_at,
					ride_started_at     : ride.ride_started_at,
					ride_completed_at   : ride.ride_completed_at,
					cancelled_at        : ride.cancelled_at,
					cancellation_reason : ride.cancellation_reason
				},
				help_support			: {
					company_phone       : company_phone
				}
			};
			return res.status(200).json({
				success : true,
				message : 'Ride details retrieved successfully',
				data    : rideDetails
			});
		}catch(err){
			console.error("Upcoming bookings error:", err);
			res.status(500).json({
				success : false,
				message : "Failed to retrieve booking details:"
			});
		}
	}
};

// Helper function to get date range and chart structure
function getDateRangeAndStructure(period){
    const now = new Date();
    let startDate, endDate, chartData;
    switch(period.toLowerCase()){
        case 'today':
            startDate   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            endDate     = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            chartData   = {
                type    : 'daily',
                format  : 'ddd, DD MMM\'YY',
                periods : ['S', 'M', 'T', 'W', 'T', 'F', 'S'] // Week days
            };
            break;
        case 'weekly':
            // Get current week (Monday to Sunday)
            const currentDay   = now.getDay();
            const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
            startDate = new Date(now);
            startDate.setDate(now.getDate() + mondayOffset);
            startDate.setHours(0, 0, 0, 0);
            endDate   = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
            chartData = {
                type: 'weekly',
                format: 'Week of MMM DD',
                periods: ['S', 'M', 'T', 'W', 'T', 'F', 'S']
            };
            break;
        case 'monthly':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            chartData = {
                type: 'monthly',
                format: 'MMM YYYY',
                periods: Array.from({length: endDate.getDate()}, (_, i) => i + 1)
            };
            break;
    }
    return { startDate, endDate, chartData };
}

// Helper function to process earnings data for chart
function processEarningsData(earningsData, period, chartData){
    const chart = [];
    if(period === 'today' || period === 'weekly'){
        // Group by day of week
        const dailyEarnings = new Array(7).fill(0);
        const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        earningsData.forEach(ride => {
            const rideDate = new Date(ride.ride_completed_at);
            const dayIndex = rideDate.getDay();
            dailyEarnings[dayIndex] += parseFloat(ride.final_fare || 0);
        });
        const today = new Date();
        const currentDayIndex = today.getDay();
        dailyEarnings.forEach((earnings, index) => {
            chart.push({
                period: dayLabels[index],
                amount: Math.round(earnings),
                highlighted: period === 'today' ? index === currentDayIndex : earnings > 0
            });
        });
    }else 
	if(period === 'monthly'){
        // Group by day of month
        const now            = new Date();
        const daysInMonth    = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const dailyEarnings  = new Array(daysInMonth).fill(0);
        earningsData.forEach(ride => {
            const rideDate   = new Date(ride.ride_completed_at);
            const dayOfMonth = rideDate.getDate() - 1; // 0-based index
            dailyEarnings[dayOfMonth] += parseFloat(ride.final_fare || 0);
        });
        const today       = new Date();
        const currentDate = today.getDate();
        dailyEarnings.forEach((earnings, index) => {
            chart.push({
                period: (index + 1).toString(),
                amount: Math.round(earnings),
                highlighted: period === 'monthly' ? (index + 1) === currentDate : earnings > 0
            });
        });
    }
    return { chart };
}

// Helper function to calculate driver metrics
function calculateDriverMetrics(allRideRequests, completedRides){
	// Average Rating Calculation
	const ratedRides        = completedRides.filter(ride => ride.rating !== null && ride.rating !== undefined);
	const totalRating       = ratedRides.reduce((sum, ride) => sum + parseInt(ride.rating || 0), 0);
	const averageRating     = ratedRides.length > 0 ? (totalRating / ratedRides.length).toFixed(1) : 0;
	// Acceptance Rate Calculation
	const totalRequests     = allRideRequests.length;
	const acceptedStatuses  = ['accepted', 'arrived', 'ride_started', 'ride_completed'];
	const acceptedRequests  = allRideRequests.filter(request => 
		acceptedStatuses.includes(request.status) || request.accepted_at !== null
	).length;
	const acceptanceRate    = totalRequests > 0 ? ((acceptedRequests / totalRequests) * 100).toFixed(1) : 0;
	// Cancellation Rate Calculation
	const cancelledRequests = allRideRequests.filter(request => request.status === 'cancelled' && request.accepted_at !== null && request.cancelled_at !== null &&
		request.cancellation_reason ).length;
	const cancellationRate  = acceptedRequests > 0 ? ((cancelledRequests / acceptedRequests) * 100).toFixed(1) : 0;
	return{
		averageRating    : parseFloat(averageRating),
		acceptanceRate   : parseFloat(acceptanceRate),
		cancellationRate : parseFloat(cancellationRate),
		totalRequests,
		acceptedRequests,
		cancelledRequests,
		ratedRides: ratedRides.length
	};
}

// Helper function to validate Coordinate
function isValidCoordinate(latitude, longitude){
	const isValidLat = typeof latitude === "number" && latitude >= -90 && latitude <= 90;
	const isValidLon = typeof longitude === "number" && longitude >= -180 && longitude <= 180;
	return isValidLat && isValidLon;
}
// Helper function to get trip type name
function getTripTypeName(trip_type){
    switch (trip_type) {
        case 1: return 'ONE WAY';
        case 2: return 'ROUND TRIP';
        case 3: return 'RESERVE';
        default: return 'UNKNOWN';
    }
}
module.exports = driverController;
