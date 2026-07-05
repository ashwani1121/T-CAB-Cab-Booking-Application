const { Op, Sequelize }           = require('sequelize');
const Vehicles                    = require('../models/vehiclesModel');
const VehiclePrices               = require('../models/vehiclePricesModel');
const VehicleTypes                = require('../models/vehicleTypesModel');
const Trips                       = require('../models/tripsModel');
const State                       = require('../models/stateModel');
const Package                     = require('../models/packagesModel');
const vehiclePricesController     = {

    // Vehicle prices search with enhanced filters
    getVehiclePrices: async (req, res) => {
        try{
            const { 
                page              = 1, 
                limit             = 10, 
                search            = '', 
                status            = '', 
                trip_id           = '', 
                vehicle_id        = '', 
                vehicle_type_id   = '', 
                state_id          = '',
                package_id        = '',
                sort              = 'updated_at', 
                order             = 'desc' 
            } = req.query;
            const pageNum         = parseInt(page, 10);
            const limitNum        = parseInt(limit, 10);
            if(isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1){
                return res.status(400).json({
                    success: false,
                    message: 'Invalid pagination parameters'
                });
            }
            const validSortFields = ['status', 'updated_at', 'updated_pricing_at', 'created_at'];
            const sortField       = validSortFields.includes(sort) ? sort : 'updated_at';
            const sortOrder       = ['asc', 'desc'].includes(order.toLowerCase()) ? order.toUpperCase() : 'DESC';
            const where           = {};
            const include         = [
                {
                    model: Trips,
                    as: 'trip',
                    attributes: ['id', 'trip']
                },
                {
                    model: VehicleTypes,
                    as: 'vehicleType',
                    attributes: ['id', 'name', 'status'],
                    include: [
                        {
                            model: Vehicles,
                            attributes: ['id', 'name', 'status']
                        }
                    ]
                },
                {
                    model: State,
                    as: 'state',
                    attributes: ['id', 'state_name', 'status']
                },
                {
                    model: Package,
                    as: 'package',
                    attributes: ['id', 'name', 'km', 'status']
                }
            ];
            if(search){
                const searchConditions = [];
                // Search in vehicle names
                searchConditions.push({
                    '$vehicle.name$': {
                        [Op.like]: `%${search}%`
                    }
                });
                // Search in vehicle type names
                searchConditions.push({
                    '$vehicleType.name$': {
                        [Op.like]: `%${search}%`
                    }
                });
                // Search in trip types
                searchConditions.push({
                    '$trip.trip$': {
                        [Op.like]: `%${search}%`
                    }
                });
                // Search in state names
                searchConditions.push({
                    '$state.state_name$': {
                        [Op.like]: `%${search}%`
                    }
                });
                // If search is numeric, also search in pricing fields
                if(!isNaN(search) && search.trim() !== ''){
                    const numericSearch = Number(search);
                    searchConditions.push(
                        { igst_rate: { [Op.eq]: numericSearch } },
                        { cgst_rate: { [Op.eq]: numericSearch } },
                        { sgst_rate: { [Op.eq]: numericSearch } },
                        { intercity_base_fare: { [Op.eq]: numericSearch } },
                        { outstation_base_fare: { [Op.eq]: numericSearch } }
                    );
                }
                where[Op.or] = searchConditions;
            }
            // Status filter
            if(status === '1' || status === 1 || status === 'active'){
                where.status = 1;
            }else if(status === '0' || status === 0 || status === 'inactive'){
                where.status = 0;
            }
            // Trip type filter
            if(trip_id && !isNaN(trip_id)){
                where.trip_id = Number(trip_id);
            }
            // Vehicle filter
            if(vehicle_id && !isNaN(vehicle_id)){
                where.vehicle_id = Number(vehicle_id);
            }
            // Vehicle type filter
            if(vehicle_type_id && !isNaN(vehicle_type_id)){
                where.vehicle_type_id = Number(vehicle_type_id);
            }
            // State filter
            if(state_id && !isNaN(state_id)){
                where.state_id = Number(state_id);
            }
            // Package filter
            if(package_id && !isNaN(package_id)){
                where.package_id = Number(package_id);
            }
            const { rows, count } = await VehiclePrices.findAndCountAll({
                where,
                include,
                order    : [[sortField, sortOrder]],
                limit    : limitNum,
                offset   : (pageNum - 1) * limitNum,
                distinct : true 
            });
            const responseData = rows.map((vehiclePrice) => ({
                ...vehiclePrice.dataValues,
                trip_name         : vehiclePrice.trip?.trip || null,
                vehicle_name      : vehiclePrice.vehicleType?.Vehicle?.name || null, // Updated path
                vehicle_type_name : vehiclePrice.vehicleType?.name || null,
                state_name        : vehiclePrice.state?.state_name || null,
                package_name      : vehiclePrice.package?.name || null, 
                package_km        : vehiclePrice.package?.km || null
            }));
            // Get filter options for frontend
            const [trips, vehicles, vehicleTypes, states, packages] = await Promise.all([
                Trips.findAll({
                    attributes: ['id', 'trip'],
                    order: [['trip', 'ASC']]
                }),
                Vehicles.findAll({
                    where: { status: 1 },
                    attributes: ['id', 'name'],
                    order: [['name', 'ASC']]
                }),
                VehicleTypes.findAll({
                    where: { status: 1 },
                    attributes: ['id', 'name'],
                    order: [['name', 'ASC']]
                }),
                State.findAll({
                    where: { status: true },
                    attributes: ['id', 'state_name'],
                    order: [['state_name', 'ASC']]
                }),
                Package.findAll({
                    where: { status: 1 },
                    attributes: ['id', 'name', 'km'],
                    order: [['name', 'ASC']]
                })
            ]);
            res.status(200).json({
                success               : true,
                data                  : {
                    vehiclePrices     : responseData,
                    pagination        : {
                        total_records : count,
                        current_page  : pageNum,
                        per_page      : limitNum,
                        total_pages   : Math.ceil(count / limitNum),
                        has_next      : pageNum < Math.ceil(count / limitNum),
                        has_prev      : pageNum > 1
                    },
                    filters: {
                        trips,
                        vehicles,
                        vehicleTypes,
                        states,
                        packages
                    }
                }
            });
        }catch(err){
            console.error('getVehiclePrices error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    },

    // Get vehicle price by ID with full details
    getVehiclePriceById: async (req, res) => {
        try{
            const { id }       = req.params;
            const vehiclePrice = await VehiclePrices.findByPk(id, {
                include: [
                    {
                        model: Trips,
                        as: 'trip',
                        attributes: ['id', 'trip']
                    },
                    {
                        model: Vehicles,
                        as: 'vehicle',
                        attributes: ['id', 'name', 'status']
                    },
                    {
                        model: VehicleTypes,
                        as: 'vehicleType',
                        attributes: ['id', 'name', 'status']
                    },
                    {
                        model: State,
                        as: 'state',
                        attributes: ['id', 'state_name', 'status']
                    },
                    {
                        model: Package,
                        as: 'package',
                        attributes: ['id', 'name', 'km', 'status']
                    }
                ]
            });
            if(!vehiclePrice){
                return res.status(404).json({
                    success: false,
                    message: 'Vehicle price not found'
                });
            }
            res.status(200).json({
                success: true,
                data: {
                    ...vehiclePrice.dataValues,
                    trip_name: vehiclePrice.trip?.trip || null,
                    vehicle_name: vehiclePrice.vehicle?.name || null,
                    vehicle_type_name: vehiclePrice.vehicleType?.name || null,
                    state_name: vehiclePrice.state?.state_name || null,
                    package_km: vehiclePrice.package?.km || null
                }
            });
        }catch(err){
            console.error('getVehiclePriceById error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    },

    // Insert
    createVehiclePrice: async(req, res) => {
        try{
            const data   = req.body || {};
            const errors = {};
            
            // Trip Id validation
            if(!data.trip_id || isNaN(data.trip_id)){
                errors.trip_id = 'Trip ID is required and must be a valid number';
            }else{
                const trip = await Trips.findByPk(data.trip_id);
                if(!trip){
                    errors.trip_id = 'Trip not found';
                }
            }
            
            // Get trip type to determine required fields
            let tripType = null;
            if(data.trip_id && !errors.trip_id){
                const trip = await Trips.findByPk(data.trip_id);
                if(trip){
                    tripType = trip.trip.toLowerCase();
                }
            }
            
            // Package Id validation - REQUIRED ONLY FOR TRIP TYPE 3 (Reserve)
            if(data.trip_id === 3 || tripType === 'reserve'){
                if(!data.package_id || isNaN(data.package_id)){
                    errors.package_id = 'Package is required for Reserve trip type';
                }else{
                    const packageData = await Package.findByPk(data.package_id);
                    if(!packageData){
                        errors.package_id = 'Package not found';
                    }else if(packageData.status !== 1){
                        errors.package_id = 'Selected package is not active';
                    }
                }
            }else{
                // For other trip types, package is optional but validate if provided
                if(data.package_id){
                    if(isNaN(data.package_id)){
                        errors.package_id = 'Package ID must be a valid number';
                    }else{
                        const packageData = await Package.findByPk(data.package_id);
                        if(!packageData){
                            errors.package_id = 'Package not found';
                        }else if(packageData.status !== 1){
                            errors.package_id = 'Selected package is not active';
                        }
                    }
                }
            }
            
            // Vehicle Id validation
            if(!data.vehicle_id || isNaN(data.vehicle_id)){
                errors.vehicle_id = 'Vehicle ID is required and must be a valid number';
            }else{
                const vehicle = await Vehicles.findByPk(data.vehicle_id);
                if(!vehicle){
                    errors.vehicle_id = 'Vehicle not found';
                }
            }
            
            // Vehicle Type validation
            if(!data.vehicle_type_id || isNaN(data.vehicle_type_id)){
                errors.vehicle_type_id = 'Vehicle Type ID is required and must be a valid number';
            }else{
                const vehicleType = await VehicleTypes.findByPk(data.vehicle_type_id);
                if(!vehicleType){
                    errors.vehicle_type_id = 'Vehicle Type not found';
                }
            }
            
            // State Id validation
            if(!data.state_id || isNaN(data.state_id)){
                errors.state_id = 'State ID is required and must be a valid number';
            }else{
                const state = await State.findByPk(data.state_id);
                if(!state){
                    errors.state_id = 'State not found';
                }
            }
            
            // Check for duplicate combination
            const duplicateWhere = {
                vehicle_type_id: data.vehicle_type_id,
                trip_id: data.trip_id,
                state_id: data.state_id
            };
            
            // Add package_id to duplicate check only if it's provided
            if(data.package_id){
                duplicateWhere.package_id = data.package_id;
            }else{
                duplicateWhere.package_id = null;
            }
            
            const existingPrice = await VehiclePrices.findOne({
                where: duplicateWhere
            });
            
            if(existingPrice){
                errors.duplicate = 'Vehicle price already exists for this combination of vehicle type, trip, state' + (data.package_id ? ' and package' : '');
            }
            
            // GST Rates validation
            if(data.igst_rate !== undefined && (isNaN(data.igst_rate) || Number(data.igst_rate) < 0 || Number(data.igst_rate) > 100)){
                errors.igst_rate = 'IGST rate must be a number between 0 and 100';
            }
            if(data.cgst_rate !== undefined && (isNaN(data.cgst_rate) || Number(data.cgst_rate) < 0 || Number(data.cgst_rate) > 100)){
                errors.cgst_rate = 'CGST rate must be a number between 0 and 100';
            }
            if(data.sgst_rate !== undefined && (isNaN(data.sgst_rate) || Number(data.sgst_rate) < 0 || Number(data.sgst_rate) > 100)){
                errors.sgst_rate = 'SGST rate must be a number between 0 and 100';
            }
            
            // Validate CGST + SGST = IGST
            if(data.igst_rate !== undefined && data.cgst_rate !== undefined && data.sgst_rate !== undefined){
                const igst = Number(data.igst_rate);
                const cgst = Number(data.cgst_rate);
                const sgst = Number(data.sgst_rate);
                if(Math.abs((cgst + sgst) - igst) > 0.01){
                    errors.tax_rates = 'CGST + SGST must equal IGST';
                }
            }
            
            // max km validation - ONLY for one way and round trip
            if(tripType !== 'reserve'){
                if(!data.max_km || isNaN(data.max_km) || Number(data.max_km) <= 0){
                    errors.max_km = 'Maximum Km is required and must be a valid positive number';
                }
            }
            
            // outstation km validation - ONLY for one way and round trip
            // if(tripType !== 'reserve'){
            //     if(!data.outstation_km || isNaN(data.outstation_km) || Number(data.outstation_km) <= 0){
            //         errors.outstation_km = 'Outstation Km is required and must be a valid positive number';
            //     }
            // }
            
            // Cross validation: outstation_km must be less than or equal to max_km
            if(tripType !== 'reserve' && data.max_km && data.outstation_km && !isNaN(data.max_km) && !isNaN(data.outstation_km) && Number(data.outstation_km) > Number(data.max_km)){
                errors.outstation_km = 'Outstation Km cannot be greater than Maximum Km (vehicle limit)';
            }
            
            if(!data.status || isNaN(data.status)){
                errors.status = 'Status is required and must be a valid number';
            }
            
            // Trip-specific validation
            if(tripType){
                // ONE WAY TRIP VALIDATIONS
                if(tripType === 'one way'){
                    const oneWayIntercityFields = [
                        'intercity_base_fare',
                        'intercity_minimum_fare',
                        'intercity_per_km_charges',
                        'intercity_waiting_charges',
                        'intercity_bata_charges',
                    ];
                    oneWayIntercityFields.forEach(field => {
                        if(!data[field] && data[field] !== '0') {
                            errors[field] = `${field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} is required`;
                        }else 
                        if(data[field] && (isNaN(data[field]) || Number(data[field]) < 0)) {
                            errors[field] = `${field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} must be a positive number`;
                        }
                    });
                    
                    const oneWayOutstationFields = [
                        'outstation_base_fare',
                        'outstation_minimum_fare',
                        'outstation_per_km_charges',
                        'outstation_waiting_charges',
                        'outstation_bata_charges',
                    ];
                    oneWayOutstationFields.forEach(field => {
                        if(!data[field] && data[field] !== '0'){
                            errors[field] = `${field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} is required`;
                        }else 
                        if(data[field] && (isNaN(data[field]) || Number(data[field]) < 0)){
                            errors[field] = `${field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} must be a positive number`;
                        }
                    });
                }
                
                // ROUND TRIP VALIDATIONS
                if(tripType === 'round trip'){
                    const roundTripIntercityFields = [
                        'round_intercity_base_fare',
                        'round_intercity_minimum_fare',
                        'round_intercity_per_km_charges',
                        'round_intercity_waiting_charges',
                        'round_intercity_bata_charges'
                    ];
                    roundTripIntercityFields.forEach(field => {
                        if(!data[field] && data[field] !== '0') {
                            errors[field] = `${field.replace(/round_|_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} is required`;
                        }else 
                        if(data[field] && (isNaN(data[field]) || Number(data[field]) < 0)){
                            errors[field] = `${field.replace(/round_|_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} must be a positive number`;
                        }
                    });
                    
                    const roundTripOutstationFields = [
                        'round_outstation_base_fare',
                        'round_outstation_minimum_fare',
                        'round_outstation_per_km_charges',
                        'round_outstation_waiting_charges',
                        'round_outstation_bata_charges'
                    ];
                    roundTripOutstationFields.forEach(field => {
                        if(!data[field] && data[field] !== '0'){
                            errors[field] = `${field.replace(/round_|_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} is required`;
                        }else 
                        if(data[field] && (isNaN(data[field]) || Number(data[field]) < 0)){
                            errors[field] = `${field.replace(/round_|_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} must be a positive number`;
                        }
                    });
                }
                
                // RESERVATION TRIP VALIDATIONS
                if(tripType === 'reserve'){
                    const reservationIntercityFields = [
                        'reservation_base_fare',
                        'reservation_per_km_charges',
                    ];
                    reservationIntercityFields.forEach(field => {
                        if(!data[field] && data[field] !== '0'){
                            errors[field] = `${field.replace(/reservation_|_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} is required`;
                        }else 
                        if(data[field] && (isNaN(data[field]) || Number(data[field]) < 0)){
                            errors[field] = `${field.replace(/reservation_|_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} must be a positive number`;
                        }
                    });
                }
            }
            
            if(Object.keys(errors).length > 0){
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors,
                });
            }
            
            // Base create data - common for all trip types
            const createData = {
                trip_id: Number(data.trip_id),
                vehicle_id: Number(data.vehicle_id),
                vehicle_type_id: Number(data.vehicle_type_id),
                state_id: Number(data.state_id),
                package_id: data.package_id ? Number(data.package_id) : null,
                igst_rate: data.igst_rate !== undefined ? Number(data.igst_rate) : 5.00,
                cgst_rate: data.cgst_rate !== undefined ? Number(data.cgst_rate) : 2.50,
                sgst_rate: data.sgst_rate !== undefined ? Number(data.sgst_rate) : 2.50,
                status: data.status !== undefined ? Number(data.status) : 1,
                bata_time_start: data.bata_time_start || '21:00:00',
                bata_time_end: data.bata_time_end || '05:00:00',
            };
            
            // Add max_km and outstation_km only for one way and round trip
            if(tripType !== 'reserve'){
                createData.max_km = Number(data.max_km);
                createData.outstation_km = Number(data.outstation_km);
            }
            
            // Add trip-specific pricing fields ONLY for that trip type
            if(tripType === 'one way'){
                createData.intercity_base_fare = Number(data.intercity_base_fare);
                createData.intercity_minimum_fare = Number(data.intercity_minimum_fare);
                createData.intercity_per_km_charges = Number(data.intercity_per_km_charges);
                createData.intercity_waiting_charges = Number(data.intercity_waiting_charges);
                createData.intercity_bata_charges = Number(data.intercity_bata_charges);
                createData.outstation_base_fare = Number(data.outstation_base_fare);
                createData.outstation_minimum_fare = Number(data.outstation_minimum_fare);
                createData.outstation_per_km_charges = Number(data.outstation_per_km_charges);
                createData.outstation_waiting_charges = Number(data.outstation_waiting_charges);
                createData.outstation_bata_charges = Number(data.outstation_bata_charges);
            }
            else if(tripType === 'round trip'){
                createData.round_intercity_base_fare = Number(data.round_intercity_base_fare);
                createData.round_intercity_minimum_fare = Number(data.round_intercity_minimum_fare);
                createData.round_intercity_per_km_charges = Number(data.round_intercity_per_km_charges);
                createData.round_intercity_waiting_charges = Number(data.round_intercity_waiting_charges);
                createData.round_intercity_bata_charges = Number(data.round_intercity_bata_charges);
                createData.round_outstation_base_fare = Number(data.round_outstation_base_fare);
                createData.round_outstation_minimum_fare = Number(data.round_outstation_minimum_fare);
                createData.round_outstation_per_km_charges = Number(data.round_outstation_per_km_charges);
                createData.round_outstation_waiting_charges = Number(data.round_outstation_waiting_charges);
                createData.round_outstation_bata_charges = Number(data.round_outstation_bata_charges);
            }
            else if(tripType === 'reserve'){
                createData.reservation_base_fare = Number(data.reservation_base_fare);
                createData.reservation_per_km_charges = Number(data.reservation_per_km_charges);
            }
            
            await VehiclePrices.create(createData);
            
            res.status(201).json({
                success: true,
                message: 'Vehicle price created successfully'
            });
        }catch(err){
            console.error('createVehiclePrice error:', err);
            
            // Handle duplicate entry error specifically
            if(err.name === 'SequelizeUniqueConstraintError'){
                return res.status(400).json({
                    success: false,
                    message: 'Vehicle price already exists for this combination of vehicle type, trip, state' + (req.body.package_id ? ' and package' : ''),
                    error: 'duplicate_entry'
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    },

    // Update 
    updateVehiclePrice: async (req, res) => {
        try{
            const { id } = req.params;
            const data   = req.body || {};
            // Check if vehicle price exists
            const VehiclePrice = await VehiclePrices.findByPk(id);
            if(!VehiclePrice){
                return res.status(404).json({
                    success: false,
                    message: 'Vehicle price not found'
                });
            }
            const errors = {};
            // Trip Id validation and trip type detection
            let tripType = null;
            if(data.trip_id !== undefined){
                if(!data.trip_id || isNaN(data.trip_id)){
                    errors.trip_id = 'Trip ID must be a valid number';
                }else{
                    const trip = await Trips.findByPk(data.trip_id);
                    if(!trip){
                        errors.trip_id = 'Trip not found';
                    }else{
                        tripType = trip.trip.toLowerCase();
                    }
                }
            }else{
                // If trip_id is not being updated, get it from existing record
                if(VehiclePrice.trip_id){
                    const trip = await Trips.findByPk(VehiclePrice.trip_id);
                    if(trip){
                        tripType = trip.trip.toLowerCase();
                    }
                }
            }
            // Package Id validation - REQUIRED ONLY FOR TRIP TYPE 3 (Reserve)
            if(data.trip_id === 3 || tripType === 'reserve'){
                // For reserve trip, package is required
                if(data.package_id !== undefined){
                    if(!data.package_id || isNaN(data.package_id)){
                        errors.package_id = 'Package is required for Reserve trip type';
                    }else{
                        const packageData = await Package.findByPk(data.package_id);
                        if(!packageData){
                            errors.package_id = 'Package not found';
                        }else if(packageData.status !== 1){
                            errors.package_id = 'Selected package is not active';
                        }
                    }
                }else{
                    // If package_id is not in update data but trip is reserve, check if existing record has package
                    if(!VehiclePrice.package_id){
                        errors.package_id = 'Package is required for Reserve trip type';
                    }
                }
            }else{
                // For other trip types, package is optional but validate if provided
                if(data.package_id !== undefined){
                    if(data.package_id && isNaN(data.package_id)){
                        errors.package_id = 'Package ID must be a valid number';
                    }else if(data.package_id){
                        const packageData = await Package.findByPk(data.package_id);
                        if(!packageData){
                            errors.package_id = 'Package not found';
                        }else if(packageData.status !== 1){
                            errors.package_id = 'Selected package is not active';
                        }
                    }
                }
            }
            // Vehicle Id validation
            if(data.vehicle_id !== undefined){
                if(!data.vehicle_id || isNaN(data.vehicle_id)){
                    errors.vehicle_id = 'Vehicle ID must be a valid number';
                }else{
                    const vehicle = await Vehicles.findByPk(data.vehicle_id);
                    if(!vehicle){
                        errors.vehicle_id = 'Vehicle not found';
                    }
                }
            }
            // Vehicle Type Id validation
            if(data.vehicle_type_id !== undefined){
                if(!data.vehicle_type_id || isNaN(data.vehicle_type_id)){
                    errors.vehicle_type_id = 'Vehicle Type ID must be a valid number';
                }else{
                    const vehicleType = await VehicleTypes.findByPk(data.vehicle_type_id);
                    if(!vehicleType){
                        errors.vehicle_type_id = 'Vehicle type not found';
                    }
                }
            }
            // State Id validation
            if(data.state_id !== undefined){
                if(!data.state_id || isNaN(data.state_id)){
                    errors.state_id = 'State ID must be a valid number';
                }else{
                    const state = await State.findByPk(data.state_id);
                    if(!state){
                        errors.state_id = 'State not found';
                    }
                }
            }
            // Check for duplicate combination (excluding current record)
            if(data.vehicle_type_id !== undefined || data.trip_id !== undefined || data.state_id !== undefined || data.package_id !== undefined){
                const checkData = {
                    vehicle_type_id: data.vehicle_type_id !== undefined ? data.vehicle_type_id : VehiclePrice.vehicle_type_id,
                    trip_id: data.trip_id !== undefined ? data.trip_id : VehiclePrice.trip_id,
                    state_id: data.state_id !== undefined ? data.state_id : VehiclePrice.state_id,
                    package_id: data.package_id !== undefined ? (data.package_id || null) : VehiclePrice.package_id
                };
                const existingPrice = await VehiclePrices.findOne({
                    where: {
                        ...checkData,
                        id: { [Op.ne]: id }
                    }
                });
                if(existingPrice){
                    errors.duplicate = 'Vehicle price already exists for this combination of vehicle type, trip, state, and package';
                }
            }
            // GST Rate validation
            if(data.igst_rate !== undefined && (isNaN(data.igst_rate) || Number(data.igst_rate) < 0 || Number(data.igst_rate) > 100)){
                errors.igst_rate = 'IGST rate must be a number between 0 and 100';
            }
            if(data.cgst_rate !== undefined && (isNaN(data.cgst_rate) || Number(data.cgst_rate) < 0 || Number(data.cgst_rate) > 100)){
                errors.cgst_rate = 'CGST rate must be a number between 0 and 100';
            }
            if(data.sgst_rate !== undefined && (isNaN(data.sgst_rate) || Number(data.sgst_rate) < 0 || Number(data.sgst_rate) > 100)){
                errors.sgst_rate = 'SGST rate must be a number between 0 and 100';
            }
            // Validate CGST + SGST = IGST if all fields are provided
            if(data.igst_rate !== undefined && data.cgst_rate !== undefined && data.sgst_rate !== undefined){
                const igst = Number(data.igst_rate);
                const cgst = Number(data.cgst_rate);
                const sgst = Number(data.sgst_rate);
                if(Math.abs((cgst + sgst) - igst) > 0.01){ 
                    errors.tax_rates = 'CGST + SGST must equal IGST';
                }
            }
            // Max km validation - ONLY for one way and round trip
            if(tripType !== 'reserve'){
                if(data.max_km !== undefined){
                    if(!data.max_km || isNaN(data.max_km) || Number(data.max_km) <= 0){
                        errors.max_km = 'Maximum km is required and must be a valid positive number';
                    }
                }
            }
            // Outstation km validation - ONLY for one way and round trip
            if(tripType !== 'reserve'){
                if(data.outstation_km !== undefined){
                    if(!data.outstation_km || isNaN(data.outstation_km) || Number(data.outstation_km) <= 0){
                        errors.outstation_km = 'Outstation km is required and must be a valid positive number';
                    }
                }
            }
            // Cross validation: outstation_km must be less than or equal to max_km - ONLY for one way and round trip
            if(tripType !== 'reserve' && (data.max_km !== undefined || data.outstation_km !== undefined)){
                const maxKmValue        = data.max_km !== undefined ? Number(data.max_km) : Number(VehiclePrice.max_km);
                const outstationKmValue = data.outstation_km !== undefined ? Number(data.outstation_km) : Number(VehiclePrice.outstation_km);
                // Only validate if both values are valid numbers and exist
                if(maxKmValue && outstationKmValue && !isNaN(maxKmValue) && !isNaN(outstationKmValue)){
                    if(outstationKmValue > maxKmValue){
                        errors.outstation_km = 'Outstation Km cannot be greater than Maximum Km (vehicle limit)';
                    }
                }
            }
            // Status validation
            if(data.status !== undefined && (isNaN(data.status))){
                errors.status = 'Status is required and must be a valid number';
            }            
            // Trip-specific field validation
            if(tripType){
                // ONE WAY TRIP VALIDATIONS
                if(tripType === 'one way'){
                    const oneWayIntercityFields = [
                        'intercity_base_fare',
                        'intercity_minimum_fare',
                        'intercity_per_km_charges',
                        'intercity_waiting_charges',
                        'intercity_bata_charges',
                    ];
                    oneWayIntercityFields.forEach(field => {
                        if(data[field] !== undefined && !data[field] && data[field] !== '0' && data[field] !== 0) {
                            errors[field] = `${field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} is required`;
                        }else 
                        if(data[field] !== undefined && data[field] && (isNaN(data[field]) || Number(data[field]) < 0)) {
                            errors[field] = `${field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} must be a positive number`;
                        }
                    });
                    const oneWayOutstationFields = [
                        'outstation_base_fare',
                        'outstation_minimum_fare',
                        'outstation_per_km_charges',
                        'outstation_waiting_charges',
                        'outstation_bata_charges',
                    ];
                    oneWayOutstationFields.forEach(field => {
                        if(data[field] !== undefined && !data[field] && data[field] !== '0' && data[field] !== 0){
                            errors[field] = `${field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} is required`;
                        }else 
                        if(data[field] !== undefined && data[field] && (isNaN(data[field]) || Number(data[field]) < 0)){
                            errors[field] = `${field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} must be a positive number`;
                        }
                    });
                }
                // ROUND TRIP VALIDATIONS
                if(tripType === 'round trip'){
                    const roundTripIntercityFields = [
                        'round_intercity_base_fare',
                        'round_intercity_minimum_fare',
                        'round_intercity_per_km_charges',
                        'round_intercity_waiting_charges',
                        'round_intercity_bata_charges',
                    ];
                    roundTripIntercityFields.forEach(field => {
                        if(data[field] !== undefined && !data[field] && data[field] !== '0' && data[field] !== 0) {
                            errors[field] = `${field.replace(/round_|_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} is required`;
                        }else 
                        if(data[field] !== undefined && data[field] && (isNaN(data[field]) || Number(data[field]) < 0)){
                            errors[field] = `${field.replace(/round_|_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} must be a positive number`;
                        }
                    });
                    const roundTripOutstationFields = [
                        'round_outstation_base_fare',
                        'round_outstation_minimum_fare',
                        'round_outstation_per_km_charges',
                        'round_outstation_waiting_charges',
                        'round_outstation_bata_charges',
                    ];
                    roundTripOutstationFields.forEach(field => {
                        if(data[field] !== undefined && !data[field] && data[field] !== '0' && data[field] !== 0){
                            errors[field] = `${field.replace(/round_|_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} is required`;
                        }else 
                        if(data[field] !== undefined && data[field] && (isNaN(data[field]) || Number(data[field]) < 0)){
                            errors[field] = `${field.replace(/round_|_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} must be a positive number`;
                        }
                    });
                }
                // RESERVATION TRIP VALIDATIONS  
                if(tripType === 'reserve'){
                    const reservationIntercityFields = [
                        'reservation_base_fare',
                        'reservation_per_km_charges',
                    ];
                    reservationIntercityFields.forEach(field => {
                        if(data[field] !== undefined && !data[field] && data[field] !== '0' && data[field] !== 0){
                            errors[field] = `${field.replace(/reservation_|_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} is required`;
                        }else 
                        if(data[field] !== undefined && data[field] && (isNaN(data[field]) || Number(data[field]) < 0)){
                            errors[field] = `${field.replace(/reservation_|_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} must be a positive number`;
                        }
                    });
                }
            }
            if(Object.keys(errors).length > 0){
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors,
                });
            }
            const updateData = {};
            if(data.trip_id !== undefined) updateData.trip_id = Number(data.trip_id);
            if(data.vehicle_id !== undefined) updateData.vehicle_id = Number(data.vehicle_id);
            if(data.vehicle_type_id !== undefined) updateData.vehicle_type_id = Number(data.vehicle_type_id);
            if(data.state_id !== undefined) updateData.state_id = Number(data.state_id);
            if(data.igst_rate !== undefined) updateData.igst_rate = Number(data.igst_rate);
            if(data.cgst_rate !== undefined) updateData.cgst_rate = Number(data.cgst_rate);
            if(data.sgst_rate !== undefined) updateData.sgst_rate = Number(data.sgst_rate);
            // Add max_km and outstation_km only for one way and round trip
            if(tripType !== 'reserve'){
                if(data.max_km !== undefined) updateData.max_km = Number(data.max_km);
                if(data.outstation_km !== undefined) updateData.outstation_km = Number(data.outstation_km);
            }else{
                // For reserve trips, explicitly set to null if changing to reserve
                if(data.trip_id !== undefined && data.trip_id === 3){
                    updateData.max_km = null;
                    updateData.outstation_km = null;
                }
            }
            if(data.status !== undefined) updateData.status = Number(data.status);
            if(data.bata_time_start !== undefined) updateData.bata_time_start = data.bata_time_start;
            if(data.bata_time_end !== undefined) updateData.bata_time_end = data.bata_time_end;
            if(data.package_id !== undefined) updateData.package_id = data.package_id ? Number(data.package_id) : null;
            // One way trip pricing
            if(tripType === 'one way'){
                if(data.intercity_base_fare !== undefined) updateData.intercity_base_fare = data.intercity_base_fare ? Number(data.intercity_base_fare) : null;
                if(data.intercity_minimum_fare !== undefined) updateData.intercity_minimum_fare = data.intercity_minimum_fare ? Number(data.intercity_minimum_fare) : null;
                if(data.intercity_per_km_charges !== undefined) updateData.intercity_per_km_charges = data.intercity_per_km_charges ? Number(data.intercity_per_km_charges) : null;
                if(data.intercity_waiting_charges !== undefined) updateData.intercity_waiting_charges = data.intercity_waiting_charges ? Number(data.intercity_waiting_charges) : null;
                if(data.intercity_bata_charges !== undefined) updateData.intercity_bata_charges = data.intercity_bata_charges ? Number(data.intercity_bata_charges) : null;
                if(data.outstation_base_fare !== undefined) updateData.outstation_base_fare = data.outstation_base_fare ? Number(data.outstation_base_fare) : null;
                if(data.outstation_minimum_fare !== undefined) updateData.outstation_minimum_fare = data.outstation_minimum_fare ? Number(data.outstation_minimum_fare) : null;
                if(data.outstation_per_km_charges !== undefined) updateData.outstation_per_km_charges = data.outstation_per_km_charges ? Number(data.outstation_per_km_charges) : null;
                if(data.outstation_waiting_charges !== undefined) updateData.outstation_waiting_charges = data.outstation_waiting_charges ? Number(data.outstation_waiting_charges) : null;
                if(data.outstation_bata_charges !== undefined) updateData.outstation_bata_charges = data.outstation_bata_charges ? Number(data.outstation_bata_charges) : null;
            }
            // Round trip pricing
            if(tripType === 'round trip'){
                if(data.round_intercity_base_fare !== undefined) updateData.round_intercity_base_fare = data.round_intercity_base_fare ? Number(data.round_intercity_base_fare) : null;
                if(data.round_intercity_minimum_fare !== undefined) updateData.round_intercity_minimum_fare = data.round_intercity_minimum_fare ? Number(data.round_intercity_minimum_fare) : null;
                if(data.round_intercity_per_km_charges !== undefined) updateData.round_intercity_per_km_charges = data.round_intercity_per_km_charges ? Number(data.round_intercity_per_km_charges) : null;
                if(data.round_intercity_waiting_charges !== undefined) updateData.round_intercity_waiting_charges = data.round_intercity_waiting_charges ? Number(data.round_intercity_waiting_charges) : null;
                if(data.round_intercity_bata_charges !== undefined) updateData.round_intercity_bata_charges = data.round_intercity_bata_charges ? Number(data.round_intercity_bata_charges) : null;
                if(data.round_outstation_base_fare !== undefined) updateData.round_outstation_base_fare = data.round_outstation_base_fare ? Number(data.round_outstation_base_fare) : null;
                if(data.round_outstation_minimum_fare !== undefined) updateData.round_outstation_minimum_fare = data.round_outstation_minimum_fare ? Number(data.round_outstation_minimum_fare) : null;
                if(data.round_outstation_per_km_charges !== undefined) updateData.round_outstation_per_km_charges = data.round_outstation_per_km_charges ? Number(data.round_outstation_per_km_charges) : null;
                if(data.round_outstation_waiting_charges !== undefined) updateData.round_outstation_waiting_charges = data.round_outstation_waiting_charges ? Number(data.round_outstation_waiting_charges) : null;
                if(data.round_outstation_bata_charges !== undefined) updateData.round_outstation_bata_charges = data.round_outstation_bata_charges ? Number(data.round_outstation_bata_charges) : null;
            }
            // Reservation trip pricing
            if(tripType === 'reserve'){
                if(data.reservation_base_fare !== undefined) updateData.reservation_base_fare = data.reservation_base_fare ? Number(data.reservation_base_fare) : null;
                if(data.reservation_per_km_charges !== undefined) updateData.reservation_per_km_charges = data.reservation_per_km_charges ? Number(data.reservation_per_km_charges) : null;
            }
            // Only perform update if there's something to update
            if(Object.keys(updateData).length === 0){
                return res.status(400).json({
                    success: false,
                    message: 'No data provided for update'
                });
            }
            // Update pricing timestamp if any pricing field is being updated
            const pricingFields = [
                'intercity_base_fare', 'intercity_minimum_fare', 'intercity_per_km_charges', 'intercity_waiting_charges',
                'intercity_bata_charges', 'outstation_base_fare', 'outstation_minimum_fare',
                'outstation_per_km_charges', 'outstation_waiting_charges', 'outstation_bata_charges',
                'round_intercity_base_fare', 'round_intercity_minimum_fare', 'round_intercity_per_km_charges',
                'round_intercity_waiting_charges','round_intercity_bata_charges','round_outstation_base_fare', 'round_outstation_minimum_fare',
                'round_outstation_per_km_charges', 'round_outstation_waiting_charges', 'round_outstation_bata_charges',
                'reservation_base_fare', 'reservation_per_km_charges'
            ];
            const hasPricingUpdate = pricingFields.some(field => updateData.hasOwnProperty(field));
            if(hasPricingUpdate){
                updateData.updated_pricing_at = new Date();
            }
            await VehiclePrice.update(updateData);
            res.status(200).json({
                success: true,
                message: 'Vehicle price updated successfully'
            });
        }catch(err){
            console.error('updateVehiclePrice error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    },

    // Delete
    deleteVehiclePrice: async (req, res) => {
        try{
            const { id } = req.params;
            const vehiclePrice = await VehiclePrices.findByPk(id);
            if(!vehiclePrice){
                return res.status(404).json({
                    success: false,
                    message: 'Vehicle price not found',
                });
            }
            await vehiclePrice.destroy();
            res.status(200).json({
                success: true,
                message: 'Vehicle price deleted successfully',
            });
        }catch(err){
            console.error('deleteVehiclePrice error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to delete vehicle price'
            });
        }
    },

    // Get all active states
    getStates: async (req, res) => {
        try{
            const states = await State.findAll({
                where: { status: true },
                attributes: ['id', 'state_name'],
                order: [['state_name', 'ASC']],
            });
            res.status(200).json({
                success: true,
                data: states,
            });
        }catch(err){
            console.error('getStates error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch states'
            });
        }
    },

    // Based on vehicle, retrieve vehicle type
    getVehicleTypesByVehicle: async (req, res) => {
        try{
            const { vehicleId } = req.params;
            const vehicleTypes = await VehicleTypes.findAll({
                where: { 
                    vehicle_id: vehicleId,
                    status: 1 
                },
                attributes: ['id', 'name'],
                order: [['name', 'ASC']]
            });
            res.status(200).json({
                success: true,
                data: vehicleTypes
            });
        }catch(err){
            console.error('getVehicleTypesByVehicle error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch vehicle types'
            });
        }
    }
};
module.exports = vehiclePricesController;