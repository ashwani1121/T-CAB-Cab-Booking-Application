const { sequelize, Sequelize, DriverLocation, User, DriverDetails, Vehicletypes } = require('../models');
class NearbyDriverService{
    constructor(db, redis, helperService, config){
        this.db                       = db;
        this.redis                    = redis;
        this.helperService            = helperService;
        this.SEARCH_RADII             = config.SEARCH_RADII;
        this.MAX_DRIVERS_TO_NOTIFY    = config.MAX_DRIVERS_TO_NOTIFY;
        this.LOCATION_STALE_THRESHOLD = config.LOCATION_STALE_THRESHOLD;
    }

    // User request ride : nearbydriver 
    async findNearbyDrivers(pickupLocation, vehicleTypeId, rideRequestId = null, excludedDriverIds = null) {
        try{
            const isBookAnyVehicle = vehicleTypeId === 'any';
            const excludedDrivers  = excludedDriverIds !== null ? excludedDriverIds : await this.getExcludedDriversForRide(rideRequestId);
            if(isBookAnyVehicle){
                return await this.findNearbyDriversForAnyVehicle(pickupLocation, rideRequestId, excludedDrivers);
            }else{
                return await this.findNearbyDriversForSpecificVehicle(pickupLocation, vehicleTypeId, rideRequestId, excludedDrivers);
            }
        }catch(error){
            console.error('driver_search_error', error);
            return [];
        }
    }

    // Find drivers for specific vehicle type 
    async findNearbyDriversForSpecificVehicle(pickupLocation, vehicleTypeId, rideRequestId = null, excludedDriverIds = null) {
        try{
            // Use provided excludedDriverIds or fetch from DB
            const excludedDrivers = excludedDriverIds !== null 
                ? (Array.isArray(excludedDriverIds) ? excludedDriverIds : [])
                : await this.getExcludedDriversForRide(rideRequestId);
            
            console.log(`🔍 EXCLUDED DRIVERS FOR SPECIFIC VEHICLE: [${excludedDrivers.join(', ')}]`);
            
            // Step 1: Get cached online drivers for specific vehicle type
            const onlineDrivers = await this.getCachedOnlineDrivers(vehicleTypeId);
            if(onlineDrivers.length === 0){
                return [];
            }
            
            //Filter out excluded drivers
            const eligibleDrivers = excludedDrivers.length > 0 
                ? onlineDrivers.filter(d => !excludedDrivers.includes(d.driver_id)) 
                : onlineDrivers;
                
            if(eligibleDrivers.length === 0){
                console.log(`All ${onlineDrivers.length} drivers for vehicle type ${vehicleTypeId} are excluded`);
                return [];
            }

            // Step 2: Batch fetch live locations
            const driversWithLocation = await this.batchFetchDriverLocations(eligibleDrivers);
            if(driversWithLocation.length === 0){
                return [];
            }

            // Step 3: Calculate distances
            const driversWithDistance = await this.calculateOptimizedDistances(
                pickupLocation.latitude,
                pickupLocation.longitude,
                driversWithLocation
            );

            // Step 4: Progressive radius search
            const nearbyDrivers = this.findDriversInProgressiveRadius(driversWithDistance);

            // Step 5: Select optimal drivers
            const selectedDrivers = this.selectOptimalDrivers(nearbyDrivers);
            return selectedDrivers;
        }catch(error){
            console.error('specific_vehicle_search_error', error);
            return [];
        }
    }

