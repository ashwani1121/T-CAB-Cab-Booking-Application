const { User }                 = require('../models');
const { Role }                 = require('../models');
const { DriverDetails }        = require('../models');
const { UserRole }             = require('../models');
const { RideRequests }         = require('../models');
const { Settings }             = require('../models');
const { Op, literal, fn, col } = require('sequelize');
const { sequelize }            = require('../models');
const fs                       = require('fs');
const path                     = require('path');
const BASE_URL                 = process.env.BASE_URL || "http://localhost:5000";
const rankingsController       = {

    // Get top ranking drivers with pagination and sorting
    topRankingDrivers: async (req, res) => {
        try{
            const { 
                page       = 1, 
                limit      = 10, 
                search     = '', 
                date_from  = '', 
                date_to    = '', 
                state_id   = '',  
                sort_by    = 'ranking_score', 
                sort_order = 'DESC' 
            } = req.query;
            const pageNum  = parseInt(page, 10);
            const limitNum = parseInt(limit, 10);
            const offset   = (pageNum - 1) * limitNum;
            // Validate pagination parameters
            if(isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1){
                return res.status(400).json({
                    success: false,
                    message: "Invalid pagination parameters"
                });
            }
            // Base where conditions for drivers only
            const userWhereConditions = {
                status: 1 // Active users only
            };
            // Search conditions for user data
            const searchConditions = [];
            if(search && search.trim() !== ''){
                const searchTerm = search.trim();
                searchConditions.push(
                    { name: { [Op.like]: `%${searchTerm}%` } },
                    { mobile: { [Op.like]: `%${searchTerm}%` } },
                    { email: { [Op.like]: `%${searchTerm}%` } }
                );
            }
            if(searchConditions.length > 0){
                userWhereConditions[Op.or] = searchConditions;
            }
            // Date range filter for ride requests
            const rideWhereConditions = {
                status: 'ride_completed'
            };
            // State-based filtering
            if(state_id && !isNaN(parseInt(state_id))){
                rideWhereConditions.pickup_state_id = parseInt(state_id);
            }
            if(date_from && date_to){
                const fromDate = new Date(date_from);
                const toDate   = new Date(date_to);
                if(!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())){
                    fromDate.setHours(0, 0, 0, 0);
                    toDate.setHours(23, 59, 59, 999);
                    rideWhereConditions.ride_completed_at = {
                        [Op.between]: [fromDate, toDate]
                    };
                }
            }else 
            if(date_from){
                const fromDate = new Date(date_from);
                if(!isNaN(fromDate.getTime())){
                    fromDate.setHours(0, 0, 0, 0);
                    rideWhereConditions.ride_completed_at = {
                        [Op.gte]: fromDate
                    };
                }
            }else 
            if(date_to){
                const toDate = new Date(date_to);
                if(!isNaN(toDate.getTime())){
                    toDate.setHours(23, 59, 59, 999);
                    rideWhereConditions.ride_completed_at = {
                        [Op.lte]: toDate
                    };
                }
            }
            // Validate sort_by parameter
            const validSortFields = ['ranking_score', 'total_trips', 'average_rating', 'created_at', 'name'];
            const sortField       = validSortFields.includes(sort_by) ? sort_by : 'ranking_score';
            const sortDirection   = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
            // Get drivers with their statistics and calculate ranking
            const { rows: drivers, count } = await User.findAndCountAll({
                where: userWhereConditions,
                include: [
                    {
                        model          : UserRole,
                        required       : true,
                        include        : [{
                            model      : Role,
                            where      : { name: 'driver' },
                            attributes : []
                        }],
                        attributes     : []
                    },
                    {
                        model          : DriverDetails,
                        as             : 'DriverDetail',
                        required       : true,
                        where          : { status: 'approved' },
                        attributes     : ['rating', 'vehicle_number', 'status']
                    },
                    {
                        model          : RideRequests,
                        as             : 'assignedRides',
                        where          : rideWhereConditions,
                        required       : false,
                        attributes     : []
                    }
                ],
                attributes: [
                    'id',
                    'name', 
                    'email',
                    'mobile',
                    'profile',
                    'created_at',
                    [fn('COUNT', col('assignedRides.id')), 'total_trips'],
                    [fn('COALESCE', fn('AVG', col('assignedRides.rating')), 0), 'average_rating'],
                    [fn('COUNT', literal("CASE WHEN assignedRides.pickup_state_id = " + (state_id || 'NULL') + " THEN 1 END")), 'state_trips'],
                    [fn('COALESCE', fn('AVG', literal("CASE WHEN assignedRides.pickup_state_id = " + (state_id || 'NULL') + " THEN assignedRides.rating END")), 0), 'state_rating']
                ],
                group: [
                    'User.id',
                    'DriverDetail.id'
                ],
                having: literal('COUNT(assignedRides.id) > 0'), // Only drivers with at least one trip
                subQuery: false,
                distinct: true,
                limit: limitNum,
                offset: offset,
                order: [
                    // Enhanced ranking calculation considering state filter
                    state_id ? 
                        [literal(`((COUNT(CASE WHEN assignedRides.pickup_state_id = ${parseInt(state_id)} THEN 1 END) * 0.4) + (COALESCE(AVG(CASE WHEN assignedRides.pickup_state_id = ${parseInt(state_id)} THEN assignedRides.rating END), 0) * 0.6 * 20))`), sortDirection] :
                        [literal(`((COUNT(assignedRides.id) * 0.4) + (COALESCE(AVG(assignedRides.rating), 0) * 0.6 * 20))`), sortDirection]
                ]
            });
            // Format the response data
            const formattedRankings = drivers.map((driver, index) => {
                const totalTrips    = parseInt(driver.getDataValue('total_trips')) || 0;
                const averageRating = parseFloat(driver.getDataValue('average_rating')) || 0;
                // Calculate ranking score based on filtering
                let rankingScore, displayTrips, displayRating;
                const stateTrips    = parseInt(driver.getDataValue('state_trips')) || 0;
                const stateRating   = parseFloat(driver.getDataValue('state_rating')) || 0;
                if(state_id){
                    displayTrips    = stateTrips;
                    displayRating   = stateRating;
                    rankingScore    = (stateTrips * 0.4) + (stateRating * 0.6 * 20);
                }else{
                    displayTrips    = totalTrips;
                    displayRating   = averageRating;
                    rankingScore    = (totalTrips * 0.4) + (averageRating * 0.6 * 20);
                }
                return {
                    id              : driver.id,
                    rank            : offset + index + 1,
                    name            : driver.name,
                    email           : driver.email,
                    mobile          : driver.mobile,
                    profile_image   : driver.profile ? `${BASE_URL}/uploads/profile/${driver.profile}`: null,
                    vehicle_number  : driver.DriverDetail?.vehicle_number || 'N/A',
                    driver_status   : driver.DriverDetail?.status || 'pending',
                    total_trips     : displayTrips,
                    average_rating  : parseFloat(displayRating.toFixed(2)),
                    driver_rating   : driver.DriverDetail?.rating || 'N/A',
                    ranking_score   : parseFloat(rankingScore.toFixed(2)),
                    joined_date     : driver.created_at,
                    overall_trips   : totalTrips,
                    overall_rating  : parseFloat(averageRating.toFixed(2)),
                    state_specific_data: state_id ? {
                        state_trips: stateTrips,
                        state_rating: parseFloat(stateRating.toFixed(2))
                    } : null
                };
            });
            // Get total count of drivers with trips for pagination
            const totalDriversWithTrips = await User.count({
                where: userWhereConditions,
                include: [
                    {
                        model          : UserRole,
                        required       : true,
                        include        : [{
                            model      : Role,
                            where      : { name: 'driver' },
                            attributes : []
                        }],
                        attributes     : []
                    },
                    {
                        model          : DriverDetails,
                        as             : 'DriverDetail',
                        required       : true,
                        where          : { status: 'approved' },
                        attributes     : []
                    },
                    {
                        model          : RideRequests,
                        as             : 'assignedRides',
                        where          : rideWhereConditions,
                        required       : false,
                        attributes     : []
                    }
                ],
                group: ['User.id'],
                having: literal('COUNT(assignedRides.id) > 0')
            });
            const totalCount  = Array.isArray(totalDriversWithTrips) ? totalDriversWithTrips.length : totalDriversWithTrips;
            const totalPages  = Math.ceil(totalCount / limitNum);
            const hasNextPage = pageNum < totalPages;
            const hasPrevPage = pageNum > 1;
            return res.status(200).json({
                success : true,
                message : state_id ? 
                    `Top ranking drivers for state retrieved successfully` : 
                    'Top ranking drivers retrieved successfully',
                data    : {
                    rides             : formattedRankings,
                    filters           : {
                        state_id      : state_id || null,
                        date_from     : date_from || null,
                        date_to       : date_to || null,
                        search        : search || null
                    },
                    ranking_info      : {
                        criteria: state_id ? 
                            "Rankings based on rides from selected state only" : 
                            "Rankings based on all completed rides",
                        formula: "Ranking Score = (Trip Count × 0.4) + (Average Rating × 0.6 × 20)"
                    },
                    pagination        : {
                        current_page  : pageNum,
                        per_page      : limitNum,
                        total_items   : totalCount,
                        total_pages   : totalPages,
                        has_next_page : hasNextPage,
                        has_prev_page : hasPrevPage,
                        next_page     : hasNextPage ? pageNum + 1 : null,
                        prev_page     : hasPrevPage ? pageNum - 1 : null
                    }
                }
            });
        }catch(err){
            console.error('getTopRankingDrivers error:', err.message);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    },

    // Top 3 Ranking Drivers For chart 
    topRankingDriversChart: async (req, res) => {
        try{
            const { fromDate, toDate, limit = 3 } = req.query;
            let startDate, endDate;
            if(fromDate && toDate){
                startDate = new Date(fromDate);
                endDate   = new Date(toDate);
                // Validate dates
                if(isNaN(startDate.getTime()) || isNaN(endDate.getTime())){
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid date format. Please use YYYY-MM-DD format.'
                    });
                }
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
            }else{
                // Default to current month
                const today = new Date();
                startDate   = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
                endDate     = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
            }
            // Step 1: Get all approved drivers with proper associations
            const approvedDrivers = await User.findAll({
                include: [
                    {
                        model: UserRole,
                        required: true,
                        include: [{
                            model: Role,
                            where: { name: 'driver' },
                            attributes: []
                        }],
                        attributes: []
                    },
                    {
                        model: DriverDetails,
                        as: 'DriverDetail', 
                        where: { status: 'approved' },
                        required: true,
                        attributes: ['rating']
                    }
                ],
                where: { status: 1 },
                attributes: ['id', 'name', 'profile', 'email'], 
                raw: false 
            });
            if(!approvedDrivers || approvedDrivers.length === 0){
                return res.json({
                    success: true,
                    data: [],
                    message: 'No approved drivers found'
                });
            }
            const driverIds = approvedDrivers.map(d => d.id);
            // Step 2: Get ride statistics using Sequelize methods instead of raw SQL
            const rideStats = await RideRequests.findAll({
                where: {
                    driver_id: { [Op.in]: driverIds },
                    ride_completed_at: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                attributes: [
                    'driver_id',
                    [fn('COUNT', col('id')), 'total_trips'],
                    [fn('COUNT', literal("CASE WHEN status = 'ride_completed' THEN 1 END")), 'completed_trips'],
                    [fn('AVG', literal("CASE WHEN rating IS NOT NULL THEN rating END")), 'avg_ride_rating'],
                    [fn('COUNT', literal("CASE WHEN rating IS NOT NULL THEN 1 END")), 'rated_trips'],
                    [fn('SUM', literal("CASE WHEN status = 'ride_completed' THEN COALESCE(driver_payout, 0) END")), 'total_earnings'],
                    [fn('AVG', literal("CASE WHEN status = 'ride_completed' THEN driver_payout END")), 'avg_earnings_per_trip'],
                    [literal("(COUNT(CASE WHEN status = 'ride_completed' THEN 1 END) * 100.0 / COUNT(*))"), 'completion_rate'],
                    [fn('COUNT', literal("CASE WHEN status = 'cancelled' AND cancelled_by LIKE '%driver%' THEN 1 END")), 'driver_cancelled_trips']
                ],
                group: ['driver_id'],
                having: literal('COUNT(id) > 0'),
                raw: true
            });
            if(!rideStats || rideStats.length === 0){
                return res.json({
                    success: true,
                    data: [],
                    message: 'No driver data available for the selected period'
                });
            }
            // Step 3: Combine driver info with ride statistics
            const driversWithStats = approvedDrivers
                .map(driver => {
                    const stats = rideStats.find(stat => stat.driver_id === driver.id);
                    if (!stats) return null;
                    return {
                        id: driver.id,
                        name: driver.name,
                        email: driver.email,
                        profile: driver.profile,
                        driver_profile_rating: parseFloat(driver.DriverDetail?.rating || 0),
                        total_trips: parseInt(stats.total_trips) || 0,
                        completed_trips: parseInt(stats.completed_trips) || 0,
                        avg_ride_rating: parseFloat(stats.avg_ride_rating) || 0,
                        rated_trips: parseInt(stats.rated_trips) || 0,
                        total_earnings: parseFloat(stats.total_earnings) || 0,
                        avg_earnings_per_trip: parseFloat(stats.avg_earnings_per_trip) || 0,
                        completion_rate: parseFloat(stats.completion_rate) || 0,
                        driver_cancelled_trips: parseInt(stats.driver_cancelled_trips) || 0
                    };
                })
                .filter(driver => driver !== null);
            if(driversWithStats.length === 0){
                return res.json({
                    success: true,
                    data: [],
                    message: 'No drivers with trip data found for the selected period'
                });
            }
            // Step 4: Calculate weighted scores with improved logic
            const maxTrips = Math.max(...driversWithStats.map(d => d.total_trips));
            const processedDrivers = driversWithStats.map(driver => {
                const normalizedTrips = maxTrips > 0 ? (driver.total_trips / maxTrips) : 0;
                let finalRating = driver.avg_ride_rating;
                if (finalRating === 0 && driver.driver_profile_rating > 0) {
                    finalRating = driver.driver_profile_rating;
                }
                const normalizedRating = finalRating > 0 ? (finalRating / 5) : 0; // Normalize to 0-1 scale
                const weightedScore = (normalizedTrips * 0.4) + (normalizedRating * 0.6);
                return {
                    ...driver,
                    finalRating,
                    weightedScore: weightedScore || 0 // Ensure no NaN values
                };
            });
            // Step 5: Sort by weighted score and get top drivers
            const topDrivers = processedDrivers
                .sort((a, b) => {
                    // First sort by weighted score
                    if (b.weightedScore !== a.weightedScore) {
                        return b.weightedScore - a.weightedScore;
                    }
                    // If scores are equal, sort by total trips
                    return b.total_trips - a.total_trips;
                })
                .slice(0, Math.min(parseInt(limit), driversWithStats.length));
            const chartData = topDrivers.map((driver, index) => ({
                id: driver.id,
                name: driver.name || 'Unknown Driver', 
                fullName: driver.name || 'Unknown Driver',
                email: driver.email || '',
                profile: driver.profile || '',
                score: parseFloat((driver.weightedScore * 100).toFixed(1)), 
                normalizedScore: parseFloat(driver.weightedScore.toFixed(3)),
                trips: driver.total_trips,
                completedTrips: driver.completed_trips,
                rating: parseFloat(driver.finalRating.toFixed(1)),
                earnings: parseFloat(driver.total_earnings.toFixed(2)),
                completionRate: parseFloat(driver.completion_rate.toFixed(1)),
                avgEarningsPerTrip: parseFloat(driver.avg_earnings_per_trip.toFixed(2)),
                rank: index + 1
            }));
            // Step 7: Calculate summary statistics
            const summaryStats = {
                totalDrivers: chartData.length,
                avgScore: chartData.length > 0 ? 
                    parseFloat((chartData.reduce((sum, d) => sum + d.normalizedScore, 0) / chartData.length).toFixed(3)) : 0,
                avgTrips: chartData.length > 0 ? 
                    parseFloat((chartData.reduce((sum, d) => sum + d.trips, 0) / chartData.length).toFixed(1)) : 0,
                avgRating: chartData.length > 0 ? 
                    parseFloat((chartData.reduce((sum, d) => sum + d.rating, 0) / chartData.length).toFixed(1)) : 0,
                totalEarnings: parseFloat(chartData.reduce((sum, d) => sum + d.earnings, 0).toFixed(2)),
                avgCompletionRate: chartData.length > 0 ? 
                    parseFloat((chartData.reduce((sum, d) => sum + d.completionRate, 0) / chartData.length).toFixed(1)) : 0
            };
            return res.json({
                success: true,
                data: chartData,
                summary: summaryStats,
                dateRange: {
                    from: startDate.toISOString().split('T')[0],
                    to: endDate.toISOString().split('T')[0]
                },
                scoringInfo: {
                    tripsWeight: 40,
                    ratingWeight: 60,
                    description: "Ranking based on 40% trip volume and 60% rating performance"
                },
                metadata: {
                    totalAvailableDrivers: approvedDrivers.length,
                    driversWithData: driversWithStats.length,
                    limit: parseInt(limit)
                }
            });
        }catch(err){
            console.error('Top Rankings drivers chart error:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch top drivers chart data'
            });
        }
    },

    // Display winners banner images
    getWinnersBanner: async (req, res) => {
        try{
            const settings = await Settings.findOne({
                where: { role: 'driver' }
            });
            if(!settings){
                return res.status(404).json({
                    success: false,
                    message: 'Driver settings not found'
                });
            }
            return res.status(200).json({
                success : true,
                message : 'Winner banners retrieved successfully',
                data    : {
                    ranking_image_url: settings.ranking_image ? `${BASE_URL}/uploads/rankings/${settings.ranking_image}` : null,
                    leaderboard_image_url: settings.leaderboard_image ? `${BASE_URL}/uploads/rankings/${settings.leaderboard_image}` : null
                }
            });
        }catch(err){
            console.error('Get Winners Banner error:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve winners banners'
            });
        }
    },

    // Update winners banner images
    updateWinnersBanner: async (req, res) => {
        try{
            const errors     = {};
            const updateData = {};
            const settings   = await Settings.findOne({
                where: { role: 'driver' }
            });
            if(!settings){
                return res.status(404).json({
                    success: false,
                    message: 'Driver settings not found'
                });
            }
            const { ranking_image, leaderboard_image } = req.files || {};
            // Check if both images are provided
            if(!ranking_image || !ranking_image[0]){
                errors.ranking_image = 'Ranking winner banner is required';
            }
            if(!leaderboard_image || !leaderboard_image[0]){
                errors.leaderboard_image = 'Leaderboard winner banner is required';
            }
            
            // Return early if required validation fails
            if(Object.keys(errors).length > 0){
                return res.status(400).json({
                    success: false,
                    message: 'Both banner images are required',
                    errors
                });
            }
            // Validate and process ranking_image
            if(ranking_image && ranking_image[0]){
                const file = ranking_image[0];
                const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
                if(!allowedTypes.includes(file.mimetype)){
                    errors.ranking_image = 'Invalid file type. Only PNG, JPEG, and JPG are allowed.';
                }else 
                if(file.size > 5 * 1024 * 1024){
                    errors.ranking_image = 'File size too large. Maximum 5MB allowed.';
                }else{
                    updateData.ranking_image = file.filename;
                    // Delete old ranking image if exists
                    if(settings.ranking_image){
                        const oldImagePath = path.join(process.cwd(), 'uploads', 'rankings', settings.ranking_image);
                        if(fs.existsSync(oldImagePath)){
                            fs.unlinkSync(oldImagePath);
                        }
                    }
                }
            }
            // Validate and process leaderboard_image
            if(leaderboard_image && leaderboard_image[0]){
                const file = leaderboard_image[0];
                const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
                if(!allowedTypes.includes(file.mimetype)){
                    errors.leaderboard_image = 'Invalid file type. Only PNG, JPEG, and JPG are allowed.';
                }else if(file.size > 5 * 1024 * 1024){
                    errors.leaderboard_image = 'File size too large. Maximum 5MB allowed.';
                }else{
                    updateData.leaderboard_image = file.filename;
                    // Delete old leaderboard image if exists
                    if(settings.leaderboard_image){
                        const oldImagePath = path.join(process.cwd(), 'uploads', 'rankings', settings.leaderboard_image);
                        if(fs.existsSync(oldImagePath)){
                            fs.unlinkSync(oldImagePath);
                        }
                    }
                }
            }
            // Check if there are any validation errors
            if(Object.keys(errors).length > 0){
                return res.status(400).json({
                    success: false,
                    message: 'Validation errors occurred',
                    errors
                });
            }
            await settings.update(updateData);
            return res.status(200).json({
                success : true,
                message : 'Winner banners updated successfully',
                data    : {
                    ranking_image_url: updateData.ranking_image ? 
                        `${BASE_URL}/uploads/rankings/${updateData.ranking_image}` : 
                        (settings.ranking_image ? `${BASE_URL}/uploads/rankings/${settings.ranking_image}` : null),
                    leaderboard_image_url: updateData.leaderboard_image ? 
                        `${BASE_URL}/uploads/rankings/${updateData.leaderboard_image}` : 
                        (settings.leaderboard_image ? `${BASE_URL}/uploads/rankings/${settings.leaderboard_image}` : null)
                }
            });
        }catch(err){
            console.error('Update Winners Banner error:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to update winners banners'
            });
        }
    },

    // App Rankings and Leaderboards
    rankingsAndLeaderboard: async (req, res) => {
        try{
            if(!req.user || !req.user.userId){
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized: Driver not authenticated"
                });
            }
            const driver_id = req.user.userId;
            const { type = 'rankings' } = req.query; 
            const { page = 1, limit = 10 } = req.query;
            const pageNum  = parseInt(page, 10);
            const limitNum = parseInt(limit, 10);
            const offset   = (pageNum - 1) * limitNum;
            // Validate pagination parameters
            if(isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1){
                return res.status(400).json({
                    success: false,
                    message: "Invalid pagination parameters"
                });
            }
            // Validate driver exists
            const driver = await User.findByPk(driver_id);
            if(!driver){
                return res.status(404).json({
                    success: false,
                    message: "Driver not found"
                });
            }
            // Validate type parameter
            const validTypes = ['rankings', 'leaderboard'];
            if(!validTypes.includes(type.toLowerCase())){
                return res.status(400).json({
                    success: false,
                    message: "Type must be one of: rankings, leaderboard"
                });
            }
            // Get banner image from settings
            const settings = await Settings.findOne({
                where: { role: 'driver' }
            });
            const bannerImage = type.toLowerCase() === 'rankings' 
                ? (settings?.ranking_image ? `${BASE_URL}/uploads/rankings/${settings.ranking_image}` : null)
                : (settings?.leaderboard_image ? `${BASE_URL}/uploads/rankings/${settings.leaderboard_image}` : null);
            // Calculate date range based on type
            const today = new Date();
            let startDate, endDate;
            if(type.toLowerCase() === 'rankings'){
                // Current month for rankings
                startDate = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
                endDate   = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
            }else{
                // Last 6 months for leaderboard
                startDate = new Date(today.getFullYear(), today.getMonth() - 5, 1, 0, 0, 0, 0);
                endDate   = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
            }
            // Ride where conditions
            const rideWhereConditions = {
                status: 'ride_completed',
                ride_completed_at: {
                    [Op.between]: [startDate, endDate]
                }
            };
            // Get all approved drivers with their statistics
            const { rows: drivers, count } = await User.findAndCountAll({
                where: { status: 1 },
                include: [
                    {
                        model: UserRole,
                        required: true,
                        include: [{
                            model: Role,
                            where: { name: 'driver' },
                            attributes: []
                        }],
                        attributes: []
                    },
                    {
                        model: DriverDetails,
                        as: 'DriverDetail',
                        required: true,
                        where: { status: 'approved' },
                        attributes: ['rating', 'vehicle_number', 'status']
                    },
                    {
                        model: RideRequests,
                        as: 'assignedRides',
                        where: rideWhereConditions,
                        required: false,
                        attributes: []
                    }
                ],
                attributes: [
                    'id',
                    'name', 
                    'email',
                    'mobile',
                    'profile',
                    'created_at',
                    [fn('COUNT', col('assignedRides.id')), 'total_trips'],
                    [fn('COALESCE', fn('AVG', col('assignedRides.rating')), 0), 'average_rating']
                ],
                group: [
                    'User.id',
                    'DriverDetail.id'
                ],
                having: literal('COUNT(assignedRides.id) > 0'),
                subQuery: false,
                distinct: true,
                order: [
                    [literal(`((COUNT(assignedRides.id) * 0.4) + (COALESCE(AVG(assignedRides.rating), 0) * 0.6 * 20))`), 'DESC']
                ]
            });
            // Calculate ranking scores and sort
            const driversWithScores = drivers.map(driver => {
                const totalTrips    = parseInt(driver.getDataValue('total_trips')) || 0;
                const averageRating = parseFloat(driver.getDataValue('average_rating')) || 0;
                const rankingScore  = (totalTrips * 0.4) + (averageRating * 0.6 * 20);
                return {
                    id: driver.id,
                    name: driver.name,
                    email: driver.email,
                    mobile: driver.mobile,
                    profile_image: driver.profile ? `${BASE_URL}/uploads/profile/${driver.profile}` : null,
                    vehicle_number: driver.DriverDetail?.vehicle_number || 'N/A',
                    driver_rating: driver.DriverDetail?.rating || 'N/A',
                    total_trips: totalTrips,
                    average_rating: parseFloat(averageRating.toFixed(2)),
                    ranking_score: parseFloat(rankingScore.toFixed(2)),
                    joined_date: driver.created_at
                };
            }).sort((a, b) => b.ranking_score - a.ranking_score);
            // Find logged-in driver's rank
            const loggedDriverIndex = driversWithScores.findIndex(d => d.id === driver_id);
            const loggedDriverRank  = loggedDriverIndex !== -1 ? loggedDriverIndex + 1 : null;
            const loggedDriverData  = loggedDriverIndex !== -1 ? driversWithScores[loggedDriverIndex] : null;
            const paginatedDrivers  = driversWithScores.slice(offset, offset + limitNum);
            const formattedRankings = paginatedDrivers.map((driver, index) => {
                return {
                    ...driver,
                    rank: offset + index + 1,
                    is_current_driver: driver.id === driver_id
                };
            });
            const totalCount  = driversWithScores.length;
            const totalPages  = Math.ceil(totalCount / limitNum);
            const hasNextPage = pageNum < totalPages;
            const hasPrevPage = pageNum > 1;
            return res.status(200).json({
                success: true,
                message: `${type === 'rankings' ? 'Monthly rankings' : 'Last 6 months leaderboard'} retrieved successfully`,
                data: {
                    type: type.toLowerCase(),
                    banner_image: bannerImage,
                    current_driver: loggedDriverData ? {
                        ...loggedDriverData,
                        rank: loggedDriverRank,
                        is_current_driver: true
                    } : null,
                    drivers: formattedRankings,
                    date_range: {
                        from: startDate.toISOString().split('T')[0],
                        to: endDate.toISOString().split('T')[0],
                        description: type.toLowerCase() === 'rankings' 
                            ? 'Current month rankings' 
                            : 'Last 6 months leaderboard'
                    },
                    ranking_info: {
                        formula: "Ranking Score = (Trip Count × 0.4) + (Average Rating × 0.6 × 20)",
                        period: type.toLowerCase() === 'rankings' ? 'monthly' : 'last_6_months'
                    },
                    pagination: {
                        current_page: pageNum,
                        per_page: limitNum,
                        total_items: totalCount,
                        total_pages: totalPages,
                        has_next_page: hasNextPage,
                        has_prev_page: hasPrevPage,
                        next_page: hasNextPage ? pageNum + 1 : null,
                        prev_page: hasPrevPage ? pageNum - 1 : null
                    }
                }
            });
        }catch(err){
            console.error('Rankings & Leaderboard Api:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve rankings & leaderboard'
            });
        }
    }
};
module.exports = rankingsController;