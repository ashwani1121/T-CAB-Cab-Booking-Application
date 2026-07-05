import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { GoogleMap, LoadScript, Marker, DirectionsRenderer } from '@react-google-maps/api';
const apiKey  = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const mapContainerStyle = {
    width: '100%',
    height: '100%',
};
const ONGOING_STATUSES = ['accepted', 'arrived', 'ride_started'];
const getCustomIcons = () => {
    if(typeof window === 'undefined' || !window.google){
        return { pickup: null, dropoff: null, stop: null, driver: null };
    }
    return {
        pickup: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="24" cy="24" r="18" fill="#10B981" stroke="#059669" stroke-width="4"/>
                    <circle cx="24" cy="24" r="10" fill="white"/>
                    <text x="24" y="29" font-size="18" text-anchor="middle" fill="#10B981" font-weight="bold">P</text>
                </svg>
            `),
            scaledSize: new window.google.maps.Size(48, 48),
            anchor: new window.google.maps.Point(24, 24),
        },
        dropoff: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="24" cy="24" r="18" fill="#EF4444" stroke="#DC2626" stroke-width="4"/>
                    <circle cx="24" cy="24" r="10" fill="white"/>
                    <text x="24" y="29" font-size="18" text-anchor="middle" fill="#EF4444" font-weight="bold">D</text>
                </svg>
            `),
            scaledSize: new window.google.maps.Size(48, 48),
            anchor: new window.google.maps.Point(24, 24),
        },
        stop: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="40" height="40" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="24" cy="24" r="16" fill="#F59E0B" stroke="#D97706" stroke-width="3"/>
                    <circle cx="24" cy="24" r="8" fill="white"/>
                    <text x="24" y="28" font-size="16" text-anchor="middle" fill="#F59E0B" font-weight="bold">S</text>
                </svg>
            `),
            scaledSize: new window.google.maps.Size(40, 40),
            anchor: new window.google.maps.Point(20, 20),
        },
        driver: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="40" cy="40" r="30" fill="#a6ccf4ff" opacity="0.25"/>
                    <circle cx="40" cy="40" r="22" fill="#6cade9ff" opacity="0.4"/>
                    <circle cx="40" cy="40" r="15" fill="#cae1efff" opacity="0.6"/>
                    <circle cx="40" cy="40" r="8" fill="#1294e0ff"/>
                </svg>
            `),
            scaledSize: new window.google.maps.Size(80, 80),
            anchor: new window.google.maps.Point(40, 40),
        }
    };
};

