import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  MapPin,
  Loader,
  Search,
  Square,
  Circle,
  Trash2,
  Eye,
  EyeOff,
  RotateCcw,
  AlertCircle,
} from "lucide-react";

const ServiceAreaMap = ({
  coordinates = [],
  onCoordinatesChange = () => {},
  apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  initialCenter = { lat: 12.9716, lng: 77.5946 },
  initialZoom = 11,
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const drawingManagerRef = useRef(null);
  const autocompleteRef = useRef(null);
  const searchInputRef = useRef(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [polygons, setPolygons] = useState([]);
  const [markers, setMarkers] = useState([]);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingTool, setDrawingTool] = useState("polygon");
  const [showServiceAreas, setShowServiceAreas] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [autoCreateBoundary, setAutoCreateBoundary] = useState(true);
  // // Load Google Maps API
  // useEffect(() => {
  //   if (window.google && window.google.maps) {
  //     setIsMapLoaded(true);
  //     return;
  //   }
  //   const script = document.createElement("script");
  //   script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,drawing,geometry&callback=initGoogleMaps`;
  //   script.async = true;
  //   script.defer = true;
  //   window.initGoogleMaps = () => {
  //     setIsMapLoaded(true);
  //   };
  //   document.head.appendChild(script);
  //   return () => {
  //     if (document.head.contains(script)) {
  //       document.head.removeChild(script);
  //     }
  //     delete window.initGoogleMaps;
  //   };
  // }, [apiKey]);

// Load Google Maps API and wait for all libraries
  useEffect(() => {
    const scriptId = "google-maps-script";

    // Prevent script from loading multiple times
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=drawing,geometry,places`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    // Wait until ALL libraries are loaded
    const checkGoogleLoaded = setInterval(() => {
      if (
        window.google &&
        window.google.maps &&
        window.google.maps.drawing &&
        window.google.maps.geometry &&
        window.google.maps.places
      ) {
        clearInterval(checkGoogleLoaded);
        setIsMapLoaded(true);
      }
    }, 100);

    return () => clearInterval(checkGoogleLoaded);
  }, [apiKey]);

  // Initialize map
  useEffect(() => {
    if (isMapLoaded && mapRef.current && !mapInstanceRef.current) {
      initializeMap();
    }
  }, [isMapLoaded]);

  // Load existing coordinates
  useEffect(() => {
    if (mapInstanceRef.current && isMapLoaded && coordinates.length > 0) {
      polygons.forEach((p) => {
        if (p.shape) {
          p.shape.setMap(null);
        }
      });
      setPolygons([]);
      loadExistingAreas();
    }
  }, [coordinates, isMapLoaded]);

  const initializeMap = () => {
    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      zoom: initialZoom,
      center: initialCenter,
      mapTypeId: "roadmap",
      styles: [
        {
          featureType: "administrative",
          elementType: "geometry",
          stylers: [{ visibility: "off" }],
        },
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }],
        },
      ],
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
      mapTypeControl: true,
    });

    drawingManagerRef.current = new window.google.maps.drawing.DrawingManager({
      drawingMode: null,
      drawingControl: false,
      polygonOptions: {
        fillColor: "#4F46E5",
        fillOpacity: 0.3,
        strokeWeight: 2,
        strokeColor: "#4F46E5",
        clickable: true,
        editable: true,
        zIndex: 1,
      },
      circleOptions: {
        fillColor: "#059669",
        fillOpacity: 0.3,
        strokeWeight: 2,
        strokeColor: "#059669",
        clickable: true,
        editable: true,
        zIndex: 1,
      },
    });

    drawingManagerRef.current.setMap(mapInstanceRef.current);

    drawingManagerRef.current.addListener(
      "polygoncomplete",
      handlePolygonComplete
    );
    drawingManagerRef.current.addListener(
      "circlecomplete",
      handleCircleComplete
    );

    if (searchInputRef.current) {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        searchInputRef.current,
        {
          componentRestrictions: { country: "in" },
          types: ["establishment", "geocode"],
        }
      );
      autocompleteRef.current.addListener("place_changed", handlePlaceSelect);
    }

    mapInstanceRef.current.addListener("click", (event) => {
      if (!isDrawingMode && !autoCreateBoundary) {
        addMarkerAtLocation(event.latLng);
      }
    });

  };

  const handlePolygonComplete = (polygon) => {
    const path = polygon.getPath();
    const coordinates = [];
    for (let i = 0; i < path.getLength(); i++) {
      const point = path.getAt(i);
      coordinates.push([point.lng(), point.lat()]);
    }
    const polygonData = {
      id: Date.now(),
      type: "polygon",
      coordinates: [coordinates],
      shape: polygon,
      area: window.google.maps.geometry.spherical.computeArea(path),
    };

    setPolygons((prev) => {
      const newPolygons = [...prev, polygonData];
      const allCoordinates = newPolygons.map((p) => p.coordinates[0]);
      onCoordinatesChange(allCoordinates);
      return newPolygons;
    });

    addPolygonListeners(polygon, polygonData.id);
    drawingManagerRef.current.setDrawingMode(null);
    setIsDrawingMode(false);
  };

  const handleCircleComplete = (circle) => {
    const center = circle.getCenter();
    const radius = circle.getRadius();
    const numPoints = 32;
    const coordinates = [];

    for (let i = 0; i < numPoints; i++) {
      const angle = (i * 2 * Math.PI) / numPoints;
      const point = window.google.maps.geometry.spherical.computeOffset(
        center,
        radius,
        (angle * 180) / Math.PI
      );
      coordinates.push([point.lng(), point.lat()]);
    }

    const polygonData = {
      id: Date.now(),
      type: "circle",
      coordinates: [coordinates],
      shape: circle,
      center: { lat: center.lat(), lng: center.lng() },
      radius: radius,
      area: Math.PI * radius * radius,
    };

    setPolygons((prev) => {
      const newPolygons = [...prev, polygonData];
      const allCoordinates = newPolygons.map((p) => p.coordinates[0]);
      onCoordinatesChange(allCoordinates);
      return newPolygons;
    });

    addCircleListeners(circle, polygonData.id);
    drawingManagerRef.current.setDrawingMode(null);
    setIsDrawingMode(false);
  };

  const addPolygonListeners = (polygon, id) => {
    const updatePolygon = () => {
      const path = polygon.getPath();
      const coordinates = [];
      for (let i = 0; i < path.getLength(); i++) {
        const point = path.getAt(i);
        coordinates.push([point.lng(), point.lat()]);
      }

      setPolygons((prev) => {
        const newPolygons = prev.map((p) =>
          p.id === id
            ? {
                ...p,
                coordinates: [coordinates],
                area: window.google.maps.geometry.spherical.computeArea(path),
              }
            : p
        );

        const allCoordinates = newPolygons.map((p) => p.coordinates[0]);
        onCoordinatesChange(allCoordinates);
        return newPolygons;
      });
    };

    window.google.maps.event.addListener(
      polygon.getPath(),
      "set_at",
      updatePolygon
    );
    window.google.maps.event.addListener(
      polygon.getPath(),
      "insert_at",
      updatePolygon
    );
    window.google.maps.event.addListener(
      polygon.getPath(),
      "remove_at",
      updatePolygon
    );

    polygon.addListener("rightclick", (e) => {
      if (window.confirm("Delete this service area?")) {
        removePolygon(id);
      }
    });
  };

  const addCircleListeners = (circle, id) => {
    const updateCircle = () => {
      const center = circle.getCenter();
      const radius = circle.getRadius();
      const numPoints = 32;
      const coordinates = [];

      for (let i = 0; i < numPoints; i++) {
        const angle = (i * 2 * Math.PI) / numPoints;
        const point = window.google.maps.geometry.spherical.computeOffset(
          center,
          radius,
          (angle * 180) / Math.PI
        );
        coordinates.push([point.lng(), point.lat()]);
      }

      setPolygons((prev) => {
        const newPolygons = prev.map((p) =>
          p.id === id
            ? {
                ...p,
                coordinates: [coordinates],
                center: { lat: center.lat(), lng: center.lng() },
                radius: radius,
                area: Math.PI * radius * radius,
              }
            : p
        );

        const allCoordinates = newPolygons.map((p) => p.coordinates[0]);
        onCoordinatesChange(allCoordinates);
        return newPolygons;
      });
    };

    circle.addListener("center_changed", updateCircle);
    circle.addListener("radius_changed", updateCircle);

    circle.addListener("rightclick", (e) => {
      if (window.confirm("Delete this service area?")) {
        removePolygon(id);
      }
    });
  };

  const handlePlaceSelect = () => {
    const place = autocompleteRef.current.getPlace();
    if (place.geometry) {
      if (autoCreateBoundary) {
        // Auto-create boundary for the place
        if (place.geometry.viewport) {
          createPolygonFromBounds(place.geometry.viewport, place);
        } else {
          createCircularAreaFromPoint(place.geometry.location, place);
        }
      } else {
        // Just add a marker
        addMarkerToMap(place);
      }
      
      mapInstanceRef.current.setCenter(place.geometry.location);
      mapInstanceRef.current.setZoom(15);
    }
  };

  const createPolygonFromBounds = (viewport, place) => {
    const ne = viewport.getNorthEast();
    const sw = viewport.getSouthWest();
    
    // Create rectangle coordinates from bounds
    const coordinates = [
      [sw.lng(), ne.lat()], // NW
      [ne.lng(), ne.lat()], // NE
      [ne.lng(), sw.lat()], // SE
      [sw.lng(), sw.lat()], // SW
      [sw.lng(), ne.lat()], // Close the polygon
    ];

    const path = coordinates.map(coord => ({
      lat: coord[1],
      lng: coord[0]
    }));

    const polygon = new window.google.maps.Polygon({
      paths: path,
      fillColor: "#4F46E5",
      fillOpacity: 0.3,
      strokeWeight: 2,
      strokeColor: "#4F46E5",
      clickable: true,
      editable: true,
      zIndex: 1,
    });

    polygon.setMap(mapInstanceRef.current);

    const polygonData = {
      id: Date.now(),
      type: "polygon",
      coordinates: [coordinates],
      shape: polygon,
      area: window.google.maps.geometry.spherical.computeArea(polygon.getPath()),
      placeName: place.name,
    };

    setPolygons((prev) => {
      const newPolygons = [...prev, polygonData];
      const allCoordinates = newPolygons.map((p) => p.coordinates[0]);
      onCoordinatesChange(allCoordinates);
      return newPolygons;
    });

    addPolygonListeners(polygon, polygonData.id);

    // Fit map to the new polygon
    mapInstanceRef.current.fitBounds(viewport);
  };

  const createCircularAreaFromPoint = (location, place, radiusMeters = 1000) => {
    const circle = new window.google.maps.Circle({
      center: location,
      radius: radiusMeters,
      fillColor: "#059669",
      fillOpacity: 0.3,
      strokeWeight: 2,
      strokeColor: "#059669",
      clickable: true,
      editable: true,
      zIndex: 1,
    });

    circle.setMap(mapInstanceRef.current);

    // Convert circle to polygon coordinates
    const numPoints = 32;
    const coordinates = [];
    for (let i = 0; i < numPoints; i++) {
      const angle = (i * 2 * Math.PI) / numPoints;
      const point = window.google.maps.geometry.spherical.computeOffset(
        location,
        radiusMeters,
        (angle * 180) / Math.PI
      );
      coordinates.push([point.lng(), point.lat()]);
    }

    const polygonData = {
      id: Date.now(),
      type: "circle",
      coordinates: [coordinates],
      shape: circle,
      center: { lat: location.lat(), lng: location.lng() },
      radius: radiusMeters,
      area: Math.PI * radiusMeters * radiusMeters,
      placeName: place.name,
    };

    setPolygons((prev) => {
      const newPolygons = [...prev, polygonData];
      const allCoordinates = newPolygons.map((p) => p.coordinates[0]);
      onCoordinatesChange(allCoordinates);
      return newPolygons;
    });

    addCircleListeners(circle, polygonData.id);
  };

  const addMarkerAtLocation = (latLng) => {
    const place = {
      geometry: { location: latLng },
      name: "Custom Location",
      formatted_address: `${latLng.lat().toFixed(6)}, ${latLng
        .lng()
        .toFixed(6)}`,
    };
    addMarkerToMap(place);
  };

  const addMarkerToMap = (place) => {
    const marker = new window.google.maps.Marker({
      position: place.geometry.location,
      map: mapInstanceRef.current,
      title: place.name,
      icon: {
        url:
          "data:image/svg+xml;charset=UTF-8," +
          encodeURIComponent(`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#DC2626"/>
              <circle cx="12" cy="9" r="2.5" fill="white"/>
            </svg>
          `),
        scaledSize: new window.google.maps.Size(24, 24),
        anchor: new window.google.maps.Point(12, 24),
      },
    });

    const markerData = {
      id: Date.now(),
      marker,
      place,
      position: {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      },
    };

    setMarkers((prev) => [...prev, markerData]);

    const infoWindow = new window.google.maps.InfoWindow({
      content: `
        <div style="padding: 8px; min-width: 200px;">
          <h3 style="margin: 0 0 4px 0; font-size: 14px; font-weight: bold;">${place.name}</h3>
          <p style="margin: 0 0 8px 0; font-size: 12px; color: #666;">${place.formatted_address}</p>
          <button onclick="removeMarker_${markerData.id}()" style="
            padding: 4px 8px;
            background: #DC2626;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 11px;
            cursor: pointer;
          ">Remove</button>
        </div>
      `,
    });

    marker.addListener("click", () => {
      infoWindow.open(mapInstanceRef.current, marker);
    });

    window[`removeMarker_${markerData.id}`] = () => {
      removeMarker(markerData.id);
      infoWindow.close();
    };

  };

  const removeMarker = (markerId) => {
    setMarkers((prev) => {
      const updated = prev.filter((m) => {
        if (m.id === markerId) {
          m.marker.setMap(null);
          delete window[`removeMarker_${markerId}`];
          return false;
        }
        return true;
      });
      return updated;
    });
  };

  const removePolygon = (polygonId) => {
    setPolygons((prev) => {
      const updated = prev.filter((p) => {
        if (p.id === polygonId) {
          p.shape.setMap(null);
          return false;
        }
        return true;
      });
      const allCoordinates = updated.map((p) => p.coordinates[0]);
      onCoordinatesChange(allCoordinates);
      return updated;
    });
  };

  const loadExistingAreas = () => {
    const bounds = new window.google.maps.LatLngBounds();
    const newPolygons = coordinates
      .map((coordSet, index) => {
        if (coordSet && coordSet.length > 0) {
          const path = coordSet.map((coord) => ({
            lat: coord[1],
            lng: coord[0],
          }));

          const polygon = new window.google.maps.Polygon({
            paths: path,
            fillColor: "#4F46E5",
            fillOpacity: 0.3,
            strokeWeight: 2,
            strokeColor: "#4F46E5",
            clickable: true,
            editable: true,
            zIndex: 1,
          });

          polygon.setMap(mapInstanceRef.current);

          const polygonData = {
            id: Date.now() + index,
            type: "polygon",
            coordinates: [coordSet],
            shape: polygon,
            area: window.google.maps.geometry.spherical.computeArea(
              polygon.getPath()
            ),
          };

          addPolygonListeners(polygon, polygonData.id);

          coordSet.forEach((coord) => {
            bounds.extend(new window.google.maps.LatLng(coord[1], coord[0]));
          });

          return polygonData;
        }
        return null;
      })
      .filter((p) => p !== null);

    setPolygons(newPolygons);
    if (newPolygons.length > 0) {
      mapInstanceRef.current.fitBounds(bounds);
    }
  };

  const toggleDrawingMode = (tool) => {
    if (isDrawingMode && drawingTool === tool) {
      drawingManagerRef.current.setDrawingMode(null);
      setIsDrawingMode(false);
    } else {
      const drawingMode =
        tool === "polygon"
          ? window.google.maps.drawing.OverlayType.POLYGON
          : window.google.maps.drawing.OverlayType.CIRCLE;

      drawingManagerRef.current.setDrawingMode(drawingMode);
      setIsDrawingMode(true);
      setDrawingTool(tool);
    }
  };

  const toggleServiceAreas = () => {
    const visible = !showServiceAreas;
    setShowServiceAreas(visible);
    polygons.forEach((p) => {
      p.shape.setVisible(visible);
    });
  };

  const toggleMarkers = () => {
    const visible = !showMarkers;
    setShowMarkers(visible);
    markers.forEach((m) => {
      m.marker.setVisible(visible);
    });
  };

  const clearAll = () => {
    if (window.confirm("Clear all service areas and markers?")) {
      polygons.forEach((p) => p.shape.setMap(null));
      markers.forEach((m) => {
        m.marker.setMap(null);
        delete window[`removeMarker_${m.id}`];
      });
      setPolygons([]);
      setMarkers([]);
      onCoordinatesChange([]);
    }
  };

  const resetView = () => {
    mapInstanceRef.current.setCenter(initialCenter);
    mapInstanceRef.current.setZoom(initialZoom);
  };

  if (!isMapLoaded) {
    return (
      <div className="w-full h-96 bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
        <div className="flex items-center space-x-3 text-gray-600">
          <Loader className="animate-spin h-6 w-6" />
          <span className="text-lg">Loading Google Maps...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex justify-center">
            <div className="relative w-full">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search places (e.g., Chennai International Airport)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="absolute -bottom-6 left-0 text-xs text-gray-500">
                {autoCreateBoundary ? "Auto-creates boundary" : "Adds marker only"}
              </div>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="flex space-x-2">
              <button
                onClick={() => toggleDrawingMode("polygon")}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isDrawingMode && drawingTool === "polygon"
                    ? "bg-red-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                title="Draw custom polygon"
              >
                <Square className="inline w-4 h-4 mr-1" />
                Polygon
              </button>
              <button
                onClick={() => toggleDrawingMode("circle")}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isDrawingMode && drawingTool === "circle"
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                title="Draw custom circle"
              >
                <Circle className="inline w-4 h-4 mr-1" />
                Circle
              </button>
              <button
                onClick={() => setAutoCreateBoundary(!autoCreateBoundary)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  autoCreateBoundary
                    ? "bg-yellow-400 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                title={autoCreateBoundary ? "Auto-boundary ON" : "Auto-boundary OFF"}
              >
                <MapPin className="inline w-4 h-4 mr-1" />
                Auto
              </button>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="flex space-x-2">
              <button
                onClick={toggleServiceAreas}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  showServiceAreas
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-500"
                }`}
                title={showServiceAreas ? "Hide areas" : "Show areas"}
              >
                {showServiceAreas ? (
                  <Eye className="inline w-4 h-4" />
                ) : (
                  <EyeOff className="inline w-4 h-4" />
                )}
              </button>
              <button
                onClick={toggleMarkers}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  showMarkers
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-500"
                }`}
                title={showMarkers ? "Hide markers" : "Show markers"}
              >
                <MapPin className="inline w-4 h-4" />
              </button>
              <button
                onClick={resetView}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
                title="Reset map view"
              >
                <RotateCcw className="inline w-4 h-4" />
              </button>
              <button
                onClick={clearAll}
                className="px-3 py-2 bg-red-100 text-red-700 rounded-md text-sm font-medium hover:bg-red-200 transition-colors"
                title="Clear all"
              >
                <Trash2 className="inline w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="relative">
        <div
          ref={mapRef}
          className="w-full h-96 rounded-lg border border-gray-300 shadow-lg"
          style={{ minHeight: "500px" }}
        />
      </div>
    </div>
  );
};

export default ServiceAreaMap;