    // Find drivers for "Book Any Vehicle" option
    async findNearbyDriversForAnyVehicle(pickupLocation, rideRequestId = null, excludedDriverIds = null) {
        try{
            // Use provided excludedDriverIds or fetch from DB
            const excludedDrivers = excludedDriverIds !== null 
                ? (Array.isArray(excludedDriverIds) ? excludedDriverIds : [])
                : await this.getExcludedDriversForRide(rideRequestId);
            
            console.log("🔍 EXCLUDED DRIVERS PASSED TO METHOD:", excludedDrivers);
            console.log(`\n🚫 GLOBAL EXCLUDED DRIVERS: [${excludedDrivers.join(', ')}]`);
            
            const activeVehicleTypes = await Vehicletypes.findAll({
                where: { status: 1 },
                attributes: ['id', 'name', 'capacity'],
                order: [['capacity', 'ASC']]
            });
            
            if(activeVehicleTypes.length === 0){
                console.log('❌ No active vehicle types found');
                return [];
            }
            
            const allNearbyDrivers   = [];
            const vehicleTypeResults = [];
            
            // Search for drivers across all vehicle types
            for(const vehicleType of activeVehicleTypes){
                try{
                    const onlineDrivers = await this.getCachedOnlineDrivers(vehicleType.id);
                    console.log(`\n📍 Vehicle Type: ${vehicleType.name} (ID: ${vehicleType.id})`);
                    console.log(`Total Online: ${onlineDrivers.length}`);
                    
                    if(onlineDrivers.length === 0){
                        vehicleTypeResults.push({
                            vehicle_type_id : vehicleType.id,
                            vehicle_name    : vehicleType.name,
                            drivers_found   : 0,
                            excluded_count  : 0
                        });
                        continue;
                    }
                    
                    // Filter out excluded drivers - THIS IS THE KEY FIX
                    const eligibleDrivers = excludedDrivers.length > 0 ? onlineDrivers.filter(d => {
                        const isExcluded = excludedDrivers.includes(d.driver_id);
                        if(isExcluded){
                            console.log(`⛔ Excluding Driver ${d.driver_id} (${d.name}) from ${vehicleType.name}`);
                        }
                        return !isExcluded;
                    }) : onlineDrivers;
                    
                    const excludedCount = onlineDrivers.length - eligibleDrivers.length;
                    console.log(`   Excluded: ${excludedCount}, Eligible: ${eligibleDrivers.length}`);
                    
                    if(eligibleDrivers.length === 0){
                        console.log(`   ⚠️ All drivers excluded for ${vehicleType.name}`);
                        vehicleTypeResults.push({
                            vehicle_type_id : vehicleType.id,
                            vehicle_name    : vehicleType.name,
                            drivers_found   : 0,
                            excluded_count  : excludedCount,
                            total_online    : onlineDrivers.length,
                            all_excluded    : true
                        });
                        continue;
                    }
                    
                    eligibleDrivers.forEach((driver, idx) => {
                        console.log(`${idx + 1}. Driver ${driver.driver_id} (${driver.name})`);
                    });
                    
                    const driversWithLocation = await this.batchFetchDriverLocations(eligibleDrivers);
                    
                    if(driversWithLocation.length === 0){
                        console.log(`   ⚠️ No drivers with valid location`);
                        continue;
                    }
                    
                    const driversWithDistance = await this.calculateOptimizedDistances(
                        pickupLocation.latitude,
                        pickupLocation.longitude,
                        driversWithLocation
                    );
                    
                    const nearbyDriversForType = this.findDriversInProgressiveRadius(driversWithDistance);
                    
                    // Add vehicle type info
                    const driversWithVehicleInfo = nearbyDriversForType.map(driver => ({
                        ...driver,
                        vehicle_type_id: vehicleType.id,
                        vehicle_type_name: vehicleType.name,
                        vehicle_capacity: vehicleType.capacity
                    }));
                    
                    allNearbyDrivers.push(...driversWithVehicleInfo);
                    
                    vehicleTypeResults.push({
                        vehicle_type_id: vehicleType.id,
                        vehicle_name: vehicleType.name,
                        drivers_found: nearbyDriversForType.length,
                        excluded_count: excludedCount,
                        total_eligible: eligibleDrivers.length
                    });
                }catch(vehicleTypeError){
                    console.error(`❌ Error searching for vehicle type ${vehicleType.name}:`, vehicleTypeError);
                }
            }
            
            if(allNearbyDrivers.length === 0){
                console.log('❌ No nearby drivers found across all vehicle types');
                return [];
            }     
            
            console.log(`\n✅ Total nearby drivers before dedup: ${allNearbyDrivers.length}`);
            
            const uniqueDrivers   = this.removeDuplicateDrivers(allNearbyDrivers);
            const selectedDrivers = this.selectOptimalDriversForAnyVehicle(uniqueDrivers);
            
            console.log(`\n🎯 FINAL SELECTED DRIVERS: ${selectedDrivers.length}`);
            selectedDrivers.forEach((driver, idx) => {
                console.log(`   ${idx + 1}. Driver ${driver.driver_id} (${driver.name}) - ${driver.vehicle_type_name} - ${driver.distance_km}km`);
            });
            
            // Create metadata
            const searchMetadata = {
                is_book_any_vehicle: true,
                vehicle_types_searched: activeVehicleTypes.length,
                total_drivers_found: allNearbyDrivers.length,
                unique_drivers: uniqueDrivers.length,
                excluded_drivers_count: excludedDrivers.length,
                excluded_driver_ids: excludedDrivers,
                vehicle_type_results: vehicleTypeResults
            };
            
            // Add metadata ONLY to the FIRST driver for logging purposes
            if(selectedDrivers.length > 0){
                selectedDrivers[0].search_metadata = searchMetadata;
            }
            
            return selectedDrivers;
        } catch (error) {
            console.error('book_any_vehicle_search_error', error);
            return [];
        }
    }

