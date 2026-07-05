import React, { useState, useEffect, useCallback, useMemo } from "react"
import axios from "axios"
import { toast } from "react-toastify"
import Layout from "./Layout"
import { useTheme } from "../context/themeContext"
import { ThemeUI } from "../context/themeUI"
import { ChevronRight, Loader, Edit, Search, Filter, Eye, Trash2, Plus, Clock } from "lucide-react"
import Modal from "./Modal"
import Offcanvas from "./Offcanvas"
import { AgGridReact } from "ag-grid-react"
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community"
import { format } from "date-fns"
import NoRowsOverlay from "./NoRowsOverlay"
ModuleRegistry.registerModules([AllCommunityModule])
function VehiclePrices(){
    const { theme }                                             = useTheme()
    const [isModalOpen, setIsModalOpen]                         = useState(false)
    const [isLoading, setIsLoading]                             = useState(false)
    const [totalRows, setTotalRows]                             = useState(0)
    const [perPage, setPerPage]                                 = useState(10)
    const [currentPage, setCurrentPage]                         = useState(1)
    const [vehiclePrices, setVehiclePrices]                     = useState([])
    const [searchQuery, setSearchQuery]                         = useState("")
    const [statusFilter, setStatusFilter]                       = useState("")
    const [tripFilter, setTripFilter]                           = useState("")
    const [vehicleFilter, setVehicleFilter]                     = useState("")
    const [vehicleTypeFilter, setVehicleTypeFilter]             = useState("")
    const [stateFilter, setStateFilter]                         = useState("")
    const [isFilterOffcanvasOpen, setIsFilterOffcanvasOpen]     = useState(false)
    const [backendErrors, setBackendErrors]                     = useState({})
    const [editingVehiclePrice, setEditingVehiclePrice]         = useState(null)
    const [tripType, setTripType]                               = useState("")
    const [filterOptions, setFilterOptions]                     = useState({
        trips                                                   : [],
        vehicles                                                : [],
        vehicleTypes                                            : [],
        states                                                  : []
    })
    const [formData, setFormData]                               = useState({
        trip_id                                                 : "",
        vehicle_id                                              : "",
        vehicle_type_id                                         : "",
        state_id                                                : "",
        package_id                                              : "",
        igst_rate                                               : "5.00",
        cgst_rate                                               : "2.50",
        sgst_rate                                               : "2.50",
        max_km                                                  : "",
        outstation_km                                           : "",
        status                                                  : 1,
        bata_time_start                                         : "21:00:00",
        bata_time_end                                           : "05:00:00",
        intercity_base_fare                                     : "",
        intercity_minimum_fare                                  : "",
        intercity_per_km_charges                                : "",
        intercity_waiting_charges                                : "",
        intercity_bata_charges                                  : "",
        outstation_base_fare                                    : "",
        outstation_minimum_fare                                 : "",
        outstation_per_km_charges                                : "",
        outstation_waiting_charges                               : "",
        outstation_bata_charges                                 : "",
        round_intercity_base_fare                               : "",
        round_intercity_minimum_fare                            : "",
        round_intercity_per_km_charges                           : "",
        round_intercity_waiting_charges                          : "",
        round_intercity_bata_charges                            : "",
        round_outstation_base_fare                              : "",
        round_outstation_minimum_fare                           : "",
        round_outstation_per_km_charges                          : "",
        round_outstation_waiting_charges                         : "",
        round_outstation_bata_charges                           : "",
        reservation_base_fare                                   : "",
        reservation_per_km_charges                              : "",
    })
    const [placeholder, setPlaceholder]                         = useState("Search by vehicle...")
    const [currentWordIndex, setCurrentWordIndex]               = useState(0)
    const [currentCharIndex, setCurrentCharIndex]               = useState(0)
    const [isDeleting, setIsDeleting]                           = useState(false)
    const words                                                 = ["vehicle", "type", "trip", "state", "fare"] 

    // Initialize permissions with safe defaults
    const [vehiclePricesPermissions, setVehiclePricesPermissions] = useState({
        can_add													: false,
        can_edit												: false,
        can_delete												: false,
        can_view												: false
    })

    // Get user permissions for the vehicles module 
    const getUserPermissions = useCallback(() => {
        try{
            const permissionsStr = localStorage.getItem('userPermissions')
            if(permissionsStr){
                const permissions = JSON.parse(permissionsStr)
                if(permissions.vehicleprices){
                    return {
                        can_add     : permissions.vehicleprices.can_add || false,
                        can_edit    : permissions.vehicleprices.can_edit || false,
                        can_delete  : permissions.vehicleprices.can_delete || false,
                        can_view    : permissions.vehicleprices.can_view || false
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
        setVehiclePricesPermissions(permissions)
    }, [getUserPermissions])
    
    // Listen for permission updates from other components
    useEffect(() => {
        const handlePermissionsUpdate = () => {
            const permissions = getUserPermissions()
            setVehiclePricesPermissions(permissions)
        }
        window.addEventListener('permissionsUpdated', handlePermissionsUpdate)
        return () => {
            window.removeEventListener('permissionsUpdated', handlePermissionsUpdate)
        }
    }, [getUserPermissions])

    // Fetch vehicle prices on mount and when pagination/search/filter changes
    useEffect(() => {
        fetchVehiclePrices(currentPage, perPage, searchQuery, statusFilter, tripFilter, vehicleFilter, vehicleTypeFilter, stateFilter)
    }, [currentPage, perPage, searchQuery, statusFilter, tripFilter, vehicleFilter, vehicleTypeFilter, stateFilter])

    // Typing animation for placeholder
    useEffect(() => {
        const typingSpeed  = isDeleting ? 50 : 100
        const pauseTime    = 1500
        const timeout      = setTimeout(() => {
        const currentWord  = words[currentWordIndex]
            if(!isDeleting && currentCharIndex < currentWord.length){ 
                setPlaceholder(
                `Search by ${currentWord.substring(0, currentCharIndex + 1)}...`
                )
                setCurrentCharIndex((prev) => prev + 1)
            }else
            if(isDeleting && currentCharIndex > 0){
                setPlaceholder(
                `Search by ${currentWord.substring(0, currentCharIndex - 1)}...`
                )
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

    // Memoized fetch function
    const fetchVehiclePrices = useCallback(async () => {
        setIsLoading(true)
        try{
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/vehicle-prices`, {
                params              : {
                    page            : currentPage,
                    limit           : perPage,
                    search          : searchQuery,
                    status          : statusFilter,
                    trip_id         : tripFilter,
                    vehicle_id      : vehicleFilter,
                    vehicle_type_id : vehicleTypeFilter,
                    state_id        : stateFilter,
                },
            })
            if(response.data.success){
                setVehiclePrices(response.data.data.vehiclePrices || [])
                setTotalRows(response.data.data.pagination.total_records || 0)
                setFilterOptions(response.data.data.filters || filterOptions)
            }else{
                toast.error("Failed to fetch vehicle prices")
                setVehiclePrices([])
                setTotalRows(0)
            }
        }catch(err){
            console.error("Error fetching vehicle prices:", err)
            toast.error(err.response?.data?.message || "Failed to fetch vehicle prices")
            setVehiclePrices([])
            setTotalRows(0)
        }finally{
            setIsLoading(false)
        }
    }, [currentPage, perPage, searchQuery, statusFilter, tripFilter, vehicleFilter, vehicleTypeFilter, stateFilter, filterOptions])

    // Handle input change
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }))
        setBackendErrors((prev) => ({ ...prev, [name]: "" }))
    }

    // Handle select change
    const handleSelectChange = async (name, selectedOption) => {
        setFormData((prev) => ({
            ...prev,
            [name]: selectedOption ? selectedOption.value : "",
            // Reset vehicle type when vehicle changes
            ...(name === "vehicle_id" && { vehicle_type_id: "" })
        }))
        // Fetch vehicle types when vehicle is selected
        if(name === "vehicle_id" && selectedOption){
            try{
                const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/vehicle-prices/vehicle-types/${selectedOption.value}`)
                if(response.data.success){
                    setFilterOptions(prev => ({
                        ...prev,
                        vehicleTypes: response.data.data
                    }))
                }
            }catch(err){
                console.error("Error fetching vehicle types:", err)
                toast.error("Failed to fetch vehicle types")
            }
        }
        if(name === "trip_id" && selectedOption){
            setTripType(selectedOption.label.toLowerCase())
        }
        setBackendErrors((prev) => ({ ...prev, [name]: "" }))
    }

    // Handle add vehicle price
    const handleAddVehiclePriceClick = () => {
        if(!vehiclePricesPermissions.can_add){
            toast.error("You don't have permission to create vehicle prices")
            return
        }
        setEditingVehiclePrice({ isNew: true })
        setFormData({
            trip_id                                                 : "",
            vehicle_id                                              : "",
            vehicle_type_id                                         : "",
            state_id                                                : "",
            package_id                                              : "",
            igst_rate                                               : "5.00",
            cgst_rate                                               : "2.50",
            sgst_rate                                               : "2.50",
            max_km                                                  : "",
            outstation_km                                           : "",
            status                                                  : 1,
            bata_time_start                                         : "21:00:00",
            bata_time_end                                           : "05:00:00",
            intercity_base_fare                                     : "",
            intercity_minimum_fare                                  : "",
            intercity_per_km_charges                                 : "",
            intercity_waiting_charges                                : "",
            intercity_bata_charges                                  : "",
            outstation_base_fare                                    : "",
            outstation_minimum_fare                                 : "",
            outstation_per_km_charges                                : "",
            outstation_waiting_charges                               : "",
            outstation_bata_charges                                 : "",
            round_intercity_base_fare                               : "",
            round_intercity_minimum_fare                            : "",
            round_intercity_per_km_charges                           : "",
            round_intercity_waiting_charges                          : "",
            round_intercity_bata_charges                            : "",
            round_outstation_base_fare                              : "",
            round_outstation_minimum_fare                           : "",
            round_outstation_per_km_charges                          : "",
            round_outstation_waiting_charges                         : "",
            round_outstation_bata_charges                           : "",
            reservation_base_fare                                   : "",
            reservation_per_km_charges                               : "",
        })
        setTripType("")
        setBackendErrors({})
        setIsModalOpen(true)
    }

    // Handle edit vehicle price
    const handleEditVehiclePriceClick = (vehiclePrice) => {
        if(!vehiclePricesPermissions.can_edit){
            toast.error("You don't have permission to edit vehicle prices")
            return
        }
        setEditingVehiclePrice(vehiclePrice)
        setFormData({
            trip_id                                                 : vehiclePrice.trip_id,
            vehicle_id                                              : vehiclePrice.vehicle_id,
            vehicle_type_id                                         : vehiclePrice.vehicle_type_id,
            state_id                                                : vehiclePrice.state_id,
            igst_rate                                               : vehiclePrice.igst_rate || "5.00",
            cgst_rate                                               : vehiclePrice.cgst_rate || "2.50",
            sgst_rate                                               : vehiclePrice.sgst_rate || "2.50",
            max_km                                                  : vehiclePrice.max_km ,
            outstation_km                                           : vehiclePrice.outstation_km ,
            package_id                                              : vehiclePrice.package_id || "",
            status                                                  : vehiclePrice.status,
            bata_time_start                                         : vehiclePrice.bata_time_start || "21:00:00",
            bata_time_end                                           : vehiclePrice.bata_time_end || "05:00:00",
            intercity_base_fare                                     : vehiclePrice.intercity_base_fare || "",
            intercity_minimum_fare                                  : vehiclePrice.intercity_minimum_fare || "",
            intercity_per_km_charges                                 : vehiclePrice.intercity_per_km_charges || "",
            intercity_waiting_charges                                : vehiclePrice.intercity_waiting_charges || "",
            intercity_bata_charges                                  : vehiclePrice.intercity_bata_charges || "",
            outstation_base_fare                                    : vehiclePrice.outstation_base_fare || "",
            outstation_minimum_fare                                 : vehiclePrice.outstation_minimum_fare || "",
            outstation_per_km_charges                                : vehiclePrice.outstation_per_km_charges || "",
            outstation_waiting_charges                               : vehiclePrice.outstation_waiting_charges || "",
            outstation_bata_charges                                 : vehiclePrice.outstation_bata_charges || "",
            round_intercity_base_fare                               : vehiclePrice.round_intercity_base_fare || "",
            round_intercity_minimum_fare                            : vehiclePrice.round_intercity_minimum_fare || "",
            round_intercity_per_km_charges                           : vehiclePrice.round_intercity_per_km_charges || "",
            round_intercity_waiting_charges                          : vehiclePrice.round_intercity_waiting_charges || "",
            round_intercity_bata_charges                            : vehiclePrice.round_intercity_bata_charges || "",
            round_outstation_base_fare                              : vehiclePrice.round_outstation_base_fare || "",
            round_outstation_minimum_fare                           : vehiclePrice.round_outstation_minimum_fare || "",
            round_outstation_per_km_charges                         : vehiclePrice.round_outstation_per_km_charges || "",
            round_outstation_waiting_charges                         : vehiclePrice.round_outstation_waiting_charges || "",
            round_outstation_bata_charges                           : vehiclePrice.round_outstation_bata_charges || "",
            reservation_base_fare                                   : vehiclePrice.reservation_base_fare || "",
            reservation_per_km_charges                               : vehiclePrice.reservation_per_km_charges || "",
        })
        setTripType(vehiclePrice.trip_name ? vehiclePrice.trip_name.toLowerCase() : "")
        setBackendErrors({})
        setIsModalOpen(true)
    }

    // Handle search
    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value)
        setCurrentPage(1)
    }

    // Handle pagination
    const handlePageChange = (page) => {
        setCurrentPage(page)
    }

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        setBackendErrors({})
        try{
            let response
            if(editingVehiclePrice?.isNew){
                response = await axios.post(`${import.meta.env.VITE_API_URL}/admin/vehicle-prices`, formData)
            }else{
                response = await axios.put(`${import.meta.env.VITE_API_URL}/admin/vehicle-prices/${editingVehiclePrice.id}`, formData)
            }
            if(response.data.success){
                toast.success(response.data.message || (editingVehiclePrice?.isNew ? "Vehicle price created successfully" : "Vehicle price updated successfully"))
                setIsModalOpen(false)
                setEditingVehiclePrice(null)
                setFormData({
                    trip_id                                                 : "",
                    vehicle_id                                              : "",
                    vehicle_type_id                                         : "",
                    state_id                                                : "",
                    igst_rate                                               : "5.00",
                    cgst_rate                                               : "2.50",
                    sgst_rate                                               : "2.50",
                    max_km                                                  : "",
                    outstation_km                                           : "",
                    status                                                  : 1,
                    bata_time_start                                         : "21:00:00",
                    bata_time_end                                           : "05:00:00",
                    intercity_base_fare                                     : "",
                    intercity_minimum_fare                                  : "",
                    intercity_per_km_charges                                 : "",
                    intercity_waiting_charges                                : "",
                    intercity_bata_charges                                  : "",
                    outstation_base_fare                                    : "",
                    outstation_minimum_fare                                 : "",
                    outstation_per_km_charges                                : "",
                    outstation_waiting_charges                               : "",
                    outstation_bata_charges                                 : "",
                    round_intercity_base_fare                               : "",
                    round_intercity_minimum_fare                            : "",
                    round_intercity_per_km_charges                           : "",
                    round_intercity_waiting_charges                          : "",
                    round_intercity_bata_charges                           : "",
                    round_outstation_base_fare                              : "",
                    round_outstation_minimum_fare                           : "",
                    round_outstation_per_km_charges                         : "",
                    round_outstation_waiting_charges                         : "",
                    round_outstation_bata_charges                           : "",
                    reservation_base_fare                                   : "",
                    reservation_per_km_charges                               : "",
                })
                setTripType("")
                fetchVehiclePrices()
            }else{
                toast.error(response.data.message || "Failed to save vehicle price")
                if(response.data.errors){
                    setBackendErrors(response.data.errors)
                }
            }
        }catch(err){
            console.error("Error saving vehicle price:", err)
            const errorMessage = err.response?.data?.message || "Failed to save vehicle price"
            toast.error(errorMessage)
            if(err.response?.data?.errors){
                setBackendErrors(err.response.data.errors)
            }
        }finally{
            setIsLoading(false)
        }
    }

    // Handle delete vehicle price
    const handleDeleteVehiclePriceClick = async (id) => {
        if(window.confirm("Are you sure you want to delete this vehicle price?")) {
            try{
                const response = await axios.delete(`${import.meta.env.VITE_API_URL}/admin/vehicle-prices/${id}`)
                if(response.data.success){
                    toast.success("Vehicle price deleted successfully")
                    fetchVehiclePrices()
                }
            }catch(err){
                toast.error(err.response?.status === 404 ? "Vehicle price not found." : "Failed to delete vehicle price.")
                console.error("Delete vehicle price error:", err)
            }
        }
    }

    // Handle modal close
    const handleModalClose = () => {
        setIsModalOpen(false)
        setEditingVehiclePrice(null)
        setFormData({
                trip_id                                                 : "",
                vehicle_id                                              : "",
                vehicle_type_id                                         : "",
                state_id                                                : "",
                igst_rate                                               : "5.00",
                cgst_rate                                               : "2.50",
                sgst_rate                                               : "2.50",
                package_id                                              : "",
                max_km                                                  : "",
                outstation_km                                           : "",
                status                                                  : 1,
                bata_time_start                                         : "21:00:00",
                bata_time_end                                           : "05:00:00",
                intercity_base_fare                                     : "",
                intercity_minimum_fare                                  : "",
                intercity_per_km_charges                                 : "",
                intercity_waiting_charges                                : "",
                intercity_bata_charges                                  : "",
                outstation_base_fare                                    : "",
                outstation_minimum_fare                                 : "",
                outstation_per_km_charges                                : "",
                outstation_waiting_charges                               : "",
                outstation_bata_charges                                 : "",
                round_intercity_base_fare                               : "",
                round_intercity_minimum_fare                            : "",
                round_intercity_per_km_charges                          : "",
                round_intercity_waiting_charges                          : "",
                round_intercity_bata_charges                           : "",
                round_outstation_base_fare                              : "",
                round_outstation_minimum_fare                           : "",
                round_outstation_per_km_charges                          : "",
                round_outstation_waiting_charges                         : "",
                round_outstation_bata_charges                           : "",
                reservation_base_fare                                   : "",
                reservation_per_km_charges                               : "",
        })
        setTripType("")
        setBackendErrors({})
    }

    // Reset filters
    const resetFilters = () => {
        setSearchQuery("")
        setStatusFilter("")
        setTripFilter("")
        setVehicleFilter("")
        setVehicleTypeFilter("")
        setStateFilter("")
        setCurrentPage(1)
        setIsFilterOffcanvasOpen(false)
    }

    // DataTable columns
    const columnDefs = useMemo(() => {
        const baseColumns = [
		            {
                headerName  : "S.No",
                valueGetter : (params) => (currentPage - 1) * perPage + params.node.rowIndex + 1,
                width       : 100,
                sortable    : false,
            },
            {
                headerName  : "Vehicle",
                field       : "vehicle_name",
                sortable    : true,
                minWidth    : 150,
                flex        : 1,
            },
            {
                headerName  : "Type",
                field       : "vehicle_type_name",
                sortable    : true,
                minWidth    : 150,
                flex        : 1,
            },
            {
                headerName  : "Trip",
                field       : "trip_name",
                sortable    : true,
                minWidth    : 150,
                flex        : 1,
            },
            {
                headerName  : "State",
                field       : "state_name",
                sortable    : true,
                minWidth    : 150,
                flex        : 1,
            },
            {
                headerName  : "IGST Rate",
                field       : "igst_rate",
                cellRenderer: (params) => (
                    <span className="font-medium">{params.value}%</span>
                ),
                sortable    : true,
                minWidth    : 120,
                flex        : 1,
            },
            {
                headerName  : "Status",
                field       : "status",
                cellRenderer: (params) => {
                    const isActive = params.value === 1
                    return(
                        <span className={`px-2 py-1 rounded-full text-xs ${
                            isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>
                            {isActive ? "Active" : "Inactive"}
                        </span>
                    )
                },
                minWidth    : 120,
                flex        : 1,
            },
            {
                headerName  : "Last Updated",
                field       : "updated_at",
                cellRenderer: (params) => (
                    <div className="flex items-center">
                        <Clock size={14} className="mr-1 text-gray-400" />
                        <p className="text-xs text-gray-600">
                            {params.data?.updated_at ? 
                                format(new Date(params.data.updated_at), "MMM d, yyyy h:mm a") : 
                                "N/A"
                            }
                        </p>
                    </div>
                ),
                sortable    : true,
                minWidth    : 180,
                flex        : 1,
            },	
        ]
        // Only add Actions column if user has edit or delete permission
        if(vehiclePricesPermissions.can_edit || vehiclePricesPermissions.can_delete){
            baseColumns.push({
                headerName  : "Actions",
                field       : "actions",
                cellRenderer: (params) => (
                    <div className="flex items-center gap-2">
                        {vehiclePricesPermissions.can_edit && (
                            <button
                                onClick   = {() => handleEditVehiclePriceClick(params.data)}
                                className = "p-1 text-blue-600 hover:text-blue-800 transition-colors"
                                title     = "Edit"
                            >
                                <Edit size={16} style={{ color: theme.primaryGradientStart }} />
                            </button>
                        )}
                        {vehiclePricesPermissions.can_delete && (
                            <button
                                onClick   = {() => handleDeleteVehiclePriceClick(params.data.id)}
                                className = "p-1 text-red-600 hover:text-red-800 transition-colors"
                                title     = "Delete"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                ),
                minWidth    : 100,
                flex        : 0.5,
                sortable    : false,
            })
        }
        return baseColumns
    }, [theme.primaryGradientStart, theme.secondaryGradientStart, currentPage, perPage, vehiclePricesPermissions, handleEditVehiclePriceClick, handleDeleteVehiclePriceClick])

    // Render vehicle price form
    const renderVehiclePriceForm = () => (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="md:col-span-12">
                <h4 className="text-md font-semibold mb-3 text-gray-800 bg-gray-100 p-2 rounded">
                    GENERAL INFORMATION
                </h4>
            </div>
            <div className="grid md:grid-cols-5 gap-4">
                <ThemeUI.FormField
                    label           = "Trip"
                    name            = "trip_id"
                    error           = {backendErrors.trip_id}
                    required
                >
                    <ThemeUI.Select
                        id          = "trip_id"
                        name        = "trip_id"
                        value       = {formData.trip_id}
                        onChange    = {(selected) => handleSelectChange("trip_id", selected)}
                        options     = {filterOptions.trips.map(t => ({ value: t.id, label: t.trip }))}
                        placeholder = "Select trip"
                        error       = {backendErrors.trip_id}
                    />
                </ThemeUI.FormField>
                <ThemeUI.FormField
                    label           = "Vehicle"
                    name            = "vehicle_id"
                    error           = {backendErrors.vehicle_id}
                    required
                >
                    <ThemeUI.Select
                        id          = "vehicle_id"
                        name        = "vehicle_id"
                        value       = {formData.vehicle_id}
                        onChange    = {(selected) => handleSelectChange("vehicle_id", selected)}
                        options     = {filterOptions.vehicles.map(v => ({ value: v.id, label: v.name }))}
                        placeholder = "Select vehicle"
                        error       = {backendErrors.vehicle_id}
                    />
                </ThemeUI.FormField>
                <ThemeUI.FormField
                    label           = "Vehicle Type"
                    name            = "vehicle_type_id"
                    error           = {backendErrors.vehicle_type_id}
                    required
                >
                    <ThemeUI.Select
                        id          = "vehicle_type_id"
                        name        = "vehicle_type_id"
                        value       = {formData.vehicle_type_id}
                        onChange    = {(selected) => handleSelectChange("vehicle_type_id", selected)}
                        options     = {filterOptions.vehicleTypes.map(vt => ({ value: vt.id, label: vt.name }))}
                        placeholder = "Select vehicle type"
                        error       = {backendErrors.vehicle_type_id}
                    />
                </ThemeUI.FormField>
                <ThemeUI.FormField
                    label           = "State"
                    name            = "state_id"
                    error           = {backendErrors.state_id}
                    required
                >
                    <ThemeUI.Select
                        id          = "state_id"
                        name        = "state_id"
                        value       = {formData.state_id}
                        onChange    = {(selected) => handleSelectChange("state_id", selected)}
                        options     = {filterOptions.states.map(s => ({ value: s.id, label: s.state_name }))}
                        placeholder = "Select state"
                        error       = {backendErrors.state_id}
                    />
                </ThemeUI.FormField>
                {tripType === "reserve" && (
                    <ThemeUI.FormField
                        label           = "Package"
                        name            = "package_id"
                        error           = {backendErrors.package_id}
                        required
                    >
                        <ThemeUI.Select
                            id          = "package_id"
                            name        = "package_id"
                            value       = {formData.package_id}
                            onChange    = {(selected) => handleSelectChange("package_id", selected)}
                            options     = {filterOptions.packages.map(p => ({
                                value: p.id,
                                label: `${p.name}`
                            }))}
                            placeholder = "Select package"
                            error       = {backendErrors.package_id}
                            isClearable = {false}
                        />
                    </ThemeUI.FormField>
                )}
                <ThemeUI.FormField
                    label           = "Bata Time Start"
                    name            = "bata_time_start"
                    error           = {backendErrors.bata_time_start}
                    required
                >
                    <ThemeUI.Input
                        id          = "bata_time_start"
                        name        = "bata_time_start"
                        type        = "time"
                        value       = {formData.bata_time_start}
                        onChange    = {handleInputChange}
                        error       = {backendErrors.bata_time_start}
                    />
                </ThemeUI.FormField>
                <ThemeUI.FormField
                    label           = "Bata Time End"
                    name            = "bata_time_end"
                    error           = {backendErrors.bata_time_end}
                    required
                >
                    <ThemeUI.Input
                        id          = "bata_time_end"
                        name        = "bata_time_end"
                        type        = "time"
                        value       = {formData.bata_time_end}
                        onChange    = {handleInputChange}
                        error       = {backendErrors.bata_time_end}
                    />
                </ThemeUI.FormField>
                <ThemeUI.FormField
                    label           = "IGST Rate (%)"
                    name            = "igst_rate"
                    error           = {backendErrors.igst_rate || backendErrors.tax_rates}
                    required
                >
                    <ThemeUI.Input
                        id          = "igst_rate"
                        name        = "igst_rate"
                        type        = "number"
                        step        = "0.01"
                        value       = {formData.igst_rate}
                        onChange    = {handleInputChange}
                        placeholder = "e.g., 5.00"
                        error       = {backendErrors.igst_rate || backendErrors.tax_rates}
                    />
                </ThemeUI.FormField>
                <ThemeUI.FormField
                    label           = "CGST Rate (%)"
                    name            = "cgst_rate"
                    error           = {backendErrors.cgst_rate || backendErrors.tax_rates}
                    required
                >
                    <ThemeUI.Input
                        id          = "cgst_rate"
                        name        = "cgst_rate"
                        type        = "number"
                        step        = "0.01"
                        value       = {formData.cgst_rate}
                        onChange    = {handleInputChange}
                        placeholder = "e.g., 2.50"
                        error       = {backendErrors.cgst_rate || backendErrors.tax_rates}
                    />
                </ThemeUI.FormField>
                <ThemeUI.FormField
                    label           = "SGST Rate (%)"
                    name            = "sgst_rate"
                    error           = {backendErrors.sgst_rate || backendErrors.tax_rates}
                    required
                >
                    <ThemeUI.Input
                        id          = "sgst_rate"
                        name        = "sgst_rate"
                        type        = "number"
                        step        = "0.01"
                        value       = {formData.sgst_rate}
                        onChange    = {handleInputChange}
                        placeholder = "e.g., 2.50"
                        error       = {backendErrors.sgst_rate || backendErrors.tax_rates}
                    />
                </ThemeUI.FormField>
                {tripType !== "reserve" && (
					<>
						<ThemeUI.FormField
							label			= "Maximum Km"
							name			= "max_km"
							error			= {backendErrors.max_km}
							required		= {true}
						>
							<ThemeUI.Input
								id			= "max_km"
								name		= "max_km"
								type		= "number"
								min			= "1"
								value		= {formData.max_km}
								onChange	= {handleInputChange}
								placeholder = "e.g., 14"
								error		= {backendErrors.max_km}
							/>
							<p className="text-xs text-gray-500 mt-1">
								Maximum distance allowed for this vehicle
							</p>
						</ThemeUI.FormField>
						<ThemeUI.FormField
							label			= "Outstation Threshold Km"
							name			= "outstation_km"
							error			= {backendErrors.outstation_km}
						>
							<ThemeUI.Input
								id			= "outstation_km"
								name		= "outstation_km"
								type		= "number"
								min			= "1"
								value		= {formData.outstation_km}
								onChange	= {handleInputChange}
								placeholder	= "e.g., 50"
								error		= {backendErrors.outstation_km}
							/>
							<p className="text-xs text-gray-500 mt-1">
								Trips above this distance = Outstation, else Intercity
							</p>
						</ThemeUI.FormField>
					</>
				)}
                <ThemeUI.FormField
                    label           = "Status"
                    name            = "status"
                    error           = {backendErrors.status}
                    required
                >
                    <ThemeUI.Select
                        id          = "status"
                        name        = "status"
                        value       = {formData.status}
                        onChange    = {(selected) => handleSelectChange("status", selected)}
                        options     = {[
                            { value: 1, label: "Active" },
                            { value: 0, label: "Inactive" },
                        ]}
                        placeholder = "Select status"
                        error       = {backendErrors.status}
                        isSearchable= {false}
                    />
                </ThemeUI.FormField>
            </div>
            {tripType === "one way" && (
                <>
                    <div className="md:col-span-12">
                        <h4 className="text-md font-semibold mb-3 text-gray-800 bg-gray-100 p-2 rounded">
                            INTERCITY PRICING
                        </h4>
                    </div>
                    <div className="grid md:grid-cols-6 gap-4">
                        <ThemeUI.FormField
                            label="Base Fare"
                            name="intercity_base_fare"
                            error={backendErrors.intercity_base_fare}
                            required
                        >
                            <ThemeUI.Input
                                id="intercity_base_fare"
                                name="intercity_base_fare"
                                type="number"
                                step="0.01"
                                value={formData.intercity_base_fare}
                                onChange={handleInputChange}
                                placeholder="e.g., 100.00"
                                error={backendErrors.intercity_base_fare}
                            />
                        </ThemeUI.FormField>
                        <ThemeUI.FormField
                            label="Minimum Fare"
                            name="intercity_minimum_fare"
                            error={backendErrors.intercity_minimum_fare}
                            required
                        >
                            <ThemeUI.Input
                                id="intercity_minimum_fare"
                                name="intercity_minimum_fare"
                                type="number"
                                step="0.01"
                                value={formData.intercity_minimum_fare}
                                onChange={handleInputChange}
                                placeholder="e.g., 50.00"
                                error={backendErrors.intercity_minimum_fare}
                            />
                        </ThemeUI.FormField>
                        <ThemeUI.FormField
                            label="Per KM Charges"
                            name="intercity_per_km_charges"
                            error={backendErrors.intercity_per_km_charges}
                            required
                        >
                            <ThemeUI.Input
                                id="intercity_per_km_charges"
                                name="intercity_per_km_charges"
                                type="number"
                                step="0.01"
                                value={formData.intercity_per_km_charges}
                                onChange={handleInputChange}
                                placeholder="e.g., 10.00"
                                error={backendErrors.intercity_per_km_charges}
                            />
                        </ThemeUI.FormField>
                        <ThemeUI.FormField
                            label="Waiting Charges"
                            name="intercity_waiting_charges"
                            error={backendErrors.intercity_waiting_charges}
                            required
                        >
                            <ThemeUI.Input
                                id="intercity_waiting_charges"
                                name="intercity_waiting_charges"
                                type="number"
                                step="0.01"
                                value={formData.intercity_waiting_charges}
                                onChange={handleInputChange}
                                placeholder="e.g., 5.00"
                                error={backendErrors.intercity_waiting_charges}
                            />
                        </ThemeUI.FormField>
                        <ThemeUI.FormField
                            label="Bata Charges"
                            name="intercity_bata_charges"
                            error={backendErrors.intercity_bata_charges}
                            required
                        >
                            <ThemeUI.Input
                                id="intercity_bata_charges"
                                name="intercity_bata_charges"
                                type="number"
                                step="0.01"
                                value={formData.intercity_bata_charges}
                                onChange={handleInputChange}
                                placeholder="e.g., 20.00"
                                error={backendErrors.intercity_bata_charges}
                            />
                        </ThemeUI.FormField>
                    </div>
                    <div className="md:col-span-12">
                        <h4 className="text-md font-semibold mb-3 text-gray-800 bg-gray-100 p-2 rounded">
                            OUTSTATION PRICING
                        </h4>
                    </div>
                    <div className="grid md:grid-cols-6 gap-4">
                        <ThemeUI.FormField
                            label           = "Base Fare"
                            name            = "outstation_base_fare"
                            error           = {backendErrors.outstation_base_fare}
                            required
                        >
                            <ThemeUI.Input
                                id          = "outstation_base_fare"
                                name        = "outstation_base_fare"
                                type        = "number"
                                step        = "0.01"
                                value       = {formData.outstation_base_fare}
                                onChange    = {handleInputChange}
                                placeholder = "e.g., 100.00"
                                error       = {backendErrors.outstation_base_fare}
                            />
                        </ThemeUI.FormField>
                        <ThemeUI.FormField
                            label           = "Minimum Fare"
                            name            = "outstation_minimum_fare"
                            error           = {backendErrors.outstation_minimum_fare}
                            required
                        >
                            <ThemeUI.Input
                                id          = "outstation_minimum_fare"
                                name        = "outstation_minimum_fare"
                                type        = "number"
                                step        = "0.01"
                                value       = {formData.outstation_minimum_fare}
                                onChange    = {handleInputChange}
                                placeholder = "e.g., 50.00"
                                error       = {backendErrors.outstation_minimum_fare}
                            />
                        </ThemeUI.FormField>
                        <ThemeUI.FormField
                            label           = "Per KM Charges"
                            name            = "outstation_per_km_charges"
                            error           = {backendErrors.outstation_per_km_charges}
                            required
                        >
                            <ThemeUI.Input
                                id          = "outstation_per_km_charges"
                                name        = "outstation_per_km_charges"
                                type        = "number"
                                step        = "0.01"
                                value       = {formData.outstation_per_km_charges}
                                onChange    = {handleInputChange}
                                placeholder ="e.g., 10.00"
                                error       = {backendErrors.outstation_per_km_charges}
                            />
                        </ThemeUI.FormField>
                        <ThemeUI.FormField
                            label           = "Waiting Charges"
                            name            = "outstation_waiting_charges"
                            error           = {backendErrors.outstation_waiting_charges}
                            required
                        >
                            <ThemeUI.Input
                                id          = "outstation_waiting_charges"
                                name        = "outstation_waiting_charges"
                                type        = "number"
                                step        = "0.01"
                                value       = {formData.outstation_waiting_charges}
                                onChange    = {handleInputChange}
                                placeholder = "e.g., 5.00"
                                error       = {backendErrors.outstation_waiting_charges}
                            />
                        </ThemeUI.FormField>
                        <ThemeUI.FormField
                            label           = "Bata Charges"
                            name            = "outstation_bata_charges"
                            error           = {backendErrors.outstation_bata_charges}
                            required
                        >
                            <ThemeUI.Input
                                id          = "outstation_bata_charges"
                                name        = "outstation_bata_charges"
                                type        = "number"
                                step        = "0.01"
                                value       = {formData.outstation_bata_charges}
                                onChange    = {handleInputChange}
                                placeholder = "e.g., 20.00"
                                error       = {backendErrors.outstation_bata_charges}
                            />
                        </ThemeUI.FormField>
                    </div>
                </>
            )}
            {tripType === "round trip" && (
                <>
                    <div className="md:col-span-12">
                        <h4 className="text-md font-semibold mb-3 text-gray-800 bg-gray-100 p-2 rounded">
                            INTERCITY PRICING
                        </h4>
                    </div>
                    <div className="grid md:grid-cols-6 gap-4">
                        <ThemeUI.FormField
                            label           = "Base Fare"
                            name            = "round_intercity_base_fare"
                            error           = {backendErrors.round_intercity_base_fare}
                            required
                        >
                            <ThemeUI.Input
                                id          = "round_intercity_base_fare"
                                name        = "round_intercity_base_fare"
                                type        = "number"
                                step        = "0.01"
                                value       = {formData.round_intercity_base_fare}
                                onChange    = {handleInputChange}
                                placeholder = "e.g., 100.00"
                                error       = {backendErrors.round_intercity_base_fare}
                            />
                        </ThemeUI.FormField>
                        <ThemeUI.FormField
                            label           = "Minimum Fare"
                            name            = "round_intercity_minimum_fare"
                            error           = {backendErrors.round_intercity_minimum_fare}
                            required
                        >
                            <ThemeUI.Input
                                id          = "round_intercity_minimum_fare"
                                name        = "round_intercity_minimum_fare"
                                type        = "number"
                                step        = "0.01"
                                value       = {formData.round_intercity_minimum_fare}
                                onChange    = {handleInputChange}
                                placeholder = "e.g., 50.00"
                                error       = {backendErrors.round_intercity_minimum_fare}
                            />
                        </ThemeUI.FormField>
                        <ThemeUI.FormField
                            label           = "Per KM Charges"
                            name            = "round_intercity_per_km_charges"
                            error           = {backendErrors.round_intercity_per_km_charges}
                            required
                        >
                            <ThemeUI.Input
                                id          = "round_intercity_per_km_charges"
                                name        = "round_intercity_per_km_charges"
                                type        = "number"
                                step        = "0.01"
                                value       = {formData.round_intercity_per_km_charges}
                                onChange    = {handleInputChange}
                                placeholder = "e.g., 10.00"
                                error       = {backendErrors.round_intercity_per_km_charges}
                            />
                        </ThemeUI.FormField>
                        <ThemeUI.FormField
                            label           = "Waiting Charges"
                            name            = "round_intercity_waiting_charges"
                            error           = {backendErrors.round_intercity_waiting_charges}
                            required
                        >
                            <ThemeUI.Input
                                id          = "round_intercity_waiting_charges"
                                name        = "round_intercity_waiting_charges"
                                type        = "number"
                                step        = "0.01"
                                value       = {formData.round_intercity_waiting_charges}
                                onChange    = {handleInputChange}
                                placeholder = "e.g., 5.00"
                                error       = {backendErrors.round_intercity_waiting_charges}
                            />
                        </ThemeUI.FormField>
                        <ThemeUI.FormField
                            label           = "Bata Charges"
                            name            = "round_intercity_bata_charges"
                            error           = {backendErrors.round_intercity_bata_charges}
                            required
                        >
                            <ThemeUI.Input
                                id          = "round_intercity_bata_charges"
                                name        = "round_intercity_bata_charges"
                                type        = "number"
                                step        = "0.01"
                                value       = {formData.round_intercity_bata_charges}
                                onChange    = {handleInputChange}
                                placeholder = "e.g., 2.00"
                                error       = {backendErrors.round_intercity_bata_charges}
                            />
                        </ThemeUI.FormField>
                    </div>
                    <div className="md:col-span-12">
                        <h4 className="text-md font-semibold mb-3 text-gray-800 bg-gray-100 p-2 rounded">
                            OUTSTATION PRICING
                        </h4>
                    </div>
                    <div className="grid md:grid-cols-6 gap-4">
                        <ThemeUI.FormField
                            label           = "Base Fare"
                            name            = "round_outstation_base_fare"
                            error           = {backendErrors.round_outstation_base_fare}
                            required
                        >
                            <ThemeUI.Input
                                id          = "round_outstation_base_fare"
                                name        = "round_outstation_base_fare"
                                type        = "number"
                                step        = "0.01"
                                value       = {formData.round_outstation_base_fare}
                                onChange    = {handleInputChange}
                                placeholder = "e.g., 100.00"
                                error       = {backendErrors.round_outstation_base_fare}
                            />
                        </ThemeUI.FormField>
                        <ThemeUI.FormField
                            label           = "Minimum Fare"
                            name            = "round_outstation_minimum_fare"
                            error           = {backendErrors.round_outstation_minimum_fare}
                            required
                        >
                            <ThemeUI.Input
                                id          = "round_outstation_minimum_fare"
                                name        = "round_outstation_minimum_fare"
                                type        = "number"
                                step        = "0.01"
                                value       = {formData.round_outstation_minimum_fare}
                                onChange    = {handleInputChange}
                                placeholder = "e.g., 50.00"
                                error       = {backendErrors.round_outstation_minimum_fare}
                            />
                        </ThemeUI.FormField>
                        <ThemeUI.FormField
                            label           = "Per KM Charges"
                            name            = "round_outstation_per_km_charges"
                            error           = {backendErrors.round_outstation_per_km_charges}
                            required
                        >
                            <ThemeUI.Input
                                id          = "round_outstation_per_km_charges"
                                name        = "round_outstation_per_km_charges"
                                type        = "number"
                                step        = "0.01"
                                value       = {formData.round_outstation_per_km_charges}
                                onChange    = {handleInputChange}
                                placeholder = "e.g., 10.00"
                                error       = {backendErrors.round_outstation_per_km_charges}
                            />
                        </ThemeUI.FormField>
                        <ThemeUI.FormField
                            label           = "Waiting Charges"
                            name            = "round_outstation_waiting_charges"
                            error           = {backendErrors.round_outstation_waiting_charges}
                            required
                        >
                            <ThemeUI.Input
                                id          = "round_outstation_waiting_charges"
                                name        = "round_outstation_waiting_charges"
                                type        = "number"
                                step        = "0.01"
                                value       = {formData.round_outstation_waiting_charges}
                                onChange    = {handleInputChange}
                                placeholder = "e.g., 5.00"
                                error       = {backendErrors.round_outstation_waiting_charges}
                            />
                        </ThemeUI.FormField>
                        <ThemeUI.FormField
                            label           = "Bata Charges"
                            name            = "round_outstation_bata_charges"
                            error           = {backendErrors.round_outstation_bata_charges}
                            required
                        >
                            <ThemeUI.Input
                                id          = "round_outstation_bata_charges"
                                name        = "round_outstation_bata_charges"
                                type        = "number"
                                step        = "0.01"
                                value       = {formData.round_outstation_bata_charges}
                                onChange    = {handleInputChange}
                                placeholder = "e.g., 2.00"
                                error       = {backendErrors.round_outstation_bata_charges}
                            />
                        </ThemeUI.FormField>
                    </div>
                </>
            )}
            {tripType === "reserve" && (
                <>
                    <div className="md:col-span-12">
                        <h4 className="text-md font-semibold mb-3 text-gray-800 bg-gray-100 p-2 rounded">
                            PRICING INFORMATION
                        </h4>
                    </div>
                    <div className="grid md:grid-cols-6 gap-4">
                        <ThemeUI.FormField
                            label           = "Base Fare"
                            name            = "reservation_base_fare"
                            error           = {backendErrors.reservation_base_fare}
                            required
                        >
                            <ThemeUI.Input
                                id          = "reservation_base_fare"
                                name        = "reservation_base_fare"
                                type        = "number"
                                step        = "0.01"
                                value       = {formData.reservation_base_fare}
                                onChange    = {handleInputChange}
                                placeholder = "e.g., 100.00"
                                error       = {backendErrors.reservation_base_fare}
                            />
                        </ThemeUI.FormField>
                        <ThemeUI.FormField
                            label           = "Per KM Charges"
                            name            = "reservation_per_km_charges"
                            error           = {backendErrors.reservation_per_km_charges}
                            required
                        >
                            <ThemeUI.Input
                                id          = "reservation_per_km_charges"
                                name        = "reservation_per_km_charges"
                                type        = "number"
                                step        = "0.01"
                                value       = {formData.reservation_per_km_charges}
                                onChange    = {handleInputChange}
                                placeholder = "e.g., 10.00"
                                error       = {backendErrors.reservation_per_km_charges}
                            />
                        </ThemeUI.FormField>
                    </div>
                </>
            )}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <ThemeUI.Button
                    type           = "button"
                    onClick        = {handleModalClose}
                    variant        = "outline"
                    gradientColors = {{
                        start: theme.secondaryGradientStart,
                        end: theme.secondaryGradientEnd,
                    }}
                    direction      = {theme.gradientDirection}
                >
                    Cancel
                </ThemeUI.Button>
                <ThemeUI.Button
                    type           = "submit"
                    disabled       = {isLoading}
                    gradientColors = {{
                        start: theme.primaryGradientStart,
                        end: theme.primaryGradientEnd,
                    }}
                    direction      = {theme.gradientDirection}
                >
                    {isLoading && <Loader size={16} className="mr-2 animate-spin" />}
                    {editingVehiclePrice?.isNew ? "Create Vehicle Price" : "Update Vehicle Price"}
                </ThemeUI.Button>
            </div>
        </form>
    )

    return (
        <Layout>
            {/* Header and breadcrumb */}
            <div className="flex items-center mb-4">
                <h1 className="text-2xl font-bold max-sm:text-xl flex-1">Fare</h1>
                <nav className="flex items-center text-sm text-gray-500 whitespace-nowrap overflow-x-auto">
                    <ol className="flex items-center">
                        <li>
                            <a href="/dashboard" className="hover:text-blue-600 transition-colors">
                                Home
                            </a>
                        </li>
                        <li className="flex items-center">
                            <ChevronRight className="h-4 w-4 mx-1" />
                        </li>
                        <li style={{ color: theme.primaryGradientStart }} className="font-medium">
                            Fare
                        </li>
                    </ol>
                </nav>
            </div>
            {/* Search and filter controls */}
            <div className="mb-4 rounded-lg w-full">
                <div className="flex justify-between items-center gap-2">
                    <div className="w-full max-sm:flex-1 sm:w-1/3">
                        <ThemeUI.Input
                            id             = "search"
                            name           = "search"
                            value          = {searchQuery}
                            className      = "bg-white border border-gray-300 rounded-md p-2 hover:border-gray-500 transition-colors"
                            onChange       = {handleSearchChange}
                            placeholder    = {placeholder}
                            leftElement    = {<Search size={16} className="text-gray-400" />}
                        />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full max-sm:w-fit sm:w-auto h-full">
                        <ThemeUI.Button
                            type           = "button"
                            onClick        = {() => setIsFilterOffcanvasOpen(true)}
                            gradientColors = {{
                                start: theme.secondaryGradientStart,
                                end: theme.secondaryGradientEnd,
                            }}
                            direction      = {theme.gradientDirection}
                            aria-label     = "Open filter options"
                        >
                            <Filter size={16} className="sm:mr-2" />
                            <p className="max-sm:hidden">Filters</p>
                        </ThemeUI.Button>
                        {vehiclePricesPermissions.can_add && (
                            <ThemeUI.Button
                                type           = "button"
                                onClick        = {handleAddVehiclePriceClick}
                                gradientColors = {{
                                    start: theme.primaryGradientStart,
                                    end: theme.primaryGradientEnd,
                                }}
                                direction      = {theme.gradientDirection}
                            >
                                <Plus size={16} className="sm:mr-2" />
                                <p className="max-sm:hidden">Add Fare</p>
                            </ThemeUI.Button>
                        )}
                    </div>
                </div>
            </div>
            {/* AG Grid - DataTable */}
            <div style={{"--header-gradient": `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})`}}>
                <AgGridReact
                    className                    = "custom-ag-grid"
                    domLayout                    = "autoHeight"
                    theme                        = {themeQuartz.withParams({
                        spacing                  : 7,
                        headerHeight             : 45,
                        headerFontSize           : 16,
                        fontSize                 : 13,
                        headerTextColor          : "white",
                        paginationPanelHeight    : 50,
                    })}
                    defaultColDef                = {{
                        resizable                : false,
                        suppressSizeToFit        : false,
                    }}
                    rowData                      = {vehiclePrices}
                    rowHeight                    = {55}
                    columnDefs                   = {columnDefs}
                    pagination
                    paginationPageSize           = {10}
                    paginationPageSizeSelector   = {[10, 20, 50, 100]}
                    paginationNumberFormatter    = {(params) => `${params.value}`}
                    suppressCellFocus
                    suppressPaginationPanel      = {false}
                    noRowsOverlayComponent       = {NoRowsOverlay}
                    noRowsOverlayComponentParams = {{ text: "No Vehicle Prices Found" }}
                    onPaginationChanged          = {(params) => {
                        if(params.api){
                            const newPage = params.api.paginationGetCurrentPage() + 1
                            handlePageChange(newPage)
                        }
                    }}
                />
            </div>
            {/* Edit Modal */}
            <Modal
                isOpen  = {isModalOpen}
                onClose = {handleModalClose}
                title   = {editingVehiclePrice?.isNew ? "Add New Fare" : "Edit Fare"}
                size    = "XL"
            >
                {renderVehiclePriceForm()}
            </Modal>
            {/* Filter Offcanvas */}
            <Offcanvas
                isOpen  = {isFilterOffcanvasOpen}
                onClose = {() => setIsFilterOffcanvasOpen(false)}
                title   = "Filter Options"
                position= "right"
                size    = "md"
            >
                <div className="space-y-4">
                    <ThemeUI.FormField label="Status">
                        <ThemeUI.Select
                            value        = {statusFilter}
                            onChange     = {(selected) => {
                                setStatusFilter(selected?.value || "")
                                setCurrentPage(1)
                            }}
                            options      = {[
                                { value: "1", label: "Active" },
                                { value: "0", label: "Inactive" },
                            ]}
                            placeholder  = "Filter by status"
                            isClearable
                            isSearchable = {false}
                        />
                    </ThemeUI.FormField>
                    <ThemeUI.FormField label="Trip">
                        <ThemeUI.Select
                            value        = {tripFilter}
                            onChange     = {(selected) => {
                                setTripFilter(selected?.value || "")
                                setCurrentPage(1)
                            }}
                            options      = {filterOptions.trips.map(t => ({ value: t.id, label: t.trip }))}
                            placeholder  = "Filter by trip"
                            isClearable
                        />
                    </ThemeUI.FormField>
                    <ThemeUI.FormField label="Vehicle">
                        <ThemeUI.Select
                            value        = {vehicleFilter}
                            onChange     = {(selected) => {
                                setVehicleFilter(selected?.value || "")
                                setCurrentPage(1)
                            }}
                            options      = {filterOptions.vehicles.map(v => ({ value: v.id, label: v.name }))}
                            placeholder  = "Filter by vehicle"
                            isClearable
                        />
                    </ThemeUI.FormField>
                    <ThemeUI.FormField label="Vehicle Type">
                        <ThemeUI.Select
                            value        = {vehicleTypeFilter}
                            onChange     = {(selected) => {
                                setVehicleTypeFilter(selected?.value || "")
                                setCurrentPage(1)
                            }}
                            options      = {filterOptions.vehicleTypes.map(vt => ({ value: vt.id, label: vt.name }))}
                            placeholder  = "Filter by vehicle type"
                            isClearable
                        />
                    </ThemeUI.FormField>
                    <ThemeUI.FormField label="State">
                        <ThemeUI.Select
                            value        = {stateFilter}
                            onChange     = {(selected) => {
                                setStateFilter(selected?.value || "")
                                setCurrentPage(1)
                            }}
                            options      = {filterOptions.states.map(s => ({ value: s.id, label: s.state_name }))}
                            placeholder  = "Filter by state"
                            isClearable
                        />
                    </ThemeUI.FormField>
                    <div className="flex gap-2">
                        <ThemeUI.Button
                            type="button"
                            onClick={resetFilters}
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
export default VehiclePrices