const RideDetailsPage = () => {
    // Changed from rideId to shareToken
    const { shareToken } = useParams();
    const [rideData, setRideData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [errorType, setErrorType] = useState(null);
    const [directions, setDirections] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [isMapLoaded, setIsMapLoaded] = useState(false);
    const mapRef = useRef(null);
    const isMountedRef = useRef(true);
    const directionsServiceRef = useRef(null);
    const customIcons = useMemo(() => getCustomIcons(), [isMapLoaded]);

    // Fetch ride details using shareToken
    const fetchRideDetails = useCallback(async (isManualRefresh = false) => {
        try{
            if(isManualRefresh) setRefreshing(true);
            // API call with shareToken instead of rideId
            const res = await axios.get(`${API_URL}/api/ride/share/${shareToken}`);
            if(!isMountedRef.current) return;
            if(res.data.success){
                setRideData(res.data.data);
                setError(null);
                setErrorType(null);
                setLastUpdated(new Date());
                return res.data.data;
            }else{
                setError(res.data.message || 'Ride not available');
                setErrorType('inactive');
                return null;
            }
        }catch(err){
            if(!isMountedRef.current) return null;
            const responseData = err.response?.data;
            const statusType   = responseData?.statusType;
            const message      = responseData?.message;
            if(err.response?.status === 403) {
                if(statusType === 'cancelled'){
                    setError('This ride has been cancelled');
                    setErrorType('cancelled');
                }else if(statusType === 'completed'){
                    setError('This ride has been completed');
                    setErrorType('completed');
                }else if(statusType === 'expired'){
                    setError('This shared link has expired (more than 24 hours after ride completion)');
                    setErrorType('expired');
                }else if(statusType === 'inactive'){
                    setError('This ride is not currently active');
                    setErrorType('inactive');
                }else{
                    setError(message || 'This ride is no longer available for sharing');
                    setErrorType('inactive');
                }
            }else if(err.response?.status === 404){
                setError('Ride not found or sharing has been disabled');
                setErrorType('inactive');
            }else{
                setError('Failed to load ride details. Please try again.');
                setErrorType('inactive');
            }
            return null;
        }finally{
            if(isMountedRef.current){
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, [shareToken]);

    const handleRefresh = () => fetchRideDetails(true);

    const fitMapBounds = useCallback(() => {
        if(!mapRef.current || !rideData || !window.google) return;
        
        const bounds = new window.google.maps.LatLngBounds();
        
        bounds.extend(new window.google.maps.LatLng(
            parseFloat(rideData.pickup_latitude),
            parseFloat(rideData.pickup_longitude)
        ));
        
        if(rideData.stop1_latitude && rideData.stop1_longitude){
            bounds.extend(new window.google.maps.LatLng(
                parseFloat(rideData.stop1_latitude),
                parseFloat(rideData.stop1_longitude)
            ));
        }
        
        if(rideData.stop2_latitude && rideData.stop2_longitude){
            bounds.extend(new window.google.maps.LatLng(
                parseFloat(rideData.stop2_latitude),
                parseFloat(rideData.stop2_longitude)
            ));
        }
        
        bounds.extend(new window.google.maps.LatLng(
            parseFloat(rideData.dropoff_latitude),
            parseFloat(rideData.dropoff_longitude)
        ));
        
        if(rideData.driver?.latitude && rideData.driver?.longitude){
            bounds.extend(new window.google.maps.LatLng(
                parseFloat(rideData.driver.latitude),
                parseFloat(rideData.driver.longitude)
            ));
        }
        
        mapRef.current.fitBounds(bounds, { top: 80, bottom: 80, left: 50, right: 50 });
    }, [rideData]);

    const calculateRoute = useCallback((data) => {
        if(!window.google || !data?.pickup_latitude) return;
        
        if(!directionsServiceRef.current){
            directionsServiceRef.current = new window.google.maps.DirectionsService();
        }
        
        const origin = { lat: parseFloat(data.pickup_latitude), lng: parseFloat(data.pickup_longitude) };
        const destination = { lat: parseFloat(data.dropoff_latitude), lng: parseFloat(data.dropoff_longitude) };
        const waypoints = [];
        
        if(data.stop1_latitude && data.stop1_longitude){
            waypoints.push({ 
                location: { lat: parseFloat(data.stop1_latitude), lng: parseFloat(data.stop1_longitude) }, 
                stopover: true 
            });
        }
        
        if(data.stop2_latitude && data.stop2_longitude){
            waypoints.push({ 
                location: { lat: parseFloat(data.stop2_latitude), lng: parseFloat(data.stop2_longitude) }, 
                stopover: true 
            });
        }
        
        directionsServiceRef.current.route(
            { origin, destination, waypoints, travelMode: window.google.maps.TravelMode.DRIVING },
            (result, status) => {
                if (status === 'OK' && isMountedRef.current) {
                    setDirections(result);
                }
            }
        );
    }, []);

    useEffect(() => {
        isMountedRef.current = true;
        fetchRideDetails();
        return () => { isMountedRef.current = false; };
    }, [shareToken, fetchRideDetails]);

    useEffect(() => {
        if(rideData && isMapLoaded){
            calculateRoute(rideData);
        }
    }, [rideData, isMapLoaded, calculateRoute]);

    useEffect(() => {
        if(directions && mapRef.current){
            setTimeout(fitMapBounds, 300);
        }
    }, [directions, fitMapBounds]);

    useEffect(() => {
        if(loading) document.title = 'Loading Ride...';
        else if(errorType === 'completed') document.title = 'Ride Completed';
        else if(errorType === 'cancelled') document.title = 'Ride Cancelled';
        else if(errorType === 'expired') document.title = 'Link Expired';
        else if(error || !rideData) document.title = 'Ride Unavailable';
        else{
            const status = rideData.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            document.title = `${status} • Tracker`;
        }
    }, [loading, rideData, error, errorType]);

    const mapCenter = useMemo(() => {
        if(!rideData) return { lat: 20.5937, lng: 78.9629 };
        if(rideData.driver?.latitude && rideData.driver?.longitude) {
            return { 
                lat: parseFloat(rideData.driver.latitude), 
                lng: parseFloat(rideData.driver.longitude) 
            };
        }
        return { 
            lat: parseFloat(rideData.pickup_latitude), 
            lng: parseFloat(rideData.pickup_longitude) 
        };
    }, [rideData]);

    const mapZoom = useMemo(() => rideData?.driver?.latitude ? 15 : 12, [rideData?.driver?.latitude]);
    
    const formatCurrency = (amt) => (amt ? `₹${parseFloat(amt).toFixed(0)}` : '₹0');
    
    const getStatusText = (status) => ({
        'accepted': 'Driver Accepted',
        'arrived': 'Arrived at pickup',
        'ride_started': 'Ride in Progress',
        'ride_completed': 'Ride Completed',
        'cancelled': 'Ride Cancelled',
        'pending': 'Finding Driver...'
    }[status] || status.replace(/_/g, ' '));
    
    const getStatusIcon = (status) => ({
        'accepted': '🚗',
        'arrived': '📍',
        'ride_started': '🛣️',
        'ride_completed': '✅',
        'cancelled': '❌',
        'pending': '⏳'
    }[status] || '•');

    const formatLastUpdated = () => {
        if (!lastUpdated) return '';
        const diff = Math.floor((new Date() - lastUpdated) / 1000);
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        return `${Math.floor(diff / 3600)}h ago`;
    };

    const handleCenterMap = () => fitMapBounds();
    const getErrorDisplay = () => {
        switch(errorType) {
            case 'completed':
                return {
                    icon: '✅',
                    title: 'Ride Completed',
                    message: error || 'This ride has been successfully completed.'
                };
            case 'cancelled':
                return {
                    icon: '❌',
                    title: 'Ride Cancelled',
                    message: error || 'This ride has been cancelled.'
                };
            case 'expired':
                return {
                    icon: '⏰',
                    title: 'Link Expired',
                    message: error || 'This shared link has expired.'
                };
            default:
                return {
                    icon: '⚠️',
                    title: 'Ride Not Available',
                    message: error || 'This shared link is no longer active.'
                };
        }
    };
    if(loading){
        return(
            <div className="min-h-screen bg-white flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-t-gray-800 border-gray-200 rounded-full animate-spin mb-4 mx-auto"></div>
                    <p className="text-lg text-gray-600">Loading ride details...</p>
                </div>
            </div>
        );
    }
    if(error || !rideData){
        const errorDisplay = getErrorDisplay();
        const statusCode = {
            completed: '200',
            cancelled: '410',
            expired: '410',
            inactive: '403',
            default: '404'
        }[errorType] || '404';
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="flex items-center justify-center gap-8">
                        <h1 className="text-3xl font-medium">{statusCode}</h1>
                        <div className="h-16 w-px bg-gray-300"></div>
                        <p className="text-base text-gray-900 max-w-md text-left">
                            {errorDisplay.message}
                        </p>
                    </div>
                </div>
            </div>
        );
    }
    const isOngoing = ONGOING_STATUSES.includes(rideData.status);
    return (
        <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
            {/* Map Section */}
            <div className="relative flex-1 w-full" style={{ minHeight: '50vh' }}>
                <LoadScript
                    googleMapsApiKey={apiKey}
                    onLoad={() => setIsMapLoaded(true)}
                >
                    <GoogleMap
                        mapContainerStyle={mapContainerStyle}
                        center={mapCenter}
                        zoom={mapZoom}
                        onLoad={(map) => {
                            mapRef.current = map;
                            setTimeout(fitMapBounds, 500);
                        }}
                        options={{
                            streetViewControl: false,
                            mapTypeControl: false,
                            fullscreenControl: false,
                            zoomControl: true,
                        }}
                    >
                        {/* Driver Marker */}
                        {rideData.driver?.latitude && rideData.driver?.longitude && (
                            <Marker
                                position={{
                                    lat: parseFloat(rideData.driver.latitude),
                                    lng: parseFloat(rideData.driver.longitude),
                                }}
                                icon={customIcons.driver}
                                title={`${rideData.driver.name} (Driver)`}
                                zIndex={1000}
                            />
                        )}
                        {/* Pickup */}
                        <Marker
                            position={{ 
                                lat: parseFloat(rideData.pickup_latitude), 
                                lng: parseFloat(rideData.pickup_longitude) 
                            }}
                            icon={customIcons.pickup}
                            title="Pickup Location"
                            zIndex={900}
                        />
                        {/* Stops */}
                        {rideData.stop1_latitude && rideData.stop1_longitude && (
                            <Marker
                                position={{ 
                                    lat: parseFloat(rideData.stop1_latitude), 
                                    lng: parseFloat(rideData.stop1_longitude) 
                                }}
                                icon={customIcons.stop}
                                title="Stop 1"
                                zIndex={800}
                            />
                        )}
                        {rideData.stop2_latitude && rideData.stop2_longitude && (
                            <Marker
                                position={{ 
                                    lat: parseFloat(rideData.stop2_latitude), 
                                    lng: parseFloat(rideData.stop2_longitude) 
                                }}
                                icon={customIcons.stop}
                                title="Stop 2"
                                zIndex={800}
                            />
                        )}
                        {/* Dropoff */}
                        <Marker
                            position={{ 
                                lat: parseFloat(rideData.dropoff_latitude), 
                                lng: parseFloat(rideData.dropoff_longitude) 
                            }}
                            icon={customIcons.dropoff}
                            title="Dropoff Location"
                            zIndex={900}
                        />
                        {/* Route */}
                        {directions && (
                            <DirectionsRenderer
                                directions={directions}
                                options={{
                                    suppressMarkers: true,
                                    polylineOptions: {
                                        strokeColor: '#10b981',
                                        strokeWeight: 5,
                                        strokeOpacity: 0.8
                                    },
                                }}
                            />
                        )}
                    </GoogleMap>
                </LoadScript>
                {/* Status Badge */}
                <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-2">
                    <div className="bg-white rounded-2xl shadow-lg px-4 py-2.5 flex items-center gap-2 max-w-[calc(100%-4rem)]">
                        <span className="text-lg">{getStatusIcon(rideData.status)}</span>
                        <span className="text-sm font-semibold text-gray-900 truncate">
                            {getStatusText(rideData.status)}
                        </span>
                    </div>
                    {isOngoing && (
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="bg-white shadow-lg rounded-full p-3 disabled:opacity-50 hover:bg-gray-50 transition-colors"
                            title="Refresh location"
                        >
                            <svg className={`w-5 h-5 text-gray-800 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    )}
                </div>
                {/* Distance Badge */}
                {rideData.estimated_distance && (
                    <div className="absolute top-20 left-1/2 transform -translate-x-1/2">
                        <div className="bg-gray-900 text-white rounded-full px-5 py-2 shadow-lg">
                            <div className="text-sm font-bold text-center">
                                {parseFloat(rideData.estimated_distance).toFixed(1)} km
                            </div>
                            <div className="text-xs text-center text-gray-300">
                                {rideData.status === 'ride_started' ? 'Total Distance' : 'Estimated'}
                            </div>
                        </div>
                    </div>
                )}
                {/* Center Map Button */}
                <button
                    onClick={handleCenterMap}
                    className="absolute bottom-6 right-4 bg-white rounded-xl shadow-lg p-3 hover:bg-gray-50 transition-colors"
                    title="Center map"
                >
                    <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </button>
            </div>
            {/* Bottom Sheet with ride details */}
            <div className="bg-white rounded-t-3xl shadow-2xl overflow-y-auto" style={{ maxHeight: '50vh' }}>
                {/* Driver Info Card */}
                {rideData.driver && (
                    <div className="bg-white border-b border-gray-200 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-xs text-gray-500">
                                Updated {formatLastUpdated()}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0 bg-gray-100 relative">
                                {rideData.driver.profile_image ? (
                                    <img 
                                        src={rideData.driver.profile_image} 
                                        alt={rideData.driver.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.nextSibling.style.display = 'flex';
                                        }}
                                    />
                                ) : null}
                                <div 
                                    className={`w-full h-full bg-gray-800 flex items-center justify-center text-lg font-bold text-white absolute inset-0 ${rideData.driver.profile_image ? 'hidden' : 'flex'}`}
                                    style={{ display: rideData.driver.profile_image ? 'none' : 'flex' }}
                                >
                                    {rideData.driver.name.charAt(0).toUpperCase()}
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-gray-900 text-base truncate">
                                    {rideData.driver.name}
                                </div>
                                {rideData.driver.rating && (
                                    <div className="flex items-center gap-1 text-sm">
                                        <span className="text-yellow-500">⭐</span>
                                        <span className="font-medium">{rideData.driver.rating}</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                {rideData.estimated_distance && (
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-gray-900">
                                            {parseFloat(rideData.estimated_distance).toFixed(1)} KM
                                        </div>
                                        <div className="text-xs text-gray-500">Total Distance</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                {/* Trip Details */}
                <div className="p-4 space-y-3">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Ride Details • {rideData.trip_type === 'intercity' ? 'Intercity' : 'Outstation'} • One way
                    </div>
                    {/* Pickup Location */}
                    <div className="flex gap-3 items-start">
                        <div className="flex flex-col items-center pt-1">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            {(rideData.stop1_address || rideData.stop2_address || rideData.dropoff_address) && (
                                <div className="w-0.5 h-8 bg-gray-300 my-1"></div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 text-sm leading-tight">
                                {rideData.pickup_address}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                                {rideData.pickup_district}, {rideData.pickup_state}
                            </div>
                        </div>
                    </div>
                    {/* Stop 1 */}
                    {rideData.stop1_address && (
                        <div className="flex gap-3 items-start">
                            <div className="flex flex-col items-center pt-1">
                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <div className="w-0.5 h-8 bg-gray-300 my-1"></div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 text-sm leading-tight">
                                    {rideData.stop1_address}
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Stop 2 */}
                    {rideData.stop2_address && (
                        <div className="flex gap-3 items-start">
                            <div className="flex flex-col items-center pt-1">
                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <div className="w-0.5 h-8 bg-gray-300 my-1"></div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 text-sm leading-tight">
                                    {rideData.stop2_address}
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Dropoff Location */}
                    <div className="flex gap-3 items-start">
                        <div className="flex flex-col items-center pt-1">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 text-sm leading-tight">
                                {rideData.dropoff_address}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                                {rideData.dropoff_district}, {rideData.dropoff_state}
                            </div>
                        </div>
                    </div>
                </div>
                {/* Payment Section */}
                <div className="bg-white p-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs text-gray-500 mb-1">
                                Total Fare {rideData.status === 'ride_completed' ? '(Paid)' : ''}
                            </div>
                            <div className="text-3xl font-bold text-gray-900">
                                {formatCurrency(rideData.final_fare)}
                            </div>
                            {rideData.payment_method && (
                                <div className="text-xs text-gray-600 mt-1">
                                    via {rideData.payment_method.toUpperCase()}
                                </div>
                            )}
                        </div>
                        {rideData.vehicleType && (
                            <div className="text-right">
                                <div className="text-sm font-medium text-gray-700">
                                    {rideData.vehicleType.name}
                                </div>
                                {rideData.driver?.vehicle_number && (
                                    <div className="text-xs text-gray-500 mt-1">
                                        {rideData.driver.vehicle_number}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
export default RideDetailsPage;