    async getExcludedDriversForRide(rideRequestId) {
        if(!rideRequestId){
            return [];
        }
        console.log("nb -- request id",rideRequestId);
        try{
            const { RideRequests } = require('../models');
            const rideRequest = await RideRequests.findByPk(rideRequestId, {
                attributes: ['id', 'metadata', 'status', 'vehicle_type_id', 'is_book_any_vehicle'],
                raw: true
            });
            if(!rideRequest){
                console.log(`⚠️ Ride request ${rideRequestId} not found`);
                return [];
            }
            if(!rideRequest.metadata){
                console.log(`ℹ️ No metadata - no excluded drivers`);
                return [];
            }
            try{
                if(rideRequest.metadata){
                    const metadata = JSON.parse(rideRequest.metadata);
                    console.log(metadata);
                    if(metadata.cancelled_drivers && metadata.cancelled_drivers.length > 0){
                        const verifiedExcludedDriverIds = metadata.cancelled_drivers.map(cd => cd.driver_id ?? cd);
                        console.log(`✅ Nirmal Parsed ${verifiedExcludedDriverIds.length} excluded drivers from metadata`);
                        console.log(verifiedExcludedDriverIds);
                        return verifiedExcludedDriverIds;
                    }else{
                        console.log(`⚠️ No cancelled_drivers array in metadata!`);
                        return [];
                    }
                }
            }catch(parseError){
                console.error(`❌ Failed to parse metadata:`, parseError);
                console.error(`📄 Raw Metadata: ${rideRequest.metadata.substring(0, 200)}...`);
                return [];
            }
        }catch(error){
            console.error(`   ❌ Error getting excluded drivers for ride ${rideRequestId}:`, error);
            return [];
        }
    }

    // Remove duplicate drivers and keep the best option for each
    removeDuplicateDrivers(drivers) {
        const driverMap = new Map();

        for (const driver of drivers) {
            const driverId = driver.driver_id;
            const existing = driverMap.get(driverId);

            if (!existing) {
                // First time seeing this driver
                driverMap.set(driverId, {
                    ...driver,
                    alternative_vehicle_types: []
                });
            } else {
                // Driver already exists - decide what to keep
                const currentVehicle = {
                    vehicle_type_id: driver.vehicle_type_id,
                    vehicle_type_name: driver.vehicle_type_name,
                    vehicle_capacity: driver.vehicle_capacity
                };

                // Keep the entry with shorter distance
                if (driver.distance_km < existing.distance_km) {
                    // New entry is closer - make old entry an alternative
                    const oldVehicle = {
                        vehicle_type_id: existing.vehicle_type_id,
                        vehicle_type_name: existing.vehicle_type_name,
                        vehicle_capacity: existing.vehicle_capacity
                    };

                    driverMap.set(driverId, {
                        ...driver,
                        alternative_vehicle_types: [oldVehicle, ...existing.alternative_vehicle_types]
                    });
                } else {
                    // Existing entry is closer - add new one as alternative
                    if (!existing.alternative_vehicle_types.some(v => v.vehicle_type_id === currentVehicle.vehicle_type_id)) {
                        existing.alternative_vehicle_types.push(currentVehicle);
                    }
                }
            }
        }

        return Array.from(driverMap.values());
    }

