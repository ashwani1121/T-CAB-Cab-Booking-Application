import React, { useEffect, useRef, useState } from 'react';
import { Loader } from 'lucide-react';
const RideRouteMap = ({ pickup, dropoff, stops = {} }) => {
    const mapRef                    = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError]         = useState(null);
    const mapInstanceRef            = useRef(null);
    const directionsServiceRef      = useRef(null);
    const directionsRendererRef     = useRef(null);

    useEffect(() => {
        // Check if Google Maps is already loaded
        if(window.google && window.google.maps){
            initializeMap();
            return;
        }
        // Load Google Maps Script
        const loadGoogleMaps = () => {
            const apiKey     = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
            if(!apiKey){
                setError('Google Maps API key is missing');
                setIsLoading(false);
                return;
            }
            const script   = document.createElement('script');
            script.src     = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
            script.async   = true;
            script.defer   = true;
            script.onload  = () => {
                initializeMap();
            };
            script.onerror = () => {
                setError('Failed to load Google Maps');
                setIsLoading(false);
            };
            document.head.appendChild(script);
        };
        loadGoogleMaps();
        // Cleanup
        return() => {
            if(directionsRendererRef.current){
                directionsRendererRef.current.setMap(null);
            }
        };
    }, []);

    useEffect(() => {
        if(mapInstanceRef.current && window.google){
            drawRoute();
        }
    }, [pickup, dropoff, stops]);

    const initializeMap = () => {
        if(!mapRef.current || !window.google) return;
        try{
            // Initialize map centered on pickup location
            const center = {
                lat: parseFloat(pickup?.latitude) || 0,
                lng: parseFloat(pickup?.longitude) || 0
            };
            const map = new window.google.maps.Map(mapRef.current, {
                center            : center,
                zoom              : 12,
                mapTypeControl    : true,
                streetViewControl : false,
                fullscreenControl : true,
                zoomControl       : true,
            });
            mapInstanceRef.current        = map;
            directionsServiceRef.current  = new window.google.maps.DirectionsService();
            directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
                map: map,
                suppressMarkers: false,
                polylineOptions: {
                    strokeColor: '#4F46E5',
                    strokeWeight: 5,
                    strokeOpacity: 0.8
                }
            });
            drawRoute();
            setIsLoading(false);
        }catch(err){
            console.error('Map initialization error:', err);
            setError('Failed to initialize map');
            setIsLoading(false);
        }
    };

    const drawRoute = () => {
        if(!mapInstanceRef.current || !directionsServiceRef.current || !directionsRendererRef.current) {
            return;
        }
        if(!pickup?.latitude || !pickup?.longitude || !dropoff?.latitude || !dropoff?.longitude) {
            setError('Invalid pickup or dropoff coordinates');
            return;
        }
        const origin = {
            lat: parseFloat(pickup.latitude),
            lng: parseFloat(pickup.longitude)
        };
        const destination = {
            lat: parseFloat(dropoff.latitude),
            lng: parseFloat(dropoff.longitude)
        };
        const waypoints = [];
        if(stops?.stop1?.latitude && stops?.stop1?.longitude){
            waypoints.push({
                location: {
                    lat: parseFloat(stops.stop1.latitude),
                    lng: parseFloat(stops.stop1.longitude)
                },
                stopover: true
            });
        }
        if(stops?.stop2?.latitude && stops?.stop2?.longitude){
            waypoints.push({
                location: {
                lat: parseFloat(stops.stop2.latitude),
                lng: parseFloat(stops.stop2.longitude)
                },
                stopover: true
            });
        }
        const request = {
            origin: origin,
            destination: destination,
            waypoints: waypoints.length > 0 ? waypoints : undefined,
            travelMode: window.google.maps.TravelMode.DRIVING,
            optimizeWaypoints: false
        };
        directionsServiceRef.current.route(request, (result, status) => {
            if(status === window.google.maps.DirectionsStatus.OK){
                directionsRendererRef.current.setDirections(result);
                // Add custom markers
                addCustomMarkers(origin, destination, waypoints);
            }else{
                console.error('Directions request failed:', status);
                setError('Failed to calculate route');
                // Fallback: Show markers without route
                addMarkersWithoutRoute(origin, destination, waypoints);
            }
        });
    };

    const addCustomMarkers = (origin, destination, waypoints) => {
        // Clear existing custom markers if any
        if(window.customMarkers){
            window.customMarkers.forEach(marker => marker.setMap(null));
        }
        window.customMarkers = [];
        // Pickup marker (Green)
        const pickupMarker = new window.google.maps.Marker({
            position: origin,
            map: mapInstanceRef.current,
            icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: '#22C55E',
                fillOpacity: 1,
                strokeColor: '#FFFFFF',
                strokeWeight: 3
            },
            title: 'Pickup Location',
            zIndex: 1000
        });
        window.customMarkers.push(pickupMarker);
        // Stop markers (Blue)
        waypoints.forEach((waypoint, index) => {
            const stopMarker = new window.google.maps.Marker({
                position: waypoint.location,
                map: mapInstanceRef.current,
                icon: {
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: '#3B82F6',
                    fillOpacity: 1,
                    strokeColor: '#FFFFFF',
                    strokeWeight: 2
                },
                title: `Stop ${index + 1}`,
                zIndex: 999
            });
            window.customMarkers.push(stopMarker);
        });
        // Dropoff marker (Red)
        const dropoffMarker = new window.google.maps.Marker({
            position: destination,
            map: mapInstanceRef.current,
            icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: '#EF4444',
                fillOpacity: 1,
                strokeColor: '#FFFFFF',
                strokeWeight: 3
            },
            title: 'Dropoff Location',
            zIndex: 1000
        });
        window.customMarkers.push(dropoffMarker);
    };

    const addMarkersWithoutRoute = (origin, destination, waypoints) => {
        addCustomMarkers(origin, destination, waypoints);
        // Fit bounds to show all markers
        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend(origin);
        bounds.extend(destination);
        waypoints.forEach(wp => bounds.extend(wp.location));
        mapInstanceRef.current.fitBounds(bounds);
    };

    if(error){
        return(
            <div className="w-full h-96 flex items-center justify-center bg-gray-100 rounded-lg">
                <div className="text-center">
                <p className="text-red-600 font-medium">{error}</p>
                <p className="text-gray-500 text-sm mt-2">Unable to display map</p>
                </div>
            </div>
        );
    }

    return(
        <div className="relative w-full h-96 rounded-lg overflow-hidden border border-gray-200">
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                    <div className="flex flex-col items-center">
                        <Loader className="animate-spin mb-2" size={32} />
                        <p className="text-gray-600">Loading map...</p>
                    </div>
                </div>
            )}
            <div ref={mapRef} className="w-full h-full" />
            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 text-sm">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white"></div>
                        <span>Pickup</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white"></div>
                        <span>Stop</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white"></div>
                        <span>Dropoff</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default RideRouteMap;