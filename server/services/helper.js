const axios = require('axios');
require('dotenv').config();
class HelperService{
    constructor(db, config){
        this.db = db;
        this.LOCATION_STALE_THRESHOLD = config.LOCATION_STALE_THRESHOLD;
    }

    // Method to get a specific driver's location
    async getDriverLocation(driverId){
        try{
            const locationRef = this.db.ref(`driver_locations/${driverId}`);
            const snapshot    = await locationRef.once('value');
            const location    = snapshot.val();
            if(!location?.latitude || !location?.longitude){
                return null;
            }
            const locationAge = Date.now() - new Date(location.last_updated_at).getTime();
            return{
                driver_id         : driverId,
                current_latitude  : location.latitude,
                current_longitude : location.longitude,
                last_updated      : location.last_updated_at,
                location_age      : locationAge,
                is_online         : location.is_online,
                service_status    : location.service_status
            };
        }catch(error){
            console.error(`Error retrieving driver ${driverId} location:`, error.message);
            return null;
        }
    }

    // Calculate distance using Google Distance Matrix API
    async calculateGoogleDistance(lat1, lon1, lat2, lon2){
        try{
            const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
            if(!GOOGLE_MAPS_API_KEY){
                console.warn('Google Maps API key not found, falling back to simple distance calculation');
                return this.calculateSimpleDistance(lat1, lon1, lat2, lon2);
            }
            const origins      = `${lat1},${lon1}`;
            const destinations = `${lat2},${lon2}`;
            const url          = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${destinations}&units=metric&key=${GOOGLE_MAPS_API_KEY}`;
            const response     = await axios.get(url, { timeout: 5000 });
            const data         = response.data;
            if(data.status !== 'OK'){
                console.error('Google Distance Matrix API error:', data.status);
                return this.calculateSimpleDistance(lat1, lon1, lat2, lon2);
            }
            if(!data.rows || data.rows.length === 0 || !data.rows[0].elements || data.rows[0].elements.length === 0){
                console.error('No distance data returned from Google API');
                return this.calculateSimpleDistance(lat1, lon1, lat2, lon2);
            }
            const element = data.rows[0].elements[0];
            if(element.status !== 'OK'){
                console.error('Distance calculation failed:', element.status);
                return this.calculateSimpleDistance(lat1, lon1, lat2, lon2);
            }
            const distanceInKm = element.distance.value / 1000;
            console.log(`Google API Distance: ${distanceInKm}km`);
            return Math.round(distanceInKm * 100) / 100;
        }catch(error){
            console.error('Error calculating Google distance:', error.message);
            return this.calculateSimpleDistance(lat1, lon1, lat2, lon2);
        }
    }

    // Batch calculate distances
    async calculateBatchGoogleDistances(pickupLat, pickupLon, drivers){
        try{
            const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
            if(!GOOGLE_MAPS_API_KEY){
                console.warn('Google Maps API key not found, using simple distance calculation for batch');
                return drivers.map(driver => ({
                    ...driver,
                    distance_km: this.calculateSimpleDistance(
                        pickupLat, pickupLon,
                        driver.current_latitude, driver.current_longitude
                    )
                }));
            }
            const batchSize           = 25;
            const driversWithDistance = [];
            for(let i = 0; i < drivers.length; i += batchSize){
                const batch        = drivers.slice(i, i + batchSize);
                const origins      = `${pickupLat},${pickupLon}`;
                const destinations = batch.map(driver =>
                    `${driver.current_latitude},${driver.current_longitude}`
                ).join('|');
                const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${destinations}&units=metric&key=${GOOGLE_MAPS_API_KEY}`;
                try{
                    const response = await axios.get(url, { timeout: 10000 });
                    const data     = response.data;
                    if(data.status === 'OK' && data.rows && data.rows[0]){
                        const elements    = data.rows[0].elements;
                        batch.forEach((driver, index) => {
                            const element = elements[index];
                            let distanceKm;
                            if(element && element.status === 'OK'){
                                distanceKm = element.distance.value / 1000;
                            }else{
                                distanceKm = this.calculateSimpleDistance(
                                    pickupLat, pickupLon,
                                    driver.current_latitude, driver.current_longitude
                                );
                            }
                            driversWithDistance.push({
                                ...driver,
                                distance_km: Math.round(distanceKm * 100) / 100
                            });
                        });
                    }else{
                        batch.forEach(driver => {
                            driversWithDistance.push({
                                ...driver,
                                distance_km: this.calculateSimpleDistance(
                                    pickupLat, pickupLon,
                                    driver.current_latitude, driver.current_longitude
                                )
                            });
                        });
                    }
                }catch(batchError){
                    console.error('Error in batch distance calculation:', batchError);
                    batch.forEach(driver => {
                        driversWithDistance.push({
                            ...driver,
                            distance_km: this.calculateSimpleDistance(
                                pickupLat, pickupLon,
                                driver.current_latitude, driver.current_longitude
                            )
                        });
                    });
                }
                if(i + batchSize < drivers.length){
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            return driversWithDistance;
        }catch(error){
            console.error('Error in batch Google distance calculation:', error);
            return drivers.map(driver => ({
                ...driver,
                distance_km: this.calculateSimpleDistance(
                    pickupLat, pickupLon,
                    driver.current_latitude, driver.current_longitude
                )
            }));
        }
    }

    // Simple distance calculation (Haversine formula)
    calculateSimpleDistance(lat1, lon1, lat2, lon2){
        const R    = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a    = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c    = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round((R * c) * 100) / 100;
    }
}
module.exports = HelperService;