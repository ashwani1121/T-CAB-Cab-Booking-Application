const { Vehicles }      = require('../../models');
const { Vehicletypes }  = require('../../models');
const { RideRequests }  = require('../../models'); 
const BASE_URL          = process.env.BASE_URL || 'http://localhost:5000';
const vehicleController = {

    // Get vehicles list
    getVehicles: async (req, res) => {
        try{
            const vehiclesList = await Vehicles.findAll({
                attributes: ['id', 'name', 'image', 'description'],
            });
            const vehicles = vehiclesList.map((vehicle) => ({
                id          : vehicle.id,
                name        : vehicle.name,
                description : vehicle.description,
                image       : vehicle.image ? `${BASE_URL}/uploads/vehicles/${vehicle.image}` : null,
            }));
            if(!vehicles || vehicles.length === 0){
                return res.status(404).json({
                    success: false,
                    message: 'Vehicles not found'
                });
            }
            res.status(200).json({
                success: true,
                data: vehicles
            });
        }catch(err){
            console.error('getvehicle error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve vehicles. Please try again later.'
            });
        }
    },

    // Get vehicle type based on id
    getVehicleTypeById: async (req, res) => {
        try{
            const { id } = req.params;
            if(!id){
                return res.status(400).json({
                    success: false,
                    message: 'Vehicle type ID is required'
                });
            }
            const vehicle = await Vehicles.findOne({
                where: { 
                    id: id 
                },
                attributes: ['deposit'],
            });
            const vehicleTypes = await Vehicletypes.findAll({
                where: { vehicle_id: id },
                attributes: ['id', 'name', 'image', 'description'],
            });
            if(!vehicleTypes || vehicleTypes.length === 0){
                return res.status(404).json({
                    success: false,
                    message: 'Vehicle type not found'
                });
            }
            // Map the array to include full image URLs and deposit
            const data = vehicleTypes.map(vt => ({
                id          : vt.id,
                name        : vt.name,
                description : vt.description,
                image       : vt.image ? `${BASE_URL}/uploads/vehicle-types/${vt.image}` : null,
                deposit     : vehicle ? vehicle.deposit : null
            }));
            res.status(200).json({
                success : true,
                data    : data  
            });
        }catch(err){
            console.error('getVehicleTypeById error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve vehicle type. Please try again later.'
            });
        }
    },

    // Get vehicle map image based on riderequest idd
    getVehicleMapImage: async(req, res) => {
        try{
            const { rideId } = req.params;
            
            if(!rideId){
                return res.status(400).json({
                    success: false,
                    message: 'Ride Request Id is required'
                });
            }
            
            // Get the ride request
            const rideRequest = await RideRequests.findOne({
                where: { id: rideId },
                attributes: ['vehicle_type_id'],
            });
            
            // Check if ride request exists
            if(!rideRequest){
                return res.status(404).json({
                    success: false,
                    message: 'Ride request not found'
                });
            }
            
            console.log(rideRequest.vehicle_type_id);
            
            // Get vehicle type by ID
            const vehicleType = await Vehicletypes.findByPk(rideRequest.vehicle_type_id, {
                attributes: ['id', 'name', 'map_image'],
            });
            
            if(!vehicleType){
                return res.status(404).json({
                    success: false,
                    message: 'Vehicle type not found'
                });
            }
            
            // Prepare response data
            const data = {
                id    : vehicleType.id,
                name  : vehicleType.name,
                image : vehicleType.map_image ? `${BASE_URL}/uploads/vehicle-types/${vehicleType.map_image}` : null,
            };
            
            res.status(200).json({
                success : true,
                data    : data  
            });
            
        }catch(err){
            console.error('getVehicleMapImage error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve vehicle map image. Please try again later.'
            });
        }
    }
};

module.exports = vehicleController;