    // Enhanced selection for "Book Any Vehicle" considering vehicle diversity
    selectOptimalDriversForAnyVehicle(drivers){
        if(drivers.length === 0) return [];
        // Score drivers for "Book Any Vehicle" selection
        const weights = {
            distance        : parseFloat(process.env.SCORE_DISTANCE_WEIGHT || 2),
            rating          : parseFloat(process.env.SCORE_RATING_WEIGHT || 10),
            location_age    : parseFloat(process.env.SCORE_LOCATION_AGE_WEIGHT || 0.5),
            vehicle_diversity: parseFloat(process.env.SCORE_VEHICLE_DIVERSITY_WEIGHT || 5) // NEW: Prefer vehicle diversity
        };
        const scoredDrivers = drivers.map(driver => {
            let score = 100;
            // Distance penalty
            score -= driver.distance_km * weights.distance;
            
            // Rating bonus
            if(driver.rating){
                score += (driver.rating - 4.0) * weights.rating;
            }
            
            // Location freshness penalty
            const locationAgeMinutes = (driver.location_age || 0) / 60000;
            score -= locationAgeMinutes * weights.location_age;
            
            // Vehicle diversity bonus (prefer drivers with multiple vehicle options)
            const vehicleOptions = 1 + (driver.alternative_vehicle_types?.length || 0);
            score += Math.log(vehicleOptions) * weights.vehicle_diversity;

            return{
                ...driver,
                selection_score: Math.max(score, 0),
                vehicle_options_count: vehicleOptions
            };
        });
        // Sort by score and distance, then take the best ones
        return scoredDrivers
            .sort((a, b) => {
                // Primary sort by score
                if(Math.abs(a.selection_score - b.selection_score) > 1){
                    return b.selection_score - a.selection_score;
                }
                // Secondary sort by distance if scores are close
                return a.distance_km - b.distance_km;
            })
            .slice(0, this.MAX_DRIVERS_TO_NOTIFY);
    }

    // Step 1: Optimized caching for online drivers
    async getCachedOnlineDrivers(vehicleTypeId){
        // Handle "Book Any Vehicle" caching differently
        if(vehicleTypeId === 'any'){
            return await this.getCachedOnlineDriversForAnyVehicle();
        }
        const cacheKey = `online_drivers_v3_${vehicleTypeId}`;
        try{
            const cached = await this.redis.get(cacheKey);
            if(cached){
                return JSON.parse(cached);
            }
        }catch(error){
            console.warn('Cache read failed, fetching from DB:', error.message);
        }
        const onlineDrivers = await DriverLocation.findAll({
            attributes : ['driver_id', 'last_updated_at'],
            where : { is_online: 1 },
            include : [{
                model : User,
                as : 'driver',
                attributes : ['id', 'fcm_token', 'name'],
                where : { status: 1 },
                include : [{
                    model : DriverDetails,
                    as : 'DriverDetail',
                    attributes : ['vehicle_type_id', 'rating'],
                    where : {
                        vehicle_type_id : vehicleTypeId,
                        status : "approved"
                    }
                }]
            }],
            limit: 50
        });
        const driverData = onlineDrivers.map(driver => ({
            driver_id      : driver.driver_id,
            fcm_token      : driver.driver.fcm_token,
            name           : driver.driver.name,
            rating         : driver.driver.DriverDetail?.rating || 4.0,
            vehicle_type_id: vehicleTypeId,
            last_db_update : driver.last_updated_at
        }));
        try{
            await this.redis.setEx(cacheKey, 60, JSON.stringify(driverData));
        }catch(error){
            console.warn('Cache write failed:', error.message);
        }
        return driverData;
    }

