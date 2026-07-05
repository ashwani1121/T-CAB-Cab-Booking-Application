import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Search, RefreshCw, AlertCircle } from 'lucide-react';
import { useTheme } from "../context/themeContext";
import { ThemeUI } from "../context/themeUI";
import { getDatabase, ref, onValue, off } from 'firebase/database';

const DriverLocationChart = () => {
    const { theme }                                 = useTheme();
    const [drivers, setDrivers]                     = useState([]);
    const [filteredDrivers, setFilteredDrivers]     = useState([]);
    const [searchTerm, setSearchTerm]               = useState('');
    const [loading, setLoading]                     = useState(true);
    const [error, setError]                         = useState(null);
    const [searchResults, setSearchResults]         = useState([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [mapLoaded, setMapLoaded]                 = useState(false);
    const [mapError, setMapError]                   = useState(null);
    const mapRef                                    = useRef(null);
    const mapInstanceRef                            = useRef(null);
    const markersRef                                = useRef([]);
    const overlaysRef                               = useRef([]);
    const MapImageOverlayClassRef                   = useRef(null); // NEW: Ref to hold the lazy-defined class
    const searchInputRef                            = useRef(null);
    const database                                  = getDatabase();
    const hasApiKey                                 = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);

    // Lazy class definition factory (called only when Google Maps is ready)
    const defineMapImageOverlayClass = useCallback(() => {
        if (MapImageOverlayClassRef.current) return MapImageOverlayClassRef.current;
        if (!window.google?.maps) {
            throw new Error('Google Maps not loaded - cannot define overlay class');
        }

        MapImageOverlayClassRef.current = class MapImageOverlay extends window.google.maps.OverlayView {
            constructor(bounds, imageUrl, map, onClickCallback) {
                super();
                this.bounds = bounds;
                this.imageUrl = imageUrl;
                this.div = null;
                this.onClickCallback = onClickCallback;
                this.setMap(map);
            }

            onAdd() {
                const div = document.createElement('div');
                div.style.borderStyle = 'none';
                div.style.borderWidth = '0px';
                div.style.position = 'absolute';
                div.style.opacity = '0.85';
                div.style.cursor = 'pointer';

                const img = document.createElement('img');
                img.src = this.imageUrl;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.position = 'absolute';
                img.onerror = () => {
                    console.error('Failed to load image for overlay:', this.imageUrl);
                };
                
                div.appendChild(img);
                this.div = div;

                // Add click event listener with stopPropagation to prevent map panning
                div.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (this.onClickCallback) {
                        this.onClickCallback();
                    }
                });

                const panes = this.getPanes();
                // FIXED: Use overlayMouseTarget pane for clickable overlays
                panes.overlayMouseTarget.appendChild(div);
            }

            draw() {
                const overlayProjection = this.getProjection();
                const sw = overlayProjection.fromLatLngToDivPixel(this.bounds.getSouthWest());
                const ne = overlayProjection.fromLatLngToDivPixel(this.bounds.getNorthEast());

                if (this.div) {
                    this.div.style.left = sw.x + 'px';
                    this.div.style.top = ne.y + 'px';
                    this.div.style.width = (ne.x - sw.x) + 'px';
                    this.div.style.height = (sw.y - ne.y) + 'px';
                }
            }

            onRemove() {
                if (this.div) {
                    this.div.parentNode.removeChild(this.div);
                    this.div = null;
                }
            }
        };

        return MapImageOverlayClassRef.current;
    }, []);

    // Enhanced map markers update with map images
    const updateMapMarkers = useCallback(() => {
        if(!mapInstanceRef.current || !window.google) return;
        
        // NEW: Define the overlay class lazily here (only once, after Google Maps loads)
        const MapImageOverlay = defineMapImageOverlayClass();
        
        // Clear existing markers and overlays
        markersRef.current.forEach(marker => {
            if(marker && marker.setMap){
                marker.setMap(null);
            }
        });
        markersRef.current  = [];
        
        overlaysRef.current.forEach(overlay => {
            if(overlay && overlay.setMap){
                overlay.setMap(null);
            }
        });
        overlaysRef.current = [];
        
        // Add new markers and overlays for filtered drivers
        const bounds        = new window.google.maps.LatLngBounds();
        let hasValidMarkers = false;
        
        filteredDrivers.forEach((driver) => {
            const lat = parseFloat(driver.latitude);
            const lng = parseFloat(driver.longitude);
            
            try{
                const isOnline = getTimeSinceUpdate(driver.lastSeen) === 'Just now';
                const position = { lat, lng };
                
                // Add map image overlay if available, otherwise use marker
                if(driver.mapImage && driver.mapImage.trim() !== ''){
                    try {
                        // Create bounds for the image (approximately 100m x 100m area around driver)
                        const latOffset = 0.0009; // roughly 100m
                        const lngOffset = 0.0009;
                        
                        const imageBounds = new window.google.maps.LatLngBounds(
                            new window.google.maps.LatLng(lat - latOffset, lng - lngOffset),
                            new window.google.maps.LatLng(lat + latOffset, lng + lngOffset)
                        );
                        
                        // Create invisible marker just for info window
                        const marker = new window.google.maps.Marker({
                            position: position,
                            map: mapInstanceRef.current,
                            title: driver.name || `Driver ${driver.id}`,
                            icon: {
                                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                                    <svg width="1" height="1" viewBox="0 0 1 1" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="0.5" cy="0.5" r="0.5" fill="transparent"/>
                                    </svg>
                                `),
                                scaledSize: new window.google.maps.Size(1, 1),
                                anchor: new window.google.maps.Point(0, 0)
                            },
                            zIndex: 1001
                        });
                        
                        const infoWindow = new window.google.maps.InfoWindow({
                            content: `
                                <div style="padding: 12px; min-width: 250px; font-family: system-ui, sans-serif;">
                                    <h4 style="margin: 0 0 8px 0; color: ${theme.primaryGradientStart || '#3b82f6'}; font-size: 16px; font-weight: 600;">
                                        ${driver.name || `Driver ${driver.id}`}
                                    </h4>
                                    <div style="font-size: 14px; line-height: 1.5;">
                                        <div><strong>Phone:</strong> ${driver.phone || 'N/A'}</div>
                                        <div><strong>Status:</strong> 
                                            <span style="color: ${isOnline ? '#10b981' : '#f59e0b'}; font-weight: 500;">
                                                ${isOnline ? 'Online' : 'Recently Active'}
                                            </span>
                                        </div>
                                        <div><strong>Last Update:</strong> ${getTimeSinceUpdate(driver.lastSeen)}</div>
                                        <div style="font-size: 12px; color: #666; margin-top: 4px;">
                                            ${lat.toFixed(6)}, ${lng.toFixed(6)}
                                        </div>
                                    </div>
                                </div>
                            `
                        });
                        
                        // Create overlay with click callback
                        const overlay = new MapImageOverlay(
                            imageBounds, 
                            driver.mapImage, 
                            mapInstanceRef.current,
                            () => {
                                infoWindow.open(mapInstanceRef.current, marker);
                            }
                        );
                        
                        overlaysRef.current.push(overlay);
                        markersRef.current.push(marker);
                    } catch(overlayErr) {
                        console.error('Error creating map image overlay for driver:', driver.id, overlayErr);
                    }
                } else {
                    // Create visible marker if no map image
                    const marker = new window.google.maps.Marker({
                        position: position,
                        map: mapInstanceRef.current,
                        title: driver.name || `Driver ${driver.id}`,
                        icon: {
                            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="16" cy="16" r="14" fill="${isOnline ? '#10b981' : '#f59e0b'}" stroke="white" stroke-width="3"/>
                                    <circle cx="16" cy="16" r="6" fill="white"/>
                                    <circle cx="16" cy="16" r="3" fill="${isOnline ? '#10b981' : '#f59e0b'}"/>
                                </svg>
                            `),
                            scaledSize: new window.google.maps.Size(32, 32),
                            anchor: new window.google.maps.Point(16, 16)
                        },
                        zIndex: 1000
                    });
                    
                    const infoWindow = new window.google.maps.InfoWindow({
                        content: `
                            <div style="padding: 12px; min-width: 250px; font-family: system-ui, sans-serif;">
                                <h4 style="margin: 0 0 8px 0; color: ${theme.primaryGradientStart || '#3b82f6'}; font-size: 16px; font-weight: 600;">
                                    ${driver.name || `Driver ${driver.id}`}
                                </h4>
                                <div style="font-size: 14px; line-height: 1.5;">
                                    <div><strong>Phone:</strong> ${driver.phone || 'N/A'}</div>
                                    <div><strong>Status:</strong> 
                                        <span style="color: ${isOnline ? '#10b981' : '#f59e0b'}; font-weight: 500;">
                                            ${isOnline ? 'Online' : 'Recently Active'}
                                        </span>
                                    </div>
                                    <div><strong>Last Update:</strong> ${getTimeSinceUpdate(driver.lastSeen)}</div>
                                    <div style="font-size: 12px; color: #666; margin-top: 4px;">
                                        ${lat.toFixed(6)}, ${lng.toFixed(6)}
                                    </div>
                                </div>
                            </div>
                        `
                    });
                    
                    marker.addListener('click', () => {
                        infoWindow.open(mapInstanceRef.current, marker);
                    });
                    
                    markersRef.current.push(marker);
                }
                

                bounds.extend(position);
                hasValidMarkers = true;
            }catch(err){
                console.error('Error creating marker for driver:', driver.id, err);
            }
        });

        // Fit map to show all markers if there are any
        if(hasValidMarkers && markersRef.current.length > 0){
            mapInstanceRef.current.fitBounds(bounds);
            // Ensure reasonable zoom level
            const listener = mapInstanceRef.current.addListener('bounds_changed', () => {
                const zoom = mapInstanceRef.current.getZoom();
                if(zoom > 16){
                    mapInstanceRef.current.setZoom(16);
                }
                window.google.maps.event.removeListener(listener);
            });
        }
    }, [filteredDrivers, theme.primaryGradientStart, defineMapImageOverlayClass]); // UPDATED: Added dep for the factory

    // Load Google Maps Script
    const loadGoogleMapsScript = useCallback(() => {
        return new Promise((resolve, reject) => {
            // already loaded?
            if(window.google?.maps){
                return resolve();
            }
            // existing script?
            const existing = document.querySelector('script[data-gmaps="1"]');
            if(existing){
                if(window.google?.maps) return resolve();
                existing.addEventListener('load', () => window.google?.maps ? resolve() : reject(new Error('Google Maps not ready after load')));
                existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps script')));
                return;
            }
            const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
            if(!apiKey){
                return reject(new Error('Google Maps API key not found'));
            }
            const script = document.createElement('script');
            script.src   = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&libraries=geometry,places`;
            script.async = true;
            script.defer = true;
            script.setAttribute('data-gmaps', '1');
            script.onload = () => {
                const ready = () => window.google && window.google.maps;
                if(ready()){
                    return resolve();
                }
                const t = setInterval(() => { if (ready()) { clearInterval(t); resolve(); } }, 50);
                setTimeout(() => { clearInterval(t); if (!ready()) reject(new Error('Google Maps not ready')); }, 3000);
            };
            script.onerror = () => {
                reject(new Error('Failed to load Google Maps script'));
            };
            document.head.appendChild(script);
        });
    }, []);

    // Initialize Google Map
    const initializeMap = useCallback(() => {
        try{
            if(!mapRef.current){
                console.warn("Map container not ready yet");
                return;
            }
            const map   = new window.google.maps.Map(mapRef.current, {
                zoom              : 12,
                center            : { lat: 12.9716, lng: 77.5946 }, // Bangalore center
                mapTypeControl    : true,
                streetViewControl : false,
                fullscreenControl : true,
                zoomControl       : true,
                gestureHandling   : 'greedy',
                styles            : [
                    { featureType: 'poi.business', stylers: [{ visibility: 'off' }] }
                ]
            });
            mapInstanceRef.current = map;
            // Wait for map to be idle before updating markers
            const idleListener = map.addListener('idle', () => {
                window.google.maps.event.removeListener(idleListener);
                updateMapMarkers();
            });
        }catch(err){
            console.error('Error initializing map:', err);
            setMapError('Failed to initialize Google Maps: ' + err.message);
        }
    }, [updateMapMarkers]);

    // Load Google Maps on component mount
    useEffect(() => {
        let isMounted = true;
        (async () => {
            if(!hasApiKey){
                setMapError('Google Maps API key required');
                setMapLoaded(false);
                return;
            }
            try{
                await loadGoogleMapsScript();
                if(isMounted){
                    setMapLoaded(true);
                }
            }catch(err) {
                if(isMounted){
                    setMapError(err.message);
                    setMapLoaded(false);
                }
            }
        })();
        return () => { 
            isMounted = false; 
            markersRef.current.forEach(m => m?.setMap?.(null)); 
            markersRef.current = [];
            overlaysRef.current.forEach(o => o?.setMap?.(null));
            overlaysRef.current = [];
        };
    }, [hasApiKey, loadGoogleMapsScript]);

    useEffect(() => {
        if(mapLoaded && !mapInstanceRef.current && mapRef.current && !mapError){
            initializeMap();
        }
    }, [mapLoaded, mapError, initializeMap]);

    // Enhanced Firebase data fetching with better debugging
    useEffect(() => {
        const driversRef  = ref(database, 'driver_locations');
        const unsubscribe = onValue(driversRef, (snapshot) => {
            try{
                setLoading(true);
                const data               = snapshot.val();
                let rawDataCount         = 0;
                let validDriversCount    = 0;
                let sampleDriver         = null;
                if(data){
                    const rawDrivers     = Object.keys(data);
                    rawDataCount         = rawDrivers.length;
                    const driversList    = rawDrivers.map(key => {
                        const driverData = data[key];
                        return {
                            id: key,
                            ...driverData,
                            lastSeen: driverData.timestamp ? new Date(driverData.timestamp) : new Date()
                        };
                    });
                    // Enhanced filtering with detailed logging
                    const activeDrivers = driversList.filter(driver => {
                        const hasCoords = driver.latitude && driver.longitude;
                        const validLat  = !isNaN(parseFloat(driver.latitude));
                        const validLng  = !isNaN(parseFloat(driver.longitude));
                        const timeDiff  = Date.now() - driver.lastSeen.getTime();
                        const isRecent  = timeDiff < 10 * 60 * 1000; // 10 minutes
                        const isValid   = hasCoords && validLat && validLng && isRecent;
                        if(!sampleDriver){
                            sampleDriver = {
                                id: driver.id,
                                hasCoords,
                                validLat,
                                validLng,
                                isRecent,
                                timeDiff: Math.floor(timeDiff / 60000),
                                latitude: driver.latitude,
                                longitude: driver.longitude,
                                isValid
                            };
                        }
                        if(isValid) validDriversCount++;
                        return isValid;
                    });
                    setDrivers(activeDrivers);
                    setFilteredDrivers(activeDrivers);
                }else{
                    setDrivers([]);
                    setFilteredDrivers([]);
                }
                setError(null);
            }catch(err){
                console.error('Error processing driver locations:', err);
                setError('Failed to process driver location data: ' + err.message);
            }finally{
                setLoading(false);
            }
        },(error) => {
            console.error('Firebase error:', error);
            setError('Failed to fetch driver locations: ' + error.message);
            setLoading(false);
        });
        return () => {
            off(driversRef);
        };
    }, [database]);

    // Handle search with debouncing
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if(!searchTerm.trim()){
                setFilteredDrivers(drivers);
                setSearchResults([]);
                setShowSearchResults(false);
            }else{
                const filtered = drivers.filter(driver =>
                    driver.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    driver.phone?.includes(searchTerm) ||
                    driver.id?.toLowerCase().includes(searchTerm.toLowerCase())
                );
                setFilteredDrivers(filtered);
                setSearchResults(filtered.slice(0, 10));
                setShowSearchResults(filtered.length > 0 && searchTerm.trim() !== '');
            }
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [searchTerm, drivers]);


    // Update markers when filtered drivers change
    useEffect(() => {
        if(mapInstanceRef.current && mapLoaded && !mapError){
            updateMapMarkers();
        }
    }, [filteredDrivers, updateMapMarkers, mapLoaded, mapError]);

    const handleDriverSelect = (driver) => {
        if(mapInstanceRef.current && driver.latitude && driver.longitude){
            const lat = parseFloat(driver.latitude);
            const lng = parseFloat(driver.longitude);
            if(!isNaN(lat) && !isNaN(lng)){
                const position = { lat, lng };
                mapInstanceRef.current.setCenter(position);
                mapInstanceRef.current.setZoom(15);
                // Find and trigger click on the corresponding marker
                const marker = markersRef.current.find(m => {
                    const markerPos = m.getPosition();
                    return Math.abs(markerPos.lat() - lat) < 0.001 &&
                           Math.abs(markerPos.lng() - lng) < 0.001;
                });
                if(marker){
                    window.google.maps.event.trigger(marker, 'click');
                }
            }
        }
        setShowSearchResults(false);
        setSearchTerm('');
    };

    const handleSearchClear = () => {
        setSearchTerm('');
        setShowSearchResults(false);
        setFilteredDrivers(drivers);
        if(searchInputRef.current){
            searchInputRef.current.focus();
        }
    };

    const getTimeSinceUpdate = (timestamp) => {
        const now     = new Date();
        const diff    = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        if(minutes < 1) return 'Just now';
        if(minutes < 60) return `${minutes}m ago`;
        const hours   = Math.floor(minutes / 60);
        if(hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    const LoadingComponent = () => (
        <div className="flex flex-col items-center justify-center h-96">
            <div className="w-10 h-10 border-4 border-opacity-20 rounded-full animate-spin"
                style={{ borderColor: theme.primaryGradientStart, borderTopColor: 'transparent' }}>
            </div>
            <p className="mt-4 text-lg font-medium">Loading driver locations...</p>
            <p className="mt-1 text-sm text-gray-500">Connecting to real-time data</p>
        </div>
    );

    const ErrorComponent = () => (
        <div className="flex flex-col items-center justify-center h-96">
            <AlertCircle className="h-16 w-16 text-red-500 mb-6" />
            <p className="text-center text-red-600 mb-6 max-w-md text-lg">{error}</p>
            <ThemeUI.Button
                type           = "button"
                onClick        = {() => window.location.reload()}
                gradientColors = {{
                    start: '#ef4444',
                    end: '#dc2626',
                }}
                direction      = {theme.gradientDirection}
                className      = "px-6 py-3"
            >
                <RefreshCw className="h-5 w-5 mr-2" />
                Retry Connection
            </ThemeUI.Button>
        </div>
    );

    if(loading) return <LoadingComponent />;
    if(error) return <ErrorComponent />;
    return(
        <div className="rounded-lg shadow-sm border mb-6 transition-all duration-300 hover:shadow-md"
            style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb' }}>
            {/* Header with Search */}
            <div className="p-4 border-gray-200 border-b">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center">
                        <div className="p-2 rounded-xl mr-4 transition-all duration-300 hover:scale-110"
                            style={{ background: `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})` }}>
                            <MapPin className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold">Driver Live Locations</h2>
                            <p className="text-sm">
                                Real-time tracking of {drivers.length} active drivers
                            </p>
                        </div>
                    </div>
                    {/* Search */}
                    <div className="relative w-full lg:w-80">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                ref         = {searchInputRef}
                                type        = "text"
                                placeholder = "Search drivers..."
                                value       = {searchTerm}
                                onChange    = {(e) => setSearchTerm(e.target.value)}
                                className   = "w-full pl-10 pr-10 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all duration-200"
                                style       = {{
                                    backgroundColor: '#ffffff',
                                    borderColor: searchTerm ? theme.primaryGradientStart : '#d1d5db',
                                    '--tw-ring-color': theme.primaryGradientStart || '#3b82f6'
                                }}
                            />
                            {searchTerm && (
                                <button
                                    onClick={handleSearchClear}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                        {/* Search Results Dropdown */}
                        {showSearchResults && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border-gray-200 border-2 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                                <div className="p-3 border-gray-200 border-b">
                                    <p className="text-sm font-medium text-gray-700">
                                        Found {filteredDrivers.length} driver{filteredDrivers.length !== 1 ? 's' : ''}
                                    </p>
                                </div>
                                {searchResults.map((driver) => (
                                    <div
                                        key={driver.id}
                                        onClick={() => handleDriverSelect(driver)}
                                        className="p-3 cursor-pointer border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-all duration-150"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <p className="font-medium">
                                                    {driver.name || `Driver ${driver.id}`}
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    {driver.phone || 'No phone number'}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    Updated {getTimeSinceUpdate(driver.lastSeen)}
                                                </p>
                                            </div>
                                            <div className={`w-3 h-3 rounded-full ${
                                                getTimeSinceUpdate(driver.lastSeen) === 'Just now' 
                                                    ? 'bg-green-500' 
                                                    : 'bg-yellow-500'
                                                }`} />
                                        </div>
                                    </div>
                                ))}
                                {searchResults.length === 0 && (
                                    <div className="p-6 text-center text-gray-500">
                                        No drivers found matching "{searchTerm}"
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="p-4">
                {/* Map Container */}
                <div className="h-[500px] rounded-xl border-2 border-gray-200 overflow-hidden shadow-sm relative">
                    {!hasApiKey ? (
                        <div className="flex items-center justify-center h-full bg-gray-100">
                            <div className="text-center">
                                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-600 text-lg">Google Maps API key required</p>
                                <p className="text-gray-400 text-sm">Add VITE_GOOGLE_MAPS_API_KEY to environment</p>
                            </div>
                        </div>
                    ) : mapError ? (
                        <div className="flex items-center justify-center h-full bg-gray-100">
                            <div className="text-center">
                                <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                                <p className="text-red-600 text-lg">Map Error</p>
                                <p className="text-red-400 text-sm">{mapError}</p>
                            </div>
                        </div>
                    ) : !mapLoaded ? (
                        <div className="flex items-center justify-center h-full bg-gray-100">
                            <div className="text-center">
                                <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="text-gray-600">Initializing map...</p>
                                <p className="text-gray-400 text-sm mt-1">Setting up markers</p>
                            </div>
                        </div>
                    ) : (
                        <div ref={mapRef} className="w-full h-full" />
                    )}
                </div>
                {/* Statistics */}
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-gray-200 border-t">
                    <div className="text-center transition-all duration-300 hover:scale-105">
                        <p className="text-sm text-gray-600">Total Active</p>
                        <p className="text-2xl font-semibold">{drivers.length}</p>
                    </div>
                    <div className="text-center transition-all duration-300 hover:scale-105">
                        <p className="text-sm text-gray-600">Online Now</p>
                        <p className="text-2xl font-semibold text-green-600">
                            {drivers.filter(d => getTimeSinceUpdate(d.lastSeen) === 'Just now').length}
                        </p>
                    </div>
                    <div className="text-center transition-all duration-300 hover:scale-105">
                        <p className="text-sm text-gray-600">Recent (5m)</p>
                        <p className="text-2xl font-semibold">
                            {drivers.filter(d => {
                                const diff = Date.now() - d.lastSeen.getTime();
                                return diff < 5 * 60 * 1000 && diff >= 60000;
                            }).length}
                        </p>
                    </div>
                    <div className="text-center transition-all duration-300 hover:scale-105">
                        <p className="text-sm text-gray-600">Showing</p>
                        <p className="text-2xl font-semibold">{filteredDrivers.length}</p>
                    </div>
                </div>
                {/* Search Results Summary */}
                {searchTerm && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <p className="text-blue-800 font-medium">
                            {filteredDrivers.length === 0 
                                ? `No drivers found for "${searchTerm}"`
                                : `Showing ${filteredDrivers.length} driver${filteredDrivers.length !== 1 ? 's' : ''} matching "${searchTerm}"`
                            }
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DriverLocationChart;