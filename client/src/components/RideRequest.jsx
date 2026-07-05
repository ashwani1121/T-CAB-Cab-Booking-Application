import React, { useState, useEffect, useCallback, useMemo } from "react"
import axios from "axios"
import { toast } from "react-toastify"
import Layout from "./Layout"
import { useTheme } from "../context/themeContext"
import { ThemeUI } from "../context/themeUI"
import { ChevronRight, Loader, Search, Filter, Eye, User, MapPin, Clock, CreditCard, Star, Phone, Mail, Download } from "lucide-react"
import Modal from "./Modal"
import Offcanvas from "./Offcanvas"
import defaultProfileImage from "../assets/images/default-profile.png"
import { AgGridReact } from "ag-grid-react"
import { themeQuartz } from "ag-grid-community"
import NoRowsOverlay from "./NoRowsOverlay"
import RideRouteMap from './RideRouteMap'
import * as XLSX from 'xlsx'
function RideRequest(){
	const { theme } 									    = useTheme()
	const [isLoading, setIsLoading] 						= useState(false)
	const [totalRows, setTotalRows] 						= useState(0)
	const [perPage, setPerPage] 							= useState(10)
	const [currentPage, setCurrentPage] 					= useState(1)
	const [rideRequests, setRideRequests] 					= useState([])
	const [searchQuery, setSearchQuery]						= useState("")
	const today 											= new Date().toISOString().split("T")[0]
	const [states, setStates]                               = useState([])
	const [filters, setFilters] 							= useState({
		status												: "",
		trip_type											: "",
		payment_status										: "",
		date_from											: today,
		date_to												: today,
		pickup_state_id       								: ""
	})
	const [isFilterOffcanvasOpen, setIsFilterOffcanvasOpen] = useState(false)
	const [isModalOpen, setIsModalOpen] 					= useState(false)
	const [rideDetails, setRideDetails] 					= useState(null)
	const [placeholder, setPlaceholder] 					= useState("Search by address...")
	const [currentWordIndex, setCurrentWordIndex] 			= useState(0)
	const [currentCharIndex, setCurrentCharIndex] 			= useState(0)
	const [isDeleting, setIsDeleting] 						= useState(false)
	const [isLoadingDetails, setIsLoadingDetails] 			= useState(false)
	const words 											= ["address", "fare"]

	// Initialize permissions with safe defaults
	const [ridePermissions, setRidePermissions]      	    = useState({
		can_add                                                 : false,
		can_edit                                                : false,
		can_delete                                              : false,
		can_view                                                : false
	})

	// Get user permissions for the riderequest module 
	const getUserPermissions = useCallback(() => {
		try{
			const permissionsStr = localStorage.getItem('userPermissions')
			if(permissionsStr){
				const permissions = JSON.parse(permissionsStr)
				if(permissions.riderequest){
					return {
						can_add     : permissions.riderequest.can_add || false,
						can_edit    : permissions.riderequest.can_edit || false,
						can_delete  : permissions.riderequest.can_delete || false,
						can_view    : permissions.riderequest.can_view || false
					}
				}
			}
			return{
				can_add         : false,
				can_edit        : false,
				can_delete      : false,
				can_view        : false
			}
		}catch(error){
			console.error('Error parsing user permissions:', error)
			return {
				can_add         : false,
				can_edit        : false,
				can_delete      : false,
				can_view        : false
			}
		}
	}, [])

	// Load permissions on mount
	useEffect(() => {
		const permissions = getUserPermissions()
		setRidePermissions(permissions)
	}, [getUserPermissions])

	// Listen for permission updates from other components
	useEffect(() => {
		const handlePermissionsUpdate = () => {
			const permissions = getUserPermissions()
			setRidePermissions(permissions)
		}
		window.addEventListener('permissionsUpdated', handlePermissionsUpdate)
		return () => {
			window.removeEventListener('permissionsUpdated', handlePermissionsUpdate)
		}
	}, [getUserPermissions])

	// Fetch ride requests on mount and when pagination/search/filters change
	useEffect(() => {
		fetchRideRequests(currentPage, perPage, searchQuery, filters)
	}, [currentPage, perPage, searchQuery, filters])

	// Typing animation for placeholder
	useEffect(() => {
		const typingSpeed  = isDeleting ? 50 : 100
		const pauseTime    = 1500
		const timeout      = setTimeout(() => {
		const currentWord  = words[currentWordIndex]
			if(!isDeleting && currentCharIndex < currentWord.length){ 
				setPlaceholder(`Search by ${currentWord.substring(0, currentCharIndex + 1)}...`)
				setCurrentCharIndex((prev) => prev + 1)
			}else
			if(isDeleting && currentCharIndex > 0){
				setPlaceholder(`Search by ${currentWord.substring(0, currentCharIndex - 1)}...`)
				setCurrentCharIndex((prev) => prev - 1)
			}else 
			if(!isDeleting && currentCharIndex === currentWord.length){
				setTimeout(() => setIsDeleting(true), pauseTime)
			}else 
			if(isDeleting && currentCharIndex === 0){
				setIsDeleting(false)
				setCurrentWordIndex((prev) => (prev + 1) % words.length)
			}
		}, typingSpeed)
		return () => clearTimeout(timeout)
	}, [currentCharIndex, currentWordIndex, isDeleting, words])

    // Fetch states on mount (same endpoint as Rankings)
    useEffect(() => {
        const fetchStates = async () => {
            try{
                const resp = await axios.get(`${import.meta.env.VITE_API_URL}/admin/vehicle-prices/states`)
                setStates(resp.data.data || [])
            }catch(err){
                console.error("Failed to load states:", err)
                toast.error("Could not load states for filter")
            }
        }
        fetchStates()
    }, [])

	// Memoized fetch function
	const fetchRideRequests = useCallback(
		async (page, limit, search, filters) => {
			setIsLoading(true)
			try{
				const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/ride-requests`,{
					params: {
						page,
						limit,
						search,
						status: filters.status || "",
						trip_type: filters.trip_type || "",
						payment_status: filters.payment_status || "",
						date_from: filters.date_from || "",
						date_to: filters.date_to || "",
						pickup_state_id: filters.pickup_state_id || ""
					},
				})
				if(response.data.success){
					setRideRequests(response.data.data.rides)
					setTotalRows(response.data.data.pagination.total_items || 0)
				}else{
					toast.error("Failed to fetch ride requests")
					setRideRequests([])
					setTotalRows(0)
				}
			}catch(err){
				console.error("Error fetching ride requests:", err)
				toast.error(err.response?.data?.message || "Failed to fetch ride requests")
				setRideRequests([])
				setTotalRows(0)
			}finally{
				setIsLoading(false)
			}
		},
		[]
	)

	// Handle search
	const handleSearchChange = (e) => {
		setSearchQuery(e.target.value)
		setCurrentPage(1)
	}

	// Handle filter change
	const handleFilterChange = (name, value) => {
		setFilters((prev) => ({ ...prev, [name]: value }))
		setCurrentPage(1)
	}

	// Handle pagination
	const handlePageChange = (page) => {
		setCurrentPage(page)
	}

	const handlePerRowsChange = (newPerPage, page) => {
		setPerPage(newPerPage)
		setCurrentPage(page)
	}

	// Handle view details
	const handleViewClick = (id) => {
		console.log(id);
		setIsModalOpen(true)
		fetchRideDetails(id)
	}

	// Handle cancel view
	const handleCancelEdit = () => {
		setIsModalOpen(false)
		setRideDetails(null)
	}

	// Function to format status text
	const formatStatus = (status) => {
		if (!status) return "N/A"
		return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
	}

	// Function to format date and time
	const formatDateTime = (dateString) => {
		if (!dateString) return "N/A"
		const date = new Date(dateString)
		return date.toLocaleDateString("en-IN", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		})
	}

	// Function to open Google Maps with coordinates
	const openLocationInMaps = (latitude, longitude) => {
		if (latitude && longitude) {
			const url = `https://www.google.com/maps?q=${latitude},${longitude}`
			window.open(url, "_blank")
		}
	}

	// To Display complete ride details
	const fetchRideDetails = async (id) => {
		setIsLoadingDetails(true)
		try {
		const response = await axios.get(
			`${import.meta.env.VITE_API_URL}/admin/ride-requests/${id}`
		)
		if (response.data.success) {
			setRideDetails(response.data.data)
		} else {
			toast.error("Failed to get ride details")
		}
		} catch (err) {
		console.error("Error retrieving ride details:", err)
		toast.error(err.response?.data?.message || "Failed to get ride details")
		} finally {
		setIsLoadingDetails(false)
		}
	}

	// Handle Excel Export
	const handleExcelExport = useCallback(() => {
		try {
			const exportData = rideRequests.map((ride, index) => ({
				'S.No'							: (currentPage - 1) * perPage + index + 1,
				'Ride ID'						: ride.id,
				'Passenger'						: ride.passenger || 'N/A',
				'Driver'						: ride.driver || 'Not Assigned',
				'Trip'							: ride.trip || 'N/A',
				'Trip Type'						: ride.trip_type || 'N/A',
				'Pickup Address'				: ride.pickup || 'N/A',
				'Dropoff Address'				: ride.dropoff || 'N/A',
				'Stop 1'						: ride.stop1?.address || 'N/A',
				'Stop 2'						: ride.stop2?.address || 'N/A',
				'Estimated Distance (km)'		: rideDetails?.ride.estimated_distance || 'N/A',
				'Actual Distance (km)'			: rideDetails?.actual_distance || ride.actual_distance || 'N/A',
				'Estimated Duration'			: rideDetails?.estimated_duration || `${Math.floor((ride.estimated_duration || 0) / 60)}h ${(ride.estimated_duration || 0) % 60}m`,
				'Actual Duration'				: rideDetails?.actual_duration || `${Math.floor((ride.actual_duration || 0) / 60)}h ${(ride.actual_duration || 0) % 60}m`,
				'Waiting Time'					: rideDetails?.waiting_time || `${Math.floor((ride.waiting_time || 0) / 60)}h ${(ride.waiting_time || 0) % 60}m`,
				'Estimated Fare'				: `₹${rideDetails?.payment_summary?.estimated_fare || ride.estimated_fare || 0}`,
				'Actual Fare'					: `₹${rideDetails?.payment_summary?.actual_fare || ride.actual_fare || 0}`,
				'Discount'						: `₹${rideDetails?.payment_summary?.discount || ride.discount_amount || 0}`,
				'Final Fare'					: `₹${rideDetails?.payment_summary?.final_fare || ride.final_fare || 0}`,
				'Tip Amount'					: `₹${ride.tip_amount || 0}`,
				'Commission %'					: `${ride.commission_percentage || 0}%`,
				'Commission Amount'				: `₹${ride.commission_amount || 0}`,
				'Driver Payout'					: `₹${ride.driver_payout || 0}`,
				'Coupon Code'					: rideDetails?.payment_summary?.coupon_code || ride.coupon_code || 'N/A',
				'Status'						: formatStatus(ride.status || 'N/A'),
				'Payment Status'				: formatStatus(ride.payment_status || 'N/A'),
				'Payment Method'				: ride.payment_method || 'N/A',
				'Ride OTP'						: rideDetails?.verification?.otp || 'N/A',
				'OTP Verified'					: rideDetails?.verification?.otp_verified ? 'Yes' : 'No',
				'Rating'						: rideDetails?.feedback?.rating || ride.rating || 'N/A',
				'Feedback'						: rideDetails?.feedback?.feedback || ride.feedback || 'N/A',
				'Is Rated'						: rideDetails?.feedback?.is_rated || ride.is_rated ? 'Yes' : 'No',
				'Created At'					: formatDateTime(ride.created_at),
				'Accepted At'					: formatDateTime(ride.accepted_at),
				'Arrived At'					: formatDateTime(ride.arrived_at),
				'Started At'					: formatDateTime(ride.ride_started_at),
				'Completed At'					: formatDateTime(ride.ride_completed_at),
				'Cancelled At'					: formatDateTime(ride.cancelled_at),
				'Cancelled By'					: ride.cancelled_by || 'N/A',
				'Cancellation Reason'			: rideDetails?.cancellation?.reason || ride.cancellation_reason || 'N/A',
				'Pickup Date'					: ride.pickup_date || 'N/A',
				'Pickup Time'					: ride.pickup_time || 'N/A',
				'Is Scheduled'					: ride.is_scheduled ? 'Yes' : 'No',
				'Vehicle Type ID'				: ride.vehicle_type_id || 'N/A',
				'Advance Paid'					: ride.is_advance_paid ? `₹${ride.advance_paid_amount || 0}` : 'No',
				'Remaining Fare'				: `₹${ride.remaining_fare_to_pay || 0}`,
				'Is Custom Trip'				: ride.is_custom_trip ? 'Yes' : 'No',
				'Custom KM'						: ride.custom_km || 'N/A',
				'Custom Days'					: ride.custom_days || 'N/A',
				'Start Meter'					: ride.start_meter_reading ? `${ride.start_meter_reading} (Image: ${ride.start_meter_image || 'N/A'})` : 'N/A',
				'End Meter'						: ride.end_meter_reading ? `${ride.end_meter_reading} (Image: ${ride.end_meter_image || 'N/A'})` : 'N/A',
				'Pickup State ID'				: ride.pickup_state_id || 'N/A',
				'Dropoff State ID'				: ride.dropoff_state_id || 'N/A',
				'Is Interstate'					: ride.is_interstate ? 'Yes' : 'No',
				'Estimated Base Fare'			: `₹${ride.estimated_base_fare || 0}`,
				'Estimated Distance Charge'		: `₹${ride.estimated_distance_charge || 0}`,
				'Estimated Waiting Charge'		: `₹${ride.estimated_waiting_charge || 0}`,
				'Estimated BATA Charge'			: `₹${ride.estimated_bata_charge || 0}`,
				'Estimated Subtotal'			: `₹${ride.estimated_subtotal || 0}`,
				'Estimated Total GST'			: `₹${ride.estimated_total_gst_amount || 0}`,
				'Estimated IGST'				: `₹${ride.estimated_igst_amount || 0}`,
				'Estimated CGST'				: `₹${ride.estimated_cgst_amount || 0}`,
				'Estimated SGST'				: `₹${ride.estimated_sgst_amount || 0}`,
				'Actual Base Fare'				: `₹${ride.actual_base_fare || 0}`,
				'Actual Distance Charge'		: `₹${ride.actual_distance_charge || 0}`,
				'Actual Waiting Charge'			: `₹${ride.actual_waiting_charge || 0}`,
				'Actual BATA Charge'			: `₹${ride.actual_bata_charge || 0}`,
				'Actual Subtotal'				: `₹${ride.actual_subtotal || 0}`,
				'Actual Total GST'				: `₹${ride.actual_total_gst_amount || 0}`,
				'Actual IGST'					: `₹${ride.actual_igst_amount || 0}`,
				'Actual CGST'					: `₹${ride.actual_cgst_amount || 0}`,
				'Actual SGST'					: `₹${ride.actual_sgst_amount || 0}`,
				'Pending Cancellation Applied' 	: ride.pending_cancellation_applied ? 'Yes' : 'No',
				'Pending Cancellation Amount'  	: `₹${ride.pending_cancellation_amount || 0}`,
				'Drivers Notified'             	: ride.drivers_notified || 0,
				'Search Restart Count'         	: ride.search_restart_count || 0,
				'Is Book Any Vehicle'          	: ride.is_book_any_vehicle ? 'Yes' : 'No',
				'Special Instructions'		    : ride.special_instructions || 'N/A'
			}));

			const wb = XLSX.utils.book_new();
			const ws = XLSX.utils.json_to_sheet(exportData);

			// Auto-fit columns (basic approach)
			const colWidths = exportData[0] ? Object.keys(exportData[0]).map(key => ({
				wch: Math.max(key.length, ...exportData.map(row => (row[key] || '').toString().length)) + 2
			})) : [];

			ws['!cols'] = colWidths;

			// Add worksheet to workbook
			XLSX.utils.book_append_sheet(wb, ws, 'Ride Requests');

			// Generate filename with timestamp
			const timestamp = new Date().toISOString().split('T')[0];
			const filename = `ride_requests_${timestamp}.xlsx`;

			// Write file
			XLSX.writeFile(wb, filename);
			toast.success('Excel file exported successfully');
		} catch (error) {
			console.error('Error exporting to Excel:', error);
			toast.error('Failed to export Excel file');
		}
	}, [rideRequests, currentPage, perPage, rideDetails]);

	// DataTable columns - with conditional Actions column
	const columnDefs = useMemo(() => {
		const baseColumns = [
			{
				headerName: "S.No",
				valueGetter: (params) =>
				(currentPage - 1) * perPage + params.node.rowIndex + 1,
				sortable: false,
				width: 80,
				suppressSizeToFit: true,
			},
			{
				headerName: "Passenger",
				field: "passenger",
				sortable: true,
				valueGetter: (params) => params.data.passenger || "N/A",
				minWidth: 110,
				flex: 1,
			},
			{
				headerName: "Driver",
				field: "driver",
				sortable: true,
				valueGetter: (params) => params.data.driver || "Not Assigned",
				minWidth: 100,
				flex: 1,
			},
			{
				headerName: "Trip",
				field: "trip",
				sortable: true,
				minWidth: 100,
				flex: 1,
			},
			{
				headerName: "Trip Type",
				field: "trip_type",
				sortable: true,
				minWidth: 100,
				flex: 1,
			},
			{
				headerName: "Pickup Address",
				field: "pickup",
				sortable: true,
				cellRenderer: (params) => <span>{params.data.pickup}</span>,
				minWidth: 200,
				flex: 1,
			},
			{
				headerName: "Drop Address",
				field: "dropoff",
				sortable: true,
				cellRenderer: (params) => <span>{params.data.dropoff}</span>,
				minWidth: 200,
				flex: 1,
			},
			{
				headerName: "Fare",
				field: "fare",
				sortable: true,
				cellRenderer: (params) => <span>₹{params.data.fare || "0"}</span>,
				minWidth: 100,
				flex: 1,
			},
			{
				headerName: "Status",
				field: "status",
				sortable: true,
				cellRenderer: (params) => (
				<span
					className={`px-2 py-1 rounded-full text-xs ${
					params.data.status === "ride_completed"
						? "bg-green-100 text-green-800"
						: params.data.status === "cancelled"
						? "bg-red-100 text-red-800"
						: "bg-yellow-100 text-yellow-800"
					}`}
				>
					{formatStatus(params.data.status)}
				</span>
				),
				minWidth: 100,
				flex: 1,
			},
		]
		// Only add Actions column if user has edit or delete permission
		baseColumns.push({
			headerName  : "Actions",
			field       : "actions",
			cellRenderer: (params) => (
				<div className="flex items-center gap-2">
					<button
						onClick   = {() => handleViewClick(params.data.id)}
						className = "p-1 text-blue-600 hover:text-blue-800 transition-colors"
						title     = "View Details"
					>
						<Eye size={16} style={{ color: theme.primaryGradientStart }} />
					</button>
				</div>
			),
			minWidth    : 100,
			flex        : 0.5,
			sortable    : false,
		})
		return baseColumns
	}, [theme.primaryGradientStart, theme.secondaryGradientStart, currentPage, perPage, setRidePermissions, handleViewClick])


	// Render complete ride details in a clean and organized way
	const renderRideDetails = () => {
		if (isLoadingDetails) {
		return (
			<div className="flex items-center justify-center py-8">
			<Loader className="animate-spin mr-2" size={20} />
			<span>Loading ride details...</span>
			</div>
		)
		}
		if (!rideDetails) {
		return (
			<div className="text-center py-8 text-gray-500">
			No ride details available
			</div>
		)
		}
		return (
		<div className="space-y-6 p-2 max-h-[80vh] overflow-y-auto">
			{/* Header with Ride ID and Status */}
			<div className="border-gray-200 border-b pb-4">
				<div className="flex justify-between items-start">
					<div>
					<h2 className="text-2xl font-bold text-gray-800">
						Ride #{rideDetails.id}
					</h2>
					<p className="text-gray-600">
						{rideDetails.trip} • {rideDetails.trip_type}
					</p>
					</div>
					<div className="text-right">
					<span
						className={`px-3 py-1 rounded-full text-sm font-medium ${
						rideDetails.status === "ride_completed"
							? "bg-green-100 text-green-800"
							: rideDetails.status === "cancelled"
							? "bg-red-100 text-red-800"
							: "bg-yellow-100 text-yellow-800"
						}`}
					>
						{formatStatus(rideDetails.status)}
					</span>
					</div>
				</div>
			</div>
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Passenger Details */}
				<div className="bg-white rounded-lg p-4">
					<div className="flex items-start justify-between">
						<div className="flex items-center gap-3">
							<h4 className="font-medium text-gray-900">Passenger Details</h4>
						</div>
						<div className="flex items-center gap-2 ">
							<div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
							<MapPin size={16} className="text-blue-600" />
							{rideDetails.pickup?.latitude && rideDetails.pickup?.longitude && (
								<button
									onClick={() =>
										openLocationInMaps(
											rideDetails.pickup.latitude,
											rideDetails.pickup.longitude
										)
									}
									className="p-2 text-blue-600 rounded-lg transition-all duration-200"
									title="View location on map"
								>
									<MapPin size={18} />
								</button>
							)}
							</div>
						</div>
					</div>
					{rideDetails.user ? (
						<div className="space-y-2">
							<div className="flex items-center">
								<img
									src={rideDetails.user.profile_url || defaultProfileImage} 
									alt="Passenger Profile"
									className="w-12 h-12 rounded-full mr-3 object-cover"
									onError={(e) => (e.target.src = defaultProfileImage)} 
								/>
								<div>
									<p className="font-medium">{rideDetails.user.name}</p>
									<p className="text-sm text-gray-600">
										{rideDetails.user.gender || "N/A"}
									</p>
								</div>
							</div>
							<div className="space-y-1">
								<p className="flex items-center text-sm">
									<Phone size={14} className="mr-2" />
									{rideDetails.user.mobile}
								</p>
								<p className="flex items-center text-sm">
									<Mail size={14} className="mr-2" />
									{rideDetails.user.email}
								</p>
							</div>
						</div>
					) : (
					<p className="text-gray-500">
						No passenger information available
					</p>
					)}
				</div>
				{/* Driver Details */}
				<div className="bg-white rounded-lg p-4">
					<div className="flex items-start justify-between">
						<div className="flex items-center gap-3">
							<h4 className="font-medium text-gray-900">Driver Details</h4>
						</div>
						<div className="flex items-center gap-2">
							<div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
							<MapPin size={16} className="text-green-600" />
							{rideDetails.driver?.latitude &&
								rideDetails.driver?.longitude && (
								<button
									onClick={() =>
									openLocationInMaps(
										rideDetails.driver.latitude,
										rideDetails.driver.longitude
									)
									}
									className="p-2 text-green-600 rounded-lg transition-all duration-200"
									title="View driver location on map"
								>
									<MapPin size={18} />
								</button>
								)}
							</div>
						</div>
					</div>
					{rideDetails.driver ? (
						<div className="space-y-2">
							<div className="flex items-center">
							<img
								src={rideDetails.driver.profile_url || defaultProfileImage} // Fallback to default image
								alt="Driver Profile"
								className="w-12 h-12 rounded-full mr-3 object-cover"
								onError={(e) => (e.target.src = defaultProfileImage)} // Fallback for broken image URLs
							/>
							<div>
								<p className="font-medium">{rideDetails.driver.name}</p>
								<p className="text-sm text-gray-600">
								{rideDetails.driver.gender || "N/A"}
								</p>
							</div>
							</div>
							<div className="space-y-1">
							<p className="flex items-center text-sm">
								<Phone size={14} className="mr-2" />
								{rideDetails.driver.mobile}
							</p>
							<p className="flex items-center text-sm">
								<Mail size={14} className="mr-2" />
								{rideDetails.driver.email}
							</p>
							</div>
						</div>
					) : (
						<p className="text-gray-500">No driver assigned</p>
					)}
				</div>
			</div>
			{/* Trip Route Information */}
			<div className="bg-white border-gray-200 border rounded-lg p-4">
				<h3 className="text-lg font-semibold mb-3 flex items-center">
					<MapPin
					className="mr-2"
					size={20}
					style={{ color: theme.primaryGradientStart }}
					/>
					Trip Route
				</h3>
				<div className="mb-4">
					<RideRouteMap 
					pickup={rideDetails.pickup}
					dropoff={rideDetails.dropoff}
					stops={rideDetails.stops}
					/>
				</div>
				<div className="space-y-4">
					{/* Pickup Location */}
					<div className="flex items-start">
					<div className="w-3 h-3 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
					<div className="flex-1">
						<p className="font-medium text-green-700">Pickup Location</p>
						<p className="text-gray-600">
						{rideDetails.pickup?.address || "N/A"}
						</p>
						{rideDetails.pickup?.latitude &&
						rideDetails.pickup?.longitude && (
							<p className="text-xs text-gray-500">
							Coordinates: {rideDetails.pickup.latitude},{" "}
							{rideDetails.pickup.longitude}
							</p>
						)}
					</div>
					</div>
					{/* Stop 1 */}
					{rideDetails.stops?.stop1 && (
					<div className="flex items-start">
						<div className="w-3 h-3 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
						<div className="flex-1">
						<p className="font-medium text-blue-700">Stop 1</p>
						<p className="text-gray-600">
							{rideDetails.stops.stop1.address}
						</p>
						{rideDetails.stops.stop1.latitude &&
							rideDetails.stops.stop1.longitude && (
							<p className="text-xs text-gray-500">
								Coordinates: {rideDetails.stops.stop1.latitude},{" "}
								{rideDetails.stops.stop1.longitude}
							</p>
							)}
						</div>
					</div>
					)}
					{/* Stop 2 */}
					{rideDetails.stops?.stop2 && (
					<div className="flex items-start">
						<div className="w-3 h-3 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
						<div className="flex-1">
						<p className="font-medium text-blue-700">Stop 2</p>
						<p className="text-gray-600">
							{rideDetails.stops.stop2.address}
						</p>
						{rideDetails.stops.stop2.latitude &&
							rideDetails.stops.stop2.longitude && (
							<p className="text-xs text-gray-500">
								Coordinates: {rideDetails.stops.stop2.latitude},{" "}
								{rideDetails.stops.stop2.longitude}
							</p>
							)}
						</div>
					</div>
					)}
					{/* Drop Location */}
					<div className="flex items-start">
					<div className="w-3 h-3 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
					<div className="flex-1">
						<p className="font-medium text-red-700">Drop Location</p>
						<p className="text-gray-600">
						{rideDetails.dropoff?.address || "N/A"}
						</p>
						{rideDetails.dropoff?.latitude &&
						rideDetails.dropoff?.longitude && (
							<p className="text-xs text-gray-500">
							Coordinates: {rideDetails.dropoff.latitude},{" "}
							{rideDetails.dropoff.longitude}
							</p>
						)}
					</div>
					</div>
				</div>
			</div>
			{/* Schedule Information */}
			{rideDetails.schedule?.is_scheduled && (
			<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
				<h3 className="text-lg font-semibold mb-3 flex items-center text-blue-800">
				<Clock className="mr-2" size={20} />
				Schedule Information
				</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<p className="font-medium text-blue-700">Pickup Date & Time</p>
					<p className="text-gray-600">
					{rideDetails.schedule.pickup_datetime}
					</p>
				</div>
				</div>
			</div>
			)}
			{/* Distance and Time Information */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<div className="bg-white border-gray-200 border rounded-lg p-4">
				<h3 className="text-lg font-semibold mb-3">Distance & Duration</h3>
				<div className="space-y-2">
				<div className="flex justify-between">
					<span className="text-gray-600">Estimated Distance:</span>
					<span className="font-medium">
					{rideDetails.distance_time_info?.estimated_distance || "N/A"}{" "}
					km
					</span>
				</div>
				<div className="flex justify-between">
					<span className="text-gray-600">Actual Distance:</span>
					<span className="font-medium">
					{rideDetails.distance_time_info?.actual_distance || "N/A"} km
					</span>
				</div>
				<div className="flex justify-between">
					<span className="text-gray-600">Estimated Duration:</span>
					<span className="font-medium">
					{rideDetails.distance_time_info?.estimated_duration || "N/A"}
					</span>
				</div>
				<div className="flex justify-between">
					<span className="text-gray-600">Actual Duration:</span>
					<span className="font-medium">
					{rideDetails.distance_time_info?.actual_duration || "N/A"}
					</span>
				</div>
				<div className="flex justify-between">
					<span className="text-gray-600">Waiting Time:</span>
					<span className="font-medium">
					{rideDetails.distance_time_info?.waiting_time || "0m"}
					</span>
				</div>
				</div>
			</div>
			{/* Payment Summary */}
			<div className="bg-white border-gray-200 border rounded-lg p-4">
				<h3 className="text-lg font-semibold mb-3 flex items-center">
				<CreditCard
					className="mr-2"
					size={20}
					style={{ color: theme.primaryGradientStart }}
				/>
				Payment Summary
				</h3>
				<div className="space-y-2">
				<div className="flex justify-between">
					<span className="text-gray-600">Estimated Fare:</span>
					<span className="font-medium">
					₹{rideDetails.payment_summary?.estimated_fare || "0"}
					</span>
				</div>
				<div className="flex justify-between">
					<span className="text-gray-600">Actual Fare:</span>
					<span className="font-medium">
					₹{rideDetails.payment_summary?.actual_fare || "0"}
					</span>
				</div>
				<div className="flex justify-between">
					<span className="text-gray-600">Discount:</span>
					<span className="font-medium text-green-600">
					-₹{rideDetails.payment_summary?.discount || "0"}
					</span>
				</div>
				<div className="flex justify-between border-gray-200 border-t pt-2">
					<span className="text-gray-800 font-semibold">Final Fare:</span>
					<span
					className="font-bold text-lg"
					style={{ color: theme.primaryGradientStart }}
					>
					₹{rideDetails.payment_summary?.final_fare || "0"}
					</span>
				</div>
				<div className="flex justify-between">
					<span className="text-gray-600">Payment Method:</span>
					<span className="font-medium">
					{rideDetails.payment_method || "N/A"}
					</span>
				</div>
				<div className="flex justify-between">
					<span className="text-gray-600">Payment Status:</span>
					<span
					className={`font-medium ${
						rideDetails.payment_status === "paid"
						? "text-green-600"
						: rideDetails.payment_status === "failed"
						? "text-red-600"
						: "text-yellow-600"
					}`}
					>
					{formatStatus(rideDetails.payment_status)}
					</span>
				</div>
				{rideDetails.payment_summary?.coupon_code && (
					<div className="flex justify-between">
					<span className="text-gray-600">Coupon Code:</span>
					<span className="font-medium">
						{rideDetails.payment_summary.coupon_code}
					</span>
					</div>
				)}
				</div>
			</div>
			</div>
			{/* OTP Verification Details */}
			{rideDetails.verification && (
			<div className="bg-white border-gray-200 border rounded-lg p-4">
				<h3 className="text-lg font-semibold mb-3">OTP Verification</h3>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div>
					<p className="text-gray-600">OTP:</p>
					<p className="font-medium font-mono text-lg">
					{rideDetails.verification.otp || "N/A"}
					</p>
				</div>
				<div>
					<p className="text-gray-600">Generated At:</p>
					<p className="font-medium">
					{formatDateTime(rideDetails.verification.generated_at)}
					</p>
				</div>
				<div>
					<p className="text-gray-600">Verification Status:</p>
					<span
					className={`inline-block px-2 py-1 rounded text-xs font-medium ${
						rideDetails.verification.otp_verified
						? "bg-green-100 text-green-800"
						: "bg-red-100 text-red-800"
					}`}
					>
					{rideDetails.verification.otp_verified
						? "Verified"
						: "Not Verified"}
					</span>
				</div>
				</div>
			</div>
			)}
			{/* Feedback Section */}
			{rideDetails.feedback?.is_rated && (
			<div className="bg-white border-gray-200 border rounded-lg p-4">
				<h3 className="text-lg font-semibold mb-3 flex items-center">
				<Star
					className="mr-2"
					size={20}
					style={{ color: theme.primaryGradientStart }}
				/>
				Customer Feedback
				</h3>
				<div className="space-y-2">
				<div className="flex items-center">
					<span className="text-gray-600 mr-2">Rating:</span>
					<div className="flex items-center">
					{[1, 2, 3, 4, 5].map((star) => (
						<Star
						key={star}
						size={16}
						className={
							star <= (rideDetails.feedback.rating || 0)
							? "text-yellow-400 fill-current"
							: "text-gray-300"
						}
						/>
					))}
					<span className="ml-2 font-medium">
						{rideDetails.feedback.rating}/5
					</span>
					</div>
				</div>
				{rideDetails.feedback.feedback && (
					<div>
					<p className="text-gray-600">Feedback:</p>
					<p className="bg-gray-50 p-3 rounded italic">
						{rideDetails.feedback.feedback}
					</p>
					</div>
				)}
				</div>
			</div>
			)}
			{/* Cancellation Details */}
			{rideDetails.status === "cancelled" &&
			rideDetails.cancellation?.reason && (
				<div className="bg-red-50 border-gray-200 border border-red-200 rounded-lg p-4">
				<h3 className="text-lg font-semibold mb-3 text-red-800">
					Cancellation Details
				</h3>
				<div className="space-y-2">
					<div>
					<p className="text-gray-600">Reason:</p>
					<p className="font-medium">
						{rideDetails.cancellation.reason}
					</p>
					</div>
					<div>
					<p className="text-gray-600">Cancelled At:</p>
					<p className="font-medium">
						{formatDateTime(rideDetails.cancellation.cancelled_at)}
					</p>
					</div>
				</div>
				</div>
			)}
			{/* Timeline */}
			<div className="bg-white border-gray-200 border rounded-lg p-4">
			<h3 className="text-lg font-semibold mb-3 flex items-center">
				<Clock
				className="mr-2"
				size={20}
				style={{ color: theme.primaryGradientStart }}
				/>
				Ride Timeline
			</h3>
			<div className="space-y-3">
				{Object.entries({
				"Ride Requested": rideDetails.timestamps?.created_at,
				"Driver Accepted": rideDetails.timestamps?.accepted_at,
				"Driver Arrived": rideDetails.timestamps?.arrived_at,
				"Ride Started": rideDetails.timestamps?.started_at,
				"Ride Completed": rideDetails.timestamps?.completed_at,
				Cancelled: rideDetails.timestamps?.cancelled_at,
				}).map(
				([event, timestamp]) =>
					timestamp && (
					<div key={event} className="flex items-center">
						<div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
						<div className="flex-1">
						<span className="font-medium">{event}: </span>
						<span className="text-gray-600">
							{formatDateTime(timestamp)}
						</span>
						</div>
					</div>
					)
				)}
			</div>
			</div>
			<div className="flex justify-end gap-3 pt-4 border-gray-200 border-t">
			<ThemeUI.Button
				type="button"
				onClick={handleCancelEdit}
				gradientColors={{
				start: theme.primaryGradientStart,
				end: theme.primaryGradientEnd,
				}}
			>
				Close
			</ThemeUI.Button>
			</div>
		</div>
		)
	}

	return (
		<Layout>
		{/* Header and breadcrumb */}
		<div className="flex flex-row items-center mb-4">
			<h1 className="text-2xl flex-1 font-bold max-sm:text-xl">
				Trip Details Overview
			</h1>
			<nav className="flex items-center text-sm text-gray-500 whitespace-nowrap overflow-x-auto">
				<ol className="flex items-center">
					<li>
						<a
							href="/dashboard"
							className="hover:text-blue-600 transition-colors"
						>
							Home
						</a>
					</li>
					<li className="flex items-center">
						<ChevronRight className="h-4 w-4 mx-1" />
					</li>
					<li
						style={{ color: theme.primaryGradientStart }}
						className="font-medium"
					>
					Trip Details
					</li>
				</ol>
			</nav>
		</div>
		{/* Status and Trip Type Tabs */}
		<div className="mb-4 space-y-3">
			{/* Status Tabs */}
			<div className="flex justify-center">
				<div className="inline-flex rounded-md shadow-sm" role="group">
					{[
						{ value: "all", label: "All", isFirst: true },
						{ value: "pending", label: "Pending" },
						{ value: "ride_started", label: "Started" },
						{ value: "ride_completed", label: "Completed" },
						{ value: "cancelled", label: "Cancelled" },
					].map(({ value, label, isFirst }) => (
						<button
							key={value}
							type="button"
							className={`px-4 py-2 text-sm font-medium flex items-center transition-all duration-200 ${
								isFirst ? "rounded-l-md" : value === "cancelled" ? "rounded-r-md" : "border-r"
							} ${
								(filters.status === value || (!filters.status && value === "all"))
									? "text-white border-transparent"
									: "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
							}`}
							style={
								(filters.status === value || (!filters.status && value === "all"))
									? { background: `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})` }
									: {}
							}
							onClick={() => handleFilterChange("status", value === "all" ? "" : value)}
						>
							{label}
						</button>
					))}
				</div>
			</div>
			{/* Trip Type Tabs */}
			<div className="flex justify-center">
				<div className="inline-flex rounded-md shadow-sm" role="group">
					{[
						{ value: "all", label: "All", isFirst: true },
						{ value: "1", label: "Intercity" },
						{ value: "2", label: "Outstation", isLast: true },
					].map(({ value, label, isFirst, isLast }) => (
						<button
							key={value}
							type="button"
							className={`px-4 py-2 text-sm font-medium flex items-center transition-all duration-200 ${
								isFirst ? "rounded-l-md" : isLast ? "rounded-r-md" : "border-r"
							} ${
								(filters.trip_type === value || (!filters.trip_type && value === "all"))
									? "text-white border-transparent"
									: "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
							}`}
							style={
								(filters.trip_type === value || (!filters.trip_type && value === "all"))
									? { background: `linear-gradient(${theme.gradientDirection}, ${theme.secondaryGradientStart}, ${theme.secondaryGradientEnd})` }
									: {}
							}
							onClick={() => handleFilterChange("trip_type", value === "all" ? "" : value)}
						>
							{label}
						</button>
					))}
				</div>
			</div>
		</div>
		{/* Search and filter controls */}
		<div className="mb-4 rounded-lg w-full">
			<div className="flex justify-between items-center gap-2">
			<div className="w-full max-sm:flex-1 sm:w-1/3">
				<ThemeUI.Input
				id="search"
				name="search"
				value={searchQuery}
				className="bg-white border border-gray-300 rounded-md p-2 hover:border-gray-500 transition-colors"
				onChange={handleSearchChange}
				placeholder={placeholder}
				leftElement={<Search size={16} className="text-gray-400" />}
				/>
			</div>
			<div className="flex flex-col sm:flex-row gap-2 w-full max-sm:w-fit sm:w-auto h-full">
				<ThemeUI.Button
				type="button"
				onClick={handleExcelExport}
				gradientColors={{
					start: theme.secondaryGradientStart,
					end: theme.secondaryGradientEnd,
				}}
				direction={theme.gradientDirection}
				aria-label="Export to Excel"
				>
				<Download size={16} className="mr-2" /> Export Excel
				</ThemeUI.Button>
				<ThemeUI.Button
				type="button"
				onClick={() => setIsFilterOffcanvasOpen(true)}
				gradientColors={{
					start: theme.secondaryGradientStart,
					end: theme.secondaryGradientEnd,
				}}
				direction={theme.gradientDirection}
				aria-label="Open filter options"
				>
				<Filter size={16} className="sm:mr-2" />
				<p className="max-sm:hidden">Filters</p>
				</ThemeUI.Button>
			</div>
			</div>
		</div>
		{/* DataTable with horizontal scroll wrapper */}
		<div style={{
			"--header-gradient": `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})`,
			}}
		>
			<AgGridReact
			className="custom-ag-grid"
			domLayout="autoHeight"
			theme={themeQuartz.withParams({
				spacing: 7,
				headerHeight: 45,
				headerFontSize: 16,
				fontSize: 13,
				headerTextColor: "white",
				paginationPanelHeight: 50,
			})}
			defaultColDef={{
				resizable: false,
				suppressSizeToFit: false,
			}}
			rowData={rideRequests}
			rowHeight={55}
			columnDefs={columnDefs}
			pagination
			paginationPageSize={10}
			paginationPageSizeSelector={[10, 20, 50, 100]}
			paginationNumberFormatter={(params) => `${params.value}`}
			suppressCellFocus
			suppressPaginationPanel={false}
			overlayLoadingTemplate={'<span class="p-4">Loading...</span>'}
			noRowsOverlayComponent={NoRowsOverlay}
			noRowsOverlayComponentParams={{ text: "No Ride Requests Found" }}
			onPaginationChanged={(params) => {
				if (params.api) {
				const newPage = params.api.paginationGetCurrentPage() + 1
				handlePageChange(newPage)
				}
			}}
			/>
		</div>
		{/* Modal */}
		<Modal
			isOpen={isModalOpen}
			onClose={handleCancelEdit}
			title="View Ride Details"
			size="full"
		>
			{renderRideDetails()}
		</Modal>
		{/* Filter Offcanvas */}
		<Offcanvas
			isOpen={isFilterOffcanvasOpen}
			onClose={() => setIsFilterOffcanvasOpen(false)}
			title="Filter Options"
			position="right"
			size="md"
		>
			<div className="space-y-4">
			<ThemeUI.FormField label="Status">
				<ThemeUI.Select
				value={filters.status}
				onChange={(selected) =>
					handleFilterChange("status", selected?.value || "")
				}
				options={[
					{ value: "pending", label: "Pending" },
					{ value: "searching_driver", label: "Searching Driver" },
					{ value: "accepted", label: "Accepted" },
					{ value: "arrived", label: "Driver Arrived" },
					{ value: "ride_started", label: "Ride Started" },
					{ value: "ride_completed", label: "Ride Completed" },
					{ value: "cancelled", label: "Cancelled" },
					{ value: "expired", label: "Expired" },
					{
					value: "no_drivers_available",
					label: "No Drivers Available",
					},
					{ value: "timeout", label: "Timeout" },
				]}
				placeholder="Filter by status"
				isClearable
				isSearchable={false}
				/>
			</ThemeUI.FormField>
			<ThemeUI.FormField label="Trip Type">
				<ThemeUI.Select
				value={filters.trip_type}
				onChange={(selected) =>
					handleFilterChange("trip_type", selected?.value || "")
				}
				options={[
					{ value: "1", label: "Intercity" },
					{ value: "2", label: "Outstation" },
				]}
				placeholder="Filter by trip type"
				isClearable
				isSearchable={false}
				/>
			</ThemeUI.FormField>
			<ThemeUI.FormField label="Payment Status">
				<ThemeUI.Select
				value={filters.payment_status}
				onChange={(selected) =>
					handleFilterChange("payment_status", selected?.value || "")
				}
				options={[
					{ value: "pending", label: "Pending" },
					{ value: "paid", label: "Paid" },
					{ value: "failed", label: "Failed" },
					{ value: "refunded", label: "Refunded" },
				]}
				placeholder="Filter by payment status"
				isClearable
				isSearchable={false}
				/>
			</ThemeUI.FormField>
			<ThemeUI.FormField label="State">
				<ThemeUI.Select
					value={filters.pickup_state_id}
					onChange={(selected) =>
						handleFilterChange("pickup_state_id", selected?.value || "")
					}
					options={states.map((s) => ({
						value: s.id.toString(),
						label: s.state_name
					}))}
					placeholder="Select a state"
					isClearable
					isSearchable={false}
				/>
			</ThemeUI.FormField>
			<ThemeUI.FormField label="Date From">
				<ThemeUI.Input
				type="date"
				value={filters.date_from}
				onChange={(e) => handleFilterChange("date_from", e.target.value)}
				/>
			</ThemeUI.FormField>
			<ThemeUI.FormField label="Date To">
				<ThemeUI.Input
				type="date"
				value={filters.date_to}
				onChange={(e) => handleFilterChange("date_to", e.target.value)}
				/>
			</ThemeUI.FormField>
			<div className="flex gap-2">
				<ThemeUI.Button
				type="button"
				onClick={() => {
					setFilters({
					status: "",
					trip_type: "",
					payment_status: "",
					date_from: "",
					date_to: "",
					})
					setCurrentPage(1)
					setIsFilterOffcanvasOpen(false)
				}}
				gradientColors={{
					start: theme.secondaryGradientStart,
					end: theme.secondaryGradientEnd,
				}}
				>
				Reset Filters
				</ThemeUI.Button>
			</div>
			</div>
		</Offcanvas>
		</Layout>
	)
}
export default RideRequest