    // Get cached online drivers for "Book Any Vehicle"
    async getCachedOnlineDriversForAnyVehicle(){
        const cacheKey = `online_drivers_any_vehicle_v3`;
        try{
            const cached = await this.redis.get(cacheKey);
            if(cached){
                return JSON.parse(cached);
            }
        }catch(error){
            console.warn('Cache read failed for any vehicle, fetching from DB:', error.message);
        }
        // Get all online drivers regardless of vehicle type
        const onlineDrivers = await DriverLocation.findAll({
            attributes : ['driver_id', 'last_updated_at'],
            where : { is_online: 1 },
            include : [{
                model : User,
                as : 'driver',
                attributes : ['id', 'fcm_token', 'name'],
                where : { status: 1 },
                include : [{
                    model : DriverDetails,
                    as : 'DriverDetail',
                    attributes : ['vehicle_type_id', 'rating'],
                    where : { status : "approved" }
                }]
            }],
            limit: 100 // Increased limit for "Book Any Vehicle"
        });
        const driverData = onlineDrivers.map(driver => ({
            driver_id      : driver.driver_id,
            fcm_token      : driver.driver.fcm_token,
            name           : driver.driver.name,
            rating         : driver.driver.DriverDetail?.rating || 4.0,
            vehicle_type_id: driver.driver.DriverDetail?.vehicle_type_id,
            last_db_update : driver.last_updated_at
        }));
        try{
            await this.redis.setEx(cacheKey, 30, JSON.stringify(driverData)); // Shorter cache for any vehicle
        }catch(error){
            console.warn('Cache write failed:', error.message);
        }
        return driverData;
    }

