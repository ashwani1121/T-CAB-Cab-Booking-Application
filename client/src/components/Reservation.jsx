import React, { useState, useEffect, useCallback, useMemo } from "react"
import axios from "axios"
import { toast } from "react-toastify"
import Layout from "./Layout"
import { useTheme } from "../context/themeContext"
import { ThemeUI } from "../context/themeUI"
import { ChevronRight, Loader, Search, Filter, Eye, User, MapPin, Clock, CreditCard, Star, Phone, Mail, Download, UserPlus, UserMinus } from "lucide-react"
import Modal from "./Modal"
import Offcanvas from "./Offcanvas"
import defaultProfileImage from "../assets/images/default-profile.png"
import { AgGridReact } from "ag-grid-react"
import { themeQuartz } from "ag-grid-community"
import NoRowsOverlay from "./NoRowsOverlay"
import * as XLSX from 'xlsx'

function Reservation(){
	const { theme } = useTheme()
	const [isLoading, setIsLoading] = useState(false)
	const [totalRows, setTotalRows] = useState(0)
	const [perPage, setPerPage] = useState(10)
	const [currentPage, setCurrentPage] = useState(1)
	const [rideRequests, setRideRequests] = useState([])
	const [searchQuery, setSearchQuery] = useState("")
	const today = new Date().toISOString().split("T")[0]
	const [states, setStates] = useState([])
	const [filters, setFilters] = useState({
		status: "",
		payment_status: "",
		is_custom_trip: "",
		is_transferred: "",  
		date_from: today,
		date_to: today,
		pickup_state_id: "",
		dropoff_state_id: ""
	})
	const [isFilterOffcanvasOpen, setIsFilterOffcanvasOpen] = useState(false)
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [rideDetails, setRideDetails] = useState(null)
	const [placeholder, setPlaceholder] = useState("Search by address...")
	const [currentWordIndex, setCurrentWordIndex] = useState(0)
	const [currentCharIndex, setCurrentCharIndex] = useState(0)
	const [isDeleting, setIsDeleting] = useState(false)
	const [isLoadingDetails, setIsLoadingDetails] = useState(false)
	const words = ["address", "rider name", "fare"]

	// Driver assignment states
	const [isAssignDriverModalOpen, setIsAssignDriverModalOpen] = useState(false)
	const [selectedReservationForAssignment, setSelectedReservationForAssignment] = useState(null)
	const [selectedDriver, setSelectedDriver] = useState([])
	const [isAssigningDriver, setIsAssigningDriver] = useState(false)
	const [isUnassigningDriver, setIsUnassigningDriver] = useState(false)

	// Initialize permissions with safe defaults
	const [ridePermissions, setRidePermissions] = useState({
		can_add: false,
		can_edit: false,
		can_delete: false,
		can_view: false
	})

	// Get user permissions for the reservation module 
	const getUserPermissions = useCallback(() => {
		try {
			const permissionsStr = localStorage.getItem('userPermissions')
			if (permissionsStr) {
				const permissions = JSON.parse(permissionsStr)
				if (permissions.reservation) {
					return {
						can_add: permissions.reservation.can_add || false,
						can_edit: permissions.reservation.can_edit || false,
						can_delete: permissions.reservation.can_delete || false,
						can_view: permissions.reservation.can_view || false
					}
				}
			}
			return {
				can_add: false,
				can_edit: false,
				can_delete: false,
				can_view: false
			}
		} catch (error) {
			console.error('Error parsing user permissions:', error)
			return {
				can_add: false,
				can_edit: false,
				can_delete: false,
				can_view: false
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

	// Memoized fetch function
	const fetchRideRequests = useCallback(
		async (page, limit, search, filters) => {
			setIsLoading(true)
			try {
				const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/reservation`, {
					params: {
						page,
						limit,
						search,
						status: filters.status || "",
						payment_status: filters.payment_status || "",
						is_custom_trip: filters.is_custom_trip || "",
    					is_transferred: filters.is_transferred || "", 
						date_from: filters.date_from || "",
						date_to: filters.date_to || "",
						pickup_state_id: filters.pickup_state_id || "",
						dropoff_state_id: filters.dropoff_state_id || ""
					},
				})
				if (response.data.success) {
					setRideRequests(response.data.data.reservations)
					setTotalRows(response.data.data.pagination.total_items || 0)
				} else {
					toast.error("Failed to fetch reservation rides")
					setRideRequests([])
					setTotalRows(0)
				}
			} catch (err) {
				console.error("Error fetching reservation rides:", err)
				toast.error(err.response?.data?.message || "Failed to fetch reservation rides")
				setRideRequests([])
				setTotalRows(0)
			} finally {
				setIsLoading(false)
			}
		},
		[]
	)

	// Fetch ride requests on mount and when pagination/search/filters change
	useEffect(() => {
		fetchRideRequests(currentPage, perPage, searchQuery, filters)
	}, [currentPage, perPage, searchQuery, filters, fetchRideRequests])

	// Typing animation for placeholder
	useEffect(() => {
		const typingSpeed = isDeleting ? 50 : 100
		const pauseTime = 1500
		const timeout = setTimeout(() => {
			const currentWord = words[currentWordIndex]
			if (!isDeleting && currentCharIndex < currentWord.length) {
				setPlaceholder(`Search by ${currentWord.substring(0, currentCharIndex + 1)}...`)
				setCurrentCharIndex((prev) => prev + 1)
			} else if (isDeleting && currentCharIndex > 0) {
				setPlaceholder(`Search by ${currentWord.substring(0, currentCharIndex - 1)}...`)
				setCurrentCharIndex((prev) => prev - 1)
			} else if (!isDeleting && currentCharIndex === currentWord.length) {
				setTimeout(() => setIsDeleting(true), pauseTime)
			} else if (isDeleting && currentCharIndex === 0) {
				setIsDeleting(false)
				setCurrentWordIndex((prev) => (prev + 1) % words.length)
			}
		}, typingSpeed)
		return () => clearTimeout(timeout)
	}, [currentCharIndex, currentWordIndex, isDeleting, words])

	// Fetch states on mount
	useEffect(() => {
		const fetchStates = async () => {
			try {
				const resp = await axios.get(`${import.meta.env.VITE_API_URL}/admin/vehicle-prices/states`)
				setStates(resp.data.data || [])
			} catch (err) {
				console.error("Failed to load states:", err)
				toast.error("Could not load states for filter")
			}
		}
		fetchStates()
	}, [])

	// Load drivers for autocomplete
	const loadDrivers = useCallback(async (inputValue, callback) => {
		try {
			// Assuming driver role ID is 3 - adjust based on your system
			const DRIVER_ROLE_ID = 3
			const response = await axios.get(
				`${import.meta.env.VITE_API_URL}/admin/notification/${DRIVER_ROLE_ID}/search`,
				{
					params: {
						page: 1,
						limit: 50,
						search: inputValue
					}
				}
			)
			console.log(response);
			if (response.data.success && response.data.data) {
				const driverOptions = response.data.data.map(driver => ({
					value: driver.id,
					label: `${driver.name}`,
					mobile: driver.mobile,
					email: driver.email
				}))
				callback(driverOptions)
			} else {
				callback([])
			}
		} catch (error) {
			console.error('Error loading drivers:', error)
			toast.error('Failed to load drivers')
			callback([])
		}
	}, [])

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
	const handleViewClick = useCallback((id) => {
		setIsModalOpen(true)
		fetchRideDetails(id)
	}, [])

	// Handle cancel view
	const handleCancelEdit = () => {
		setIsModalOpen(false)
		setRideDetails(null)
	}

	// Handle assign driver click
	const handleAssignDriverClick = useCallback((reservation) => {
		setSelectedReservationForAssignment(reservation)
		setSelectedDriver([])
		setIsAssignDriverModalOpen(true)
	}, [])

	// Handle assign driver submission
	const handleAssignDriver = async () => {
		if (!selectedDriver || selectedDriver.length === 0) {
			toast.error('Please select a driver')
			return
		}

		setIsAssigningDriver(true)
		try {
			const response = await axios.post(
				`${import.meta.env.VITE_API_URL}/admin/reservation/${selectedReservationForAssignment.id}/assign-driver`,
				{
					driver_id: selectedDriver[0].value
				}
			)

			if (response.data.success) {
				toast.success('Driver assigned successfully')
				setIsAssignDriverModalOpen(false)
				setSelectedReservationForAssignment(null)
				setSelectedDriver([])
				// Refresh the list
				fetchRideRequests(currentPage, perPage, searchQuery, filters)
			} else {
				toast.error(response.data.message || 'Failed to assign driver')
			}
		} catch (error) {
			console.error('Error assigning driver:', error)
			toast.error(error.response?.data?.message || 'Failed to assign driver')
		} finally {
			setIsAssigningDriver(false)
		}
	}

	// Handle unassign driver
	const handleUnassignDriver = useCallback(async (reservation) => {
		// Confirm action
		if (!window.confirm(`Are you sure you want to unassign ${reservation.driver?.name} from this reservation?`)) {
			return
		}

		setIsUnassigningDriver(true)
		try {
			const response = await axios.delete(
				`${import.meta.env.VITE_API_URL}/admin/reservation/${reservation.id}/assign-driver`
			)

			if (response.data.success) {
				toast.success('Driver unassigned successfully')
				// Refresh the list
				fetchRideRequests(currentPage, perPage, searchQuery, filters)
			} else {
				toast.error(response.data.message || 'Failed to unassign driver')
			}
		} catch (error) {
			console.error('Error unassigning driver:', error)
			toast.error(error.response?.data?.message || 'Failed to unassign driver')
		} finally {
			setIsUnassigningDriver(false)
		}
	}, [currentPage, perPage, searchQuery, filters, fetchRideRequests])

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
				`${import.meta.env.VITE_API_URL}/admin/reservation/${id}`
			)
			if (response.data.success) {
				setRideDetails(response.data.data)
			} else {
				toast.error("Failed to get reservation details")
			}
		} catch (err) {
			console.error("Error retrieving reservation details:", err)
			toast.error(err.response?.data?.message || "Failed to get reservation details")
		} finally {
			setIsLoadingDetails(false)
		}
	}

	// Handle Excel Export
	const handleExcelExport = useCallback(() => {
		try {
			const exportData = rideRequests.map((ride, index) => ({
				'S.No': (currentPage - 1) * perPage + index + 1,
				'Reservation ID': ride.id,
				'Booker': ride.passenger?.name || 'N/A',
				'Rider': ride.rider?.name || 'N/A',
				'Driver': ride.driver?.name || 'Not Assigned',
				'Pickup Address': ride.pickup || 'N/A',
				'Dropoff Address': ride.dropoff || 'N/A',
				'Stop 1': ride.stop1?.address || 'N/A',
				'Stop 2': ride.stop2?.address || 'N/A',
				'Package ID': ride.package_id || 'N/A',
				'Custom Trip': ride.is_custom_trip ? 'Yes' : 'No',
				'Custom KM': ride.custom_km || 'N/A',
				'Custom Days': ride.custom_days || 'N/A',
				'Pickup Date': ride.pickup_date || 'N/A',
				'Pickup Time': ride.pickup_time || 'N/A',
				'Is Scheduled': ride.is_scheduled ? 'Yes' : 'No',
				'Advance Paid': ride.is_advance_paid ? `₹${ride.advance_paid_amount || 0}` : 'No',
				'Remaining Fare': `₹${ride.remaining_fare_to_pay || 0}`,
				'Estimated Distance (km)': ride.estimated_distance || 'N/A',
				'Actual Distance (km)': ride.actual_distance || 'N/A',
				'Estimated Duration': ride.estimated_duration ? `${Math.floor((ride.estimated_duration || 0) / 60)}h ${(ride.estimated_duration || 0) % 60}m` : 'N/A',
				'Actual Duration': ride.actual_duration ? `${Math.floor((ride.actual_duration || 0) / 60)}h ${(ride.actual_duration || 0) % 60}m` : 'N/A',
				'Waiting Time': ride.waiting_time ? `${Math.floor((ride.waiting_time || 0) / 60)}h ${(ride.waiting_time || 0) % 60}m` : '0m',
				'Estimated Fare': `₹${ride.estimated_fare || 0}`,
				'Actual Fare': `₹${ride.actual_fare || 0}`,
				'Discount': `₹${ride.discount || 0}`,
				'Final Fare': `₹${ride.final_fare || 0}`,
				'Status': formatStatus(ride.status || 'N/A'),
				'Payment Status': formatStatus(ride.payment_status || 'N/A'),
				'Payment Method': ride.payment_method || 'N/A',
				'Start Meter': ride.start_meter_reading ? `${ride.start_meter_reading} (Image: ${ride.start_meter_image || 'N/A'})` : 'N/A',
				'End Meter': ride.end_meter_reading ? `${ride.end_meter_reading} (Image: ${ride.end_meter_image || 'N/A'})` : 'N/A',
				'Created At': formatDateTime(ride.created_at),
				'Accepted At': formatDateTime(ride.accepted_at),
				'Started At': formatDateTime(ride.ride_started_at),
				'Completed At': formatDateTime(ride.ride_completed_at),
				'Special Instructions': ride.special_instructions || 'N/A'
			}))

			const wb = XLSX.utils.book_new();
			const ws = XLSX.utils.json_to_sheet(exportData);

			// Auto-fit columns (basic approach)
			const colWidths = exportData[0] ? Object.keys(exportData[0]).map(key => ({
				wch: Math.max(key.length, ...exportData.map(row => (row[key] || '').toString().length)) + 2
			})) : [];

			ws['!cols'] = colWidths;

			// Add worksheet to workbook
			XLSX.utils.book_append_sheet(wb, ws, 'Reservation Rides');

			// Generate filename with timestamp
			const timestamp = new Date().toISOString().split('T')[0];
			const filename = `reservation_rides_${timestamp}.xlsx`;

			// Write file
			XLSX.writeFile(wb, filename);
			toast.success('Excel file exported successfully');
		} catch (error) {
			console.error('Error exporting to Excel:', error);
			toast.error('Failed to export Excel file');
		}
	}, [rideRequests, currentPage, perPage])

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
				headerName: "Booker",
				field: "passenger",
				sortable: true,
				valueGetter: (params) => params.data.passenger?.name || "N/A",
				minWidth: 110,
				flex: 1,
			},
			{
				headerName: "Rider",
				field: "rider",
				sortable: true,
				valueGetter: (params) => params.data.rider?.name || "N/A",
				minWidth: 100,
				flex: 1,
			},
			{
				headerName: "Driver",
				field: "driver",
				sortable: true,
				valueGetter: (params) => params.data.driver?.name || "Not Assigned",
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
				headerName: "Package",
				field: "package_id",
				sortable: true,
				valueGetter: (params) => params.data.package_id || "N/A",
				minWidth: 100,
				flex: 1,
			},
			{
				headerName: "Pickup Date",
				field: "pickup_date",
				sortable: true,
				valueGetter: (params) => params.data.pickup_date || "N/A",
				minWidth: 120,
				flex: 1,
			},
			{
				headerName: "Fare",
				field: "final_fare",
				sortable: true,
				cellRenderer: (params) => <span>₹{params.data.final_fare || params.data.estimated_fare || "0"}</span>,
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
		// Only add Actions column if user has view or edit permission
		if(ridePermissions.can_view || ridePermissions.can_edit){
			baseColumns.push({
				headerName: "Actions",
				sortable: false,
				suppressSizeToFit: true,
				minWidth: 120,
				flex: 0.5,
				cellRenderer: (params) => {
					return (
						<div className="flex items-center gap-2 h-full">
							{ridePermissions.can_view && (
								<button
									onClick={() => handleViewClick(params.data.id)}
									className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
									title="View Details"
								>
									<Eye size={16} style={{ color: theme.primaryGradientStart }} />
								</button>
							)}
							{ridePermissions.can_edit && params.data.is_custom_trip && !params.data.driver && (
								<button
									onClick={() => handleAssignDriverClick(params.data)}
									className="p-1 text-green-600 hover:text-green-800 transition-colors"
									title="Assign Driver"
								>
									<UserPlus size={16} style={{ color: theme.secondaryGradientStart }} />
								</button>
							)}
							{ridePermissions.can_edit && params.data.is_custom_trip && params.data.driver && 
								params.data.status !== 'ride_started' && params.data.status !== 'ride_completed' && (
									<button
										onClick={() => handleUnassignDriver(params.data)}
										className="p-1 text-red-600 hover:text-red-800 transition-colors"
										title="Unassign Driver"
										disabled={isUnassigningDriver}
									>
										<UserMinus size={16} style={{ color: '#EF4444' }} />
									</button>
								)}
							{ridePermissions.can_edit && params.data.is_transferred_to_admin && !params.data.driver && (
								<button
									onClick={() => handleAssignDriverClick(params.data)}
									className="p-1 text-green-600 hover:text-green-800 transition-colors"
									title="Assign Driver to Transferred Ride"
								>
									<UserPlus size={16} style={{ color: theme.secondaryGradientStart }} />
								</button>
							)}
							{ridePermissions.can_edit && params.data.is_transferred_to_admin && params.data.driver && 
							params.data.status !== 'ride_started' && params.data.status !== 'ride_completed' && (
								<button
									onClick={() => handleUnassignDriver(params.data)}
									className="p-1 text-red-600 hover:text-red-800 transition-colors"
									title="Unassign Driver from Transferred Ride"
									disabled={isUnassigningDriver}
								>
									<UserMinus size={16} style={{ color: '#EF4444' }} />
								</button>
							)}
						</div>
					)
				},
			})
		}
		return baseColumns
	}, [theme.primaryGradientStart, theme.secondaryGradientStart, currentPage, perPage, ridePermissions, handleViewClick, handleAssignDriverClick, handleUnassignDriver, isUnassigningDriver])

	// Render complete reservation details in a clean and organized way
	const renderRideDetails = () => {
		if (isLoadingDetails) {
			return (
				<div className="flex items-center justify-center py-8">
					<Loader className="animate-spin mr-2" size={20} />
					<span>Loading reservation details...</span>
				</div>
			)
		}
		if (!rideDetails) {
			return (
				<div className="text-center py-8 text-gray-500">
					No reservation details available
				</div>
			)
		}
		const { booker, rider, driver, reservation_details, advance_payment, meter_readings, distance_time_info, pickup, dropoff, stops, payment_summary, timestamps, status, payment_status, special_instructions, cancellation, feedback, verification } = rideDetails
		return (
			<div className="space-y-6 p-2 max-h-[80vh] overflow-y-auto">
				{/* Header with Reservation ID and Status */}
				<div className="border-gray-200 border-b pb-4">
					<div className="flex justify-between items-start">
						<div>
							<h2 className="text-2xl font-bold text-gray-800">
								Reservation #{rideDetails.id}
							</h2>
							<p className="text-gray-600">Reserve Trip</p>
						</div>
						<div className="text-right">
							<span
								className={`px-3 py-1 rounded-full text-sm font-medium ${
									status === "ride_completed"
										? "bg-green-100 text-green-800"
										: status === "cancelled"
										? "bg-red-100 text-red-800"
										: "bg-yellow-100 text-yellow-800"
								}`}
							>
								{formatStatus(status)}
							</span>
						</div>
					</div>
				</div>
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Booker Details */}
					<div className="bg-gray-50 rounded-lg p-4">
						<h4 className="font-medium text-gray-900 mb-3">Booker Details</h4>
						{booker ? (
							<div className="space-y-2">
								<div className="flex items-center">
									<img
										src={booker.profile_url || defaultProfileImage}
										alt="Booker Profile"
										className="w-12 h-12 rounded-full mr-3 object-cover"
										onError={(e) => (e.target.src = defaultProfileImage)}
									/>
									<div>
										<p className="font-medium">{booker.name}</p>
										<p className="text-sm text-gray-600">{booker.gender || "N/A"}</p>
									</div>
								</div>
								<div className="space-y-1">
									<p className="flex items-center text-sm">
										<Phone size={14} className="mr-2" />
										{booker.mobile}
									</p>
									<p className="flex items-center text-sm">
										<Mail size={14} className="mr-2" />
										{booker.email}
									</p>
								</div>
							</div>
						) : (
							<p className="text-gray-500">No booker information available</p>
						)}
					</div>
					{/* Rider Details */}
					<div className="bg-gray-50 rounded-lg p-4">
						<h4 className="font-medium text-gray-900 mb-3">Rider Details</h4>
						{rideDetails.rider ? (
							<div className="space-y-2">
								<div className="flex items-center">
									<User size={40} className="text-gray-400 mr-3" />
									<div>
										<p className="font-medium">{rider.name}</p>
										<p className="text-sm text-gray-600">
											Relationship: {rider.relationship || "N/A"} {rider.is_booking_for_other ? "(Booking for other)" : ""}
										</p>
									</div>
								</div>
								<p className="flex items-center text-sm">
									<Phone size={14} className="mr-2" />
									{rider.mobile}
								</p>
							</div>
						) : (
							<p className="text-gray-500">No rider information available</p>
						)}
					</div>
					{/* Driver Details */}
					{driver && (
						<div className="bg-gray-50 rounded-lg p-4 lg:col-span-2">
							<div className="flex items-start justify-between">
								<h4 className="font-medium text-gray-900">Driver Details</h4>
							</div>
							<div className="space-y-2 mt-3">
								<div className="flex items-center">
									<img
										src={driver.profile_url || defaultProfileImage}
										alt="Driver Profile"
										className="w-12 h-12 rounded-full mr-3 object-cover"
										onError={(e) => (e.target.src = defaultProfileImage)}
									/>
									<div>
										<p className="font-medium">{driver.name}</p>
										<p className="text-sm text-gray-600">{driver.gender || "N/A"}</p>
									</div>
								</div>
								<div className="space-y-1">
									<p className="flex items-center text-sm">
										<Phone size={14} className="mr-2" />
										{driver.mobile}
									</p>
									<p className="flex items-center text-sm">
										<Mail size={14} className="mr-2" />
										{driver.email}
									</p>
								</div>
							</div>
						</div>
					)}
				</div>
				{/* Trip Route Information */}
				<div className="bg-white border-gray-200 border rounded-lg p-4">
					<h3 className="text-lg font-semibold mb-3 flex items-center">
						<MapPin className="mr-2" size={20} style={{ color: theme.primaryGradientStart }} />
						Trip Route
					</h3>
					<div className="space-y-4">
						{/* Pickup Location */}
						<div className="flex items-start">
							<div className="w-3 h-3 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
							<div className="flex-1">
								<p className="font-medium text-green-700">Pickup Location</p>
								<p className="text-gray-600">{pickup.address || "N/A"}</p>
								{pickup.latitude && pickup.longitude && (
									<>
										<button
											onClick={() => openLocationInMaps(pickup.latitude, pickup.longitude)}
											className="p-2 text-blue-600 rounded-lg transition-all duration-200 mr-2"
											title="View location on map"
										>
											<MapPin size={18} />
										</button>
										<p className="text-xs text-gray-500">
											Coordinates: {pickup.latitude}, {pickup.longitude}
										</p>
									</>
								)}
							</div>
						</div>
						{/* Stop 1 */}
						{stops?.stop1 && (
							<div className="flex items-start">
								<div className="w-3 h-3 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
								<div className="flex-1">
									<p className="font-medium text-blue-700">Stop 1</p>
									<p className="text-gray-600">{stops.stop1.address}</p>
									{stops.stop1.latitude && stops.stop1.longitude && (
										<p className="text-xs text-gray-500">
											Coordinates: {stops.stop1.latitude}, {stops.stop1.longitude}
										</p>
									)}
								</div>
							</div>
						)}
						{/* Stop 2 */}
						{stops?.stop2 && (
							<div className="flex items-start">
								<div className="w-3 h-3 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
								<div className="flex-1">
									<p className="font-medium text-blue-700">Stop 2</p>
									<p className="text-gray-600">{stops.stop2.address}</p>
									{stops.stop2.latitude && stops.stop2.longitude && (
										<p className="text-xs text-gray-500">
											Coordinates: {stops.stop2.latitude}, {stops.stop2.longitude}
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
								<p className="text-gray-600">{dropoff.address || "N/A"}</p>
								{dropoff.latitude && dropoff.longitude && (
									<>
										<button
											onClick={() => openLocationInMaps(dropoff.latitude, dropoff.longitude)}
											className="p-2 text-blue-600 rounded-lg transition-all duration-200 mr-2"
											title="View location on map"
										>
											<MapPin size={18} />
										</button>
										<p className="text-xs text-gray-500">
											Coordinates: {dropoff.latitude}, {dropoff.longitude}
										</p>
									</>
								)}
							</div>
						</div>
					</div>
				</div>
				{/* Distance and Time Information */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<div className="bg-white border-gray-200 border rounded-lg p-4">
						<h3 className="text-lg font-semibold mb-3">Distance & Duration</h3>
						<div className="space-y-2">
							<div className="flex justify-between">
								<span className="text-gray-600">Estimated Distance:</span>
								<span className="font-medium">{distance_time_info.estimated_distance || "N/A"} km</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-600">Actual Distance:</span>
								<span className="font-medium">{distance_time_info.actual_distance || "N/A"} km</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-600">Estimated Duration:</span>
								<span className="font-medium">{distance_time_info.estimated_duration || "N/A"}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-600">Actual Duration:</span>
								<span className="font-medium">{distance_time_info.actual_duration || "N/A"}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-600">Waiting Time:</span>
								<span className="font-medium">{distance_time_info.waiting_time || "0m"}</span>
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
								<span className="font-medium">₹{payment_summary.estimated_fare || "0"}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-600">Actual Fare:</span>
								<span className="font-medium">₹{payment_summary.actual_fare || "0"}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-600">Discount:</span>
								<span className="font-medium text-green-600">-₹{payment_summary.discount || "0"}</span>
							</div>
							<div className="flex justify-between border-gray-200 border-t pt-2">
								<span className="text-gray-800 font-semibold">Final Fare:</span>
								<span
									className="font-bold text-lg"
									style={{ color: theme.primaryGradientStart }}
								>
									₹{payment_summary.final_fare || "0"}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-600">Payment Method:</span>
								<span className="font-medium">{rideDetails.payment_method || "N/A"}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-600">Payment Status:</span>
								<span
									className={`font-medium ${
										payment_status === "paid"
											? "text-green-600"
											: payment_status === "failed"
											? "text-red-600"
											: "text-yellow-600"
									}`}
								>
									{formatStatus(payment_status)}
								</span>
							</div>
							{payment_summary.coupon_code && (
								<div className="flex justify-between">
									<span className="text-gray-600">Coupon Code:</span>
									<span className="font-medium">{payment_summary.coupon_code}</span>
								</div>
							)}
						</div>
					</div>
				</div>
				{/* Meter Readings */}
				{(meter_readings.start.reading || meter_readings.end.reading) && (
					<div className="bg-white border-gray-200 border rounded-lg p-4">
						<h3 className="text-lg font-semibold mb-3">Meter Readings</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{meter_readings.start.reading && (
								<div>
									<p className="text-gray-600">Start Reading:</p>
									<p className="font-medium">{meter_readings.start.reading}</p>
									{meter_readings.start.image && <img src={meter_readings.start.image} alt="Start Meter" className="mt-2 max-w-xs" />}
								</div>
							)}
							{meter_readings.end.reading && (
								<div>
									<p className="text-gray-600">End Reading:</p>
									<p className="font-medium">{meter_readings.end.reading}</p>
									{meter_readings.end.image && <img src={meter_readings.end.image} alt="End Meter" className="mt-2 max-w-xs" />}
								</div>
							)}
						</div>
					</div>
				)}
				{/* OTP Verification Details */}
				{verification && (
					<div className="bg-white border-gray-200 border rounded-lg p-4">
						<h3 className="text-lg font-semibold mb-3">OTP Verification</h3>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div>
								<p className="text-gray-600">OTP:</p>
								<p className="font-medium font-mono text-lg">{verification.otp || "N/A"}</p>
							</div>
							<div>
								<p className="text-gray-600">Generated At:</p>
								<p className="font-medium">{formatDateTime(verification.generated_at)}</p>
							</div>
							<div>
								<p className="text-gray-600">Verification Status:</p>
								<span
									className={`inline-block px-2 py-1 rounded text-xs font-medium ${
										verification.otp_verified
											? "bg-green-100 text-green-800"
											: "bg-red-100 text-red-800"
									}`}
								>
									{verification.otp_verified ? "Verified" : "Not Verified"}
								</span>
							</div>
						</div>
					</div>
				)}
				{/* Feedback Section */}
				{feedback?.is_rated && (
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
												star <= (feedback.rating || 0)
													? "text-yellow-400 fill-current"
													: "text-gray-300"
											}
										/>
									))}
									<span className="ml-2 font-medium">{feedback.rating}/5</span>
								</div>
							</div>
							{feedback.feedback && (
								<div>
									<p className="text-gray-600">Feedback:</p>
									<p className="bg-gray-50 p-3 rounded italic">{feedback.feedback}</p>
								</div>
							)}
						</div>
					</div>
				)}
				{/* Cancellation Details */}
				{status === "cancelled" && cancellation?.reason && (
					<div className="bg-red-50 border border-red-200 rounded-lg p-4">
						<h3 className="text-lg font-semibold mb-3 text-red-800">Cancellation Details</h3>
						<div className="space-y-2">
							<div>
								<p className="text-gray-600">Reason:</p>
								<p className="font-medium">{cancellation.reason}</p>
							</div>
							<div>
								<p className="text-gray-600">Cancelled At:</p>
								<p className="font-medium">{formatDateTime(cancellation.cancelled_at)}</p>
							</div>
						</div>
					</div>
				)}
				{/* Special Instructions */}
				{special_instructions && (
					<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
						<h3 className="text-lg font-semibold mb-3 text-blue-800">Special Instructions</h3>
						<p className="text-gray-700">{special_instructions}</p>
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
						Reservation Timeline
					</h3>
					<div className="space-y-3">
						{Object.entries(timestamps).map(([event, timestamp]) =>
							timestamp ? (
								<div key={event} className="flex items-center">
									<div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
									<div className="flex-1">
										<span className="font-medium">
											{event.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}:
										</span>
										<span className="text-gray-600">{formatDateTime(timestamp)}</span>
									</div>
								</div>
							) : null
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
					Reservation Details Overview
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
							Reservations
						</li>
					</ol>
				</nav>
			</div>
			{/* Status Tabs */}
			<div className="mb-4 space-y-3">
				{/* Reservation Type Tabs */}
				<div className="flex justify-center">
					<div className="inline-flex rounded-md shadow-sm" role="group">
						{[
							{ value: "all", label: "All", isFirst: true },
							{ value: "false", label: "Normal Reservation" },
							{ value: "true", label: "Custom Reservation" },
							{ value: "transferred", label: "Transferred", isLast: true },
						].map(({ value, label, isFirst, isLast }) => (
							<button
								key={value}
								type="button"
								className={`px-4 py-2 text-sm font-medium flex items-center transition-all duration-200 ${
									isFirst ? "rounded-l-md" : isLast ? "rounded-r-md" : "border-r"
								} ${
									(value === "transferred" && filters.is_transferred === "true") ||
									(value !== "transferred" && filters.is_custom_trip === value) ||
									(!filters.is_custom_trip && !filters.is_transferred && value === "all")
										? "text-white border-transparent"
										: "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
								}`}
								style={
									(value === "transferred" && filters.is_transferred === "true") ||
									(value !== "transferred" && filters.is_custom_trip === value) ||
									(!filters.is_custom_trip && !filters.is_transferred && value === "all")
										? { background: `linear-gradient(${theme.gradientDirection}, ${theme.secondaryGradientStart}, ${theme.secondaryGradientEnd})` }
										: {}
								}
								onClick={() => {
									if (value === "transferred") {
										handleFilterChange("is_transferred", "true")
										handleFilterChange("is_custom_trip", "")
									} else {
										handleFilterChange("is_transferred", "")
										handleFilterChange("is_custom_trip", value === "all" ? "" : value)
									}
								}}
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
			<div
				style={{
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
					noRowsOverlayComponentParams={{ text: "No Reservation Rides Found" }}
					onPaginationChanged={(params) => {
						if (params.api) {
							const newPage = params.api.paginationGetCurrentPage() + 1
							handlePageChange(newPage)
						}
					}}
				/>
			</div>
			{/* View Details Modal */}
			<Modal
				isOpen={isModalOpen}
				onClose={handleCancelEdit}
				title="View Reservation Details"
				size="full"
			>
				{renderRideDetails()}
			</Modal>

			{/* Assign Driver Modal */}
			<Modal
				isOpen={isAssignDriverModalOpen}
				onClose={() => {
					setIsAssignDriverModalOpen(false)
					setSelectedReservationForAssignment(null)
					setSelectedDriver([])
				}}
				title="Assign Driver to Custom Reservation"
				size="md"
			>
				<div className="space-y-4 p-4">
					{selectedReservationForAssignment && (
						<div className="bg-gray-50 rounded-lg p-4 mb-4">
							<h4 className="font-medium text-gray-900 mb-2">Reservation Details</h4>
							<div className="space-y-1 text-sm">
								<p><span className="text-gray-600">Reservation ID:</span> <span className="font-medium">#{selectedReservationForAssignment.id}</span></p>
								<p><span className="text-gray-600">Rider:</span> <span className="font-medium">{selectedReservationForAssignment.rider?.name || 'N/A'}</span></p>
								<p><span className="text-gray-600">Pickup:</span> <span className="font-medium">{selectedReservationForAssignment.pickup}</span></p>
								<p><span className="text-gray-600">Pickup Date:</span> <span className="font-medium">{selectedReservationForAssignment.pickup_date} {selectedReservationForAssignment.pickup_time}</span></p>
								<p><span className="text-gray-600">Custom KM:</span> <span className="font-medium">{selectedReservationForAssignment.custom_km || 'N/A'} km</span></p>
								<p><span className="text-gray-600">Custom Days:</span> <span className="font-medium">{selectedReservationForAssignment.custom_days || 'N/A'} days</span></p>
							</div>
						</div>
					)}

					<ThemeUI.FormField label="Select Driver" required>
						<ThemeUI.AutoComplete
							id="driver-select"
							name="driver"
							value={selectedDriver}
							loadOptions={loadDrivers}
							onChange={setSelectedDriver}
							placeholder="Type to search drivers..."
							isMulti={false}
							minInputLength={1}
							debounceDelay={300}
							noOptionsMessage={({ inputValue }) => 
								inputValue ? 'No drivers found' : 'Type to search'
							}
						/>
					</ThemeUI.FormField>

					<div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
						<ThemeUI.Button
							type="button"
							onClick={() => {
								setIsAssignDriverModalOpen(false)
								setSelectedReservationForAssignment(null)
								setSelectedDriver([])
							}}
							gradientColors={{
								start: '#6B7280',
								end: '#4B5563',
							}}
							disabled={isAssigningDriver}
						>
							Cancel
						</ThemeUI.Button>
						<ThemeUI.Button
							type="button"
							onClick={handleAssignDriver}
							gradientColors={{
								start: theme.primaryGradientStart,
								end: theme.primaryGradientEnd,
							}}
							disabled={isAssigningDriver || selectedDriver.length === 0}
						>
							{isAssigningDriver ? (
								<>
									<Loader className="animate-spin mr-2" size={16} />
									Assigning...
								</>
							) : (
								<>
									<UserPlus size={16} className="mr-2" />
									Assign Driver
								</>
							)}
						</ThemeUI.Button>
					</div>
				</div>
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
							onChange={(selected) => handleFilterChange("status", selected?.value || "")}
							options={[
								{ value: "pending", label: "Pending" },
								{ value: "searching_driver", label: "Searching Driver" },
								{ value: "accepted", label: "Accepted" },
								{ value: "arrived", label: "Driver Arrived" },
								{ value: "ride_started", label: "Ride Started" },
								{ value: "ride_completed", label: "Ride Completed" },
								{ value: "cancelled", label: "Cancelled" },
								{ value: "expired", label: "Expired" },
								{ value: "no_drivers_available", label: "No Drivers Available" },
								{ value: "timeout", label: "Timeout" },
							]}
							placeholder="Filter by status"
							isClearable
							isSearchable={false}
						/>
					</ThemeUI.FormField>
					<ThemeUI.FormField label="Reservation Type">
						<ThemeUI.Select
							value={filters.is_custom_trip}
							onChange={(selected) => handleFilterChange("is_custom_trip", selected?.value || "")}
							options={[
								{ value: "", label: "All" },
								{ value: "false", label: "Normal Reservation" },
								{ value: "true", label: "Custom Reservation" },
							]}
							placeholder="Filter by reservation type"
							isClearable
							isSearchable={false}
						/>
					</ThemeUI.FormField>
					<ThemeUI.FormField label="Payment Status">
						<ThemeUI.Select
							value={filters.payment_status}
							onChange={(selected) => handleFilterChange("payment_status", selected?.value || "")}
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
					<ThemeUI.FormField label="Pickup State">
						<ThemeUI.Select
							value={filters.pickup_state_id}
							onChange={(selected) => handleFilterChange("pickup_state_id", selected?.value || "")}
							options={states.map((s) => ({
								value: s.id.toString(),
								label: s.state_name
							}))}
							placeholder="Select pickup state"
							isClearable
							isSearchable={false}
						/>
					</ThemeUI.FormField>
					<ThemeUI.FormField label="Dropoff State">
						<ThemeUI.Select
							value={filters.dropoff_state_id}
							onChange={(selected) => handleFilterChange("dropoff_state_id", selected?.value || "")}
							options={states.map((s) => ({
								value: s.id.toString(),
								label: s.state_name
							}))}
							placeholder="Select dropoff state"
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
									payment_status: "",
									is_custom_trip: "",
    								is_transferred: "",
									date_from: "",
									date_to: "",
									pickup_state_id: "",
									dropoff_state_id: ""
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
export default Reservation;