    // Step 2: Batch fetch driver locations from Firebase
    async batchFetchDriverLocations(drivers){
        const batchSize = 20;
        const driversWithLocation = [];
        for(let i = 0; i < drivers.length; i += batchSize){
            const batch = drivers.slice(i, i + batchSize);
            const locationPromises = batch.map(async (driver) => {
                try{
                    const locationRef = this.db.ref(`driver_locations/${driver.driver_id}`);
                    const snapshot    = await locationRef.once('value');
                    const location    = snapshot.val();
                    if(!location?.latitude || !location?.longitude){
                        return null;
                    }
                    const locationAge = Date.now() - (location.last_updated_at || 0);
                    if(locationAge > this.LOCATION_STALE_THRESHOLD){
                        return null;
                    }
                    return {
                        ...driver,
                        current_latitude  : location.latitude,
                        current_longitude : location.longitude,
                        last_updated      : location.last_updated_at,
                        location_age      : locationAge
                    };
                }catch(error){
                    console.error(`Firebase fetch error for driver ${driver.driver_id}:`, error);
                    return null;
                }
            });
            const batchResults = await Promise.allSettled(locationPromises);
            batchResults.forEach(result => {
                if(result.status === 'fulfilled' && result.value){
                    driversWithLocation.push(result.value);
                }
            });
            if(i + batchSize < drivers.length){
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
        return driversWithLocation;
    }

    // Step 3: Optimized distance calculation
    async calculateOptimizedDistances(pickupLat, pickupLon, drivers) {
        try{
            return await this.helperService.calculateBatchGoogleDistances(pickupLat, pickupLon, drivers);
        }catch(error){
            console.warn('Google Distance Matrix failed, using simple calculation:', error.message);
            return drivers.map(driver => ({
                ...driver,
                distance_km: this.helperService.calculateSimpleDistance(
                    pickupLat, pickupLon,
                    driver.current_latitude, driver.current_longitude
                ),
                calculation_method: 'simple'
            }));
        }
    }

    // Step 4: Progressive radius search 
    findDriversInProgressiveRadius(driversWithDistance){
        for(const radius of this.SEARCH_RADII){
            const nearbyDrivers = driversWithDistance.filter(driver => driver.distance_km <= radius);
            if(nearbyDrivers.length > 0){
                return nearbyDrivers.sort((a, b) => a.distance_km - b.distance_km);
            }
        }
        return [];
    }

    // Step 5: Intelligent driver selection
    selectOptimalDrivers(nearbyDrivers){
        if(nearbyDrivers.length === 0) return [];
        const weights = {
            distance     : parseFloat(process.env.SCORE_DISTANCE_WEIGHT || 2),
            rating       : parseFloat(process.env.SCORE_RATING_WEIGHT || 10),
            location_age : parseFloat(process.env.SCORE_LOCATION_AGE_WEIGHT || 0.5)
        };
        const scoredDrivers = nearbyDrivers.map(driver => {
            let score = 100;
            score    -= driver.distance_km * weights.distance;
            if(driver.rating){
                score += (driver.rating - 4.0) * weights.rating;
            }
            const locationAgeMinutes = driver.location_age / 60000;
            score -= locationAgeMinutes * weights.location_age;
            return{
                ...driver,
                selection_score: Math.max(score, 0)
            };
        });
        return scoredDrivers
            .sort((a, b) => b.selection_score - a.selection_score)
            .slice(0, this.MAX_DRIVERS_TO_NOTIFY);
    }

    // To display vehicles in user app : nearbydriver
    async findNearbyDriversforUser(pickupLocation, vehicleTypeId){
        try{
            const isShowAllVehicles = vehicleTypeId === 'any';
            let whereCondition      = { is_online: 1 };
            let driverDetailsWhere  = { status: "approved" };
            if(!isShowAllVehicles){
                driverDetailsWhere.vehicle_type_id = vehicleTypeId;
            }
            const onlineDrivers = await DriverLocation.findAll({
                attributes : ['driver_id', 'last_updated_at'],
                where      : whereCondition,
                include    : [{
                    model      : User,
                    as         : 'driver',
                    attributes : ['id', 'fcm_token', 'name'],
                    where      : { status: 1 },
                    include    : [{
                        model          : DriverDetails,
                        as             : 'DriverDetail',
                        attributes     : ['vehicle_type_id', 'rating'],
                        where          : driverDetailsWhere,
                    }]
                }],
                limit: isShowAllVehicles ? 100 : 50
            });
            // Get real-time locations from Firebase
            const driversWithLocation = [];
            const locationPromises    = onlineDrivers.map(async (driver) => {
                try{
                    const locationRef = this.db.ref(`driver_locations/${driver.driver_id}`);
                    const snapshot    = await locationRef.once('value');
                    const location    = snapshot.val();
                    if(location?.latitude && location?.longitude){
                        const lastUpdatedAt = new Date(location.last_updated_at).getTime();
                        const locationAge   = Date.now() - lastUpdatedAt;
                        // Only include if location is fresh (less than 5 minutes old)
                        if(locationAge < 300000){
                            const vehicleDetail = driver.driver.DriverDetail;
                            return{
                                driver_id         : driver.driver_id,
                                name              : driver.driver.name,
                                current_latitude  : location.latitude,
                                current_longitude : location.longitude,
                                last_updated      : location.last_updated_at,
                                rating            : vehicleDetail?.rating || 4.0,
                                vehicle_type_id   : vehicleDetail?.vehicle_type_id,
                            };
                        }
                    }
                    return null;
                }catch(error){
                    console.error(`Error fetching location for driver ${driver.driver_id}:`, error);
                    return null;
                }
            });
            const results = await Promise.allSettled(locationPromises);
            results.forEach(result => {
                if(result.status === 'fulfilled' && result.value){
                    driversWithLocation.push(result.value);
                }
            });
            // This will try Google Distance Matrix first, then fallback to Haversine
            const driversWithDistance = await this.helperService.calculateBatchGoogleDistances(
                pickupLocation.latitude, 
                pickupLocation.longitude, 
                driversWithLocation
            );
            // Filter drivers within reasonable distance and sort
            let nearbyDrivers = driversWithDistance
                .filter(driver => driver.distance_km <= 10) // Within 10km
                .sort((a, b) => a.distance_km - b.distance_km);
            // For "show all vehicles", group by vehicle type and limit per type
            if(isShowAllVehicles){
                const driversByVehicleType = nearbyDrivers.reduce((acc, driver) => {
                    const vehicleType = driver.vehicle_type_id;
                    if(!acc[vehicleType]){
                        acc[vehicleType] = [];
                    }
                    acc[vehicleType].push(driver);
                    return acc;
                }, {});
                // Take top 5 drivers from each vehicle type
                nearbyDrivers = Object.values(driversByVehicleType)
                    .map(driversOfType => driversOfType.slice(0, 5))
                    .flat()
                    .sort((a, b) => a.distance_km - b.distance_km)
                    .slice(0, 20);
            }else{
                nearbyDrivers = nearbyDrivers.slice(0, 20);
            }
            return nearbyDrivers;
        }catch(error){
            console.error('driver_search_error_for_user', error);
            return [];
        }
    }
}
module.exports = NearbyDriverService;